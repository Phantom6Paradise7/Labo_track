const Asset = require('../models/Asset');
const IssueRequest = require('../models/IssueRequest');
const AuditLog = require('../models/AuditLog');

// Supplier Portal Dashboard
const getSupplierDashboard = async (req, res) => {
  try {
    const assets = await Asset.find().sort({ updatedAt: -1 });

    const totalStockUnits = assets.reduce((acc, a) => acc + (a.quantity || 0), 0);
    const lowStockItems = assets.filter(a => a.availableQuantity <= 2);

    res.render('supplier/index', {
      title: 'Supplier Stock Control Center — LaboTrack',
      assets,
      stats: {
        totalItems: assets.length,
        totalStockUnits,
        lowStockCount: lowStockItems.length
      },
      msg: req.query.msg || null,
      error: req.query.error || null
    });
  } catch (err) {
    console.error('Supplier dashboard error:', err);
    res.status(500).send(err.message);
  }
};

// Supplier adds brand new item to stock
const addNewStockItem = async (req, res) => {
  try {
    const {
      assetTag,
      name,
      category,
      labLocation,
      quantity,
      modelNumber,
      manufacturer,
      purchaseCost,
      description,
      specifications
    } = req.body;

    if (!assetTag || !assetTag.trim()) {
      return res.redirect('/supplier?error=Asset%20tag%20identifier%20is%20mandatory');
    }
    if (!name || !name.trim()) {
      return res.redirect('/supplier?error=Equipment%20name%20is%20mandatory');
    }

    const cleanTag = assetTag.trim().toUpperCase();
    const existing = await Asset.findOne({ assetTag: cleanTag });
    if (existing) {
      return res.redirect(`/supplier?error=Asset%20tag%20"${cleanTag}"%20already%20exists%20in%20inventory`);
    }

    const parsedQty = parseInt(quantity, 10);
    const validQty = (!isNaN(parsedQty) && parsedQty > 0) ? parsedQty : 1;

    const newStock = new Asset({
      assetTag: cleanTag,
      name: name.trim(),
      category: category || 'General Lab Equipment',
      labLocation: labLocation && labLocation.trim() ? labLocation.trim() : 'Central Supplies Intake',
      building: 'BioScience Complex',
      floor: 'Floor 1',
      room: 'Room 105',
      condition: 'Good',
      quantity: validQty,
      availableQuantity: validQty,
      modelNumber: modelNumber ? modelNumber.trim() : '',
      manufacturer: manufacturer ? manufacturer.trim() : '',
      purchaseCost: parseFloat(purchaseCost) || 0,
      description: description ? description.trim() : '',
      specifications: specifications ? specifications.trim() : '',
      supplier: req.session.user ? req.session.user._id : null,
      supplierName: (req.session.user && (req.session.user.supplierCompany || req.session.user.name)) || 'Authorized Supplier'
    });

    await newStock.save();

    await AuditLog.create({
      action: 'SUPPLIER_STOCK_ADDED',
      actorName: req.session.user ? req.session.user.name : 'Supplier',
      actorRole: 'supplier',
      targetType: 'Stock',
      targetId: newStock.assetTag,
      details: `Supplier added ${validQty} units of new item "${newStock.name}" (${newStock.assetTag})`
    });

    res.redirect(`/supplier?msg=New%20stock%20item%20"${encodeURIComponent(newStock.name)}"%20successfully%20added%20to%20inventory`);
  } catch (err) {
    console.error('Add stock item error:', err);
    res.redirect(`/supplier?error=${encodeURIComponent(err.message)}`);
  }
};

