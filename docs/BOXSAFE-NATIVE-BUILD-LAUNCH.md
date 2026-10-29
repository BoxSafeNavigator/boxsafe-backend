# BoxSafe native build launch

This branch changes only build configuration and this guide. It is based on master 9293608aab51e5cb51fa5e3f167cbc1f3c5b5c2b and does not merge prototype application changes.

The workflow explicitly checks out BoxSafe prototype revision 90ac77c36b77f938dc06c7862fdf96d9caaacc21. This fixes a launch problem: the default branch does not contain the prototype scripts, so an unspecified checkout after installing the workflow there would use the wrong source tree. Source identity is recorded with artifacts.

Local checks passed: YAML parsing, manual-only trigger, read-only permissions, explicit checkout identity and bash syntax for all four run blocks. Native compilation and binary verification have NOT run. The successful execution path remains unverified.

After reviewed installation on the default branch, open Actions, select BoxSafe native binary build, and choose Run workflow on master. Inspect account Actions policy and billing settings before starting; this change does not change limits or authorize paid runner upgrades. The workflow has a 45-minute timeout, does not request secrets, and preserves evidence for seven days. It does not deploy a public service.

Download the evidence artifact and inspect native-build.log, fixture-tests.log, binary-verification logs and original-trip.json. Any failure must be fixed before claiming success. Even decoded original edge IDs do not establish graph restriction completeness or physical clearance. Graph restriction lookup remains separate work.

Connected tools in this session expose workflow inspection and retry operations but no initial workflow dispatch. No Actions run, default-branch merge, hosting purchase or driving approval was performed in preparing this change.
