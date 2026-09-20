const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { ensureAuthenticated, requireRole } = require('../middleware/auth');

// Dedicated Stock & Inventory Management routes (supplier, lab_incharge, admin)
router.get('/', ensureAuthenticated, requireRole('supplier', 'admin', 'lab_incharge'), supplierController.getSupplierDashboard);
router.post('/new', ensureAuthenticated, requireRole('supplier', 'admin', 'lab_incharge'), supplierController.addNewStockItem);
router.post('/edit/:id', ensureAuthenticated, requireRole('supplier', 'admin', 'lab_incharge'), supplierController.updateStockItem);
router.post('/replenish', ensureAuthenticated, requireRole('supplier', 'admin', 'lab_incharge'), supplierController.replenishStock);
router.post('/delete/:id', ensureAuthenticated, requireRole('supplier', 'admin', 'lab_incharge'), supplierController.deleteStockItem);

module.exports = router;
