-- ============================================================================
-- Cold Store — Supabase schema
-- Run this whole file once in Supabase Studio → SQL Editor → New query → Run.
-- Free tier: Postgres + Realtime, no paid extensions required.
-- ============================================================================

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists room_settings (
  id smallint primary key default 1,
  cooling_status text not null default 'on' check (cooling_status in ('on','off')),
  temperature numeric not null default 4.0,
  humidity numeric not null default 90,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);
insert into room_settings (id) values (1) on conflict (id) do nothing;

create table if not exists bays (
  id smallint primary key,
  status text not null default 'available' check (status in ('available','reserved','occupied')),
  updated_at timestamptz not null default now()
);
insert into bays (id, status)
  select g, 'available' from generate_series(1,12) g
  on conflict (id) do nothing;

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  bay_id smallint references bays(id),
  farmer_name text not null,
  farmer_phone text,
  fruit_type text not null,
  crate_count int not null default 1,
  status text not null default 'reserved' check (status in ('reserved','occupied','completed','cancelled')),
  dropoff_slot text,                     -- 'now' | '4pm' | '6pm' | 'tomorrow_am'
  expected_dropoff_time timestamptz not null,
  pickup_days int,                       -- chosen at check-in, e.g. 1/2/3
  expected_pickup_time timestamptz,
  claim_code text,
  device_id text not null,
  created_at timestamptz not null default now(),
  checked_in_at timestamptz,
  completed_at timestamptz
);

create index if not exists idx_bookings_device on bookings(device_id);
create index if not exists idx_bookings_bay on bookings(bay_id);
create index if not exists idx_bookings_status on bookings(status);

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  farmer_name text not null,
  farmer_phone text,
  fruit_type text not null,
  crate_count int not null default 1,
  device_id text not null,
  created_at timestamptz not null default now(),
  fulfilled boolean not null default false
);

