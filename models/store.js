const bcrypt = require('bcryptjs');

/**
 * Memory Data Store for instant offline execution
 * Provides zero-configuration out-of-the-box evaluation when MongoDB Atlas URI is not yet configured.
 */

let memoryUsers = [];
let memoryAssets = [];
let memoryRequests = [];
let memoryLogs = [];
let memoryAudit = [];

const initMemoryStore = async () => {
  const hashPass = (pw) => bcrypt.hashSync(pw, 10);

  memoryUsers = [
    {
      _id: 'usr_admin_001',
      name: 'Dr. Sarah Mitchell',
      email: 'admin@labotrack.edu',
      password: hashPass('AdminPassword123!'),
      role: 'admin',
      department: 'Central Laboratory Operations',
      studentOrStaffId: 'ADM-1001',
      comparePassword: async function(candidate) {
        return bcrypt.compare(candidate, this.password);
      }
    },
    {
      _id: 'usr_inchg_002',
      name: 'Prof. Marcus Vance',
      email: 'incharge@labotrack.edu',
      password: hashPass('InchargePassword123!'),
      role: 'lab_incharge',
      department: 'Biochemistry & Molecular Physics',
      studentOrStaffId: 'STAFF-2042',
      comparePassword: async function(candidate) {
        return bcrypt.compare(candidate, this.password);
      }
    },
    {
      _id: 'usr_req_003',
      name: 'Elena Rostova',
      email: 'requester@labotrack.edu',
      password: hashPass('RequesterPassword123!'),
      role: 'requester',
      department: 'Bioengineering Graduate Program',
      studentOrStaffId: 'STU-9941',
      comparePassword: async function(candidate) {
        return bcrypt.compare(candidate, this.password);
      }
    },
    {
      _id: 'usr_sup_004',
      name: 'BioEquip Global Supplies',
      email: 'supplier@labotrack.edu',
      password: hashPass('SupplierPassword123!'),
      role: 'supplier',
      department: 'Scientific Vendor Network',
      supplierCompany: 'BioEquip Global Instrument Solutions',
      comparePassword: async function(candidate) {
        return bcrypt.compare(candidate, this.password);
      }
    }
  ];

  memoryAssets = [
    {
      _id: 'ast_001',
      assetTag: 'OSC-0042',
      name: 'Tektronix TDS2024C Digital Storage Oscilloscope',
      category: 'Analytical Instruments',
      labLocation: 'Lab A-12 (Main Hall)',
      building: 'BioScience Complex',
      floor: 'Floor 1',
      room: 'Room 101',
      condition: 'Good',
      quantity: 5,
      availableQuantity: 4,
      modelNumber: 'TDS2024C-4CH',
      manufacturer: 'Tektronix Inc.',
      serialNumber: 'SN-TKX-88491',
      purchaseCost: 2450.00,
      description: '200 MHz, 4-Channel Digital Storage Oscilloscope with USB connectivity and color display.',
      specifications: 'Bandwidth: 200 MHz, Channels: 4, Sample Rate: 2.0 GS/s, Display: 5.7 in TFT.',
      supplierName: 'BioEquip Global',
      isDecommissioned: false,
      createdAt: new Date(),
      save: async function() { return this; }
    },
    {
      _id: 'ast_002',
      assetTag: 'CEN-0118',
      name: 'Eppendorf 5430 R High-Speed Microcentrifuge',
      category: 'Centrifuges',
      labLocation: 'Lab B-03 (Biochem)',
      building: 'BioScience Complex',
      floor: 'Floor 2',
      room: 'Room 204',
      condition: 'Good',
      quantity: 3,
      availableQuantity: 2,
      modelNumber: '5430R-Refrig',
      manufacturer: 'Eppendorf SE',
      serialNumber: 'SN-EPP-11029',
      purchaseCost: 7890.00,
      description: 'Refrigerated benchtop centrifuge accommodating up to 48 micro-test tubes with rapid cooling.',
      specifications: 'Max speed: 17,500 rpm, Temp range: -11°C to +40°C, 30,130 x g.',
      supplierName: 'BioEquip Global',
      isDecommissioned: false,
      createdAt: new Date(),
      save: async function() { return this; }
    },
    {
      _id: 'ast_003',
      assetTag: 'PIP-0331',
      name: 'Gilson Pipetman Classic 4-Pipette Research Set',
      category: 'Liquid Handling',
      labLocation: 'Lab A-12 (Main Hall)',
      building: 'BioScience Complex',
      floor: 'Floor 1',
      room: 'Room 102',
      condition: 'Good',
      quantity: 8,
      availableQuantity: 7,
      modelNumber: 'F167300',
      manufacturer: 'Gilson Inc.',
      serialNumber: 'SN-GIL-44912',
      purchaseCost: 1150.00,
      description: 'Continuously adjustable air-displacement pipettes covering P20, P200, P1000, and P5000.',
      specifications: 'Volume range: 2 µL – 5 mL, Stainless steel piston, PVDF tip holder.',
      supplierName: 'BioEquip Global',
      isDecommissioned: false,
      createdAt: new Date(),
      save: async function() { return this; }
    },
    {
      _id: 'ast_004',
      assetTag: 'MIC-0205',
      name: 'Olympus IX73 Inverted Fluorescence Microscope System',
      category: 'Microscopy',
      labLocation: 'Lab C-07 (Analytical)',
      building: 'BioScience Complex',
      floor: 'Floor 3',
      room: 'Room 312',
      condition: 'Good',
      quantity: 2,
      availableQuantity: 2,
      modelNumber: 'IX73P1F',
      manufacturer: 'Evident / Olympus',
      serialNumber: 'SN-OLY-90241',
      purchaseCost: 18500.00,
      description: 'Modular inverted research microscope system for live cell imaging and fluorescence assay.',
      specifications: 'Objective turrets: 6-position, Illumination: 100W Halogen & LED Fluorescence.',
      supplierName: 'BioEquip Global',
      isDecommissioned: false,
      createdAt: new Date(),
      save: async function() { return this; }
    },
    {
      _id: 'ast_005',
      assetTag: 'FUM-0087',
      name: 'AirClean Ductless Chemical Fume Hood',
      category: 'Safety & Containment',
      labLocation: 'Lab C-07 (Analytical)',
      building: 'BioScience Complex',
      floor: 'Floor 3',
      room: 'Room 315',
      condition: 'Fair',
      quantity: 2,
      availableQuantity: 2,
      modelNumber: 'AC600-FUME',
      manufacturer: 'AirClean Systems',
      serialNumber: 'SN-ACS-6612',
      purchaseCost: 4900.00,
      description: 'Polypropylene ductless enclosure with gas-phase bonded carbon filter technology.',
      specifications: 'Face velocity: 100 FPM, Filter monitor alarm, Airflow: 250 CFM.',
      supplierName: 'BioEquip Global',
      isDecommissioned: false,
      createdAt: new Date(),
      save: async function() { return this; }
    },
    {
      _id: 'ast_006',
      assetTag: 'SPC-0019',
      name: 'Thermo Fisher NanoDrop One Microvolume UV-Vis Spectrometer',
      category: 'Spectrometry',
      labLocation: 'Central Analytics Core',
      building: 'BioScience Complex',
      floor: 'Floor 2',
      room: 'Room 210',
      condition: 'Repair',
      quantity: 1,
      availableQuantity: 1,
      modelNumber: 'ND-ONE-W',
      manufacturer: 'Thermo Fisher Scientific',
      serialNumber: 'SN-THM-55210',
      purchaseCost: 12200.00,
      description: 'Full-spectrum UV-Vis microvolume spectrophotometer with Acclaro sample intelligence.',
      specifications: 'Wavelength: 190–850 nm, Sample size: 1–2 µL, Detection limit: 2.0 ng/µL dsDNA.',
      supplierName: 'BioEquip Global',
      isDecommissioned: false,
      createdAt: new Date(),
      save: async function() { return this; }
    }
  ];

  const now = new Date();
  const overdueDate = new Date();
  overdueDate.setDate(now.getDate() - 3);

  const futureDate = new Date();
  futureDate.setDate(now.getDate() + 7);

  memoryRequests = [
    {
      _id: 'req_001',
      requestCode: 'REQ-409182',
      requester: 'usr_req_003',
      requesterName: 'Elena Rostova',
      requesterRole: 'requester',
      items: [
        {
          asset: 'ast_001',
          assetTag: 'OSC-0042',
          assetName: 'Tektronix TDS2024C Digital Storage Oscilloscope',
          quantity: 1
        }
      ],
      purpose: 'Signal integrity and harmonic distortion analysis for thesis chapter 4.',
      expectedReturnDate: futureDate,
      status: 'Pending',
      createdAt: new Date(),
      isOverdue: false,
      save: async function() { return this; }
    },
    {
      _id: 'req_002',
      requestCode: 'REQ-108273',
      requester: 'usr_req_003',
      requesterName: 'Elena Rostova',
      requesterRole: 'requester',
      items: [
        {
          asset: 'ast_002',
          assetTag: 'CEN-0118',
          assetName: 'Eppendorf 5430 R High-Speed Microcentrifuge',
          quantity: 1
        }
      ],
      purpose: 'Enzyme precipitation protocol and pellet density centrifugation.',
      expectedReturnDate: overdueDate,
      issuedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      status: 'Issued',
      reviewedBy: 'usr_inchg_002',
      reviewerName: 'Prof. Marcus Vance',
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      isOverdue: true,
      save: async function() { return this; }
    },
    {
      _id: 'req_003',
      requestCode: 'REQ-992014',
      requester: 'usr_req_003',
      requesterName: 'Elena Rostova',
      requesterRole: 'requester',
      items: [
        {
          asset: 'ast_003',
          assetTag: 'PIP-0331',
          assetName: 'Gilson Pipetman Classic 4-Pipette Research Set',
          quantity: 1
        }
      ],
      purpose: 'Buffer preparation and multi-dilution titration series.',
      expectedReturnDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      actualReturnDate: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      issuedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      status: 'Returned',
      returnCondition: 'OK',
      returnNotes: 'All 4 pipettes wiped down and calibration seal verified intact.',
      reviewedBy: 'usr_inchg_002',
      reviewerName: 'Prof. Marcus Vance',
      createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      isOverdue: false,
      save: async function() { return this; }
    }
  ];

  const nextServiceDate = new Date();
  nextServiceDate.setMonth(now.getMonth() + 2);

  memoryLogs = [
    {
      _id: 'log_001',
      asset: 'ast_001',
      assetTag: 'OSC-0042',
      serviceDate: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
      serviceType: 'Calibration',
      cost: 320.00,
      technician: 'Tektronix Field Specialist #84',
      nextServiceDue: nextServiceDate,
      notes: 'Channel 1–4 voltage offsets adjusted. Trace noise within manufacturer tolerance.',
      status: 'Completed',
      createdAt: new Date()
    },
    {
      _id: 'log_002',
      asset: 'ast_006',
      assetTag: 'SPC-0019',
      serviceDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      serviceType: 'Emergency Repair',
      cost: 850.00,
      technician: 'Thermo Fisher Precision BioTech',
      nextServiceDue: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      notes: 'Fiber-optic baseline calibration error. Sensor replacement ordered.',
      status: 'In Progress',
      createdAt: new Date()
    }
  ];

  memoryAudit = [
    {
      _id: 'aud_001',
      action: 'SYSTEM_INITIALIZATION',
      actorName: 'System Administrator',
      actorRole: 'admin',
      targetType: 'Asset',
      targetId: 'ALL',
      details: 'Baseline lab inventory loaded and ready.',
      timestamp: new Date()
    }
  ];
};

module.exports = {
  get memoryUsers() { return memoryUsers; },
  get memoryAssets() { return memoryAssets; },
  get memoryRequests() { return memoryRequests; },
  get memoryLogs() { return memoryLogs; },
  get memoryAudit() { return memoryAudit; },
  initMemoryStore
};
