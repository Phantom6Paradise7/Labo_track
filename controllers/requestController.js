const IssueRequest = require('../models/IssueRequest');
const Asset = require('../models/Asset');
const AuditLog = require('../models/AuditLog');

// List requester's own requests (categorized into currently owned, ordered, and history)
const getMyRequests = async (req, res) => {
  try {
    const requests = await IssueRequest.find({ requester: req.session.user._id })
      .sort({ createdAt: -1 });

    const currentlyOwned = requests.filter(r => r.status === 'Issued');
    const orderedPending = requests.filter(r => r.status === 'Pending' || r.status === 'Approved');
    const pastOrders = requests.filter(r => r.status === 'Returned' || r.status === 'Rejected');

    res.render('requests/my-requests', {
      title: 'My Equipment Orders & Active Assets — LaboTrack',
      requests,
      currentlyOwned,
      orderedPending,
      pastOrders,
      msg: req.query.msg || null,
      error: req.query.error || null
    });
  } catch (err) {
    console.error('Error fetching user requests:', err);
    res.status(500).send(err.message);
  }
};

// Dedicated Request Equipment Page
const getRequestEquipmentPage = async (req, res) => {
  try {
    const { assetId } = req.query;
    let selectedAsset = null;
    if (assetId) {
      selectedAsset = await Asset.findById(assetId);
    }

    const availableAssets = await Asset.find({
      availableQuantity: { $gt: 0 },
      condition: { $nin: ['Repair', 'Decommissioned'] }
    }).sort({ name: 1 });

    // Set default expected return date to 14 days from today (YYYY-MM-DD)
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 14);
    const defaultReturnDate = defaultDate.toISOString().split('T')[0];

    res.render('requests/new', {
      title: 'Request Laboratory Equipment — LaboTrack',
      selectedAsset,
      availableAssets,
      defaultReturnDate,
      msg: req.query.msg || null,
      error: req.query.error || null
    });
  } catch (err) {
    console.error('Error loading request equipment page:', err);
    res.status(500).send(err.message);
  }
};

// Submit Equipment Request Order
const submitEquipmentRequest = async (req, res) => {
  try {
    const { assetId, quantity, purpose, expectedReturnDate } = req.body;

    if (!assetId) {
      return res.redirect('/requests/new?error=Please%20select%20an%20equipment%20item');
    }
    if (!purpose || !purpose.trim()) {
      return res.redirect(`/requests/new?assetId=${assetId}&error=Please%20specify%20a%20research%20or%20coursework%20purpose`);
    }
    if (!expectedReturnDate) {
      return res.redirect(`/requests/new?assetId=${assetId}&error=Expected%20return%20date%20is%20mandatory`);
    }

    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res.redirect('/requests/new?error=Equipment%20not%20found%20in%20catalog');
    }

    const reqQty = parseInt(quantity, 10) || 1;
    if (reqQty <= 0) {
      return res.redirect(`/requests/new?assetId=${assetId}&error=Requested%20quantity%20must%20be%20at%20least%201`);
    }

    if (asset.availableQuantity < reqQty) {
      return res.redirect(`/requests/new?assetId=${assetId}&error=Requested%20quantity%20exceeds%20available%20stock%20(${asset.availableQuantity}%20units%20available)`);
    }

    const requestCode = 'REQ-' + Math.floor(100000 + Math.random() * 900000);

    const newRequest = new IssueRequest({
      requestCode,
      requester: req.session.user._id,
      requesterName: req.session.user.name,
      requesterRole: req.session.user.role,
      department: req.session.user.department || 'Academic Department',
      studentOrStaffId: req.session.user.studentOrStaffId || 'STU-0000',
      items: [{
        asset: asset._id,
        assetTag: asset.assetTag,
        assetName: asset.name,
        quantity: reqQty
      }],
      purpose: purpose.trim(),
      expectedReturnDate: new Date(expectedReturnDate),
      status: 'Pending'
    });

    await newRequest.save();

    await AuditLog.create({
      action: 'REQUISITION_CREATED',
      actorName: req.session.user.name,
      actorRole: req.session.user.role,
      targetType: 'IssueRequest',
      targetId: requestCode,
      details: `Requisition placed for ${reqQty} unit(s) of "${asset.name}" (${asset.assetTag}). Purpose: ${purpose.trim()}`
    });

    res.redirect(`/requests/my-requests?msg=Requisition%20order%20"${requestCode}"%20successfully%20placed!`);
  } catch (err) {
    console.error('Submit equipment request error:', err);
    res.redirect(`/requests/new?error=${encodeURIComponent(err.message)}`);
  }
};

