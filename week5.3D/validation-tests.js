const http = require('http');

// Server configuration constants
const PORT = process.env.PORT || 3000;
const API_BASE = '/api/books';

// Generate a unique ID prefix per execution run to prevent database collisions
const uniqueId = 'b' + Date.now().toString().slice(-8);

// Test counter metrics
let total = 0;
let passCount = 0;
let failCount = 0;

// Coverage tracking map corresponding to required assessment tags
const coverageTracker = {
  CREATE_FAIL: 0,
  UPDATE_FAIL: 0,
  TYPE: 0,
  REQUIRED: 0,
  BOUNDARY: 0,
  LENGTH: 0,
  TEMPORAL: 0,
  UNKNOWN_CREATE: 0,
  UNKNOWN_UPDATE: 0,
  IMMUTABLE: 0
};

// Generates a valid book payload for testing POST requests
function makeValidBook(suffix = '1') {
  return {
    id: `${uniqueId}${suffix}`,
    title: 'Valid Ethical Software Book',
    author: 'John Doe',
    year: 2024,
    genre: 'Computer Science',
    summary: 'A comprehensive guide on implementing ethical principles in software development.',
    price: '29.99',
    currency: 'AUD'
  };
}

// Generates a valid book payload for testing PUT requests
function makeValidUpdate() {
  return {
    title: 'Updated Ethical Software Book',
    author: 'Jane Doe',
    year: 2025,
    genre: 'Software Engineering',
    summary: 'An updated and revised edition covering safe writes and validation.',
    price: '34.99',
    currency: 'AUD'
  };
}

// Sends HTTP requests to the target server using Node's built-in http module
function request(method, path, body = null) {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => resolve({ status: res.statusCode }));

    req.on('error', () => resolve({ status: 500 }));
    if (payload) req.write(payload);
    req.end();
  });
}

// Executes an individual test, records coverage tags, and prints formatted output
function test(name, method, path, payload, expectedStatus, tags = []) {
  total++;
  tags.forEach(tag => {
    if (coverageTracker.hasOwnProperty(tag)) coverageTracker[tag]++;
  });

  return request(method, path, payload).then(res => {
    const pass = res.status === expectedStatus;
    if (pass) passCount++;
    else failCount++;

    console.log(`TEST ${name} ${method}|${path} expected=${expectedStatus}|actual=${res.status}|pass=${pass ? 'Y' : 'N'}`);
    return pass;
  });
}

// Main test execution function
async function runAllTests() {
  console.log('SIT725 VALIDATION TESTS');
  console.log(`BASE_URL http://localhost:${PORT}`);
  console.log(`API_BASE=${API_BASE}`);
  console.log(`INFO Generated uniqueId=${uniqueId}`);

  const primaryId = `${uniqueId}1`;

  //  Base Tests
  await test('T01 Valid create', 'POST', API_BASE, makeValidBook('1'), 201);
  await test('T02 Duplicate ID', 'POST', API_BASE, makeValidBook('1'), 409, ['CREATE_FAIL']);
  await test('T03 Valid update', 'PUT', `${API_BASE}/${primaryId}`, makeValidUpdate(), 200);
  await test('T04 Update nonexistent', 'PUT', `${API_BASE}/nonexistent_${uniqueId}`, makeValidUpdate(), 404, ['UPDATE_FAIL']);
  await test('T05 Invalid ID format', 'POST', API_BASE, { ...makeValidBook('2'), id: 'invalid_id_123' }, 400, ['CREATE_FAIL', 'TYPE']);

  // Field Tests
  await test('T06 Missing title on CREATE', 'POST', API_BASE, { ...makeValidBook('3'), title: undefined }, 400, ['CREATE_FAIL', 'REQUIRED']);
  await test('T07 Missing author on CREATE', 'POST', API_BASE, { ...makeValidBook('4'), author: undefined }, 400, ['CREATE_FAIL', 'REQUIRED']);
  await test('T08 Missing summary on CREATE', 'POST', API_BASE, { ...makeValidBook('5'), summary: undefined }, 400, ['CREATE_FAIL', 'REQUIRED']);

  // Data Type Validation Tests
  await test('T09 Decimal year passed', 'POST', API_BASE, { ...makeValidBook('6'), year: 2024.5 }, 400, ['CREATE_FAIL', 'TYPE']);
  await test('T10 Invalid price format', 'POST', API_BASE, { ...makeValidBook('7'), price: 'abc' }, 400, ['CREATE_FAIL', 'TYPE']);

  // Boundary Value Tests
  await test('T11 Price below min (0.00)', 'POST', API_BASE, { ...makeValidBook('8'), price: '0.00' }, 400, ['CREATE_FAIL', 'BOUNDARY']);
  await test('T12 Price above max (1500.00)', 'POST', API_BASE, { ...makeValidBook('9'), price: '1500.00' }, 400, ['CREATE_FAIL', 'BOUNDARY']);

  // String Length Violation Tests
  await test('T13 Title too short (< 2 chars)', 'POST', API_BASE, { ...makeValidBook('10'), title: 'A' }, 400, ['CREATE_FAIL', 'LENGTH']);
  await test('T14 Genre too short (< 3 chars)', 'POST', API_BASE, { ...makeValidBook('11'), genre: 'CS' }, 400, ['CREATE_FAIL', 'LENGTH']);
  await test('T15 Summary too short (< 10 chars)', 'POST', API_BASE, { ...makeValidBook('12'), summary: 'Short' }, 400, ['CREATE_FAIL', 'LENGTH']);

  // Temporal Rule Tests
  await test('T16 Year in future', 'POST', API_BASE, { ...makeValidBook('13'), year: 2099 }, 400, ['CREATE_FAIL', 'TEMPORAL']);
  await test('T17 Year too ancient (< 1000)', 'POST', API_BASE, { ...makeValidBook('14'), year: 800 }, 400, ['CREATE_FAIL', 'TEMPORAL']);

  // Safe Writes 
  await test('T18 Unknown field on CREATE', 'POST', API_BASE, { ...makeValidBook('15'), hackerField: 'malicious' }, 400, ['UNKNOWN_CREATE']);
  await test('T19 Unknown field on UPDATE', 'PUT', `${API_BASE}/${primaryId}`, { ...makeValidUpdate(), adminPrivilege: true }, 400, ['UNKNOWN_UPDATE']);
  await test('T20 ID modification on UPDATE', 'PUT', `${API_BASE}/${primaryId}`, { ...makeValidUpdate(), id: 'b99999' }, 400, ['IMMUTABLE']);

  // Schema Enforcement on UPDATE
  await test('T21 Title too short on UPDATE', 'PUT', `${API_BASE}/${primaryId}`, { ...makeValidUpdate(), title: 'X' }, 400, ['UPDATE_FAIL', 'LENGTH']);
  await test('T22 Price above max on UPDATE', 'PUT', `${API_BASE}/${primaryId}`, { ...makeValidUpdate(), price: '2000.00' }, 400, ['UPDATE_FAIL', 'BOUNDARY']);

  // Print required SUMMARY and COVERAGE lines
  const allPassed = passCount === total;
  console.log(`SUMMARY pass=${allPassed ? 'Y' : 'N'}|failed=${failCount}|total=${total}`);

  const covStr = Object.entries(coverageTracker)
    .map(([k, v]) => `${k}=${v}`)
    .join('|');
  console.log(`COVERAGE ${covStr}`);

  // Exit with process code 0 on success or 1 on failure
  process.exit(allPassed ? 0 : 1);
}

runAllTests().catch(() => process.exit(1));