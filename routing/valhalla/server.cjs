'use strict';
const http = require('node:http');
const { createRouter } = require('./adapter.cjs');
const route = createRouter({ endpoint: process.env.VALHALLA_URL || 'http://127.0.0.1:8002', provenance: {
  datasetId: process.env.BOXSAFE_DATASET_ID || null, graphBuildId: process.env.BOXSAFE_GRAPH_BUILD_ID || null } });
http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST' || req.url !== '/route') { res.writeHead(404); return res.end('{}'); }
  try {
    let bytes = 0; const chunks = [];
    for await (const c of req) { bytes += c.length;
      if (bytes > 16384) { res.writeHead(413); return res.end('{}'); } chunks.push(c); }
    let input;
    try { input = JSON.parse(Buffer.concat(chunks).toString()); }
    catch { res.writeHead(400); return res.end('{"error":"INVALID_JSON"}'); }
    const result = await route(input); res.writeHead(200); res.end(JSON.stringify(result));
  } catch (e) { res.writeHead(e.status || 500); res.end(JSON.stringify({ error: e.code || 'ROUTING_UNAVAILABLE',
    safeRouteFound: false, truckRouteVerified: false, message: 'DO NOT PROCEED. No verified truck route is available.' })); }
}).listen(8085, '127.0.0.1', () => console.log('Private prototype at http://127.0.0.1:8085'));