// Lab In-Charge & Admin: Manage all requests (approve, issue, return triage)
const getManageRequests = async (req, res) => {
  try {
    const statusFilter = req.query.status || 'All';
    let query = {};
    if (statusFilter !== 'All') {
      query.status = statusFilter;
    }

    const requests = await IssueRequest.find(query).sort({ createdAt: -1 });

    // Identify overdue items
    const now = new Date();
    const stats = {
      pending: await IssueRequest.countDocuments({ status: 'Pending' }),
      approved: await IssueRequest.countDocuments({ status: 'Approved' }),
      issued: await IssueRequest.countDocuments({ status: 'Issued' }),
      returned: await IssueRequest.countDocuments({ status: 'Returned' }),
      overdue: await IssueRequest.countDocuments({
        status: 'Issued',
        expectedReturnDate: { $lt: now }
      })
    };

    res.render('requests/manage', {
      title: 'Equipment Requisition Desk — LaboTrack In-Charge',
      requests,
      currentStatus: statusFilter,
      stats,
      msg: req.query.msg || null,
      error: req.query.error || null
    });
  } catch (err) {
    console.error('Error fetching manage requests:', err);
    res.status(500).send(err.message);
  }
};

// Batch Issue Request Endpoint (Fulfilled Promise from DevTools Staging Array or Standard Form)
const createBatchRequest = async (req, res) => {
  try {
    let { items, purpose, expectedReturnDate, assetId, quantity } = req.body;

    // Fallback if submitted as single asset form instead of staged items array
    if ((!items || !Array.isArray(items) || items.length === 0) && (assetId || req.body['items[0][assetId]'])) {
      const targetAssetId = assetId || req.body['items[0][assetId]'];
      const targetQty = parseInt(quantity || req.body['items[0][quantity]'] || 1, 10);
      items = [{
        assetId: targetAssetId,
        quantity: targetQty
      }];
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      if (req.xhr || req.headers.accept?.includes('json')) {
        return res.status(400).json({
          success: false,
          message: 'No equipment items were provided in the requisition payload.'
        });
      }
      return res.redirect('/assets?error=No%20equipment%20items%20provided');
    }

    if (!purpose || !purpose.trim()) {
      if (req.xhr || req.headers.accept?.includes('json')) {
        return res.status(400).json({
          success: false,
          message: 'A clear research/institutional purpose is required.'
        });
      }
      return res.redirect('/assets?error=Purpose%20is%20required');
    }

    if (!expectedReturnDate) {
      if (req.xhr || req.headers.accept?.includes('json')) {
        return res.status(400).json({
          success: false,
          message: 'Expected return date is mandatory.'
        });
      }
      return res.redirect('/assets?error=Return%20date%20is%20mandatory');
    }

    const validatedItems = [];

    // Verify stock availability for every staged asset
    for (const item of items) {
      const asset = await Asset.findById(item.assetId);
      if (!asset) {
        if (req.xhr || req.headers.accept?.includes('json')) {
          return res.status(404).json({
            success: false,
            message: `Asset with ID ${item.assetId} could not be found in active inventory.`
          });
        }
        return res.redirect('/assets?error=Asset%20not%20found');
      }

      const reqQty = parseInt(item.quantity, 10) || 1;
      if (asset.availableQuantity < reqQty) {
        if (req.xhr || req.headers.accept?.includes('json')) {
          return res.status(400).json({
            success: false,
            message: `Insufficient inventory: Only ${asset.availableQuantity} unit(s) of "${asset.name}" (${asset.assetTag}) available; requested ${reqQty}.`
          });
        }
        return res.redirect('/assets?error=Insufficient%20stock');
      }

      validatedItems.push({
        asset: asset._id,
        assetTag: asset.assetTag,
        assetName: asset.name,
        quantity: reqQty
      });
    }

    const newRequest = new IssueRequest({
      requestCode: 'REQ-' + Math.floor(100000 + Math.random() * 900000),
      requester: req.session.user._id,
      requesterName: req.session.user.name,
      requesterRole: req.session.user.role,
      items: validatedItems,
      purpose: purpose.trim(),
      expectedReturnDate: new Date(expectedReturnDate),
      status: 'Pending'
    });

    await newRequest.save();

    await AuditLog.create({
      action: 'REQUISITION_SUBMITTED',
      actorName: req.session.user.name,
      actorRole: req.session.user.role,
      targetType: 'IssueRequest',
      targetId: newRequest.requestCode,
      details: `Requisition batch submitted with ${validatedItems.length} equipment items.`
    });

    if (req.xhr || req.headers.accept?.includes('json') || req.is('json')) {
      return res.status(201).json({
        success: true,
        message: 'Requisition order created successfully and sent to Lab In-charge.',
        requestCode: newRequest.requestCode,
        redirectUrl: '/requests/my-requests?msg=Requisition%20order%20placed%20successfully'
      });
    }

    return res.redirect('/requests/my-requests?msg=Requisition%20order%20placed%20successfully');
  } catch (err) {
    console.error('Batch request submission error:', err);
    if (req.xhr || req.headers.accept?.includes('json') || req.is('json')) {
      return res.status(500).json({
        success: false,
        message: 'Failed to process requisition promise: ' + err.message
      });
    }
    return res.redirect(`/assets?error=${encodeURIComponent(err.message)}`);
  }
};

