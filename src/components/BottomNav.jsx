import React from 'react';
import { t } from '../i18n.js';

const TABS = [
  { key: 'floor', icon: '🗂️', labelKey: 'floorMap' },
  { key: 'checkin', icon: '🔑', labelKey: 'checkInReserve' },
  { key: 'dashboard', icon: '📊', labelKey: 'dailySummary' }
];

export default function BottomNav({ active, setActive, lang }) {
  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <button key={tab.key} className={active === tab.key ? 'active' : ''} onClick={() => setActive(tab.key)}>
          <span className="nav-icon">{tab.icon}</span>
          {t(tab.labelKey, lang)}
        </button>
      ))}
    </nav>
  );
}