// Lab In-charge / Supplier edits existing stock item
const updateStockItem = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      labLocation,
      condition,
      quantity,
      modelNumber,
      manufacturer,
      purchaseCost,
      description,
      specifications
    } = req.body;

    let asset = await Asset.findById(id);
    if (!asset) {
      asset = await Asset.findOne({ assetTag: id });
    }
    if (!asset) {
      return res.redirect('/supplier?error=Stock%20item%20not%20found');
    }

    const newTotalQty = parseInt(quantity, 10);
    if (!isNaN(newTotalQty) && newTotalQty >= 0) {
      const currentQty = parseInt(asset.quantity, 10) || 0;
      const currentAvail = parseInt(asset.availableQuantity, 10) || 0;
      const diff = newTotalQty - currentQty;
      asset.quantity = newTotalQty;
      asset.availableQuantity = Math.max(0, currentAvail + diff);
    }

    if (name && name.trim()) asset.name = name.trim();
    if (category) asset.category = category;
    if (labLocation && labLocation.trim()) asset.labLocation = labLocation.trim();
    if (condition) asset.condition = condition;
    if (modelNumber !== undefined) asset.modelNumber = modelNumber.trim();
    if (manufacturer !== undefined) asset.manufacturer = manufacturer.trim();
    if (purchaseCost !== undefined) asset.purchaseCost = parseFloat(purchaseCost) || 0;
    if (description !== undefined) asset.description = description.trim();
    if (specifications !== undefined) asset.specifications = specifications.trim();

    await asset.save();

    await AuditLog.create({
      action: 'STOCK_UPDATED',
      actorName: req.session.user ? req.session.user.name : 'Lab In-charge',
      actorRole: req.session.user ? req.session.user.role : 'lab_incharge',
      targetType: 'Stock',
      targetId: asset.assetTag,
      details: `Updated details for "${asset.name}" (${asset.assetTag})`
    });

    res.redirect(`/supplier?msg=Stock%20item%20"${encodeURIComponent(asset.name)}"%20successfully%20updated`);
  } catch (err) {
    console.error('Update stock item error:', err);
    res.redirect(`/supplier?error=${encodeURIComponent(err.message)}`);
  }
};

// Lab In-charge / Supplier replenishes quantity of existing asset
const replenishStock = async (req, res) => {
  try {
    const { assetId, additionalQuantity } = req.body;
    const qtyToAdd = parseInt(additionalQuantity, 10);

    if (isNaN(qtyToAdd) || qtyToAdd <= 0) {
      return res.redirect('/supplier?error=Please%20specify%20a%20positive%20quantity%20to%20replenish');
    }

    let asset = await Asset.findById(assetId);
    if (!asset) {
      asset = await Asset.findOne({ assetTag: assetId });
    }
    if (!asset) {
      return res.redirect('/supplier?error=Asset%20not%20found');
    }

    asset.quantity = (parseInt(asset.quantity, 10) || 0) + qtyToAdd;
    asset.availableQuantity = (parseInt(asset.availableQuantity, 10) || 0) + qtyToAdd;
    await asset.save();

    await AuditLog.create({
      action: 'STOCK_REPLENISHED',
      actorName: req.session.user ? req.session.user.name : 'Lab In-charge',
      actorRole: req.session.user ? req.session.user.role : 'lab_incharge',
      targetType: 'Stock',
      targetId: asset.assetTag,
      details: `Replenished +${qtyToAdd} units (New total: ${asset.quantity})`
    });

    res.redirect(`/supplier?msg=Successfully%20replenished%20+${qtyToAdd}%20units%20for%20${encodeURIComponent(asset.name)}`);
  } catch (err) {
    console.error('Replenish stock error:', err);
    res.redirect(`/supplier?error=${encodeURIComponent(err.message)}`);
  }
};

// Lab In-charge / Supplier deletes or removes item from stock
const deleteStockItem = async (req, res) => {
  try {
    const { id } = req.params;
    let asset = await Asset.findById(id);
    if (!asset) {
      asset = await Asset.findOne({ assetTag: id });
    }

    if (!asset) {
      return res.redirect('/supplier?error=Asset%20not%20found');
    }

    const assetTag = asset.assetTag;
    const assetName = asset.name;
    const assetObjId = asset._id;

    // Delete item from inventory catalog
    await Asset.findByIdAndDelete(assetObjId);

    // Resolve any pending or active requisition requests referencing this deleted item
    try {
      if (typeof IssueRequest.updateMany === 'function') {
        await IssueRequest.updateMany(
          { 'items.asset': assetObjId, status: { $in: ['Pending', 'Approved'] } },
          { status: 'Rejected', rejectionReason: 'Equipment decommissioned or removed from active inventory by Lab In-charge.' }
        );
      }
    } catch (e) {}

    await AuditLog.create({
      action: 'STOCK_DELETED',
      actorName: req.session.user ? req.session.user.name : 'Lab In-charge',
      actorRole: req.session.user ? req.session.user.role : 'lab_incharge',
      targetType: 'Stock',
      targetId: assetTag,
      details: `Deleted stock item "${assetName}" (${assetTag})`
    });

    res.redirect('/supplier?msg=Stock%20item%20successfully%20deleted%20from%20inventory');
  } catch (err) {
    console.error('Delete stock item error:', err);
    res.redirect(`/supplier?error=${encodeURIComponent(err.message)}`);
  }
};

module.exports = {
  getSupplierDashboard,
  addNewStockItem,
  updateStockItem,
  replenishStock,
  deleteStockItem
};
