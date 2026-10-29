# Export verification checkpoint

A private hosted preview is published at https://boxsafe-private-studio-20261029.jimmiewiley1962.chatgpt.site . Browser testing remains incomplete: secure account-selection request was declined. Do not retry sign-in without a new user request.

Added a no-network command for validating downloaded UI request files:

    node routing/valhalla/ops/check-request.cjs /path/to/boxsafe-route-request.json

Success means the input conforms to the adapter's truck/profile and preference validation. It does not calculate a route or verify clearance. Failure gives a generic error without printing file contents. File size is bounded to 16 KiB.

123 local Node tests pass, including file-based checks of valid requests, malformed JSON, missing truck profile and oversized input. Visual browser checks, real Valhalla routing, and graph build remain outstanding.
