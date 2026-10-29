'use strict';
const test=require('node:test'),assert=require('node:assert/strict');const {plot}=require('../routing/valhalla/plot.cjs');
test('schematic preserves east and north orientation',()=>{assert.equal(plot([[-81,34],[-80,35]]),'30.00,360.00 570.00,30.00')});
test('plot rejects malformed, degenerate and out-of-range geometry',()=>{for(const p of [[],[[0,0]],[[0,0],[0,0]],[[0,0],[181,0]],[[0,0],[NaN,1]]])assert.throws(()=>plot(p))});
