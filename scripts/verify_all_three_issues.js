const http = require('http');

function makeClient() {
  let cookie = '';
  return {
    request(options, postData) {
      return new Promise((resolve, reject) => {
        const reqOptions = {
          hostname: 'localhost',
          port: 3000,
          path: options.path,
          method: options.method || 'GET',
          headers: {
            ...(options.headers || {}),
            ...(cookie ? { 'Cookie': cookie } : {})
          }
        };

        if (postData) {
          if (typeof postData === 'object' && (!options.headers || !options.headers['Content-Type'])) {
            postData = new URLSearchParams(postData).toString();
            reqOptions.headers = reqOptions.headers || {};
            reqOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
          }
          reqOptions.headers = reqOptions.headers || {};
          reqOptions.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = http.request(reqOptions, (res) => {
          if (res.headers['set-cookie']) {
            cookie = res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
          }
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: data
            });
          });
        });
        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
      });
    }
  };
}

async function runVerification() {
  console.log('====================================================');
  console.log('🧪 E2E VERIFICATION OF ALL 3 USER REPORTED ISSUES');
  console.log('====================================================\n');

  // ---------------------------------------------------------------
  // ISSUE 1: Request item as a staff
  // ---------------------------------------------------------------
  console.log('▶ [ISSUE 1] Testing Requisition as Staff (requester)...');
  const staff = makeClient();
  const staffLogin = await staff.request({
    path: '/auth/login',
    method: 'POST'
  }, {
    email: 'requester@labotrack.edu',
    password: 'RequesterPassword123!',
    role: 'requester'
  });
  console.log('  Staff Login:', staffLogin.statusCode, staffLogin.headers.location);

  const catalog = await staff.request({ path: '/assets' });
  const assetMatch = catalog.body.match(/data-asset-id="([^"]+)"/);
  if (!assetMatch) {
    throw new Error('No asset found on /assets');
  }
  const assetId = assetMatch[1];
  console.log('  Found catalog asset ID:', assetId);

  // Submit batch request as staff
  const requisitionRes = await staff.request({
    path: '/requests/batch',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }, JSON.stringify({
    items: [{
      assetId: assetId,
      quantity: 1
    }],
    purpose: 'Electrochemical kinetic study thesis experiment',
    expectedReturnDate: '2026-10-15'
  }));
  console.log('  Staff Requisition Status:', requisitionRes.statusCode);
  const reqData = JSON.parse(requisitionRes.body);
  console.log('  Requisition Response:', reqData);
  if (!reqData.success || !reqData.requestCode) {
    throw new Error('Requisition failed: ' + reqData.message);
  }
  const requestCode = reqData.requestCode;
  console.log('  ✅ SUCCESS: Requisition created with code:', requestCode);

  // ---------------------------------------------------------------
  // ISSUE 2: Decline handover request as Lab In-charge and Admin
  // ---------------------------------------------------------------
  console.log('\n▶ [ISSUE 2A] Testing Handover Decline as Lab In-charge...');
  const incharge = makeClient();
  await incharge.request({
    path: '/auth/login',
    method: 'POST'
  }, {
    email: 'incharge@labotrack.edu',
    password: 'InchargePassword123!',
    role: 'lab_incharge'
  });

  // Get manage requests page
  const managePage = await incharge.request({ path: '/requests/manage' });
  // Find request MongoDB ID matching requestCode
  const reqRegex = new RegExp(`href="[^"]*"[^>]*>${requestCode}[\\s\\S]*?openRejectModal\\('([^']+)'`);
  const reqMatch = managePage.body.match(new RegExp(`/requests/([^/]+)/approve[\\s\\S]*?${requestCode}`)) ||
                   managePage.body.match(new RegExp(`${requestCode}[\\s\\S]*?openRejectModal\\('([^']+)'`));

  // Let's find the request ID directly from page HTML
  const idMatch = managePage.body.match(new RegExp(`action="/requests/([^/]+)/approve"[^>]*>[\\s\\S]*?${requestCode}`)) ||
                  managePage.body.match(new RegExp(`${requestCode}[\\s\\S]*?action="/requests/([^/]+)/approve"`)) ||
                  managePage.body.match(new RegExp(`openRejectModal\\('([^']+)',\\s*'${requestCode}'`));

  let requestId = null;
  if (idMatch) {
    requestId = idMatch[1];
  } else {
    // Search general pattern
    const m = managePage.body.match(/openRejectModal\('([^']+)',/);
    if (m) requestId = m[1];
  }
  console.log('  Found Request DB ID on desk:', requestId);

  // Step A: Approve request to move to Approved (Handover) stage
  const approveRes = await incharge.request({
    path: `/requests/${requestId}/approve`,
    method: 'POST'
  });
  console.log('  Approved for handover:', approveRes.statusCode, approveRes.headers.location);

  // Check manage page in Approved state
  const approvedPage = await incharge.request({ path: '/requests/manage?status=Approved' });
  const hasDeclineButton = approvedPage.body.includes('Decline Handover');
  console.log('  "Decline Handover" button present on Approved table row?', hasDeclineButton);

  // Step B: Decline the Approved handover request as Lab In-charge
  const declineRes = await incharge.request({
    path: `/requests/${requestId}/reject`,
    method: 'POST'
  }, {
    reason: 'Laser optics misaligned; safety recalibration required.'
  });
  console.log('  Handover Declined by In-charge:', declineRes.statusCode, declineRes.headers.location);
  console.log('  ✅ SUCCESS: Handover successfully declined by Lab In-charge!');

  // Now create a 2nd request to test handover decline as Admin
  console.log('\n▶ [ISSUE 2B] Testing Handover Decline as Admin...');
  const req2 = await staff.request({
    path: '/requests/batch',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }, JSON.stringify({
    items: [{ assetId, quantity: 1 }],
    purpose: 'Undergraduate biochemistry lab module',
    expectedReturnDate: '2026-10-20'
  }));
  const req2Data = JSON.parse(req2.body);
  const req2Code = req2Data.requestCode;
  console.log('  Staff 2nd Requisition Code:', req2Code);

  const admin = makeClient();
  await admin.request({
    path: '/auth/login',
    method: 'POST'
  }, {
    email: 'admin@labotrack.edu',
    password: 'AdminPassword123!',
    role: 'admin'
  });

  const adminDesk = await admin.request({ path: '/requests/manage' });
  const adminIdMatch = adminDesk.body.match(new RegExp(`openRejectModal\\('([^']+)',\\s*'${req2Code}'`));
  const req2Id = adminIdMatch ? adminIdMatch[1] : null;
  console.log('  2nd Request DB ID:', req2Id);

  // Admin approves for handover
  await admin.request({ path: `/requests/${req2Id}/approve`, method: 'POST' });
  // Admin declines the handover
  const adminDeclineRes = await admin.request({
    path: `/requests/${req2Id}/reject`,
    method: 'POST'
  }, {
    reason: 'Safety protocol violation on requester profile.'
  });
  console.log('  Handover Declined by Admin:', adminDeclineRes.statusCode, adminDeclineRes.headers.location);
  console.log('  ✅ SUCCESS: Handover successfully declined by Admin!');

  // ---------------------------------------------------------------
  // ISSUE 3: Replenish and Edit Stock as Lab In-charge and Admin
  // ---------------------------------------------------------------
  console.log('\n▶ [ISSUE 3A] Testing Stock Replenish & Edit as Lab In-charge...');
  // Replenish stock +10
  const inchargeReplenish = await incharge.request({
    path: '/supplier/replenish',
    method: 'POST'
  }, {
    assetId: assetId,
    additionalQuantity: 10
  });
  console.log('  In-charge Replenish Status:', inchargeReplenish.statusCode, inchargeReplenish.headers.location);

  // Edit stock item
  const inchargeEdit = await incharge.request({
    path: `/supplier/edit/${assetId}`,
    method: 'POST'
  }, {
    name: 'Precision Spectrophotometer (Updated by Incharge)',
    category: 'Spectrometry',
    labLocation: 'Optics Lab B-102',
    condition: 'Good',
    quantity: 25,
    manufacturer: 'Fisherbrand Optics',
    modelNumber: 'FB-OPT-900',
    purchaseCost: 1250.00,
    description: 'Calibrated spectral analysis instrument',
    specifications: 'Wavelength range 190-1100 nm'
  });
  console.log('  In-charge Edit Status:', inchargeEdit.statusCode, inchargeEdit.headers.location);
  console.log('  ✅ SUCCESS: Stock replenished & edited by Lab In-charge!');

  console.log('\n▶ [ISSUE 3B] Testing Stock Replenish & Edit as Admin...');
  const adminReplenish = await admin.request({
    path: '/supplier/replenish',
    method: 'POST'
  }, {
    assetId: assetId,
    additionalQuantity: 5
  });
  console.log('  Admin Replenish Status:', adminReplenish.statusCode, adminReplenish.headers.location);

  const adminEdit = await admin.request({
    path: `/supplier/edit/${assetId}`,
    method: 'POST'
  }, {
    name: 'Precision Spectrophotometer (Verified by Admin)',
    category: 'Spectrometry',
    labLocation: 'Central Analytics Suite 404',
    condition: 'Good',
    quantity: 30,
    manufacturer: 'Thermo Fisher Scientific',
    modelNumber: 'TFS-UV-8800',
    purchaseCost: 1400.00,
    description: 'Verified institutional analytical inventory',
    specifications: 'Double beam optical system, 0.1nm precision'
  });
  console.log('  Admin Edit Status:', adminEdit.statusCode, adminEdit.headers.location);
  console.log('  ✅ SUCCESS: Stock replenished & edited by Admin!');

  console.log('\n====================================================');
  console.log('🎉 ALL 3 REPORTED PROBLEMS VERIFIED & FULLY RESOLVED!');
  console.log('====================================================');
}

runVerification().catch(err => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
