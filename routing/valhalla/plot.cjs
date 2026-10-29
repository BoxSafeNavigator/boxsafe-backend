'use strict';
// Schematic only. Preserves route ordering; not a basemap or navigation renderer.
function plot(points) {
 if(!Array.isArray(points)||points.length<2||points.length>50000)throw Error('INVALID_PLOT');
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 for(const p of points){if(!Array.isArray(p)||p.length!==2||!Number.isFinite(p[0])||!Number.isFinite(p[1])||Math.abs(p[0])>180||Math.abs(p[1])>90)throw Error('INVALID_PLOT');minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);minY=Math.min(minY,p[1]);maxY=Math.max(maxY,p[1]);}
 const span=Math.max(maxX-minX,maxY-minY);if(!span)throw Error('INVALID_PLOT');
 return points.map(p=>`${(30+(p[0]-minX)/span*540).toFixed(2)},${(360-(p[1]-minY)/span*330).toFixed(2)}`).join(' ');
}
module.exports={plot};
