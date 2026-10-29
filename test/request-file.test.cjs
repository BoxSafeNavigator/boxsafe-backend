'use strict';
const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), os=require('node:os'), path=require('node:path');
const {validateFile}=require('../routing/valhalla/ops/check-request.cjs');
test('exported request file validates without engine access and rejects invalid files',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'boxsafe-request-'));
 try {
  const p=path.join(dir,'request.json');
  const request={locations:[{lat:34.92,lon:-81.03},{lat:34.93,lon:-81.04}],truck:{height:{value:13,unit:'ft'},width:{value:102,unit:'in'},length:{value:26,unit:'ft'},loadedWeight:{value:26000,unit:'lb'},maxAxleLoad:{value:16000,unit:'lb'},axleCount:2,hazmat:false},preferences:{preferFewerTolls:true}};
  fs.writeFileSync(p,JSON.stringify(request));assert.equal(validateFile(p).costing_options.truck.use_tolls,0);
  fs.writeFileSync(p,'{');assert.throws(()=>validateFile(p));
  fs.writeFileSync(p,JSON.stringify({...request,truck:null}));assert.throws(()=>validateFile(p));
  fs.writeFileSync(p,' '.repeat(16385));assert.throws(()=>validateFile(p));
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
