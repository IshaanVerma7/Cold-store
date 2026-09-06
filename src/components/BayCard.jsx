import React from 'react';
import { t, fruitName } from '../i18n.js';
import { speak } from '../speak.js';

export default function BayCard({ bay, booking, lang, onOpen }) {
  const isOverdue =
    booking &&
    booking.status === 'occupied' &&
    booking.expected_pickup_time &&
    new Date(booking.expected_pickup_time) < new Date();

  const isLocked = bay.status === 'reserved' || bay.status === 'occupied';

  function announce(e) {
    e.stopPropagation();
    const statusWord = t(bay.status, lang);
    let line = `${t('bay', lang)} ${bay.id}. ${statusWord}.`;
    if (booking) {
      line += ` ${fruitName(booking.fruit_type, lang)}. ${t('farmer', lang)}: ${booking.farmer_name}.`;
    }
    speak(line, lang);
  }

  return (
    <button
      className={`bay-card status-${bay.status} ${isOverdue ? 'overdue' : ''}`}
      onClick={() => onOpen(bay)}
    >
      {isLocked && <span className="bay-lock-badge" aria-label="locked">🔒</span>}
      <div className="bay-number">
        {t('bay', lang)} {bay.id}{' '}
        <span onClick={announce} role="img" aria-label="speak">
          🔊
        </span>
      </div>
      {bay.status === 'available' ? (
        <>
          <div className="bay-emoji">🟢</div>
          <div className="bay-fruit-label">{t('available', lang)}</div>
        </>
      ) : (
        <>
          <div className="bay-emoji">{fruitEmoji(booking?.fruit_type)}</div>
          <div className="bay-fruit-label">{fruitName(booking?.fruit_type, lang)}</div>
        </>
      )}
      {booking && (
        <div className="bay-sub">
          {booking.crate_count} {t('crates', lang)}
        </div>
      )}
    </button>
  );
}

function fruitEmoji(key) {
  const map = { mango: '🥭', tomato: '🍅', banana: '🍌', papaya: '🍈', grape: '🍇' };
  return map[key] || '📦';
}
