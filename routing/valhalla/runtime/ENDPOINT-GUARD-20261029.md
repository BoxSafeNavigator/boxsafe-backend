# Endpoint guard checkpoint

Recovered latest source from GitHub into an isolated checkout after temporary workspace reverted to an earlier checkpoint. Rebuilt the tiny fixture, not the full SC graph.

Actor locate(verbose=true) exposes access_restrictions on correlated edges. Added check_endpoints before Actor.route in the private Python transport. All correlated endpoint candidates must have explicit truck access and a restrictions array. Known height/width/length/weight/axle-load restrictions are compared against the normalized profile. Unsupported, missing, conflicting or malformed restriction evidence blocks routing conservatively. No path is searched from a conflicting endpoint.

Four real-engine fixture checks passed: height and weight conflict profiles blocked; two smaller controls passed the guard. These exercise the actual locate API, not mocked restriction records. Original engine defects remain preserved; this mitigates them in the BoxSafe private transport without changing upstream Valhalla. It has not yet been tested over live HTTP against every endpoint scenario.

Node adapter now requires the transport's endpoint-assessment marker before accepting a response. Raw native-service output without that assessment fails closed. The marker is trusted private-service metadata, not independently authenticated evidence or a client-provided override. normalize() remains a low-level diagnostic helper; it is not the guarded routing entrypoint.

145 local Node tests pass, including missing-assessment rejection. Earlier HTTP smoke artifact predates this guard and is not evidence the new flow passed. All route verification flags stay false. Empty graph restrictions mean no recorded conflict, not verified physical clearance; unknown real-world restrictions remain unknown. All-candidate checks may over-reject ambiguous endpoints. No clearance margin or actual bridge database validation is introduced.

Next: guarded live HTTP tests with realistic graph reachability, malformed locate evidence tests, then expand to full-route edge validation and independently reviewed clearance evidence. Public driving release remains blocked.
