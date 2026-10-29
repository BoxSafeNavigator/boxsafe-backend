# Places along the route — data foundation

October 29, 2026. This module validates source-attributed place records for restaurants, hotels, rest areas, truck stops and scenic stops. No live listings, provider contracts, business-hour feeds, route detour calculation or UI catalog integration exists yet. Test fixtures are fictional.

Records require ID, name, category, coordinates, source publisher/URL/check timestamp, and separate truckAccess/truckParking states. States are confirmed, unknown or unsuitable. Non-unknown states require evidence indexes. Confirmation describes a source-backed listing claim, not independent field verification or navigational clearance. Import quarantines invalid and duplicate records and preserves caller data.

Presentation downgrades stale positive evidence to unknown (prototype policy: 90 days; not a reliability guarantee). Old negative evidence remains unsuitable until reviewed. Open-now status, actual parking availability and approach clearance remain unknown. Source age is available for review. Do not advertise a listing as reachable merely because it is near a route.

Validation: 131 local tests pass including eight catalog cases. Browser testing remains paused after secure account-selection was declined. Real engine installation and South Carolina graph build are still outstanding. No purchase or live data acquisition.

Next implementation: select permitted place data, document licensing and refresh policy, build a reviewed regional pilot catalog, then calculate truck-aware approach routes and detour time with a running engine. Connect UI filters only when real data and uncertainty handling are ready.
