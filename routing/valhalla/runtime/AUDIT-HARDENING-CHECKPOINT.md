# Three-step offline audit hardening

Reviewed malformed supplied JSON cases. Fixed an exception caused by a non-string restriction type (for example an array), and now mark contradictory or missing restriction-presence flags unknown. Updated fixtures to declare restriction presence explicitly.

Added four regressions for malformed type, contradictory presence flags, malformed edge records and missing access. Fourteen offline audit tests pass. Combined Python discovery passes 23 tests: fourteen audit, five endpoint and four candidate-evidence tests. These are local tests, not additional real-engine routes; native protobuf tests require separate generated modules.

No native compilation, real-route edge reader, service integration or driving approval is claimed. Existing real-engine results remain historical; this change only affects the offline supplied-data checker.
