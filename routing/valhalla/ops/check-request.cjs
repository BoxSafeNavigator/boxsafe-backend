#!/usr/bin/env node
'use strict';
// Validates a UI export without contacting any routing provider.
const fs = require('node:fs');
const { buildRequest } = require('../adapter.cjs');
function validateFile(path) {
  if (!path || fs.statSync(path).size > 16384) throw Error('Expected a route request file up to 16 KiB');
  return buildRequest(JSON.parse(fs.readFileSync(path, 'utf8')));
}
if (require.main === module) {
  try {
    validateFile(process.argv[2]);
    console.log(JSON.stringify({ valid: true, costing: 'truck', networkRequests: 0,
      readyForNavigation: false, message: 'Request structure accepted. No route was calculated.' }));
  } catch {
    console.error(JSON.stringify({ valid: false, networkRequests: 0, readyForNavigation: false,
      message: 'Invalid or unreadable request. Export a confirmed truck profile and route coordinates.' }));
    process.exitCode = 1;
  }
}
module.exports = { validateFile };
