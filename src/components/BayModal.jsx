import React, { useState } from 'react';
import { t, fruitLabel, FRUITS, DROPOFF_SLOTS } from '../i18n.js';
import { speak } from '../speak.js';

const STATUS_CLASS = { available: 'pill-available', reserved: 'pill-reserved', occupied: 'pill-occupied' };

function dropoffToDate(slotKey) {
  const now = new Date();
  const d = new Date(now);
  if (slotKey === 'now') return now;
  if (slotKey === '4pm') { d.setHours(16, 0, 0, 0); if (d < now) d.setDate(d.getDate() + 1); return d; }
  if (slotKey === '6pm') { d.setHours(18, 0, 0, 0); if (d < now) d.setDate(d.getDate() + 1); return d; }
  if (slotKey === 'tomorrow_am') { d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d; }
  return now;
}

// Splits an ISO datetime into separate yyyy-mm-dd and HH:mm strings for the
// two plain <input type="date"> / <input type="time"> fields.
function isoToDateAndTime(iso) {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`
  };
}

const todayStr = (() => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
})();

export default function BayModal({ bay, booking, lang, deviceId, restricted, onClose, onAction }) {
  const [step, setStep] = useState(bay.status === 'available' ? 'fruit' : 'view');
  const [isEditing, setIsEditing] = useState(false);
  const [fruit, setFruit] = useState(null);
  const [slot, setSlot] = useState(null);
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [crates, setCrates] = useState(20);
  const [pickupDays, setPickupDays] = useState(3);
  const [checkedInResult, setCheckedInResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function startEdit() {
    if (!booking) return;
    setIsEditing(true);
    setFruit(booking.fruit_type);
    setName(booking.farmer_name);
    setPhone(booking.farmer_phone || '');
    setCrates(booking.crate_count);
    if (booking.dropoff_slot && booking.dropoff_slot !== 'custom' && DROPOFF_SLOTS.some((s) => s.key === booking.dropoff_slot)) {
      setSlot(booking.dropoff_slot);
    } else {
      const { date, time } = isoToDateAndTime(booking.expected_dropoff_time);
      setCustomDate(date);
      setCustomTime(time);
      setSlot('custom');
    }
    setStep('fruit');
  }

  function computeExpectedDropoff() {
    if (slot === 'custom') return new Date(`${customDate}T${customTime}`).toISOString();
    return dropoffToDate(slot).toISOString();
  }

  async function submitReserve() {
    setBusy(true);
    setError(null);
    const payload = {
      farmerName: name || 'Farmer',
      farmerPhone: phone,
      fruitType: fruit,
      crateCount: crates,
      dropoffSlot: slot,
      expectedDropoffTime: computeExpectedDropoff()
    };
    const res = isEditing
      ? await onAction('editReservation', { bookingId: booking.id, ...payload })
      : await onAction('reserve', { bayId: bay.id, ...payload, deviceId });
    setBusy(false);
    if (res.error) setError(res.error);
    else onClose();
  }

  async function submitCheckIn() {
    setBusy(true);
    setError(null);
    const res = await onAction('checkIn', { bookingId: booking.id, pickupDays });
    setBusy(false);
    if (res.error) setError(res.error);
    else {
      setCheckedInResult(res.data);
      setStep('checkedIn');
      speak(res.data.claim_code.split('').join(' '), lang);
    }
  }

  async function submitCancel() {
    setBusy(true);
    const res = await onAction('cancel', { bookingId: booking.id });
    setBusy(false);
    if (!res.error) onClose();
    else setError(res.error);
  }

  async function submitSurrender() {
    setBusy(true);
    const res = await onAction('surrender', { bookingId: booking.id });
    setBusy(false);
    if (!res.error) onClose();
    else setError(res.error);
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <div>
            <div className="sheet-title">
              {t('bay', lang)} #{bay.id}
            </div>
            <span className={`sheet-badge ${STATUS_CLASS[bay.status]}`}>{t(bay.status, lang)}</span>
          </div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        {error && (
          <div className="warning-card">
            <div className="warning-card-title">
              {error === 'BAY_UNAVAILABLE'
                ? lang === 'hi' ? 'यह बे अभी-अभी बुक हो गया' : 'This bay was just booked'
                : lang === 'hi' ? 'कुछ गलत हुआ, फिर कोशिश करें' : 'Something went wrong, try again'}
            </div>
          </div>
        )}

        {/* ---------------- reservation flow (new OR editing an existing one) ---------------- */}
        {(bay.status === 'available' || isEditing) && step === 'fruit' && (
          <>
            <div className="section-title">{t('pickHarvest', lang)}</div>
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
            <button className="primary-btn" disabled={!fruit} onClick={() => setStep('dropoff')}>
              {t('confirm', lang)}
            </button>
            {isEditing && (
              <button className="secondary-btn" onClick={() => { setIsEditing(false); setStep('view'); }}>
                {t('back', lang)}
              </button>
            )}
          </>
        )}

        {(bay.status === 'available' || isEditing) && step === 'dropoff' && (
          <>
            <div className="section-title">{t('pickDropoff', lang)}</div>
            <div className="slot-list">
              {DROPOFF_SLOTS.map((s) => (
                <button
                  key={s.key}
                  className={`slot-btn ${slot === s.key ? 'selected' : ''}`}
                  onClick={() => { setSlot(s.key); setShowCustomTime(false); }}
                >
                  {lang === 'hi' ? s.hi : s.en}
                </button>
              ))}
              <button
                className={`slot-btn ${slot === 'custom' ? 'selected' : ''}`}
                onClick={() => setShowCustomTime(true)}
              >
                📅 {t('pickExactTime', lang)}
              </button>
            </div>

            {showCustomTime && (
              <>
                <div className="field-label">{t('selectDate', lang)}</div>
                <input
                  className="text-field"
                  type="date"
                  value={customDate}
                  min={todayStr}
                  onChange={(e) => setCustomDate(e.target.value)}
                />
                <div className="field-label">{t('selectTime', lang)}</div>
                <input
                  className="text-field"
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                />
                <button
                  className="secondary-btn"
                  disabled={!customDate || !customTime}
                  onClick={() => { setSlot('custom'); setShowCustomTime(false); }}
                >
                  {t('useThisTime', lang)}
                </button>
              </>
            )}

            {slot === 'custom' && customDate && customTime && !showCustomTime && (
              <div className="info-row">
                <span className="label">{t('dropoffBy', lang)}</span>
                <span className="value">{new Date(`${customDate}T${customTime}`).toLocaleString()}</span>
              </div>
            )}

            <button className="primary-btn" disabled={!slot} onClick={() => setStep('details')}>
              {t('confirm', lang)}
            </button>
            <button className="secondary-btn" onClick={() => setStep('fruit')}>
              {t('back', lang)}
            </button>
          </>
        )}

        {(bay.status === 'available' || isEditing) && step === 'details' && (
          <>
            <div className="section-title">{t('yourName', lang)}</div>
            <input
              className="text-field"
              placeholder={t('yourName', lang)}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="text-field"
              placeholder={t('phoneOptional', lang)}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <div className="section-title">{t('crateCount', lang)}</div>
            <div className="stepper">
              <button onClick={() => setCrates((c) => Math.max(1, c - 5))}>−</button>
              <div className="stepper-value">{crates}</div>
              <button onClick={() => setCrates((c) => c + 5)}>+</button>
            </div>
            <button className="primary-btn" disabled={busy} onClick={submitReserve}>
              {busy ? '…' : isEditing ? t('saveChanges', lang) : t('reserveBay', lang)}
            </button>
            <button className="secondary-btn" onClick={() => setStep('dropoff')}>
              {t('back', lang)}
            </button>
          </>
        )}

        {/* ---------------- RESTRICTED: someone else's bay, tapped from the public floor map ---------------- */}
        {restricted && (bay.status === 'reserved' || bay.status === 'occupied') && booking && (
          <>
            <div
              className="big-status-box"
              style={{ background: bay.status === 'occupied' ? 'var(--red-bg)' : 'var(--orange-bg)' }}
            >
              <div className="big-emoji">🔒</div>
              <div style={{ fontWeight: 800, marginTop: 6 }}>{fruitLabel(booking.fruit_type, lang)}</div>
            </div>
            <div className="info-row">
              <span className="label">{t('crates', lang)}</span>
              <span className="value">{booking.crate_count}</span>
            </div>
            <div className="empty-state" style={{ padding: '16px 4px' }}>
              🔒 {t('detailsPrivate', lang)}
            </div>
          </>
        )}

        {/* ---------------- RESERVED: check-in, edit, or cancel ---------------- */}
        {!restricted && bay.status === 'reserved' && step === 'view' && booking && (
          <>
            <div className="big-status-box" style={{ background: 'var(--orange-bg)' }}>
              <div className="big-emoji">{fruitEmoji(booking.fruit_type)}</div>
              <div style={{ fontWeight: 800, marginTop: 6 }}>{fruitLabel(booking.fruit_type, lang)}</div>
            </div>
            <div className="info-row">
              <span className="label">{t('farmer', lang)}</span>
              <span className="value">{booking.farmer_name}</span>
            </div>
            <div className="info-row">
              <span className="label">{t('crates', lang)}</span>
              <span className="value">{booking.crate_count}</span>
            </div>
            <div className="info-row">
              <span className="label">{t('dropoffBy', lang)}</span>
              <span className="value">{new Date(booking.expected_dropoff_time).toLocaleString()}</span>
            </div>
            <div style={{ height: 14 }} />
            <button className="primary-btn" onClick={() => setStep('pickupDays')}>
              ⚡ {t('checkIn', lang)}
            </button>
            <button className="secondary-btn" onClick={startEdit}>
              ✏️ {t('editReservation', lang)}
            </button>
            <button className="danger-btn" disabled={busy} onClick={submitCancel}>
              {busy ? '…' : t('cancelReservation', lang)}
            </button>
          </>
        )}

        {bay.status === 'reserved' && step === 'pickupDays' && (
          <>
            <div className="section-title">
              {lang === 'hi' ? 'कितने दिन रखेंगे?' : 'How many days will it stay?'}
            </div>
            <div className="choice-grid">
              {[1, 2, 3].map((d) => (
                <button
                  key={d}
                  className={`choice-btn ${pickupDays === d ? 'selected' : ''}`}
                  onClick={() => setPickupDays(d)}
                >
                  {d} {lang === 'hi' ? 'दिन' : d === 1 ? 'day' : 'days'}
                </button>
              ))}
            </div>
            <button className="primary-btn" disabled={busy} onClick={submitCheckIn}>
              {busy ? '…' : t('confirm', lang)}
            </button>
            <button className="secondary-btn" onClick={() => setStep('view')}>
              {t('back', lang)}
            </button>
          </>
        )}

        {step === 'checkedIn' && checkedInResult && (
          <>
            <div style={{ textAlign: 'center', fontSize: 40 }}>✅</div>
            <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 18, marginBottom: 4 }}>
              {t('checkInSuccess', lang)}
            </div>
            <div style={{ textAlign: 'center', color: 'var(--text-2)', fontWeight: 700, marginBottom: 6 }}>
              {t('claimCode', lang)}
            </div>
            <div className="claim-code-row">
              {checkedInResult.claim_code.split('').map((d, i) => (
                <div className="claim-digit" key={i}>{d}</div>
              ))}
            </div>
            <button
              className="secondary-btn"
              onClick={() => speak(checkedInResult.claim_code.split('').join(' '), lang)}
            >
              🔊 {t('listenCode', lang)}
            </button>
            <div className="info-row">
              <span className="label">{t('assignedBay', lang)}</span>
              <span className="value">#{bay.id}</span>
            </div>
            <div className="info-row">
              <span className="label">{t('farmer', lang)}</span>
              <span className="value">{checkedInResult.farmer_name}</span>
            </div>
            <button className="primary-btn" onClick={onClose}>
              {t('done', lang)}
            </button>
          </>
        )}

        {/* ---------------- OCCUPIED: show code + surrender ---------------- */}
        {!restricted && bay.status === 'occupied' && step === 'view' && booking && (
          <>
            <div className="big-status-box" style={{ background: 'var(--red-bg)' }}>
              <div className="big-emoji">{fruitEmoji(booking.fruit_type)}</div>
              <div style={{ fontWeight: 800, marginTop: 6 }}>
                {fruitLabel(booking.fruit_type, lang)} · {booking.crate_count} {t('crates', lang)}
              </div>
            </div>
            <div className="info-row">
              <span className="label">{t('farmer', lang)}</span>
              <span className="value">{booking.farmer_name}</span>
            </div>
            <div className="info-row">
              <span className="label">{t('storedSince', lang)}</span>
              <span className="value">{new Date(booking.checked_in_at).toLocaleDateString()}</span>
            </div>
            <div className="info-row">
              <span className="label">{t('expectedPickup', lang)}</span>
              <span className="value">
                {booking.expected_pickup_time ? new Date(booking.expected_pickup_time).toLocaleDateString() : '—'}
              </span>
            </div>
            {booking.claim_code && (
              <>
                <div style={{ textAlign: 'center', marginTop: 14, marginBottom: 6, fontWeight: 700, color: 'var(--text-2)' }}>
                  {t('claimCode', lang)}
                </div>
                <div className="claim-code-row">
                  {booking.claim_code.split('').map((d, i) => (
                    <div className="claim-digit" key={i}>{d}</div>
                  ))}
                </div>
              </>
            )}
            <button className="danger-btn" disabled={busy} onClick={submitSurrender}>
              {busy ? '…' : t('surrenderVacate', lang)}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function fruitEmoji(key) {
  const map = { mango: '🥭', tomato: '🍅', banana: '🍌', papaya: '🍈', grape: '🍇' };
  return map[key] || '📦';
}
