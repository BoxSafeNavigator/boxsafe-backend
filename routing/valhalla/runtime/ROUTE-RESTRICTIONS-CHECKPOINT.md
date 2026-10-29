# Offline route restriction audit

Three steps completed: implemented a supplied-data route restriction checker, passed ten focused tests (including all five numeric restriction types), and exercised a CLI that exits nonzero for incomplete evidence. Empty input was rejected and every result retains false navigationReady/fullPathClearanceVerified/safeRouteFound flags.

The packet contract requires normalized metric truck values, the original directed-edge ID sequence as decimal strings, matching graph build IDs, ordered edge evidence, explicit truck access, and restriction records with explicit units and conditional/truck flags. It detects supplied dimension conflicts, denied access, missing data, unsupported conditions, wrong units and graph/sequence mismatches. The source is unauthenticated: even a structurally complete packet cannot prove the original route or physical clearance. A zero CLI exit code means only that supplied data is complete under this limited contract and has no detected conflict.

Run: python routing/valhalla/runtime/audit-route-evidence.py packet.json --output report.json

This is an offline diagnostic only, not connected to the routing service. The native original-edge reader remains unavailable. No full-route graph coverage, turn restriction evaluation, temporal restriction evaluation, safety margin, graph topology validation or driving approval is introduced. No additional server installation or paid services occurred.