create index if not exists idx_waitlist_open on waitlist(fulfilled, created_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Anyone (anon) can READ everything — it's a public shared board, no login.
-- Anyone can WRITE only through the RPC functions below (SECURITY DEFINER),
-- never by writing directly to the tables. This is what actually enforces
-- "no double-booking" and stops a malicious client from e.g. setting a bay
-- straight to 'occupied' without going through reserve -> check-in.
-- ---------------------------------------------------------------------------

alter table bays enable row level security;
alter table bookings enable row level security;
alter table waitlist enable row level security;
alter table room_settings enable row level security;

create policy "public read bays" on bays for select using (true);
create policy "public read bookings" on bookings for select using (true);
create policy "public read waitlist" on waitlist for select using (true);
create policy "public read room_settings" on room_settings for select using (true);

-- No insert/update/delete policies are created for anon on the base tables,
-- so direct writes are rejected. All mutation happens via functions marked
-- `security definer`, which run with the table owner's privileges.

-- ---------------------------------------------------------------------------
-- reserve_bay: atomically claim a bay.
-- The UPDATE ... WHERE status='available' is the double-booking guard: if two
-- farmers tap the same bay at the same instant, Postgres serializes the two
-- UPDATEs and only one can match the WHERE clause. The loser gets 0 rows
-- updated and the function raises, so the frontend can show "already taken".
-- ---------------------------------------------------------------------------

create or replace function reserve_bay(
  p_bay_id smallint,
  p_farmer_name text,
  p_farmer_phone text,
  p_fruit_type text,
  p_crate_count int,
  p_dropoff_slot text,
  p_expected_dropoff_time timestamptz,
  p_device_id text
) returns bookings
language plpgsql
security definer
as $$
declare
  v_updated smallint;
  v_booking bookings;
begin
  update bays set status = 'reserved', updated_at = now()
    where id = p_bay_id and status = 'available'
    returning id into v_updated;

  if v_updated is null then
    raise exception 'BAY_UNAVAILABLE';
  end if;

  insert into bookings (
    bay_id, farmer_name, farmer_phone, fruit_type, crate_count,
    status, dropoff_slot, expected_dropoff_time, device_id
  ) values (
    p_bay_id, p_farmer_name, p_farmer_phone, p_fruit_type, p_crate_count,
    'reserved', p_dropoff_slot, p_expected_dropoff_time, p_device_id
  ) returning * into v_booking;

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_reservation: farmer changes their mind before arriving.
-- ---------------------------------------------------------------------------

create or replace function cancel_reservation(p_booking_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_bay_id smallint;
begin
  update bookings set status = 'cancelled'
    where id = p_booking_id and status = 'reserved'
    returning bay_id into v_bay_id;

  if v_bay_id is null then
    raise exception 'BOOKING_NOT_CANCELLABLE';
  end if;

  update bays set status = 'available', updated_at = now() where id = v_bay_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- check_in: farmer has physically arrived with crates.
-- Generates the 4-digit claim code and moves Reserved -> Occupied.
-- p_pickup_days sets expected_pickup_time so overdue/spoilage warnings work.
-- ---------------------------------------------------------------------------

create or replace function check_in(p_booking_id uuid, p_pickup_days int default 3)
returns bookings
language plpgsql
security definer
as $$
declare
  v_booking bookings;
  v_code text;
begin
  v_code := lpad(floor(random() * 10000)::int::text, 4, '0');

  update bookings
    set status = 'occupied',
        checked_in_at = now(),
        pickup_days = p_pickup_days,
        expected_pickup_time = now() + (p_pickup_days || ' days')::interval,
        claim_code = v_code
    where id = p_booking_id and status = 'reserved'
    returning * into v_booking;

  if v_booking.id is null then
    raise exception 'BOOKING_NOT_CHECKINABLE';
  end if;

  update bays set status = 'occupied', updated_at = now() where id = v_booking.bay_id;

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- free_bay_and_bump: shared logic for "early checkout" (E) and "late
-- drop-off auto-cancel" (D). Frees the bay, then if anyone is waiting,
-- immediately reserves it for whoever has waited longest.
-- Returns the waitlist row that got bumped, if any (for the UI banner).
-- ---------------------------------------------------------------------------

create or replace function free_bay_and_bump(p_bay_id smallint)
returns waitlist
language plpgsql
security definer
as $$
declare
  v_next waitlist;
  v_new_booking_id uuid;
begin
  update bays set status = 'available', updated_at = now() where id = p_bay_id;

  select * into v_next from waitlist
    where fulfilled = false
    order by created_at asc
    limit 1
    for update skip locked;

  if v_next.id is not null then
    update waitlist set fulfilled = true where id = v_next.id;

    insert into bookings (
      bay_id, farmer_name, farmer_phone, fruit_type, crate_count,
      status, dropoff_slot, expected_dropoff_time, device_id
    ) values (
      p_bay_id, v_next.farmer_name, v_next.farmer_phone, v_next.fruit_type, v_next.crate_count,
      'reserved', 'now', now() + interval '45 minutes', v_next.device_id
    ) returning id into v_new_booking_id;

    update bays set status = 'reserved', updated_at = now() where id = p_bay_id;
  end if;

  return v_next;
end;
$$;

-- ---------------------------------------------------------------------------
-- surrender_bay: farmer picks up crates early / vacates before their
-- expected pickup time.
-- ---------------------------------------------------------------------------

create or replace function surrender_bay(p_booking_id uuid)
returns waitlist
language plpgsql
security definer
as $$
declare
  v_bay_id smallint;
  v_bump waitlist;
begin
  update bookings set status = 'completed', completed_at = now()
    where id = p_booking_id and status = 'occupied'
    returning bay_id into v_bay_id;

  if v_bay_id is null then
    raise exception 'BOOKING_NOT_ACTIVE';
  end if;

  select * into v_bump from free_bay_and_bump(v_bay_id);
  return v_bump;
end;
$$;

-- ---------------------------------------------------------------------------
-- join_waitlist: used only when all 12 bays are Reserved/Occupied.
-- ---------------------------------------------------------------------------

create or replace function join_waitlist(
  p_farmer_name text,
  p_farmer_phone text,
  p_fruit_type text,
  p_crate_count int,
  p_device_id text
) returns waitlist
language plpgsql
security definer
as $$
declare
  v_row waitlist;
begin
  insert into waitlist (farmer_name, farmer_phone, fruit_type, crate_count, device_id)
    values (p_farmer_name, p_farmer_phone, p_fruit_type, p_crate_count, p_device_id)
    returning * into v_row;
  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- expire_overdue_reservations: implements (D) late drop-off auto-cancel.
-- Cancels any 'reserved' booking that is more than GRACE_MINUTES past its
-- expected_dropoff_time, frees the bay, and bumps the waitlist if needed.
-- Call this via supabase.rpc() every ~30s from any open client (see App.jsx)
-- AND optionally schedule it with pg_cron (see README) so it still runs
-- with zero clients connected.
-- ---------------------------------------------------------------------------

create or replace function expire_overdue_reservations(p_grace_minutes int default 45)
returns setof bookings
language plpgsql
security definer
as $$
declare
  v_row bookings;
begin
  for v_row in
    select * from bookings
    where status = 'reserved'
      and expected_dropoff_time + (p_grace_minutes || ' minutes')::interval < now()
  loop
    update bookings set status = 'cancelled' where id = v_row.id;
    perform free_bay_and_bump(v_row.bay_id);
    return next v_row;
  end loop;
  return;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: anon (the public, unauthenticated role Supabase uses for the
-- browser client) may read tables directly and call the functions above.
-- ---------------------------------------------------------------------------

grant select on bays, bookings, waitlist, room_settings to anon;
grant execute on function
  reserve_bay(smallint,text,text,text,int,text,timestamptz,text),
  cancel_reservation(uuid),
  check_in(uuid,int),
  surrender_bay(uuid),
  join_waitlist(text,text,text,int,text),
  expire_overdue_reservations(int)
  to anon;

-- ---------------------------------------------------------------------------
-- Realtime: expose these tables on the "supabase_realtime" publication so
-- the frontend's live subscriptions get instant updates across devices.
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table bays;
alter publication supabase_realtime add table bookings;
alter publication supabase_realtime add table waitlist;
alter publication supabase_realtime add table room_settings;

-- ---------------------------------------------------------------------------
-- Optional: toggle cooling off/on to test the emergency banner, e.g.
-- update room_settings set cooling_status = 'off' where id = 1;
-- ---------------------------------------------------------------------------
