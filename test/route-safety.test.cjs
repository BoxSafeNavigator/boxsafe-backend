'use strict';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const net = require('node:net');
const originalLoad = Module._load;
const originalConnect = net.Socket.prototype.connect;
const originalFetch = global.fetch;
const originalApiKey = process.env.ROUTES_API_KEY;

// Tests require no network, including localhost or metadata endpoints.
net.Socket.prototype.connect = function() {
  throw Error('Test blocked outbound connection');
};
global.fetch = async () => { throw Error('Unexpected test fetch'); };
after(() => {
  net.Socket.prototype.connect = originalConnect;
  global.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.ROUTES_API_KEY;
  else process.env.ROUTES_API_KEY = originalApiKey;
});

// Minimal process-memory implementation of only the storage methods used by
// the actual safety-event store. Clone records at both write and read boundaries.
const collections = new Map();
class MemoryFirestore {
  collection(name) {
    if (!collections.has(name)) collections.set(name, new Map());
    const records = collections.get(name);
    return {
      doc: id => ({ set: async value => records.set(id, structuredClone(value)) }),
      where: (field, operator, value) => {
        assert.equal(operator, '==');
        return {
          get: async () => ({
            docs: [...records.values()]
              .filter(record => record[field] === value)
              .map(record => ({ data: () => structuredClone(record) }))
          })
        };
      }
    };
  }
}
let handler;
try {
  Module._load = function(name, ...args) {
    if (name === '@google-cloud/functions-framework') {
      return { http: (target, fn) => { assert.equal(target, 'helloHttp'); handler = fn; } };
    }
    if (name === '@google-cloud/firestore') return { Firestore: MemoryFirestore };
    if (name.startsWith('@google-cloud/')) throw Error('Unexpected cloud SDK load');
    return originalLoad.call(this, name, ...args);
  };
  require('../index');
} finally {
  Module._load = originalLoad;
}
process.env.ROUTES_API_KEY = 'development-mock-only';

test('module interception restored and outbound sockets blocked', () => {
  assert.equal(Module._load, originalLoad);
  for (const host of ['routes.googleapis.com', '169.254.169.254', '127.0.0.1']) {
    const socket = new net.Socket();
    try {
      assert.throws(() => socket.connect({ host, port: 443 }), /Test blocked outbound connection/);
    } finally {
      socket.destroy();
    }
  }
});

