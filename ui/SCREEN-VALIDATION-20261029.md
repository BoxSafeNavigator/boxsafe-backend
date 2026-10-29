# Screen logic validation — October 29, 2026

122 Node tests passed: 116 existing tests plus six new screen-flow checks. Tests execute the actual inline UI script with a minimal DOM/form harness. They verify profile gating, axle consistency, exported request compatibility with the adapter, preference serialization, invalidation after profile/route edits, and disclosure that rest search is disconnected.

These are logic tests, not browser tests. Native browser number validation, keyboard behavior, downloads on iPad, responsive rendering and visual accessibility remain unverified. Attempted browser access to the locally served prototype returned ERR_CONNECTION_REFUSED because the browser could not reach the workspace loopback server. No claim of visual QA completion.

No new defects were observed in tested paths. Next gate: open ui/index.html in a reachable supported browser, inspect phone/tablet layouts and exercise actual form constraints and downloads. Live routing remains blocked on compatible Valhalla runtime and graph build. No production deployment or purchase.
