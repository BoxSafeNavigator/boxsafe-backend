'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { importCatalog, presentPlace } = require('../places/catalog.cjs');
const now = Date.parse('2026-10-29T12:00:00.000Z');
const record = () => ({ id:'fixture-only', name:'Fictional test stop', category:'rest_area', location:{lat:34.9,lon:-81},
 sources:[{url:'https://example.org/fixture',publisher:'Test fixture — not a real listing',checkedAt:'2026-10-28T12:00:00.000Z'}],
 truckAccess:{status:'confirmed',sourceIndexes:[0]}, truckParking:{status:'unknown'} });
test('source-backed import preserves unknown fields without safety assurance',()=>{
 const r=importCatalog([record()],now); assert.equal(r.accepted.length,1);
 const p=presentPlace(r.accepted[0],{now}); assert.equal(p.truckAccess,'confirmed');
 assert.equal(p.truckParking,'unknown'); assert.equal(p.parkingAvailability,'unknown'); assert.equal(p.approachClearance,'unknown');
});
test('stale positive evidence becomes unknown',()=>{
 const p=record();p.sources[0].checkedAt='2026-01-01T12:00:00.000Z';
 assert.equal(presentPlace(p,{now}).truckAccess,'unknown');
});
test('negative access evidence remains visible when stale',()=>{
 const p=record();p.truckAccess.status='unsuitable';p.sources[0].checkedAt='2026-01-01T12:00:00.000Z';
 assert.equal(presentPlace(p,{now}).truckAccess,'unsuitable');
});
test('confirmation without evidence is rejected',()=>{
 const p=record();p.truckAccess.sourceIndexes=[];assert.equal(importCatalog([p],now).rejected.length,1);
});
test('invalid coordinates and future evidence rejected',()=>{
 let p=record();p.location.lat=91;assert.equal(importCatalog([p],now).rejected.length,1);
 p=record();p.sources[0].checkedAt='2027-01-01T00:00:00.000Z';assert.equal(importCatalog([p],now).rejected.length,1);
});
test('duplicate IDs quarantined and import copies records',()=>{
 const p=record(),r=importCatalog([p,p],now); assert.equal(r.accepted.length,1);assert.equal(r.rejected.length,1);
 p.name='Changed';assert.equal(r.accepted[0].name,'Fictional test stop');
});
test('invalid source protocol and evidence index rejected',()=>{
 let p=record();p.sources[0].url='javascript:alert(1)';assert.equal(importCatalog([p],now).rejected.length,1);
 p=record();p.truckAccess.sourceIndexes=[2];assert.equal(importCatalog([p],now).rejected.length,1);
});
test('unbounded catalog and invalid freshness policy rejected',()=>{
 assert.throws(()=>importCatalog({}));assert.throws(()=>presentPlace(record(),{now,freshnessDays:-1}));
});
