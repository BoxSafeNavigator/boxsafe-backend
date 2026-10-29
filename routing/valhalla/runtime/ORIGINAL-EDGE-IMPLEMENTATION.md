# Exact original route evidence: source investigation and implementation boundary

Three steps completed:

1. Downloaded and inspected official Valhalla tag 3.9.0, commit a3a5631c4d243eee9a09241f4ffe6680a67dd55a. src/thor/triplegbuilder.cc sets the trip edge ID from the original graph edge (set_id(edge.value), near line 1479). src/tyr/route_serializer.cc supports PBF serialization. valhalla/baldr/graphtile.h exposes GetAccessRestrictions(edgeid), with an access-mode overload. This corrects the earlier overly broad suggestion that an engine response extension is necessarily required: the original trip protobuf is a promising existing source of IDs.
2. Implemented and ran a real Actor capability probe. JSON routing passed. Requesting a trip PBF through the installed Python route method raised UnicodeDecodeError. The installed binding declares route(str)->str, so it cannot deliver this binary response intact through that call. The probe records the failure without claiming binary access or clearance.
3. Defined the implementation boundary below. No working full-path graph reader has been built or integrated; the production adapter remains unchanged.

## Native bridge contract

A bytes-returning route binding must preserve the binary serializer output. Decode the Api protobuf using definitions pinned to the same engine version; request the trip field. Walk each original trip route/leg/node edge in traversal order, retaining graph ID and partial-edge geometry indices. The bridge must load restriction records by that graph ID from the exact graph used by the Actor, using GetAccessRestrictions for truck mode, and include access, direction, conditional restrictions and graph build identity. Never use OSM way identity or trace matching as a substitute.

Reject missing graph tiles, invalid IDs, graph-version/build mismatches, malformed restrictions and unsupported conditions from any verified state. Preserve unknown for absent physical-clearance coverage, even if no restriction exists in the graph. Empty graph restriction arrays are not clearance evidence. Do not approve navigation based on this bridge alone.

Before integration, test original-edge continuity, reverse direction, parallel roads, partial first/last edges, five dimensional restriction types, conditional access and missing tiles. Compare exact returned IDs against the bridge lookup and preserve the existing synthetic HTTP regression suite.

The binary binding and graph reader require compiled native work; they are not implemented by this checkpoint. No private binary format was guessed or parsed manually, and no driving approval was granted.

Official pinned source:
- https://github.com/valhalla/valhalla/blob/3.9.0/src/thor/triplegbuilder.cc
- https://github.com/valhalla/valhalla/blob/3.9.0/src/tyr/route_serializer.cc
- https://github.com/valhalla/valhalla/blob/3.9.0/valhalla/baldr/graphtile.h
