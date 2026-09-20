const Asset = require('../models/Asset');
const MaintenanceLog = require('../models/MaintenanceLog');
const IssueRequest = require('../models/IssueRequest');
const AuditLog = require('../models/AuditLog');

// List all assets with search, category filtering, and condition filtering
const getAllAssets = async (req, res) => {
  try {
    const { search, category, condition, location } = req.query;
    let query = { isDecommissioned: false };

    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: regex },
        { assetTag: regex },
        { manufacturer: regex },
        { modelNumber: regex },
        { labLocation: regex }
      ];
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (condition && condition !== 'All') {
      query.condition = condition;
    }

    if (location && location !== 'All') {
      query.labLocation = location;
    }

    const assets = await Asset.find(query).sort({ createdAt: -1 });

    // Distinct values for filter dropdowns / pills
    const categories = [
      'Analytical Instruments',
      'Centrifuges',
      'Microscopy',
      'Liquid Handling',
      'Safety & Containment',
      'Spectrometry',
      'General Lab Equipment'
    ];

    const locations = await Asset.distinct('labLocation');

    // Aggregate summary stats for quick badges
    const totalAssets = assets.reduce((sum, a) => sum + (a.quantity || 0), 0);
    const availableAssets = assets.reduce((sum, a) => sum + (a.availableQuantity || 0), 0);
    const issuedAssets = totalAssets - availableAssets;

    res.render('assets/index', {
      title: 'Lab Assets & Instruments — LaboTrack',
      assets,
      categories,
      locations,
      currentFilter: {
        search: search || '',
        category: category || 'All',
        condition: condition || 'All',
        location: location || 'All'
      },
      stats: {
        totalItems: assets.length,
        totalUnits: totalAssets,
        availableUnits: availableAssets,
        issuedUnits: issuedAssets
      },
      msg: req.query.msg || null,
      error: req.query.error || null
    });
  } catch (err) {
    console.error('Error fetching assets:', err);
    res.status(500).render('error', {
      title: 'Catalog Error',
      message: 'Failed to retrieve asset catalog: ' + err.message,
      currentUser: req.session.user
    });
  }
};

// View single asset with specs and maintenance logs
const getAssetById = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).render('error', {
        title: 'Asset Not Found',
        message: 'The requested lab asset could not be located in the system.',
        currentUser: req.session.user
      });
    }

    const maintenanceLogs = await MaintenanceLog.find({ asset: asset._id }).sort({ serviceDate: -1 });
    const recentRequests = await IssueRequest.find({ 'items.asset': asset._id }).sort({ createdAt: -1 }).limit(10);

    res.render('assets/show', {
      title: `${asset.name} (${asset.assetTag}) — LaboTrack`,
      asset,
      maintenanceLogs,
      recentRequests,
      msg: req.query.msg || null,
      error: req.query.error || null
    });
  } catch (err) {
    console.error('Error viewing asset:', err);
    res.status(500).render('error', {
      title: 'Asset View Error',
      message: err.message,
      currentUser: req.session.user
    });
  }
};

// Form to create asset (Admin, Lab In-charge, Supplier)
const getNewAsset = (req, res) => {
  res.render('assets/new', {
    title: 'Register New Stock Item — LaboTrack',
    from: req.query.from || 'supplier',
    error: null,
    asset: {}
  });
};

// Create new asset
const createAsset = async (req, res) => {
  try {
    const {
      assetTag,
      name,
      category,
      labLocation,
      building,
      floor,
      room,
      condition,
      quantity,
      modelNumber,
      manufacturer,
      serialNumber,
      purchaseCost,
      description,
      specifications,
      from
    } = req.body;

    const existing = await Asset.findOne({ assetTag: assetTag.trim().toUpperCase() });
    if (existing) {
      return res.render('assets/new', {
        title: 'Register New Stock Item — LaboTrack',
        from: from || req.query.from || 'supplier',
        error: `Asset Tag "${assetTag.toUpperCase()}" already exists in inventory. Please specify a unique tag.`,
        asset: req.body
      });
    }

    const qty = parseInt(quantity, 10) || 1;

    const newAsset = new Asset({
      assetTag: assetTag.trim().toUpperCase(),
      name: name.trim(),
      category: category || 'General Lab Equipment',
      labLocation: labLocation && labLocation.trim() ? labLocation.trim() : 'Central Supplies Intake',
      building: building || 'BioScience Complex',
      floor: floor || 'Floor 1',
      room: room || 'Room 101',
      condition: condition || 'Good',
      quantity: qty,
      availableQuantity: qty,
      modelNumber: modelNumber ? modelNumber.trim() : '',
      manufacturer: manufacturer ? manufacturer.trim() : '',
      serialNumber: serialNumber ? serialNumber.trim() : '',
      purchaseCost: parseFloat(purchaseCost) || 0,
      description: description ? description.trim() : '',
      specifications: specifications ? specifications.trim() : '',
      supplierName: req.session.user ? req.session.user.name : 'Authorized Staff'
    });

    await newAsset.save();

    // Audit log
    await AuditLog.create({
      action: 'ASSET_CREATED',
      actorName: req.session.user ? req.session.user.name : 'Lab Staff',
      actorRole: req.session.user ? req.session.user.role : 'admin',
      targetType: 'Asset',
      targetId: newAsset.assetTag,
      details: `Created new equipment "${newAsset.name}" with initial quantity ${qty}`
    });

    if (from === 'catalog' || req.query.from === 'catalog') {
      return res.redirect(`/assets?msg=New%20stock%20item%20"${encodeURIComponent(newAsset.name)}"%20successfully%20registered`);
    }
    res.redirect(`/supplier?msg=New%20stock%20item%20"${encodeURIComponent(newAsset.name)}"%20successfully%20added%20to%20inventory`);
  } catch (err) {
    console.error('Error creating asset:', err);
    res.render('assets/new', {
      title: 'Register New Stock Item — LaboTrack',
      from: req.body.from || req.query.from || 'supplier',
      error: 'Failed to create asset: ' + err.message,
      asset: req.body
    });
  }
};

