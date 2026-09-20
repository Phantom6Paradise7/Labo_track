const http = require('http');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function login(email, password) {
  const postData = `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
  const res = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
      'x-bypass-csrf': 'true'
    }
  }, postData);

  const cookie = res.headers['set-cookie'];
  if (!cookie) {
    throw new Error(`Login failed for ${email}, status: ${res.statusCode}`);
  }
  return cookie.map(c => c.split(';')[0]).join('; ');
}

async function getPage(path, cookie) {
  return await request({
    hostname: 'localhost',
    port: 3000,
    path,
    method: 'GET',
    headers: {
      'Cookie': cookie
    }
  });
}

async function run() {
  console.log('=== VERIFYING ROLE UI CONSTRAINTS ===\n');

  // 1. TEST LAB IN-CHARGE
  console.log('1. Testing Lab In-Charge (incharge@labotrack.edu)...');
  const inchargeCookie = await login('incharge@labotrack.edu', 'InchargePassword123!');
  
  const inchargeDash = await getPage('/dashboard', inchargeCookie);
  if (inchargeDash.statusCode !== 200) throw new Error(`Dashboard status: ${inchargeDash.statusCode}`);

  // Check 5 navbar items
  const inchargeHasDashboard = inchargeDash.body.includes('href="/dashboard"');
  const inchargeHasCatalog = inchargeDash.body.includes('href="/assets"');
  const inchargeHasOrderInfo = inchargeDash.body.includes('href="/requests/order-info"');
  const inchargeHasReqDesk = inchargeDash.body.includes('href="/requests/manage"');
  const inchargeHasStockMgmt = inchargeDash.body.includes('href="/supplier"');
  const inchargeHasMyOrders = inchargeDash.body.includes('My Orders & Assets');
  const inchargeHasRequestEqHeader = inchargeDash.body.includes('+ Request Equipment');

  console.log('   - Has Dashboard link:', inchargeHasDashboard);
  console.log('   - Has Equipment Catalog link:', inchargeHasCatalog);
  console.log('   - Has Order Information link:', inchargeHasOrderInfo);
  console.log('   - Has Requisition Desk link:', inchargeHasReqDesk);
  console.log('   - Has Stock Management link:', inchargeHasStockMgmt);
  console.log('   - My Orders & Assets removed from header:', !inchargeHasMyOrders);
  console.log('   - + Request Equipment removed from header:', !inchargeHasRequestEqHeader);

  if (!inchargeHasDashboard || !inchargeHasCatalog || !inchargeHasOrderInfo || !inchargeHasReqDesk || !inchargeHasStockMgmt) {
    throw new Error('Lab In-charge navbar missing one of the 5 required modules!');
  }
  if (inchargeHasMyOrders || inchargeHasRequestEqHeader) {
    throw new Error('Lab In-charge navbar still contains My Orders or Request Equipment!');
  }

  // Check Equipment Catalog for Lab In-Charge
  const inchargeCatalog = await getPage('/assets', inchargeCookie);
  const inchargeHasCatalogRequestBtn = inchargeCatalog.body.includes('title="Request this apparatus for lab checkout"');
  console.log('   - Catalog ACTION column has Request Equipment button:', inchargeHasCatalogRequestBtn);
  if (inchargeHasCatalogRequestBtn) {
    throw new Error('Lab In-charge should NOT have Request Equipment button in Catalog ACTION column!');
  }

  // Check Order Information Page
  const inchargeOrderInfo = await getPage('/requests/order-info', inchargeCookie);
  console.log('   - Order Information page status:', inchargeOrderInfo.statusCode);
  if (inchargeOrderInfo.statusCode !== 200 || !inchargeOrderInfo.body.includes('Order Information & Intake Registry')) {
    throw new Error('Order Information page failed to load for Lab In-Charge!');
  }
  console.log('   ✅ Lab In-Charge UI perfectly verified!\n');


  // 2. TEST ADMIN
  console.log('2. Testing Admin (admin@labotrack.edu)...');
  const adminCookie = await login('admin@labotrack.edu', 'AdminPassword123!');
  
  const adminDash = await getPage('/dashboard', adminCookie);
  const adminHasDashboard = adminDash.body.includes('href="/dashboard"');
  const adminHasCatalog = adminDash.body.includes('href="/assets"');
  const adminHasOrderInfo = adminDash.body.includes('href="/requests/order-info"');
  const adminHasReqDesk = adminDash.body.includes('href="/requests/manage"');
  const adminHasStockMgmt = adminDash.body.includes('href="/supplier"');
  const adminHasMyOrders = adminDash.body.includes('My Orders & Assets');
  const adminHasRequestEqHeader = adminDash.body.includes('+ Request Equipment');

  console.log('   - Has Dashboard link:', adminHasDashboard);
  console.log('   - Has Equipment Catalog link:', adminHasCatalog);
  console.log('   - Has Order Information link:', adminHasOrderInfo);
  console.log('   - Has Requisition Desk link:', adminHasReqDesk);
  console.log('   - Has Stock Management link:', adminHasStockMgmt);
  console.log('   - My Orders & Assets removed from header:', !adminHasMyOrders);
  console.log('   - + Request Equipment removed from header:', !adminHasRequestEqHeader);

  if (!adminHasDashboard || !adminHasCatalog || !adminHasOrderInfo || !adminHasReqDesk || !adminHasStockMgmt) {
    throw new Error('Admin navbar missing one of the 5 required modules!');
  }
  if (adminHasMyOrders || adminHasRequestEqHeader) {
    throw new Error('Admin navbar still contains My Orders or Request Equipment!');
  }

  const adminCatalog = await getPage('/assets', adminCookie);
  const adminHasCatalogRequestBtn = adminCatalog.body.includes('title="Request this apparatus for lab checkout"');
  console.log('   - Catalog ACTION column has Request Equipment button:', adminHasCatalogRequestBtn);
  if (adminHasCatalogRequestBtn) {
    throw new Error('Admin should NOT have Request Equipment button in Catalog ACTION column!');
  }
  console.log('   ✅ Admin UI perfectly verified!\n');


  // 3. TEST REQUESTER / STUDENT / STAFF
  console.log('3. Testing Requester (requester@labotrack.edu)...');
  const reqCookie = await login('requester@labotrack.edu', 'RequesterPassword123!');

  const reqDash = await getPage('/dashboard', reqCookie);
  const reqHasDashboard = reqDash.body.includes('href="/dashboard"');
  const reqHasCatalog = reqDash.body.includes('href="/assets"');
  const reqHasMyOrders = reqDash.body.includes('My Orders & Assets');
  const reqHasRequestEqHeader = reqDash.body.includes('+ Request Equipment');
  const reqHasOrderInfo = reqDash.body.includes('href="/requests/order-info"');
  const reqHasReqDesk = reqDash.body.includes('href="/requests/manage"');
  const reqHasStockMgmt = reqDash.body.includes('href="/supplier"');

  console.log('   - Has Dashboard link:', reqHasDashboard);
  console.log('   - Has Equipment Catalog link:', reqHasCatalog);
  console.log('   - Has My Orders & Assets link:', reqHasMyOrders);
  console.log('   - Has + Request Equipment link:', reqHasRequestEqHeader);
  console.log('   - Order Info hidden from requester:', !reqHasOrderInfo);
  console.log('   - Requisition Desk hidden from requester:', !reqHasReqDesk);
  console.log('   - Stock Management hidden from requester:', !reqHasStockMgmt);

  if (!reqHasMyOrders || !reqHasRequestEqHeader) {
    throw new Error('Requester navbar missing My Orders or Request Equipment!');
  }
  if (reqHasOrderInfo || reqHasReqDesk || reqHasStockMgmt) {
    throw new Error('Requester should NOT have access to Admin/Incharge links in navbar!');
  }

  const reqCatalog = await getPage('/assets', reqCookie);
  const reqHasCatalogRequestBtn = reqCatalog.body.includes('title="Request this apparatus for lab checkout"');
  console.log('   - Catalog ACTION column has Request Equipment button for Requester:', reqHasCatalogRequestBtn);
  if (!reqHasCatalogRequestBtn) {
    throw new Error('Requester MUST have Request Equipment button in Catalog ACTION column!');
  }

  const reqMyOrders = await getPage('/requests/my-requests', reqCookie);
  console.log('   - Requester My Orders page status:', reqMyOrders.statusCode);
  if (reqMyOrders.statusCode !== 200 || !reqMyOrders.body.includes('What I Currently Own')) {
    throw new Error('Requester My Orders page failed to load properly!');
  }

  console.log('   ✅ Requester UI perfectly verified!\n');
  console.log('🎉 ALL ROLE UI CONSTRAINTS MET 100%!');
}

run().catch(err => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
