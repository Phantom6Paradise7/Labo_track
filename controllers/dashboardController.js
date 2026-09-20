const Asset = require('../models/Asset');
const IssueRequest = require('../models/IssueRequest');
const MaintenanceLog = require('../models/MaintenanceLog');
const AuditLog = require('../models/AuditLog');

const getDashboard = async (req, res) => {
  try {
    const assets = await Asset.find();
    const totalAssetsCount = assets.length;
    const totalUnitsCount = assets.reduce((sum, a) => sum + (a.quantity || 0), 0);
    const availableUnitsCount = assets.reduce((sum, a) => sum + (a.availableQuantity || 0), 0);
    const issuedUnitsCount = totalUnitsCount - availableUnitsCount;

    // Damaged / Repair / Lost assets
    const damagedItemsCount = assets.filter(a => a.condition === 'Repair' || a.condition === 'Poor').length;
    const decommissionedCount = assets.filter(a => a.condition === 'Decommissioned' || a.isDecommissioned).length;

    // Overdue returns calculation: only keep for that particular user
    const now = new Date();
    let overdueRequests = [];
    if (req.session && req.session.user && req.session.user.role === 'requester') {
      const allOverdue = await IssueRequest.find({
        status: 'Issued',
        expectedReturnDate: { $lt: now }
      }).sort({ expectedReturnDate: 1 });

      const currentUserId = req.session.user._id ? req.session.user._id.toString() : '';
      const currentUserName = req.session.user.name || '';

      overdueRequests = allOverdue.filter(r => {
        const reqUserId = r.requester ? r.requester.toString() : '';
        return (reqUserId && reqUserId === currentUserId) || (r.requesterName && r.requesterName === currentUserName);
      });
    }

    const activeIssuedRequests = await IssueRequest.find({
      status: 'Issued'
    }).sort({ issuedAt: -1 }).limit(6);

    const pendingApprovalRequests = await IssueRequest.find({
      status: 'Pending'
    }).sort({ createdAt: -1 }).limit(6);

    // Maintenance upcoming/recent (stretch goal)
    const recentMaintenance = await MaintenanceLog.find()
      .sort({ nextServiceDue: 1 })
      .limit(6);

    // Recent system audit logs
    const recentActivity = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(8);

    // Category distribution for visual progress bars
    const categoryDistribution = {};
    assets.forEach(a => {
      categoryDistribution[a.category] = (categoryDistribution[a.category] || 0) + a.quantity;
    });

    res.render('dashboard/index', {
      title: 'Operational Dashboard — LaboTrack',
      metrics: {
        totalAssets: totalAssetsCount,
        totalUnits: totalUnitsCount,
        availableUnits: availableUnitsCount,
        issuedUnits: issuedUnitsCount,
        overdueCount: overdueRequests.length,
        damagedCount: damagedItemsCount,
        decommissionedCount
      },
      overdueRequests,
      activeIssuedRequests,
      pendingApprovalRequests,
      recentMaintenance,
      recentActivity,
      categoryDistribution,
      msg: req.query.msg || null,
      error: req.query.error || null
    });
  } catch (err) {
    console.error('Dashboard aggregation error:', err);
    res.status(500).render('error', {
      title: 'Dashboard Error',
      message: 'Failed to aggregate dashboard metrics: ' + err.message,
      currentUser: req.session.user
    });
  }
};

module.exports = {
  getDashboard
};
