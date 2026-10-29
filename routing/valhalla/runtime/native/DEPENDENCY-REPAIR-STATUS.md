# Dependency repair status

Attempted to install Boost, Protobuf and supporting development packages through the normal system package manager. Installation could not locate packages because package indexes are unavailable. A normal apt-get update then failed on setgroups/setegid/seteuid operations denied by this workspace. No privilege changes or package-manager security overrides were attempted.

The missing dependencies are NOT repaired in this workspace. CMake/Ninja remain installed in the isolated runtime; the existing prebuilt routing engine is unaffected. The binary-response patch is still uncompiled and untested.

Prepared build-patched-wheel.sh for a standard Ubuntu 24.04 development host. It installs the required development packages, clones the pinned engine with submodules, checks source identity, applies the patch and attempts an isolated wheel build. bash -n passes. The script has NOT completed an end-to-end build; additional build dependencies may still emerge. It requires ordinary administrative package-install privileges on that host. It does not deploy a service.

After a successful wheel build: install into a separate test environment, verify route_bytes returns bytes, decode the original trip protobuf, and test exact graph-edge restriction lookup. No route-clearance approval is granted by building the wheel.
