# GitHub native build preparation

Added .github/workflows/boxsafe-native-build.yml with a manual-only trigger, read-only repository permissions, a 45-minute timeout and seven-day build evidence retention. It attempts the native wheel build on Ubuntu 24.04, creates a synthetic fixture using the released runtime in a separate environment, then runs binary verification with the patched wheel. It does not deploy, publish a package or start a public service.

The workflow has NOT run. The connected GitHub tools do not expose workflow dispatch. GitHub normally requires a workflow_dispatch workflow to exist on the repository default branch before it can be manually launched. This file currently exists only on the draft prototype branch; no merge or default-branch change was performed. A reviewed workflow installation on the default branch and an Actions run are still needed. Build success and original-route binary verification remain unverified. Runner policy, availability and account billing settings must be checked when launching; no spending limit was changed.

This provides an alternative build location to the restricted local workspace. Any job failure must be diagnosed from the saved logs; preparing YAML is not evidence that the missing native dependencies are fixed.
