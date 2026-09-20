const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Asset = require('../models/Asset');
const IssueRequest = require('../models/IssueRequest');
const { connectDB } = require('../config/db');
const { initMemoryStore } = require('../models/store');

jest.setTimeout(30000);

describe('LaboTrack Academic Test Suite', () => {
  let adminCookie;
  let inchargeCookie;
  let requesterCookie;
  let requesterId;
  let testAsset;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await connectDB();
    await initMemoryStore();

    // Helper to log in and capture session cookie
    const getSessionCookie = async (email, password) => {
      const res = await request(app)
        .post('/auth/login')
        .set('x-bypass-csrf', 'true')
        .send({ email, password });
      return res.headers['set-cookie'];
    };

    adminCookie = await getSessionCookie('admin@labotrack.edu', 'AdminPassword123!');
    inchargeCookie = await getSessionCookie('incharge@labotrack.edu', 'InchargePassword123!');
    requesterCookie = await getSessionCookie('requester@labotrack.edu', 'RequesterPassword123!');

    const reqUser = await User.findOne({ email: 'requester@labotrack.edu' });
    requesterId = reqUser ? reqUser._id : new mongoose.Types.ObjectId();

    // Create a fresh test asset
    testAsset = await Asset.create({
      assetTag: 'TEST-SPEC-001',
      name: 'High-Precision Automated Titrator',
      category: 'Analytical Equipment',
      location: 'BioChem Lab 102',
      quantity: 10,
      availableQuantity: 10,
      condition: 'Good',
      unitCost: 1500,
      manufacturer: 'Metrohm',
      model: 'Titrando 905'
    });
  });

  afterAll(async () => {
    if (testAsset && testAsset._id) {
      await Asset.findByIdAndDelete(testAsset._id);
    }
    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  // (a) Route-level Role Access Control
  describe('1. Route-Level Role Access Control', () => {
    test('Unauthenticated user is redirected or blocked from accessing protected routes', async () => {
      const res = await request(app).get('/dashboard');
      expect([302, 401]).toContain(res.statusCode);
    });

    test('Requester (Student/Staff) CANNOT access Stock Management (/supplier) -> 403 Forbidden', async () => {
      const res = await request(app)
        .get('/supplier')
        .set('Cookie', requesterCookie);
      expect(res.statusCode).toBe(403);
    });

    test('Requester (Student/Staff) CANNOT access Requisition Desk (/requests/manage) -> 403 Forbidden', async () => {
      const res = await request(app)
        .get('/requests/manage')
        .set('Cookie', requesterCookie);
      expect(res.statusCode).toBe(403);
    });

    test('Lab In-charge CAN access Requisition Desk (/requests/manage) -> 200 OK', async () => {
      const res = await request(app)
        .get('/requests/manage')
        .set('Cookie', inchargeCookie);
      expect(res.statusCode).toBe(200);
    });

    test('Administrator CAN access Stock Management (/supplier) -> 200 OK', async () => {
      const res = await request(app)
        .get('/supplier')
        .set('Cookie', adminCookie);
      expect(res.statusCode).toBe(200);
    });
  });

  // (b) Stock Decrement on Issue and Increment on Return
  describe('2. Stock Decrement on Issue and Increment on Return', () => {
    let issueReq;

    beforeEach(async () => {
      // Create an approved issue request for 2 units
      issueReq = await IssueRequest.create({
        requestCode: 'REQ-TEST-' + Math.floor(1000 + Math.random() * 9000),
        requester: requesterId,
        requesterName: 'Elena Rostova',
        requesterRole: 'requester',
        department: 'Biochemistry',
        studentOrStaffId: 'STU-9941',
        purpose: 'Titration assay experiment',
        status: 'Approved',
        expectedReturnDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        items: [{
          asset: testAsset._id,
          assetTag: testAsset.assetTag,
          assetName: testAsset.name,
          quantity: 2
        }]
      });
    });

    afterEach(async () => {
      if (issueReq && issueReq._id) {
        await IssueRequest.findByIdAndDelete(issueReq._id);
      }
    });

    test('Issuing equipment decrements availableQuantity by the requested amount', async () => {
      const initialAsset = await Asset.findById(testAsset._id);
      const initialAvail = initialAsset.availableQuantity;

      // Issue the approved request
      const res = await request(app)
        .post(`/requests/${issueReq._id}/issue`)
        .set('Cookie', inchargeCookie)
        .set('x-bypass-csrf', 'true');

      expect([302, 200]).toContain(res.statusCode);

      const updatedAsset = await Asset.findById(testAsset._id);
      expect(updatedAsset.availableQuantity).toBe(initialAvail - 2);
    });

    test('Returning equipment in OK condition restores availableQuantity', async () => {
      // First issue it so it has status 'Issued'
      await request(app)
        .post(`/requests/${issueReq._id}/issue`)
        .set('Cookie', inchargeCookie)
        .set('x-bypass-csrf', 'true');

      const afterIssueAsset = await Asset.findById(testAsset._id);
      const availAfterIssue = afterIssueAsset.availableQuantity;

      // Return equipment in OK condition
      const returnRes = await request(app)
        .post(`/requests/${issueReq._id}/return`)
        .set('Cookie', inchargeCookie)
        .set('x-bypass-csrf', 'true')
        .send({
          returnCondition: 'OK',
          returnNotes: 'Returned in clean working order'
        });

      expect([302, 200]).toContain(returnRes.statusCode);

      const restoredAsset = await Asset.findById(testAsset._id);
      expect(restoredAsset.availableQuantity).toBe(availAfterIssue + 2);
    });
  });

  // (c) Condition Triage Logic (OK / Damaged / Lost)
  describe('3. Condition Triage Logic (OK / Damaged / Lost)', () => {
    let triageReq;

    beforeEach(async () => {
      triageReq = await IssueRequest.create({
        requestCode: 'REQ-TRIAGE-' + Math.floor(1000 + Math.random() * 9000),
        requester: requesterId,
        requesterName: 'Elena Rostova',
        requesterRole: 'requester',
        department: 'Biochemistry',
        studentOrStaffId: 'STU-9941',
        purpose: 'Spectroscopy trials',
        status: 'Approved',
        expectedReturnDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        items: [{
          asset: testAsset._id,
          assetTag: testAsset.assetTag,
          assetName: testAsset.name,
          quantity: 1
        }]
      });

      // Handover / issue
      await request(app)
        .post(`/requests/${triageReq._id}/issue`)
        .set('Cookie', inchargeCookie)
        .set('x-bypass-csrf', 'true');
    });

    afterEach(async () => {
      if (triageReq && triageReq._id) {
        await IssueRequest.findByIdAndDelete(triageReq._id);
      }
    });

    test('Triage "Damaged": Restores physical unit to pool but flags condition as "Repair"', async () => {
      const res = await request(app)
        .post(`/requests/${triageReq._id}/return`)
        .set('Cookie', inchargeCookie)
        .set('x-bypass-csrf', 'true')
        .send({
          returnCondition: 'Damaged',
          returnNotes: 'Display glass cracked during transport'
        });

      expect([302, 200]).toContain(res.statusCode);

      const asset = await Asset.findById(testAsset._id);
      expect(asset.condition).toBe('Repair');
    });

    test('Triage "Lost": Permanently decrements total quantity and marks condition as "Decommissioned"', async () => {
      const initialAsset = await Asset.findById(testAsset._id);
      const initialTotal = initialAsset.quantity;

      const res = await request(app)
        .post(`/requests/${triageReq._id}/return`)
        .set('Cookie', inchargeCookie)
        .set('x-bypass-csrf', 'true')
        .send({
          returnCondition: 'Lost',
          returnNotes: 'Apparatus could not be located after field experiment'
        });

      expect([302, 200]).toContain(res.statusCode);

      const asset = await Asset.findById(testAsset._id);
      expect(asset.quantity).toBe(initialTotal - 1);
      expect(asset.condition).toBe('Decommissioned');
    });

    test('Triage "OK": Preserves total quantity and sets condition to "Good"', async () => {
      const initialAsset = await Asset.findById(testAsset._id);
      const initialTotal = initialAsset.quantity;

      const res = await request(app)
        .post(`/requests/${triageReq._id}/return`)
        .set('Cookie', inchargeCookie)
        .set('x-bypass-csrf', 'true')
        .send({
          returnCondition: 'OK',
          returnNotes: 'Verified fully functional'
        });

      expect([302, 200]).toContain(res.statusCode);

      const asset = await Asset.findById(testAsset._id);
      expect(asset.quantity).toBe(initialTotal);
      expect(asset.condition).toBe('Good');
    });
  });
});
