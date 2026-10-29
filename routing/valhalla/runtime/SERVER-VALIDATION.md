# Repeatable private prototype validation

This procedure runs development checks; it does not launch a public service or approve navigation. Use a Linux x86_64 development server with Python 3.12, Node (18 or newer; recorded run used 24.22.1), a C++-compatible environment for the pinned binary wheels, and access to the required package distributions.

From the repository root, on the BoxSafe prototype branch:

```sh
python3.12 -m venv /absolute/path/boxsafe-validation-runtime
/absolute/path/boxsafe-validation-runtime/bin/python -m pip install --only-binary=:all: -r routing/valhalla/runtime/validation-requirements.txt
/absolute/path/boxsafe-validation-runtime/bin/python routing/valhalla/runtime/validate-prototype.py --work-dir /absolute/path/boxsafe-validation-output
```

Replace the example absolute paths with directories you control. The runner prints the exact validation-report.json path. Inspect the report plus its node-tests.log, python-guard-tests.log and real-engine-http.log. The fixture subdirectory contains the generated graph, config, engine/application logs and results.json. Do not commit those graph files. The runner saves source SHA-256 values so results can be matched to the tested code.

Expected current result: 149 Node tests, 5 Python tests and 35 synthetic HTTP cases pass, with allChecksPassed=true. Any failure or timeout returns a nonzero exit code. A missing or wrong dependency version blocks validation. Passing deliberately leaves navigationReady=false and deploymentReady=false.

The fixture uses ephemeral loopback ports, the real Valhalla Actor, private Python HTTP transport and Node adapter/application. It does not need a regional OpenStreetMap extract or an external routing API. It keeps the engine's default reachability setting. It does not download or start paid hosting, expose ports publicly, configure authentication/TLS or test the browser UI.

Before server deployment is considered, separately verify authentication, TLS, rate/body limits, process supervision, resource limits, monitoring and private engine access. The current Actor transport is explicitly a private development service. Existing check-readiness.py is an older native-CLI/extract probe; its result is not equivalent to this Actor-based validation. Regional graph rebuilding and current real-world clearance/entrance evidence are separate tasks.

A passing development report must never be used as a truck-clearance certificate or driving recommendation.
