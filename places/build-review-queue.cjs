#!/usr/bin/env node
'use strict';
// A research work queue only. Never changes the source catalog or approves a stop.
const fs = require('node:fs');
const path = require('node:path');
const candidates = require('./sc-official-research.json');
const held = require('./sc-held-records.json');
const crosscheck = require('./sc-coordinate-crosscheck.json');
const rows = candidates.map(p => ({ id:p.id, name:p.name, road:p.road, mileMarker:p.mileMarker,
  status:'pending', priority:p.id==='richland-i26-wb'?'high':'normal',
  publishedPoint:p.location,
  crosscheck:crosscheck.candidates.find(c=>c.id===p.id),
  checks:{entrancePoint:null,entryDirection:null,exitDirection:null,physicalRestrictions:null,
    parkingPermission:null,parkingConditions:null,stationOperatingStatus:null,restroomAccess:null,
    evidenceReferences:[],reviewer:null,reviewedAt:null},
  routable:false,reason:'Facility point does not establish entrance, approach clearance or current parking permission.' }));
held.records.forEach((p,i)=>rows.push({id:'held-i77-'+i,name:p.name,road:p.road,mileMarker:p.mileMarker,
  status:'held',priority:'high',routable:false,reason:held.reason,
  checks:{entrancePoint:null,entryDirection:null,exitDirection:null,physicalRestrictions:null,
    parkingPermission:null,parkingConditions:null,stationOperatingStatus:null,restroomAccess:null,
    evidenceReferences:[],reviewer:null,reviewedAt:null}}));
const output={purpose:'Manual verification work queue; not a navigation dataset',rows};
if(require.main===module){
  const destination=process.argv[2];
  if(!destination){console.error('Usage: node places/build-review-queue.cjs OUTPUT.json');process.exitCode=1;}
  else fs.writeFileSync(path.resolve(destination),JSON.stringify(output,null,2)+'\n');
}
module.exports={buildReviewQueue:()=>structuredClone(output)};
