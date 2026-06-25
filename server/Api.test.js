/**
 * API Test Suite — BP People Counting System
 * 
 * Spuštění: node api.test.js
 * 
 * Předpoklady:
 * - Server běží na http://localhost:3001
 * - V DB existuje admin (viz scripts/seedAdmin.js)
 * - MongoDB je dostupná
 */

require('dotenv').config();

const BASE_URL = 'http://localhost:3001';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'heslo123';
const API_KEY = process.env.WEBHOOK_API_KEY;

let adminToken = '';
let createdRoomId = '';
let createdSensorId = '';
let createdUserId = '';

// ─── Helper funkce ────────────────────────────────────────────────

async function request(method, path, body = null, token = null, apiKey = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (apiKey) headers['X-API-Key'] = apiKey;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data;
  try { data = await res.json(); } catch { data = null; }

  return { status: res.status, data };
}

function pass(name) {
  console.log(`  ✅ ${name}`);
}

function fail(name, expected, got) {
  console.log(`  ❌ ${name}`);
  console.log(`     očekáváno: ${expected}`);
  console.log(`     obdrženo:  ${JSON.stringify(got)}`);
}

function section(name) {
  console.log(`\n━━━ ${name} ━━━`);
}

function assert(name, condition, expected = '', got = '') {
  if (condition) pass(name);
  else fail(name, expected, got);
}

// ─── Testy ────────────────────────────────────────────────────────

