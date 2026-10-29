'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function screen(fetchImpl) {
  const elements = new Map(); let download, blob;
  function element(id) {
    if (!elements.has(id)) {
      const classes = new Set(); const events = {};
      elements.set(id, { textContent: '', classList: { add: c => classes.add(c), remove: c => classes.delete(c),
        toggle: (c,on) => on ? classes.add(c) : classes.delete(c), contains: c => classes.has(c) },
        addEventListener: (event, fn) => { const previous=events[event]; events[event]=(...args)=>{if(previous)previous(...args);fn(...args)}; }, events });
    }
    return elements.get(id);
  }
  const context = { fetch: fetchImpl, AbortSignal, document: { getElementById: element, createElement: () => ({ click() { download = this.download; } }) },
    FormData: class { constructor(form) { this.values = form.values; } get(k) { return this.values[k]; } },
    Blob: class { constructor(parts) { blob = parts.join(''); } }, URL: { createObjectURL: () => 'blob:fixture', revokeObjectURL() {} }, setTimeout: fn => fn() };
  const html = fs.readFileSync(require.resolve('../ui/index.html'), 'utf8');
  vm.runInNewContext(html.split('<script>')[1].split('</script>')[0], context);
  const submit = (id, values) => element(id).onsubmit({ preventDefault() {}, target: { values } });
  return { element, submit, downloaded: () => ({ name: download, data: JSON.parse(blob) }) };
}
const profile = { height:'13', width:'102', length:'26', weight:'26000', axle:'16000', count:'2', hazmat:'false' };
const journey = { olat:'34.92', olon:'-81.03', dlat:'34.93', dlon:'-81.04', freeways:'true', tolls:'true', scenic:'true', places:'hotels' };
test('route review requires confirmed truck', () => {
 const s=screen(); s.submit('routeForm',journey);
 assert.match(s.element('routeFeedback').textContent,/Confirm your truck/);
});
test('axle inconsistency is rejected', () => {
 const s=screen(); s.submit('truckForm',{...profile,axle:'30000'});
 assert.match(s.element('feedback').textContent,/cannot exceed/);
 s.submit('routeForm',journey); assert.match(s.element('routeFeedback').textContent,/Confirm/);
});
test('confirmed profile and preferences export an adapter-compatible request', () => {
 const s=screen(); s.submit('truckForm',profile); s.submit('routeForm',journey);
 assert.match(s.element('routeFeedback').textContent,/No routing service/);
 s.element('download').onclick(); const d=s.downloaded();
 assert.equal(d.name,'boxsafe-route-request.json'); assert.equal(d.data.truck.height.unit,'ft');
 assert.equal(d.data.preferences.preferFewerTolls,true); assert.equal(d.data.preferences.preferFewerFreeways,true);
 assert.equal(d.data.locations[0].lat,34.92); assert.equal(d.data.truck.hazmat,false);
 const {buildRequest}=require('../routing/valhalla/adapter.cjs'); assert.equal(buildRequest(d.data).costing,'truck');
});
test('profile edits invalidate confirmed profile and export', () => {
 const s=screen(); s.submit('truckForm',profile); s.submit('routeForm',journey);
 s.element('truckForm').events.input(); assert.equal(s.element('download').classList.contains('hidden'),true);
 s.submit('routeForm',journey); assert.match(s.element('routeFeedback').textContent,/Confirm/);
});
test('coordinate or preference edits clear prior sample', () => {
 const s=screen(); s.submit('truckForm',profile); s.submit('routeForm',journey);
 s.element('routeForm').events.input(); assert.equal(s.element('result').classList.contains('hidden'),true);
 assert.equal(s.element('download').classList.contains('hidden'),true);
});
test('rest search discloses unavailable live data', () => {
 const s=screen(); s.element('rest').onclick(); assert.match(s.element('restStatus').textContent,/not connected/);
});
test('engine failure clears sample and displays stop message',async()=>{
 let calls=0;const s=screen(async()=>{calls++;throw Error()});s.submit('truckForm',profile);s.submit('routeForm',journey);
 await s.element('engine').onclick();assert.equal(calls,1);assert.match(s.element('engineStatus').textContent,/DO NOT PROCEED/);assert.equal(s.element('result').classList.contains('hidden'),true);
});
test('unverified engine result is rendered as text without assurance',async()=>{
 const s=screen(async()=>({ok:true,json:async()=>({safeRouteFound:false,truckRouteVerified:false,status:'UNKNOWN_ROUTE_SAFETY',route:{distanceMeters:2000,durationSeconds:120,maneuvers:[{instruction:'Fixture'}]}})}));
 s.submit('truckForm',profile);s.submit('routeForm',journey);await s.element('engine').onclick();assert.match(s.element('engineStatus').textContent,/clearance unverified/);assert.match(s.element('engineResult').textContent,/Fixture/);
});
