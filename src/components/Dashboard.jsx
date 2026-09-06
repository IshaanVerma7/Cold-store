import React from 'react';
import { t, fruitLabel, FRUITS } from '../i18n.js';

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export default function Dashboard({ bays, bookings, waitlist, lang }) {
  const occupiedBays = bays.filter((b) => b.status === 'occupied');
  const reservedBays = bays.filter((b) => b.status === 'reserved');
  const availableBays = bays.filter((b) => b.status === 'available');
  const occupancyPct = Math.round((occupiedBays.length / bays.length) * 100);

  const occupiedBookings = bookings.filter((b) => b.status === 'occupied');
  const totalCrates = occupiedBookings.reduce((s, b) => s + (b.crate_count || 0), 0);

  const cratesInToday = bookings
    .filter((b) => isToday(b.checked_in_at))
    .reduce((s, b) => s + (b.crate_count || 0), 0);
  const cratesOutToday = bookings
    .filter((b) => b.status === 'completed' && isToday(b.completed_at))
    .reduce((s, b) => s + (b.crate_count || 0), 0);

  const now = new Date();
  const risk = { high: [], moderate: [], safe: [] };
  occupiedBookings.forEach((b) => {
    if (!b.expected_pickup_time) return risk.safe.push(b);
    const pickup = new Date(b.expected_pickup_time);
    const hoursLeft = (pickup - now) / 36e5;
    if (hoursLeft < 0) risk.high.push(b);
    else if (hoursLeft < 24) risk.moderate.push(b);
    else risk.safe.push(b);
  });

  const fruitTotals = FRUITS.map((f) => ({
    ...f,
    crates: occupiedBookings.filter((b) => b.fruit_type === f.key).reduce((s, b) => s + b.crate_count, 0)
  })).filter((f) => f.crates > 0);
  const maxFruit = Math.max(1, ...fruitTotals.map((f) => f.crates));

  const waitingCount = waitlist.filter((w) => !w.fulfilled).length;

  return (
    <div className="screen">
      <div className="section-title">📊 {t('dailySummary', lang)}</div>

      <div className="dash-card">
        <div className="dash-big-number">{occupancyPct}%</div>
        <div className="dash-sub">
          {t('occupancyRate', lang)} · {occupiedBays.length}/{bays.length} {t('bay', lang)}
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${occupancyPct}%` }} />
        </div>
        <div className="three-up">
          <div className="box pill-occupied">
            <div className="n">{occupiedBays.length}</div>
            <div className="l">{t('occupied', lang)}</div>
          </div>
          <div className="box pill-reserved">
            <div className="n">{reservedBays.length}</div>
            <div className="l">{t('reserved', lang)}</div>
          </div>
          <div className="box pill-available">
            <div className="n">{availableBays.length}</div>
            <div className="l">{t('available', lang)}</div>
          </div>
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-sub" style={{ marginBottom: 8 }}>{t('totalCrates', lang)}</div>
        <div className="dash-big-number">{totalCrates}</div>
        <div className="three-up" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="box pill-available">
            <div className="n">{cratesInToday}</div>
            <div className="l">{t('cratesIn', lang)}</div>
          </div>
          <div className="box pill-waiting">
            <div className="n">{cratesOutToday}</div>
            <div className="l">{t('cratesOut', lang)}</div>
          </div>
        </div>
      </div>

      {fruitTotals.length > 0 && (
        <div className="dash-card">
          <div className="dash-sub" style={{ marginBottom: 10 }}>🧺 {t('crates', lang)}</div>
          {fruitTotals.map((f) => (
            <div className="fruit-bar-row" key={f.key}>
              <span style={{ width: 90 }}>{fruitLabel(f.key, lang)}</span>
              <div className="fruit-bar-track">
                <div className="fruit-bar-fill" style={{ width: `${(f.crates / maxFruit) * 100}%` }} />
              </div>
              <span>{f.crates}</span>
            </div>
          ))}
        </div>
      )}

      <div className="dash-card">
        <div className="dash-sub" style={{ marginBottom: 8 }}>{t('waiting', lang)}</div>
        <div className="dash-big-number">{waitingCount}</div>
      </div>

      <div className="section-title">⚠️ {t('overdueWarnings', lang)}</div>
      <div className="three-up" style={{ marginBottom: 12 }}>
        <div className="box pill-occupied"><div className="n">{risk.high.length}</div><div className="l">High Risk</div></div>
        <div className="box pill-reserved"><div className="n">{risk.moderate.length}</div><div className="l">Moderate</div></div>
        <div className="box pill-available"><div className="n">{risk.safe.length}</div><div className="l">Safe</div></div>
      </div>

      {risk.high.length === 0 && risk.moderate.length === 0 ? (
        <div className="empty-state">{t('noWarnings', lang)}</div>
      ) : (
        [...risk.high, ...risk.moderate].map((b) => (
          <div className="warning-card" key={b.id}>
            <div className="warning-card-title">
              {t('bay', lang)} #{b.bay_id} · {fruitLabel(b.fruit_type, lang)} — {t('overdue', lang)}
            </div>
            <div className="warning-card-sub">
              {b.farmer_name} · {b.crate_count} {t('crates', lang)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
