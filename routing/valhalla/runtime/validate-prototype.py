"""Repeatable development checks. Passing does not grant deployment/navigation approval."""
import argparse,datetime,hashlib,importlib.metadata,json,os,pathlib,platform,signal,shutil,subprocess,sys
p=argparse.ArgumentParser()
p.add_argument('--work-dir',required=True,help='Parent directory for a new timestamped validation run')
a=p.parse_args()
runtime=pathlib.Path(__file__).resolve().parent;repo=runtime.parents[2]
work=pathlib.Path(a.work_dir).resolve()/datetime.datetime.now(datetime.timezone.utc).strftime('validation-%Y%m%dT%H%M%S%fZ')
work.mkdir(parents=True)
report={'schemaVersion':1,'syntheticOnly':True,'navigationReady':False,'deploymentReady':False,
        'allChecksPassed':False,'pythonVersion':platform.python_version(),'checks':[],
        'limitations':['Synthetic restriction coverage only','No entrance or clearance verification','No production hosting or security validation','No browser validation']}
exit_code=1
try:
    versions={name:importlib.metadata.version(name) for name in ('pyvalhalla','osmium')}
    report['dependencies']=versions
    if versions!={'pyvalhalla':'3.9.0','osmium':'4.3.2'}:raise RuntimeError('Unexpected validation dependency versions')
    node=shutil.which('node')
    if not node:raise RuntimeError('Node executable missing')
    report['nodeVersion']=subprocess.check_output([node,'--version'],text=True).strip()
    if int(report['nodeVersion'].split('.')[0].lstrip('v'))<18:raise RuntimeError('Node 18 or newer required')
    source_paths=[repo/'routing/valhalla/adapter.cjs',repo/'routing/valhalla/server.cjs',runtime/'endpoint_guard.py',runtime/'actor-http.py',runtime/'guarded-http-smoke.py',pathlib.Path(__file__).resolve()]
    source_paths+=sorted(runtime.glob('test_*.py'))
    source_paths+=[runtime/'route_restrictions.py',runtime/'audit-route-evidence.py',runtime/'path_evidence.py']
    source_paths+=sorted((runtime/'evidence-examples').glob('*.json'))
    report['sourceSha256']={str(path.relative_to(repo)):hashlib.sha256(path.read_bytes()).hexdigest() for path in source_paths}
    commands=[('node-tests',[node,'--test',*[str(path) for path in sorted((repo/'test').glob('*.test.cjs'))]],60),
              ('python-runtime-tests',[sys.executable,'-m','unittest','discover','-s',str(runtime),'-p','test_*.py'],30),
              ('real-engine-http',[sys.executable,str(runtime/'guarded-http-smoke.py'),'--work-dir',str(work/'fixture')],120)]
    for name,command,timeout in commands:
        with open(work/(name+'.log'),'w') as log:
            process=subprocess.Popen(command,cwd=repo,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
            try: code=process.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid,signal.SIGTERM)
                try: process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid,signal.SIGKILL);process.wait()
                report['checks'].append({'name':name,'passed':False,'timedOut':True,'log':name+'.log'})
                raise RuntimeError(name+' timed out; child process group terminated')
        report['checks'].append({'name':name,'passed':code==0,'exitCode':code,'log':name+'.log'})
        if code:raise RuntimeError(name+' failed; inspect its log')
    fixture=json.loads((work/'fixture/results.json').read_text())
    if fixture.get('passed') is not True or not fixture.get('cases') or any(c.get('passed') is not True for c in fixture['cases']):raise RuntimeError('Missing complete real-engine evidence')
    report['realEngineCaseCount']=len(fixture['cases'])
    report['allChecksPassed']=True;exit_code=0
except Exception as error:
    report['failure']=str(error)
finally:
    (work/'validation-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'report':str(work/'validation-report.json'),'allChecksPassed':report['allChecksPassed'],'navigationReady':False,'deploymentReady':False}))
sys.exit(exit_code)