function encode(points) {
  let previous = [0, 0];
  let encoded = '';
  for (const point of points) {
    point.forEach((coordinate, axis) => {
      const integer = Math.round(coordinate * 1e5);
      const delta = integer - previous[axis];
      previous[axis] = integer;
      let value = delta < 0 ? -delta * 2 - 1 : delta * 2;
      while (value >= 32) {
        encoded += String.fromCharCode(value % 32 + 32 + 63);
        value = Math.floor(value / 32);
      }
      encoded += String.fromCharCode(value + 63);
    });
  }
  return encoded;
}
const route = encodedPolyline => ({ polyline: { encodedPolyline } });
const safe = { ...route(encode([[33.7488, -84.3877], [33.6407, -84.4277]])), distanceMeters: 10000 };
const unsafe = route(encode([[33.81218, -84.17035], [33.81219, -84.17036]]));
let trip = 0;
async function invoke(data) {
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://routes.googleapis.com/directions/v2:computeRoutes');
    assert.equal(options.headers['X-Goog-Api-Key'], 'development-mock-only');
    assert.equal(JSON.parse(options.body).travelMode, 'DRIVE');
    return { ok: true, status: 200, json: async () => structuredClone(data) };
  };
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await handler({ path: '/', method: 'POST', body: { tripId: `geometry-test-${++trip}` } }, res);
  assert.equal(res.code, 200);
  return res.body;
}
function assertUnknown(result) {
  assert.equal(result.boxSafe.routeSafetyStatus, 'UNKNOWN_ROUTE_SAFETY');
  assert.equal(result.boxSafe.safeRouteFound, false);
  assert.equal(result.boxSafe.noSafeRouteFound, false);
  assert.match(result.boxSafe.safetyMessage, /DO NOT PROCEED.*verified/);
  assert.doesNotMatch(result.boxSafe.safetyMessage, /every returned route conflicts/);
}
const invalid = [
  ['missing', {}], ['null route', null], ['empty', route('')],
  ['wrong type', route(42)], ['object type', route({})],
  ['non-finite numeric geometry', route(Infinity)], ['NaN geometry', route(NaN)],
  ['invalid character', route('!???')], ['unicode', route('\u0100???')],
  ['truncated latitude', route('_')], ['truncated longitude', route('?_')],
  ['missing longitude', route('?')], ['overflow', route('~~~~~~~~?')],
  ['non-canonical component', route('_???')],
  ['valid prefix with truncated tail', route(safe.polyline.encodedPolyline + '_')],
  ['overflow terminal group', route('______C?')],
  ['single point', route(encode([[0, 0]]))],
  ['duplicate points', route(encode([[0, 0], [0, 0], [0, 0]]))],
  ['latitude out of range', route(encode([[91, 0], [91, 1]]))],
  ['longitude out of range', route(encode([[0, 181], [1, 181]]))],
  ['negative out of range', route(encode([[-91, -181], [0, 0]]))],
  ['resource bound', route('?'.repeat(1000001))]
];
for (const [name, candidate] of invalid) {
  test(`unknown geometry: ${name}`, async () => {
    const result = await invoke({ routes: [candidate] });
    assertUnknown(result);
    assert.equal(result.boxSafe.unknownRouteCount, 1);
    assert.equal(result.boxSafe.routeGeometry[0].status, 'UNKNOWN');
    assert.equal(result.boxSafe.lowBridgeWarnings.length, 0);
    assert.equal(result.boxSafe.safetyEventPersistence.attempted, 0);
  });
}
test('all unknown', async () => {
  const result = await invoke({ routes: [{}, route('_')] });
  assertUnknown(result);
  assert.equal(result.boxSafe.unknownRouteCount, 2);
});
for (const candidates of [[{}, unsafe], [unsafe, {}]]) {
  test(`unknown plus unsafe, unknown first: ${candidates[0] !== unsafe}`, async () => {
    const result = await invoke({ routes: candidates });
    assertUnknown(result);
    assert.equal(result.boxSafe.unknownRouteCount, 1);
    if (candidates[0] === unsafe) {
      assert.equal(result.boxSafe.lowBridgeWarnings.length, 1);
      assert.equal(result.boxSafe.safetyEventPersistence.stored, 1);
    }
  });
}
for (const candidates of [[{}, unsafe, safe], [safe, {}, unsafe]]) {
  test(`clear alternative, safe first: ${candidates[0] === safe}`, async () => {
    const result = await invoke({ routes: candidates });
    assert.equal(result.boxSafe.routeSafetyStatus, 'SAFE_ROUTE_SELECTED');
    assert.equal(result.boxSafe.safeRouteFound, true);
    assert.equal(result.boxSafe.unknownRouteCount, 1);
    assert.equal(result.boxSafe.routeGeometry[0].status, 'VALID');
    assert.deepEqual(result.googleRoutes.routes[0], safe);
    assert.equal(result.boxSafe.lowBridgeWarnings.length, 0);
  });
}
test('all unsafe persists warning and never selects safe', async () => {
  const result = await invoke({ routes: [unsafe, unsafe] });
  assert.equal(result.boxSafe.routeSafetyStatus, 'NO_SAFE_ROUTE_FOUND');
  assert.equal(result.boxSafe.safeRouteFound, false);
  assert.equal(result.boxSafe.noSafeRouteFound, true);
  assert.equal(result.boxSafe.unknownRouteCount, 0);
  assert.equal(result.boxSafe.safetyEventPersistence.stored, 1);
});
test('empty routes retains NO_ROUTE_RETURNED', async () => {
  const result = await invoke({ routes: [] });
  assert.equal(result.boxSafe.routeSafetyStatus, 'NO_ROUTE_RETURNED');
  assert.equal(result.boxSafe.safeRouteFound, false);
  assert.equal(result.boxSafe.evaluatedRouteCount, 0);
});
test('valid route response fields and behavior retained', async () => {
  const result = await invoke({ routes: [safe] });
  assert.equal(result.boxSafe.routeSafetyStatus, 'SAFE_ROUTE_SELECTED');
  assert.equal(result.boxSafe.routingMode, 'DRIVE');
  assert.equal(result.boxSafe.safeRouteFound, true);
  assert.equal(result.boxSafe.noSafeRouteFound, false);
  assert.equal(result.boxSafe.safetyMessage, null);
  assert.equal(result.boxSafe.routeGeometry[0].pointCount, 2);
  assert.deepEqual(result.googleRoutes.routes, [safe]);
  assert.deepEqual(result.boxSafe.safetyEventPersistence, { attempted: 0, stored: 0, failed: 0 });
});
for (const data of [null, {}, { routes: null }, { routes: {} }, { routes: 'invalid' }, { routes: 42 }]) {
  test(`malformed provider collection: ${JSON.stringify(data)}`, async () => {
    const result = await invoke(data);
    assertUnknown(result);
    assert.equal(result.boxSafe.routeCollectionValid, false);
    assert.equal(result.boxSafe.evaluatedRouteCount, 0);
  });
}
test('real cloud storage SDK never loaded', () => {
  assert.equal(Object.keys(require.cache).some(path => path.includes('/node_modules/@google-cloud/firestore/')), false);
});
