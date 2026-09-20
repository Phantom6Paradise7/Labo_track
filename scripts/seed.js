require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Asset = require('../models/Asset');
const IssueRequest = require('../models/IssueRequest');
const MaintenanceLog = require('../models/MaintenanceLog');
const AuditLog = require('../models/AuditLog');

const seedData = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/labotrack';
    console.log('Connecting to database for seeding...');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB.');

    console.log('Clearing existing records...');
    await Promise.all([
      User.deleteMany({}),
      Asset.deleteMany({}),
      IssueRequest.deleteMany({}),
      MaintenanceLog.deleteMany({}),
      AuditLog.deleteMany({})
    ]);

    console.log('Creating demo users for all 4 roles...');
    // Seed Users (password hooks will hash these passwords)
    const admin = await User.create({
      name: 'Dr. Sarah Mitchell',
      email: 'admin@labotrack.edu',
      password: 'AdminPassword123!',
      role: 'admin',
      department: 'Central Laboratory Operations',
      studentOrStaffId: 'ADM-1001'
    });

    const incharge = await User.create({
      name: 'Prof. Marcus Vance',
      email: 'incharge@labotrack.edu',
      password: 'InchargePassword123!',
      role: 'lab_incharge',
      department: 'Biochemistry & Molecular Physics',
      studentOrStaffId: 'STAFF-2042'
    });

    const student = await User.create({
      name: 'Elena Rostova',
      email: 'requester@labotrack.edu',
      password: 'RequesterPassword123!',
      role: 'requester',
      department: 'Bioengineering Graduate Program',
      studentOrStaffId: 'STU-9941'
    });

    const supplier = await User.create({
      name: 'BioEquip Global Supplies',
      email: 'supplier@labotrack.edu',
      password: 'SupplierPassword123!',
      role: 'supplier',
      department: 'Scientific Vendor Network',
      supplierCompany: 'BioEquip Global Instrument Solutions'
    });

    console.log('Creating initial assets & equipment...');
    const assets = await Asset.create([
      {
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
        supplier: supplier._id,
        supplierName: 'BioEquip Global'
      },
      {
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
        supplier: supplier._id,
        supplierName: 'BioEquip Global'
      },
      {
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
        supplier: supplier._id,
        supplierName: 'BioEquip Global'
      },
      {
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
        supplier: supplier._id,
        supplierName: 'BioEquip Global'
      },
      {
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
        supplier: supplier._id,
        supplierName: 'BioEquip Global'
      },
      {
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
        supplier: supplier._id,
        supplierName: 'BioEquip Global'
      }
    ]);

    console.log('Creating initial Issue Requests with varied statuses...');
    // Seed Requests
    const now = new Date();
    const overdueDate = new Date();
    overdueDate.setDate(now.getDate() - 3); // 3 days overdue!

    const futureDate = new Date();
    futureDate.setDate(now.getDate() + 7);

    // 1. Pending Request
    await IssueRequest.create({
      requestCode: 'REQ-409182',
      requester: student._id,
      requesterName: student.name,
      requesterRole: student.role,
      items: [
        {
          asset: assets[0]._id,
          assetTag: assets[0].assetTag,
          assetName: assets[0].name,
          quantity: 1
        }
      ],
      purpose: 'Signal integrity and harmonic distortion analysis for thesis chapter 4.',
      expectedReturnDate: futureDate,
      status: 'Pending'
    });

    // 2. Overdue Issued Request (Flags overdue alert!)
    await IssueRequest.create({
      requestCode: 'REQ-108273',
      requester: student._id,
      requesterName: student.name,
      requesterRole: student.role,
      items: [
        {
          asset: assets[1]._id,
          assetTag: assets[1].assetTag,
          assetName: assets[1].name,
          quantity: 1
        }
      ],
      purpose: 'Enzyme precipitation protocol and pellet density centrifugation.',
      expectedReturnDate: overdueDate,
      issuedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      status: 'Issued',
      reviewedBy: incharge._id,
      reviewerName: incharge.name
    });

    // 3. Completed / Returned Request
    await IssueRequest.create({
      requestCode: 'REQ-992014',
      requester: student._id,
      requesterName: student.name,
      requesterRole: student.role,
      items: [
        {
          asset: assets[2]._id,
          assetTag: assets[2].assetTag,
          assetName: assets[2].name,
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
      reviewedBy: incharge._id,
      reviewerName: incharge.name
    });

    console.log('Creating Maintenance Logs (Stretch goal)...');
    const nextServiceDate = new Date();
    nextServiceDate.setMonth(now.getMonth() + 2);

    await MaintenanceLog.create([
      {
        asset: assets[0]._id,
        assetTag: assets[0].assetTag,
        serviceDate: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
        serviceType: 'Calibration',
        cost: 320.00,
        technician: 'Tektronix Field Specialist #84',
        nextServiceDue: nextServiceDate,
        notes: 'Channel 1–4 voltage offsets adjusted. Trace noise within manufacturer tolerance.',
        status: 'Completed',
        loggedBy: admin._id
      },
      {
        asset: assets[5]._id,
        assetTag: assets[5].assetTag,
        serviceDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        serviceType: 'Emergency Repair',
        cost: 850.00,
        technician: 'Thermo Fisher Precision BioTech',
        nextServiceDue: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        notes: 'Fiber-optic baseline calibration error. Sensor replacement ordered.',
        status: 'In Progress',
        loggedBy: incharge._id
      }
    ]);

    console.log('Creating Audit logs...');
    await AuditLog.create([
      {
        action: 'SYSTEM_INITIALIZATION',
        actorName: 'System Administrator',
        actorRole: 'admin',
        targetType: 'Asset',
        targetId: 'ALL',
        details: 'Initial inventory catalog baseline synchronized.'
      }
    ]);

    console.log('\n Seed Data created successfully!');
    console.log('------------------------------------------------------------');
    console.log('Default Credentials:');
    console.log('1. Admin:         admin@labotrack.edu     / AdminPassword123!');
    console.log('2. Lab In-charge: incharge@labotrack.edu  / InchargePassword123!');
    console.log('3. Requester:     requester@labotrack.edu / RequesterPassword123!');
    console.log('4. Supplier:      supplier@labotrack.edu  / SupplierPassword123!');
    console.log('------------------------------------------------------------\n');

    process.exit(0);
  } catch (err) {
    console.error('Seed Error:', err);
    process.exit(1);
  }
};

seedData();
