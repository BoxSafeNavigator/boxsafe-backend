'use strict';
// Completeness screening only. Does not authenticate evidence or approve navigation.
function assessReview(review, now = Date.now()) {
 const missing=[];
 if(!review || typeof review!=='object') return {complete:false,missing:['review'],routable:false};
 if(typeof review.facilityId!=='string'||!review.facilityId.trim()) missing.push('facilityId');
 if(typeof review.reviewer!=='string'||!review.reviewer.trim()) missing.push('reviewer');
 const timestamp=Date.parse(review.reviewedAt);
 if(typeof review.reviewedAt!=='string'||!Number.isFinite(timestamp)||timestamp>now) missing.push('reviewedAt');
 for(const field of ['entrance','parking','restrictions']) {
  const item=review[field];
  if(!item||typeof item.summary!=='string'||!item.summary.trim()) missing.push(field+'.summary');
  if(!Array.isArray(item?.evidence)||!item.evidence.length) missing.push(field+'.evidence');
  else for(const e of item.evidence){
   let valid=false;
   try {const u=new URL(e.url);const d=Date.parse(e.checkedAt);valid=u.protocol==='https:'&&!u.username&&!u.password&&typeof e.publisher==='string'&&!!e.publisher.trim()&&Number.isFinite(d)&&d<=now;} catch{}
   if(!valid)missing.push(field+'.invalidEvidence');
  }
 }
 const point=review.entrance?.point;
 if(!point||typeof point.lat!=='number'||!Number.isFinite(point.lat)||Math.abs(point.lat)>90||typeof point.lon!=='number'||!Number.isFinite(point.lon)||Math.abs(point.lon)>180)missing.push('entrance.point');
 if(!['northbound','southbound','eastbound','westbound'].includes(review.entrance?.direction))missing.push('entrance.direction');
 if(typeof review.parking?.conditions!=='string'||!review.parking.conditions.trim())missing.push('parking.conditions');
 return {complete:missing.length===0,missing,routable:false,message:'Completeness only. Evidence authenticity, real-world suitability and route clearance require independent review.'};
}
module.exports={assessReview};
