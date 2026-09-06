import React from 'react';
import { t } from '../i18n.js';
import { speak } from '../speak.js';

export default function Header({ lang, setLang, bays, waiting, room }) {
  const available = bays.filter((b) => b.status === 'available').length;
  const reserved = bays.filter((b) => b.status === 'reserved').length;
  const occupied = bays.filter((b) => b.status === 'occupied').length;
  const coolingOn = room.cooling_status === 'on';

  function announce() {
    const statusLine = coolingOn
      ? `${t('coolingOn', lang)}. ${available} ${t('available', lang)}. ${reserved} ${t(
          'reserved',
          lang
        )}. ${occupied} ${t('occupied', lang)}.`
      : `${t('coolingOff', lang)}! ${t('coolingOff', lang)}!`;
    const line = coolingOn ? `${statusLine} ${t('tapGreenToReserve', lang)}` : statusLine;
    speak(line, lang);
  }

  return (
    <header className="app-header">
      <div className="app-header-top">
        <div>
          <div className="app-eyebrow">{t('appLabel', lang)}</div>
          <div className="app-title">{t('roomTitle', lang)}</div>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={announce} aria-label="speak status">
            🔊
          </button>
          <div className="lang-toggle">
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
              EN
            </button>
            <button className={lang === 'hi' ? 'active' : ''} onClick={() => setLang('hi')}>
              हिंदी
            </button>
          </div>
        </div>
      </div>

      <div className="room-meta">
        <span>
          🌡️ {t('temperature', lang)}: {room.temperature}°C
        </span>
        <span>
          💧 {t('humidity', lang)}: {room.humidity}%
        </span>
      </div>

      <div className={coolingOn ? 'cooling-pill cooling-on' : 'cooling-pill cooling-off'}>
        {coolingOn ? '🟢' : '⚠️'} {coolingOn ? t('coolingOn', lang) : t('coolingOff', lang)}
      </div>

      <div className="stat-pills">
        <div className="stat-pill pill-available">
          {available} {t('available', lang)}
        </div>
        <div className="stat-pill pill-reserved">
          {reserved} {t('reserved', lang)}
        </div>
        <div className="stat-pill pill-occupied">
          {occupied} {t('occupied', lang)}
        </div>
        <div className="stat-pill pill-waiting">
          {waiting} {t('waiting', lang)}
        </div>
      </div>
    </header>
  );
}
