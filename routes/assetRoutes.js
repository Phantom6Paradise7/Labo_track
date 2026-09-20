const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const { ensureAuthenticated, requireRole } = require('../middleware/auth');

// All authenticated users can view assets
router.get('/', ensureAuthenticated, assetController.getAllAssets);

// Admin, Supplier & Lab In-charge asset management
router.get('/new', ensureAuthenticated, requireRole('admin', 'supplier', 'lab_incharge'), assetController.getNewAsset);
router.post('/', ensureAuthenticated, requireRole('admin', 'supplier', 'lab_incharge'), assetController.createAsset);

// Single asset detail
router.get('/:id', ensureAuthenticated, assetController.getAssetById);

// Admin, Supplier & Lab In-charge edit
router.get('/:id/edit', ensureAuthenticated, requireRole('admin', 'supplier', 'lab_incharge'), assetController.getEditAsset);
router.post('/:id/edit', ensureAuthenticated, requireRole('admin', 'supplier', 'lab_incharge'), assetController.updateAsset);

// Delete asset (Admin, Supplier, Lab In-charge)
router.post('/:id/delete', ensureAuthenticated, requireRole('admin', 'supplier', 'lab_incharge'), assetController.deleteAsset);

// Maintenance logging (Admin or Lab In-charge)
router.post('/maintenance', ensureAuthenticated, requireRole('admin', 'lab_incharge'), assetController.addMaintenanceLog);

module.exports = router;
