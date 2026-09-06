# Cold Store — Trade-offs & Edge-Case Handling

## Edge cases

**Double-booking (two farmers tap the same bay at once).**
Enforced in Postgres, not in the UI: `reserve_bay()` runs
`UPDATE bays SET status='reserved' WHERE id=? AND status='available'`. Postgres
serializes concurrent updates to the same row, so only one of the two
simultaneous requests can match `status='available'`; the second gets zero
rows updated and the function raises `BAY_UNAVAILABLE`. The frontend catches
that and tells the second farmer the bay was just taken. This holds even if
the two requests come from completely different devices with no shared state.

**Late drop-off.** Every reservation stores `expected_dropoff_time`.
`expire_overdue_reservations()` cancels any reservation more than 45 minutes
past that time, frees the bay, and immediately checks the waitlist. It's
called every 30s by any open client as a free-tier-friendly poll; the README
also shows the one-line `pg_cron` schedule to run it with zero browsers open.
45 minutes is a judgment call — long enough to allow for genuinely late
trucks on rural roads, short enough that a no-show doesn't block a bay all day.

**Early checkout → waitlist bump.** `surrender_bay()` and
`expire_overdue_reservations()` both call a shared `free_bay_and_bump()`
function: free the bay, then `SELECT ... FOR UPDATE SKIP LOCKED` the
oldest open waitlist row, mark it fulfilled, and insert a new `reserved`
booking for that farmer with a 45-minute grace window to arrive. `SKIP LOCKED`
means two bays freeing at the exact same moment can't both grab the same
waitlist entry.

**Room full.** When every bay is Reserved or Occupied, the Check-In tab shows
"Room is full" with a one-tap "Join Waitlist" form instead of pretending a
bay is available.

**Spoilage / overdue occupied bays.** Each check-in asks "how many days will
this stay?" (1/2/3 — a small necessary addition beyond the written spec,
since without it there'd be no `expected_pickup_time` to warn against). The
dashboard buckets occupied bays into High Risk (past pickup time), Moderate
(<24h left) and Safe, and the matching bay tile gets a pulsing red border on
the floor map too — not just the room-wide cooling alert.

**Shared/borrowed phones.** Identity is a random id silently stored in
`localStorage`, never a login. If a phone has no locally-stored booking (a
farmer borrowed a neighbor's phone, or cleared their browser), the Check-In
tab falls back to a plain search-by-name list of today's active bookings.

## Trade-offs

- **No accounts means no real authorization.** Any phone that opens the app
  can tap "Cancel," "Check-In," or "Surrender" on any bay — there's no proof
  the tapper is the farmer who reserved it. This matches the brief (no
  login, minimal friction, low-literacy users) and the physical reality
  (staff or the farmer themself operates a phone at the cold room), but it's
  a real limitation: a mischievous tap could free someone else's bay. A
  production version would want a lightweight PIN check on Cancel/Surrender
  even without full accounts.
- **RLS locks down direct table writes.** Farmers' browsers can only read
  tables directly and can only mutate data by calling the RPC functions
  (`security definer`), which is what actually makes the double-booking
  guarantee and the 3-state model impossible to bypass from a compromised or
  modified client.
- **Client-side polling for auto-expire, not a guaranteed background job.**
  On Supabase's free tier this is the zero-cost option; it depends on at
  least one browser tab being open somewhere. `pg_cron` (also free tier) is
  documented in the README as the more robust alternative and takes one SQL
  statement to enable.
- **Bundle size.** `@supabase/supabase-js` accounts for most of the ~112KB
  gzipped JS bundle. That's larger than a hand-rolled fetch client would be,
  but it buys realtime subscriptions and a maintained client for free-tier
  Postgres, which the brief's "live across devices" requirement needs. No
  images, no web fonts, no animation library, no CSS framework — everything
  else is deliberately minimal for 2G/3G.
- **Pickup-duration picker at check-in.** Not explicitly in the written
  spec, but required for "expected_pickup_time" (used by early-checkout
  bump and spoilage warnings) to mean anything. Kept it to a 3-button tap
  (1/2/3 days) to match the app's "minimal typing" rule.
- **Text-to-speech via the browser's built-in SpeechSynthesis API**, not a
  paid TTS service — free, but voice quality and Hindi voice availability
  vary by device/browser; it's an accessibility aid, not a required flow.
