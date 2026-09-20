const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { ensureAuthenticated, requireRole } = require('../middleware/auth');

// Requester & Orders routes
router.get('/new', ensureAuthenticated, requireRole('requester', 'admin', 'lab_incharge', 'staff', 'student'), requestController.getRequestEquipmentPage);
router.post('/new', ensureAuthenticated, requireRole('requester', 'admin', 'lab_incharge', 'staff', 'student'), requestController.submitEquipmentRequest);
router.get('/my-requests', ensureAuthenticated, requireRole('requester', 'admin', 'lab_incharge', 'staff', 'student'), requestController.getMyRequests);
router.get('/orders', ensureAuthenticated, requireRole('requester', 'admin', 'lab_incharge', 'staff', 'student'), requestController.getMyRequests);
router.post('/batch', ensureAuthenticated, requireRole('requester', 'admin', 'lab_incharge', 'staff', 'student'), requestController.createBatchRequest);

// Lab In-Charge, Supplier & Admin routes
router.get('/order-info', ensureAuthenticated, requireRole('lab_incharge', 'admin', 'supplier'), requestController.getOrderInformation);
router.get('/manage', ensureAuthenticated, requireRole('lab_incharge', 'admin', 'supplier'), requestController.getManageRequests);
router.post('/:id/approve', ensureAuthenticated, requireRole('lab_incharge', 'admin', 'supplier'), requestController.approveRequest);
router.post('/:id/reject', ensureAuthenticated, requireRole('lab_incharge', 'admin', 'supplier'), requestController.rejectRequest);
router.post('/:id/issue', ensureAuthenticated, requireRole('lab_incharge', 'admin', 'supplier'), requestController.issueHandover);
router.post('/:id/return', ensureAuthenticated, requireRole('lab_incharge', 'admin', 'supplier'), requestController.returnEquipment);

module.exports = router;
