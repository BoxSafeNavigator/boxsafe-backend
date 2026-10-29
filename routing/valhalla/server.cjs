'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createRouter } = require('./adapter.cjs');
function createApp({ route } = {}) {
  if (!route) route = createRouter({ endpoint: process.env.VALHALLA_URL || 'http://127.0.0.1:8002',
    provenance: { datasetId: process.env.BOXSAFE_DATASET_ID || null, graphBuildId: process.env.BOXSAFE_GRAPH_BUILD_ID || null } });
  return http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'GET' && req.url === '/') {
      const html = fs.readFileSync(path.join(__dirname, '../../ui/index.html'), 'utf8')
        .replace('<html lang="en">', '<html lang="en" data-engine-enabled="true">');
      res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(html);
    }
    if (req.method !== 'POST' || req.url !== '/route') { res.writeHead(404); return res.end('{}'); }
    // Same-origin browser calls only. No CORS; this server binds loopback by default.
    if (req.headers.origin) {
      try { if (new URL(req.headers.origin).host !== req.headers.host) throw Error(); }
      catch { res.writeHead(403); return res.end('{"error":"ORIGIN_REJECTED"}'); }
    }
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) {
      res.writeHead(415); return res.end('{"error":"JSON_REQUIRED"}');
    }
    try {
      let bytes = 0; const chunks = [];
      for await (const c of req) { bytes += c.length;
        if (bytes > 16384) { res.writeHead(413); return res.end('{}'); } chunks.push(c); }
      let input;
      try { input = JSON.parse(Buffer.concat(chunks).toString()); }
      catch { res.writeHead(400); return res.end('{"error":"INVALID_JSON"}'); }
      const result = await route(input); res.writeHead(200); res.end(JSON.stringify(result));
    } catch (e) {
      const status = [400, 502, 503].includes(e.status) ? e.status : 500;
      res.writeHead(status); res.end(JSON.stringify({ error: 'ROUTING_UNAVAILABLE',
        safeRouteFound: false, truckRouteVerified: false, message: 'DO NOT PROCEED. No verified truck route is available.' }));
    }
  });
}
if (require.main === module) createApp().listen(8085, '127.0.0.1', () => console.log('Private prototype at http://127.0.0.1:8085'));
module.exports = { createApp };