async function testAuth() {
  section('AUTH');

  // Login úspěšný
  const login = await request('POST', '/api/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  assert('POST /api/auth/login — úspěšný login', login.status === 200, 200, login.status);
  assert('Login vrátí token', !!login.data?.token, 'token', login.data);
  assert('Login vrátí roli admin', login.data?.user?.role === 'admin', 'admin', login.data?.user?.role);
  if (login.data?.token) adminToken = login.data.token;

  // Login špatné heslo
  const badLogin = await request('POST', '/api/auth/login', {
    email: ADMIN_EMAIL,
    password: 'spatne_heslo'
  });
  assert('POST /api/auth/login — špatné heslo vrátí 401', badLogin.status === 401, 401, badLogin.status);

  // Login chybějící pole
  const missingLogin = await request('POST', '/api/auth/login', { email: ADMIN_EMAIL });
  assert('POST /api/auth/login — chybějící heslo vrátí 400', missingLogin.status === 400, 400, missingLogin.status);
}

async function testUsers() {
  section('USERS');

  // Seznam uživatelů — admin
  const list = await request('GET', '/api/users', null, adminToken);
  assert('GET /api/users — admin dostane seznam', list.status === 200, 200, list.status);
  assert('GET /api/users — vrátí pole', Array.isArray(list.data), 'array', typeof list.data);

  // Seznam uživatelů — bez tokenu
  const listNoAuth = await request('GET', '/api/users');
  assert('GET /api/users — bez tokenu vrátí 401', listNoAuth.status === 401, 401, listNoAuth.status);

  // Vytvoření uživatele
  const create = await request('POST', '/api/users', {
    name: 'Test Viewer',
    email: 'testviewer@example.com',
    password: 'heslo123',
    role: 'viewer'
  }, adminToken);
  assert('POST /api/users — vytvoření uživatele', create.status === 201, 201, create.status);
  if (create.data?.id || create.data?._id) {
    createdUserId = create.data.id || create.data._id;
  }

  // Úprava uživatele
  if (createdUserId) {
    const update = await request('PATCH', `/api/users/${createdUserId}`, {
      role: 'admin'
    }, adminToken);
    assert('PATCH /api/users/:id — úprava role', update.status === 200, 200, update.status);
  }

  // Smazání uživatele
  if (createdUserId) {
    const del = await request('DELETE', `/api/users/${createdUserId}`, null, adminToken);
    assert('DELETE /api/users/:id — smazání', del.status === 200, 200, del.status);
  }
}

async function testSensors() {
  section('SENSORS');

  // Bez tokenu
  const noAuth = await request('GET', '/api/sensors');
  assert('GET /api/sensors — bez tokenu vrátí 401', noAuth.status === 401, 401, noAuth.status);

  // Seznam senzorů
  const list = await request('GET', '/api/sensors', null, adminToken);
  assert('GET /api/sensors — se tokenem vrátí 200', list.status === 200, 200, list.status);
  assert('GET /api/sensors — vrátí pole', Array.isArray(list.data), 'array', typeof list.data);

  // Vytvoření senzoru
  const create = await request('POST', '/api/sensors', {
    name: 'Test Senzor',
    devEui: 'AABBCCDDEEFF0011'
  }, adminToken);
  assert('POST /api/sensors — vytvoření senzoru', create.status === 201, 201, create.status);
  if (create.data?.id || create.data?._id) {
    createdSensorId = create.data.id || create.data._id;
  }

  // Duplicitní DevEUI
  const duplicate = await request('POST', '/api/sensors', {
    name: 'Duplicitní',
    devEui: 'AABBCCDDEEFF0011'
  }, adminToken);
  assert('POST /api/sensors — duplicitní DevEUI vrátí 409', duplicate.status === 409, 409, duplicate.status);

  // Úprava senzoru
  if (createdSensorId) {
    const update = await request('PATCH', `/api/sensors/${createdSensorId}`, {
      name: 'Upravený senzor'
    }, adminToken);
    assert('PATCH /api/sensors/:id — úprava názvu', update.status === 200, 200, update.status);
  }
}

async function testRooms() {
  section('ROOMS');

  // Bez tokenu
  const noAuth = await request('GET', '/api/rooms');
  assert('GET /api/rooms — bez tokenu vrátí 401', noAuth.status === 401, 401, noAuth.status);

  // Seznam místností
  const list = await request('GET', '/api/rooms', null, adminToken);
  assert('GET /api/rooms — se tokenem vrátí 200', list.status === 200, 200, list.status);
  assert('GET /api/rooms — vrátí pole', Array.isArray(list.data), 'array', typeof list.data);

  // Vytvoření místnosti
  const create = await request('POST', '/api/rooms', {
    name: 'Testovací místnost',
    capacity: 20
  }, adminToken);
  assert('POST /api/rooms — vytvoření místnosti', create.status === 201, 201, create.status);
  if (create.data?.id || create.data?._id) {
    createdRoomId = create.data.id || create.data._id;
  }

  // Přiřazení senzoru k místnosti
  if (createdRoomId && createdSensorId) {
    const assign = await request('PATCH', `/api/rooms/${createdRoomId}`, {
      sensorId: createdSensorId
    }, adminToken);
    assert('PATCH /api/rooms/:id — přiřazení senzoru', assign.status === 200, 200, assign.status);
  }

  // Readings pro místnost
  if (createdRoomId) {
    const readings = await request('GET', `/api/rooms/${createdRoomId}/readings`, null, adminToken);
    assert('GET /api/rooms/:id/readings — vrátí 200', readings.status === 200, 200, readings.status);
  }
}

async function testReadingsCollect() {
  section('READINGS COLLECT');

  // Bez API klíče
  const noKey = await request('POST', '/api/readings/collect', {
    time: new Date().toISOString(),
    deviceInfo: { devEui: '24E124767F020849' },
    object: { line_1_total_in: 10, line_1_total_out: 5, line_1_period_in: 2, line_1_period_out: 1 }
  });
  assert('POST /api/readings/collect — bez API klíče vrátí 401', noKey.status === 401, 401, noKey.status);

  // Se správným API klíčem
  const withKey = await request('POST', '/api/readings/collect', {
    time: new Date().toISOString(),
    deviceInfo: { devEui: '24E124767F020849' },
    object: { line_1_total_in: 10, line_1_total_out: 5, line_1_period_in: 2, line_1_period_out: 1 }
  }, null, API_KEY);
  assert('POST /api/readings/collect — se správným klíčem vrátí 200', withKey.status === 200, 200, withKey.status);

  // Neznámý senzor — stále 200 ale ok: false
  const unknownSensor = await request('POST', '/api/readings/collect', {
    time: new Date().toISOString(),
    deviceInfo: { devEui: 'NEEXISTUJICI000' },
    object: { line_1_total_in: 1, line_1_total_out: 0, line_1_period_in: 1, line_1_period_out: 0 }
  }, null, API_KEY);
  assert('POST /api/readings/collect — neznámý senzor vrátí 200 s ok:false',
    unknownSensor.status === 200 && unknownSensor.data?.ok === false,
    '200 + ok:false', `${unknownSensor.status} + ok:${unknownSensor.data?.ok}`
  );
}

async function testReadingsAggregate() {
  section('READINGS AGGREGATE');

  // Bez tokenu
  const noAuth = await request('GET', '/api/readings/aggregate');
  assert('GET /api/readings/aggregate — bez tokenu vrátí 401', noAuth.status === 401, 401, noAuth.status);

  // Se tokenem
  const withToken = await request('GET', '/api/readings/aggregate?interval=hour', null, adminToken);
  assert('GET /api/readings/aggregate — se tokenem vrátí 200', withToken.status === 200, 200, withToken.status);

  // Neplatný interval
  const badInterval = await request('GET', '/api/readings/aggregate?interval=tyden', null, adminToken);
  assert('GET /api/readings/aggregate — neplatný interval vrátí 400', badInterval.status === 400, 400, badInterval.status);
}

async function cleanup() {
  section('CLEANUP');

  if (createdRoomId) {
    const del = await request('DELETE', `/api/rooms/${createdRoomId}`, null, adminToken);
    assert('Smazání testovací místnosti', del.status === 200, 200, del.status);
  }

  if (createdSensorId) {
    const del = await request('DELETE', `/api/sensors/${createdSensorId}`, null, adminToken);
    assert('Smazání testovacího senzoru', del.status === 200, 200, del.status);
  }
}

// ─── Spuštění ─────────────────────────────────────────────────────

async function run() {
  console.log('🚀 Spouštím API testy...');
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Admin:    ${ADMIN_EMAIL}`);

  try {
    await testAuth();
    await testUsers();
    await testSensors();
    await testRooms();
    await testReadingsCollect();
    await testReadingsAggregate();
    await cleanup();
  } catch (err) {
    console.error('\n💥 Neočekávaná chyba:', err.message);
  }

  console.log('\n✔️  Testy dokončeny\n');
}

run();