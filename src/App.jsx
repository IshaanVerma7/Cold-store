import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase, getDeviceId } from './supabaseClient.js';
import { t, fruitLabel } from './i18n.js';
import Header from './components/Header.jsx';
import FloorMap from './components/FloorMap.jsx';
import BottomNav from './components/BottomNav.jsx';
import BayModal from './components/BayModal.jsx';
import CheckInTab from './components/CheckInTab.jsx';
import Dashboard from './components/Dashboard.jsx';

const EXPIRE_POLL_MS = 30000; // (D) late drop-off auto-cancel client-side fallback

export default function App() {
  const [lang, setLangState] = useState(localStorage.getItem('cold_store_lang') || 'en');
  const [tab, setTab] = useState('floor');
  const [bays, setBays] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [room, setRoom] = useState({ cooling_status: 'on', temperature: 4, humidity: 90 });
  const [selectedBayId, setSelectedBayId] = useState(null);
  const [modalSource, setModalSource] = useState('floor'); // 'floor' | 'checkin'
  const [bumpAlert, setBumpAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const deviceId = useMemo(() => getDeviceId(), []);

  function setLang(l) {
    setLangState(l);
    localStorage.setItem('cold_store_lang', l);
  }

  // ---------------- initial load ----------------
  useEffect(() => {
    async function load() {
      const [b, bk, wl, rs] = await Promise.all([
        supabase.from('bays').select('*'),
        supabase.from('bookings').select('*').in('status', ['reserved', 'occupied', 'completed', 'cancelled']).order('created_at', { ascending: false }).limit(300),
        supabase.from('waitlist').select('*'),
        supabase.from('room_settings').select('*').eq('id', 1).single()
      ]);
      if (b.data) setBays(b.data);
      if (bk.data) setBookings(bk.data);
      if (wl.data) setWaitlist(wl.data);
      if (rs.data) setRoom(rs.data);
      setLoading(false);
    }
    load();
  }, []);

  // ---------------- realtime subscriptions ----------------
  useEffect(() => {
    const channel = supabase
      .channel('cold-store-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bays' }, (payload) => {
        setBays((prev) => upsertById(prev, payload));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
        setBookings((prev) => upsertById(prev, payload));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waitlist' }, (payload) => {
        setWaitlist((prev) => upsertById(prev, payload));
        // Detect a bump: a waitlist row just flipped fulfilled=false -> true.
        if (payload.eventType === 'UPDATE' && payload.new.fulfilled && !payload.old.fulfilled) {
          announceBump(payload.new);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_settings' }, (payload) => {
        if (payload.new) setRoom(payload.new);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function announceBump(waitlistRow) {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('device_id', waitlistRow.device_id)
      .eq('status', 'reserved')
      .order('created_at', { ascending: false })
      .limit(1);
    const booking = data && data[0];
    setBumpAlert({
      farmerName: waitlistRow.farmer_name,
      bayId: booking ? booking.bay_id : null
    });
  }

  // ---------------- (D) late drop-off auto-cancel: client-side poll ----------------
  useEffect(() => {
    const id = setInterval(() => {
      supabase.rpc('expire_overdue_reservations').then(() => {});
    }, EXPIRE_POLL_MS);
    return () => clearInterval(id);
  }, []);

  const bookingsByBay = useMemo(() => {
    const map = {};
    bookings.forEach((b) => {
      if (b.status === 'reserved' || b.status === 'occupied') map[b.bay_id] = b;
    });
    return map;
  }, [bookings]);

  const selectedBay = bays.find((b) => b.id === selectedBayId);
  const selectedBooking = selectedBay ? bookingsByBay[selectedBay.id] : null;

  const handleAction = useCallback(async (type, args) => {
    try {
      if (type === 'reserve') {
        const { data, error } = await supabase.rpc('reserve_bay', {
          p_bay_id: args.bayId,
          p_farmer_name: args.farmerName,
          p_farmer_phone: args.farmerPhone || null,
          p_fruit_type: args.fruitType,
          p_crate_count: args.crateCount,
          p_dropoff_slot: args.dropoffSlot,
          p_expected_dropoff_time: args.expectedDropoffTime,
          p_device_id: args.deviceId
        });
        if (error) return { error: error.message.includes('BAY_UNAVAILABLE') ? 'BAY_UNAVAILABLE' : error.message };
        setBookings((prev) => [data, ...prev]);
        setBays((prev) => prev.map((b) => (b.id === args.bayId ? { ...b, status: 'reserved' } : b)));
        return { data };
      }
      if (type === 'cancel') {
        const { error } = await supabase.rpc('cancel_reservation', { p_booking_id: args.bookingId });
        if (error) return { error: error.message };
        return { data: true };
      }
      if (type === 'editReservation') {
        const { data, error } = await supabase.rpc('update_reservation', {
          p_booking_id: args.bookingId,
          p_farmer_name: args.farmerName,
          p_farmer_phone: args.farmerPhone || null,
          p_fruit_type: args.fruitType,
          p_crate_count: args.crateCount,
          p_dropoff_slot: args.dropoffSlot,
          p_expected_dropoff_time: args.expectedDropoffTime
        });
        if (error) return { error: error.message };
        setBookings((prev) => prev.map((b) => (b.id === data.id ? data : b)));
        return { data };
      }
      if (type === 'checkIn') {
        const { data, error } = await supabase.rpc('check_in', {
          p_booking_id: args.bookingId,
          p_pickup_days: args.pickupDays
        });
        if (error) return { error: error.message };
        setBookings((prev) => prev.map((b) => (b.id === data.id ? data : b)));
        return { data };
      }
      if (type === 'surrender') {
        const { error } = await supabase.rpc('surrender_bay', { p_booking_id: args.bookingId });
        if (error) return { error: error.message };
        return { data: true };
      }
      if (type === 'joinWaitlist') {
        const { data, error } = await supabase.rpc('join_waitlist', {
          p_farmer_name: args.farmerName,
          p_farmer_phone: args.farmerPhone || null,
          p_fruit_type: args.fruitType,
          p_crate_count: args.crateCount,
          p_device_id: args.deviceId
        });
        if (error) return { error: error.message };
        setWaitlist((prev) => [...prev, data]);
        return { data };
      }
    } catch (e) {
      return { error: String(e) };
    }
    return { error: 'UNKNOWN_ACTION' };
  }, []);

  const allBaysFull = bays.length > 0 && bays.every((b) => b.status !== 'available');
  const waitingCount = waitlist.filter((w) => !w.fulfilled).length;

  if (loading) {
    return (
      <div className="screen" style={{ textAlign: 'center', paddingTop: 80, fontWeight: 700, color: 'var(--text-2)' }}>
        Loading Cold Store…
      </div>
    );
  }

  return (
    <>
      <Header lang={lang} setLang={setLang} bays={bays} waiting={waitingCount} room={room} />

      {bumpAlert && (
        <div className="alert-banner">
          <span>🔔</span>
          <span>
            <strong>{t('autoBumpTitle', lang)}</strong> {bumpAlert.farmerName}
            {bumpAlert.bayId ? ` → ${t('bay', lang)} #${bumpAlert.bayId}` : ''}
          </span>
          <button className="alert-close" onClick={() => setBumpAlert(null)}>✕</button>
        </div>
      )}

      {tab === 'floor' && (
        <FloorMap
          bays={bays}
          bookingsByBay={bookingsByBay}
          lang={lang}
          deviceId={deviceId}
          onOpenBay={(bay) => { setModalSource('floor'); setSelectedBayId(bay.id); }}
        />
      )}
      {tab === 'checkin' && (
        <CheckInTab
          bookings={bookings}
          waitlist={waitlist}
          deviceId={deviceId}
          lang={lang}
          allBaysFull={allBaysFull}
          onAction={handleAction}
          onOpenBooking={(booking) => { setModalSource('checkin'); setSelectedBayId(booking.bay_id); }}
        />
      )}
      {tab === 'dashboard' && <Dashboard bays={bays} bookings={bookings} waitlist={waitlist} lang={lang} />}

      <BottomNav active={tab} setActive={setTab} lang={lang} />

      {selectedBay && (
        <BayModal
          bay={selectedBay}
          booking={selectedBooking}
          lang={lang}
          deviceId={deviceId}
          restricted={
            modalSource === 'floor' &&
            selectedBooking &&
            selectedBooking.device_id !== deviceId
          }
          onClose={() => setSelectedBayId(null)}
          onAction={handleAction}
        />
      )}
    </>
  );
}

function upsertById(list, payload) {
  if (payload.eventType === 'INSERT') {
    if (list.some((x) => x.id === payload.new.id)) return list;
    return [payload.new, ...list];
  }
  if (payload.eventType === 'UPDATE') {
    return list.map((x) => (x.id === payload.new.id ? payload.new : x));
  }
  if (payload.eventType === 'DELETE') {
    return list.filter((x) => x.id !== payload.old.id);
  }
  return list;
}
