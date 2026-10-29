#!/usr/bin/env python3
"""Read-only readiness report; never installs or starts services."""
import argparse, hashlib, json, pathlib, shutil, subprocess
p=argparse.ArgumentParser()
p.add_argument('--extract', required=True)
a=p.parse_args()
source=pathlib.Path(a.extract)
expected='f91cbefa10071fc827458c5f233f341d55dbffcfe2d5905dcb2cd21e360a12db'
actual=None
if source.is_file():
    h=hashlib.sha256()
    with source.open('rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''): h.update(block)
    actual=h.hexdigest()
commands={name:shutil.which(name) for name in ['valhalla_service','valhalla_build_tiles','valhalla_build_config','osmium']}
version=None
if commands['valhalla_service']:
    try:
        r=subprocess.run([commands['valhalla_service'],'--version'],capture_output=True,text=True,timeout=10)
        version={'exit_code':r.returncode,'output':(r.stdout+r.stderr)[:500]}
    except (OSError,subprocess.TimeoutExpired): version={'error':'version probe failed'}
print(json.dumps({'extract_exists':source.is_file(),'sha256':actual,'matches_saved_extract':actual==expected,
    'commands':commands,'version_probe':version,'graph_built':False,'ready_for_navigation':False},indent=2))
raise SystemExit(0 if actual==expected and all(commands.values()) else 1)
