# Facility verification work packet

Prepared October 29, 2026. Nine pending/held records. None approved for navigation. This packet can be used before server rental; it does not replace live routing tests.

## Review order

1. Resolve York/Rock Hill I-77 identity, duplicated published coordinates, southbound mile-marker mismatch and correct directional ramp entrance.
2. Verify Richland I-26 westbound independently; the cross-check query did not return a matching facility.
3. Review the remaining six candidates, including Lexington's differing mile labels and Dorchester I-95's approximately 211-metre point separation. These differences may reflect facility-point placement; no cause is established.

## Ask the responsible agency or facility operator

- Which exact roadway/direction and mile marker identify the site?
- What coordinate identifies the legal truck-entry ramp rather than the scale house, facility center or opposite carriageway?
- What is the legal exit route, including any gate or one-way restrictions?
- Is truck parking permitted currently, and under what operating-status, time, vehicle or duration conditions?
- Can parking remain available while the station operates? What closures or temporary restrictions apply?
- Are restrooms accessible when the station is closed?
- Are height, width, weight, turning, hazmat or other access restrictions published for the approach?
- Is there a maintained public data feed, update contact, reuse permission and correction process?

Retain dated evidence and its scope. A verbal or written statement about parking is not proof of physical clearance, entrance geometry or vacancy. Never record a general 'yes' as approval of all questions. No messages were sent and no agency replies have been received in this milestone.

## Authoritative starting points

SCDPS truck parking page: https://www.scdps.sc.gov/stp/truck-parking . Its current page gives conditional parking notes and warns restroom access can be unavailable; it does not establish today's operation or free spaces.

SCDOT rest-area directory: https://www.scdot.org/travel/travel-rest-area.html . Listed general contact: 855-467-2368 or 803-737-1200. These are routing contacts, not a verified direct contact for each scale. Do not imply SCDOT has confirmed a stop merely because its directory is listed here.

## Workflow

Run `node places/build-review-queue.cjs OUTPUT.json` to regenerate a clean pending queue. It overwrites only the specified output file; do not point it at a queue containing completed human reviews. Source candidates stay unchanged. Record answers and evidence in a separately versioned review file. The generated queue is not consumed by routing and cannot enable navigation. Only reviewed evidence, independent entrance checks and engine tests can support later promotion.

Completed here: work queue and specific evidence questions. Outstanding: operator confirmation, reviewed entrance geometry, private browser validation and live Valhalla graph tests. Existing local tests cover code behavior, not these real-world facts.
