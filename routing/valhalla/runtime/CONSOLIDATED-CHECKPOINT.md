# Consolidated prototype validation

Three steps completed: main runner now discovers all runtime Python test modules, reran the combined command, and saved its report. Source fingerprints now also include offline audit code, candidate-evidence code, runtime tests and synthetic JSON packets.

Recorded run: 149 Node tests, 24 runtime Python tests and 35 real-engine HTTP cases passed. The separate 12 native protobuf structural tests are NOT part of this command; they require generated schema modules. The binary route verification remains blocked because the installed wheel does not contain the uncompiled patch. allChecksPassed applies only to the three listed executable check groups. navigationReady and deploymentReady remain false.

The Python log is now named python-runtime-tests.log rather than python-guard-tests.log. Existing SERVER-VALIDATION.md describes an earlier five-test Python checkpoint; this document and combined-validation-results.json supersede those counts for the current runner.

Run the pinned runtime's Python with routing/valhalla/runtime/validate-prototype.py --work-dir /absolute/output. The command creates a new timestamped directory and keeps logs and fixture results there.

Remaining actual dependency: a native build environment with Boost/Protobuf development packages and the other configured build dependencies. Repeated offline tests do not repair that dependency. Build and test the patched wheel there before implementing exact original-edge restriction lookup. No paid hosting or public service deployment occurred.
