import React from 'react';
import BayCard from './BayCard.jsx';
import { t } from '../i18n.js';

export default function FloorMap({ bays, bookingsByBay, lang, deviceId, onOpenBay }) {
  const sorted = [...bays].sort((a, b) => a.id - b.id);
  const firstSix = sorted.slice(0, 6);
  const lastSix = sorted.slice(6, 12);

  return (
    <div className="screen">
      <div className="section-title">🗺️ {t('floorMap', lang)} (12 {t('bay', lang)})</div>
      <div className="bay-grid">
        {firstSix.map((bay) => (
          <BayCard
            key={bay.id}
            bay={bay}
            booking={bookingsByBay[bay.id]}
            lang={lang}
            deviceId={deviceId}
            onOpen={onOpenBay}
          />
        ))}
        <div className="aisle-divider">— {t('aisleDivider', lang)} —</div>
        {lastSix.map((bay) => (
          <BayCard
            key={bay.id}
            bay={bay}
            booking={bookingsByBay[bay.id]}
            lang={lang}
            deviceId={deviceId}
            onOpen={onOpenBay}
          />
        ))}
      </div>
    </div>
  );
}