// Approve Request (Lab In-charge / Admin)
const approveRequest = async (req, res) => {
  try {
    const request = await IssueRequest.findById(req.params.id);
    if (!request) return res.status(404).send('Request not found');

    if (request.status !== 'Pending') {
      return res.redirect('/requests/manage?error=Request%20is%20not%20in%20pending%20status');
    }

    request.status = 'Approved';
    request.reviewedBy = req.session.user._id;
    request.reviewerName = req.session.user.name;
    await request.save();

    await AuditLog.create({
      action: 'REQUISITION_APPROVED',
      actorName: req.session.user.name,
      actorRole: req.session.user.role,
      targetType: 'IssueRequest',
      targetId: request.requestCode,
      details: `Approved by Lab In-charge for checkout handover.`
    });

    res.redirect('/requests/manage?msg=Request%20approved%20for%20handover');
  } catch (err) {
    console.error('Approve error:', err);
    res.status(500).send(err.message);
  }
};

// Reject Request (Lab In-charge / Admin) - Handles Pending, Approved (Handover), and Issued (Revocation)
const rejectRequest = async (req, res) => {
  try {
    const { reason } = req.body;
    const request = await IssueRequest.findById(req.params.id);
    if (!request) return res.status(404).send('Request not found');

    if (request.status !== 'Pending' && request.status !== 'Approved' && request.status !== 'Issued') {
      return res.redirect('/requests/manage?error=Cannot%20decline%20request%20in%20its%20current%20status');
    }

    const previousStatus = request.status;

    // If it was already Issued, restore availableQuantity to inventory
    if (previousStatus === 'Issued') {
      for (const item of request.items) {
        let asset = await Asset.findById(item.asset);
        if (!asset && item.assetTag) {
          asset = await Asset.findOne({ assetTag: item.assetTag });
        }
        if (asset) {
          const itemQty = parseInt(item.quantity, 10) || 1;
          asset.availableQuantity = Math.min(asset.quantity, (asset.availableQuantity || 0) + itemQty);
          await asset.save();
        }
      }
    }

    request.status = 'Rejected';
    request.rejectionReason = reason ? reason.trim() : (previousStatus === 'Approved' ? 'Handover declined by Lab In-charge' : (previousStatus === 'Issued' ? 'Handover revoked / inspection failed by Lab In-charge' : 'Declined by Lab In-charge'));
    request.reviewedBy = req.session.user ? req.session.user._id : null;
    request.reviewerName = req.session.user ? req.session.user.name : 'Lab In-charge';
    await request.save();

    await AuditLog.create({
      action: previousStatus === 'Approved' ? 'HANDOVER_DECLINED' : (previousStatus === 'Issued' ? 'HANDOVER_REVOKED' : 'REQUISITION_REJECTED'),
      actorName: req.session.user ? req.session.user.name : 'Lab In-charge',
      actorRole: req.session.user ? req.session.user.role : 'lab_incharge',
      targetType: 'IssueRequest',
      targetId: request.requestCode,
      details: request.rejectionReason
    });

    res.redirect(`/requests/manage?msg=${previousStatus === 'Approved' ? 'Handover%20request%20declined' : (previousStatus === 'Issued' ? 'Handover%20revoked%20and%20inventory%20restored' : 'Request%20rejected')}`);
  } catch (err) {
    console.error('Reject error:', err);
    res.status(500).send(err.message);
  }
};

// Record Handover / Issue (Deduct available inventory quantity)
const issueHandover = async (req, res) => {
  try {
    const request = await IssueRequest.findById(req.params.id);
    if (!request) return res.status(404).send('Request not found');

    if (request.status !== 'Approved') {
      return res.redirect('/requests/manage?error=Equipment%20must%20be%20approved%20first');
    }

    // Double check that available units are sufficient before decrementing
    for (const item of request.items) {
      const asset = await Asset.findById(item.asset);
      if (!asset || asset.availableQuantity < item.quantity) {
        return res.redirect(`/requests/manage?error=Cannot%20issue:%20Insufficient%20stock%20for%20${item.assetName}`);
      }
    }

    // Decrement availableQuantity for each asset
    for (const item of request.items) {
      await Asset.findByIdAndUpdate(item.asset, {
        $inc: { availableQuantity: -item.quantity }
      });
    }

    request.status = 'Issued';
    request.issuedAt = new Date();
    await request.save();

    await AuditLog.create({
      action: 'EQUIPMENT_ISSUED',
      actorName: req.session.user.name,
      actorRole: req.session.user.role,
      targetType: 'IssueRequest',
      targetId: request.requestCode,
      details: `Handed over to requester. Inventory counts decremented.`
    });

    res.redirect('/requests/manage?msg=Equipment%20successfully%20issued%20to%20requester');
  } catch (err) {
    console.error('Issue handover error:', err);
    res.status(500).send(err.message);
  }
};

