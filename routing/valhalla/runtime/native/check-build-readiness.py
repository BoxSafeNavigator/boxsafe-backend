"""Read-only build prerequisites; no installation, compilation or clearance approval."""
import importlib.metadata,json,pathlib,shutil
headers={'boost':'/usr/include/boost/version.hpp','protobuf':'/usr/include/google/protobuf/message.h'}
report={'tools':{name:shutil.which(name) for name in ('c++','cmake','ninja','protoc','pkg-config')},'standardHeaders':{name:pathlib.Path(path).is_file() for name,path in headers.items()},'navigationReady':False,'nativeBuildVerified':False,'note':'Standard include paths only; custom dependency prefixes require a successful CMake configure.'}
for name in ('cmake','ninja'):
 try:report[name+'PythonPackageVersion']=importlib.metadata.version(name)
 except importlib.metadata.PackageNotFoundError:pass
print(json.dumps(report,indent=2))
