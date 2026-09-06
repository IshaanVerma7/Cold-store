import React, { useState } from 'react';
import { t, fruitLabel, FRUITS } from '../i18n.js';

export default function CheckInTab({ bookings, waitlist, deviceId, lang, onOpenBooking, onAction, allBaysFull }) {
  const active = bookings.filter((b) => b.status === 'reserved' || b.status === 'occupied');
  const mine = active.filter((b) => b.device_id === deviceId);
  const [query, setQuery] = useState('');
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);

  const searchResults = query.trim()
    ? active.filter((b) => b.farmer_name.toLowerCase().includes(query.trim().toLowerCase()))
    : [];

  const openWaitlist = [...waitlist].filter((w) => !w.fulfilled).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const myWaitlist = openWaitlist.filter((w) => w.device_id === deviceId);
  const myWaitlistPosition = myWaitlist.length > 0 ? openWaitlist.findIndex((w) => w.id === myWaitlist[0].id) + 1 : null;

  return (
    <div className="screen">
      <div className="section-title">📋 {t('checkInReserve', lang)}</div>

      {mine.length > 0 ? (
        <>
          <div className="section-title" style={{ marginTop: 0 }}>
            🙋 {mine.length > 1 ? t('yourBookings', lang) : t('yourBooking', lang)}
          </div>
          {mine.map((b) => (
            <BookingRow key={b.id} booking={b} lang={lang} onOpen={onOpenBooking} />
          ))}
        </>
      ) : (
        <>
          <div className="empty-state">{t('noBookingFound', lang)}</div>
          <div className="section-title">🔎 {t('findMyBay', lang)}</div>
          <input
            className="text-field"
            placeholder={t('searchByName', lang)}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {searchResults.map((b) => (
            <BookingRow key={b.id} booking={b} lang={lang} onOpen={onOpenBooking} />
          ))}
        </>
      )}

      {myWaitlist.length > 0 && (
        <div className="booking-row" style={{ borderColor: 'var(--orange)' }}>
          <div className="booking-row-top">
            <span className="booking-row-name">⏳ {t('waitlistJoined', lang)}</span>
            <span className="sheet-badge pill-waiting">#{myWaitlistPosition}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
            {fruitLabel(myWaitlist[0].fruit_type, lang)} · {myWaitlist[0].crate_count} {t('crates', lang)}
          </div>
        </div>
      )}

      {allBaysFull && myWaitlist.length === 0 && (
        <>
          <div className="warning-card">
            <div className="warning-card-title">{t('roomFull', lang)}</div>
          </div>
          {!showWaitlistForm ? (
            <button className="primary-btn" onClick={() => setShowWaitlistForm(true)}>
              {t('waitlistJoin', lang)}
            </button>
          ) : (
            <WaitlistForm lang={lang} deviceId={deviceId} onAction={onAction} onDone={() => setShowWaitlistForm(false)} />
          )}
        </>
      )}
    </div>
  );
}

function BookingRow({ booking, lang, onOpen }) {
  return (
    <div className="booking-row" onClick={() => onOpen(booking)}>
      <div className="booking-row-top">
        <span className="booking-row-name">
          {t('bay', lang)} #{booking.bay_id} · {fruitLabel(booking.fruit_type, lang)}
        </span>
        <span className={`sheet-badge ${booking.status === 'occupied' ? 'pill-occupied' : 'pill-reserved'}`}>
          {t(booking.status, lang)}
        </span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
        {booking.farmer_name} · {booking.crate_count} {t('crates', lang)}
      </div>
    </div>
  );
}

function WaitlistForm({ lang, deviceId, onAction, onDone }) {
  const [name, setName] = useState('');
  const [fruit, setFruit] = useState(null);
  const [crates, setCrates] = useState(20);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    await onAction('joinWaitlist', {
      farmerName: name || 'Farmer',
      fruitType: fruit || 'mango',
      crateCount: crates,
      deviceId
    });
    setBusy(false);
    onDone();
  }

  return (
    <div className="dash-card">
      <input className="text-field" placeholder={t('yourName', lang)} value={name} onChange={(e) => setName(e.target.value)} />
      <div className="choice-grid">
        {FRUITS.map((f) => (
          <button
            key={f.key}
            className={`choice-btn ${fruit === f.key ? 'selected' : ''}`}
            onClick={() => setFruit(f.key)}
          >
            <span className="choice-emoji">{f.icon}</span>
            {lang === 'hi' ? f.hi : f.en}
          </button>
        ))}
      </div>
      <div className="stepper">
        <button onClick={() => setCrates((c) => Math.max(1, c - 5))}>−</button>
        <div className="stepper-value">{crates}</div>
        <button onClick={() => setCrates((c) => c + 5)}>+</button>
      </div>
      <button className="primary-btn" disabled={busy || !fruit} onClick={submit}>
        {busy ? '…' : t('submit', lang)}
      </button>
    </div>
  );
}