// Record Return & Condition Triage (OK / Damaged / Lost)
const returnEquipment = async (req, res) => {
  try {
    const { returnCondition, returnNotes, damageCost } = req.body;
    const request = await IssueRequest.findById(req.params.id);
    if (!request) return res.status(404).send('Request not found');

    if (request.status !== 'Issued') {
      return res.redirect('/requests/manage?error=Only%20issued%20items%20can%20be%20returned');
    }

    request.status = 'Returned';
    request.actualReturnDate = new Date();
    request.returnCondition = returnCondition || 'OK';
    request.returnNotes = returnNotes ? returnNotes.trim() : '';

    // If OK or Damaged, units are physically returned to lab pool
    // If Lost, total quantity is decremented permanently
    for (const item of request.items) {
      let asset = await Asset.findById(item.asset);
      if (!asset && item.assetTag) {
        asset = await Asset.findOne({ assetTag: item.assetTag });
      }
      if (asset) {
        const itemQty = parseInt(item.quantity, 10) || 1;
        const currentQty = parseInt(asset.quantity, 10) || 0;
        const currentAvail = parseInt(asset.availableQuantity, 10) || 0;

        if (returnCondition === 'Lost') {
          // Permanently lost from total inventory
          asset.quantity = Math.max(0, currentQty - itemQty);
          asset.availableQuantity = Math.max(0, Math.min(asset.quantity, currentAvail));
          asset.condition = 'Decommissioned';
        } else if (returnCondition === 'Damaged') {
          // Returned physically but marked for repair
          asset.availableQuantity = Math.min(currentQty, currentAvail + itemQty);
          asset.condition = 'Repair';
        } else {
          // Returned in Good/OK condition
          asset.availableQuantity = Math.min(currentQty, currentAvail + itemQty);
          if (asset.condition === 'Repair' || asset.condition === 'Decommissioned') {
            asset.condition = 'Good';
          }
        }
        await asset.save();
      }
    }

    await request.save();

    await AuditLog.create({
      action: 'EQUIPMENT_RETURNED',
      actorName: req.session.user.name,
      actorRole: req.session.user.role,
      targetType: 'IssueRequest',
      targetId: request.requestCode,
      details: `Equipment returned. Condition triage: ${returnCondition}. Notes: ${returnNotes || 'None'}`
    });

    res.redirect(`/requests/manage?msg=Equipment%20return%20logged%20(${returnCondition})`);
  } catch (err) {
    console.error('Return error:', err);
    res.status(500).send(err.message);
  }
};

// Order Information (Audit view of all orders placed & received back for Admin & Lab In-charge)
const getOrderInformation = async (req, res) => {
  try {
    const statusFilter = req.query.status || 'All';
    let query = {};
    if (statusFilter !== 'All') {
      query.status = statusFilter;
    }

    const orders = await IssueRequest.find(query).sort({ createdAt: -1 });

    const stats = {
      totalOrders: await IssueRequest.countDocuments(),
      placedPending: await IssueRequest.countDocuments({ status: 'Pending' }),
      approved: await IssueRequest.countDocuments({ status: 'Approved' }),
      inHandReceived: await IssueRequest.countDocuments({ status: 'Issued' }),
      returnedReceived: await IssueRequest.countDocuments({ status: 'Returned' }),
      declined: await IssueRequest.countDocuments({ status: 'Rejected' })
    };

    res.render('requests/order-info', {
      title: 'Order Information & Registry — LaboTrack',
      orders,
      currentStatus: statusFilter,
      stats,
      msg: req.query.msg || null,
      error: req.query.error || null
    });
  } catch (err) {
    console.error('Error fetching order information:', err);
    res.status(500).send(err.message);
  }
};

module.exports = {
  getMyRequests,
  getRequestEquipmentPage,
  submitEquipmentRequest,
  getOrderInformation,
  getManageRequests,
  createBatchRequest,
  approveRequest,
  rejectRequest,
  issueHandover,
  returnEquipment
};