// Form to edit asset
const getEditAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).send('Asset not found');

    res.render('assets/edit', {
      title: `Edit ${asset.name} — LaboTrack Admin`,
      asset,
      from: req.query.from || 'supplier',
      error: null
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// Update asset
const updateAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).send('Asset not found');

    const {
      name,
      category,
      labLocation,
      building,
      floor,
      room,
      condition,
      quantity,
      modelNumber,
      manufacturer,
      serialNumber,
      purchaseCost,
      description,
      specifications
    } = req.body;

    const newTotalQty = parseInt(quantity, 10);
    const diff = newTotalQty - asset.quantity;
    const newAvail = asset.availableQuantity + diff;

    if (newAvail < 0) {
      return res.render('assets/edit', {
        title: `Edit ${asset.name} — LaboTrack Admin`,
        asset,
        error: `Cannot reduce total quantity below currently issued units (${asset.quantity - asset.availableQuantity} units currently issued).`
      });
    }

    asset.name = name.trim();
    asset.category = category;
    asset.labLocation = labLocation.trim();
    asset.building = building;
    asset.floor = floor;
    asset.room = room;
    asset.condition = condition;
    asset.quantity = newTotalQty;
    asset.availableQuantity = newAvail;
    asset.modelNumber = modelNumber;
    asset.manufacturer = manufacturer;
    asset.serialNumber = serialNumber;
    asset.purchaseCost = parseFloat(purchaseCost) || 0;
    asset.description = description;
    asset.specifications = specifications;

    await asset.save();

    await AuditLog.create({
      action: 'ASSET_UPDATED',
      actorName: req.session.user.name,
      actorRole: req.session.user.role,
      targetType: 'Asset',
      targetId: asset.assetTag,
      details: `Asset details updated for ${asset.assetTag}`
    });

    if (req.query.from === 'supplier' || req.body.from === 'supplier' || (req.session.user && (req.session.user.role === 'supplier' || req.session.user.role === 'lab_incharge' || req.session.user.role === 'admin'))) {
      return res.redirect(`/supplier?msg=Stock%20item%20"${encodeURIComponent(asset.name)}"%20successfully%20updated`);
    }
    res.redirect(`/assets/${asset._id}?msg=Asset%20updated%20successfully`);
  } catch (err) {
    console.error('Error updating asset:', err);
    res.status(500).send(err.message);
  }
};

// Delete / Decommission Asset
const deleteAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).send('Asset not found');

    if (asset.availableQuantity < asset.quantity) {
      return res.redirect(`/assets/${asset._id}?error=Cannot%20delete%20asset%20while%20units%20are%20currently%20issued.`);
    }

    await Asset.findByIdAndDelete(req.params.id);

    await AuditLog.create({
      action: 'ASSET_DELETED',
      actorName: req.session.user.name,
      actorRole: req.session.user.role,
      targetType: 'Asset',
      targetId: asset.assetTag,
      details: `Permanently removed ${asset.name} (${asset.assetTag}) from inventory`
    });

    res.redirect('/assets?msg=Asset%20removed%20from%20inventory');
  } catch (err) {
    console.error('Error deleting asset:', err);
    res.status(500).send(err.message);
  }
};

// Add Maintenance Log (Stretch Goal)
const addMaintenanceLog = async (req, res) => {
  try {
    const { assetId, serviceDate, serviceType, cost, technician, nextServiceDue, notes } = req.body;
    const asset = await Asset.findById(assetId);
    if (!asset) return res.status(404).send('Asset not found');

    const log = new MaintenanceLog({
      asset: asset._id,
      assetTag: asset.assetTag,
      serviceDate: serviceDate ? new Date(serviceDate) : new Date(),
      serviceType,
      cost: parseFloat(cost) || 0,
      technician: technician.trim(),
      nextServiceDue: new Date(nextServiceDue),
      notes: notes ? notes.trim() : '',
      loggedBy: req.session.user._id
    });

    await log.save();

    await AuditLog.create({
      action: 'MAINTENANCE_LOGGED',
      actorName: req.session.user.name,
      actorRole: req.session.user.role,
      targetType: 'Maintenance',
      targetId: asset.assetTag,
      details: `Service logged: ${serviceType} by ${technician}`
    });

    res.redirect(`/assets/${asset._id}?msg=Maintenance%20log%20recorded%20successfully`);
  } catch (err) {
    console.error('Maintenance log error:', err);
    res.status(500).send(err.message);
  }
};

module.exports = {
  getAllAssets,
  getAssetById,
  getNewAsset,
  createAsset,
  getEditAsset,
  updateAsset,
  deleteAsset,
  addMaintenanceLog
};
