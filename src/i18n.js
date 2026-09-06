// All user-facing strings live here so the EN | हिंदी toggle can switch
// everything instantly with no reload and no network round trip.
export const FRUITS = [
  { key: 'mango', icon: '🥭', en: 'Mango', hi: 'आम' },
  { key: 'tomato', icon: '🍅', en: 'Tomato', hi: 'टमाटर' },
  { key: 'banana', icon: '🍌', en: 'Banana', hi: 'केला' },
  { key: 'papaya', icon: '🍈', en: 'Papaya', hi: 'पपीता' },
  { key: 'grape', icon: '🍇', en: 'Grape', hi: 'अंगूर' }
];

export const DROPOFF_SLOTS = [
  { key: 'now', en: 'Now', hi: 'अभी' },
  { key: '4pm', en: '4 PM', hi: 'शाम 4 बजे' },
  { key: '6pm', en: '6 PM', hi: 'शाम 6 बजे' },
  { key: 'tomorrow_am', en: 'Tomorrow Morning', hi: 'कल सुबह' }
];

export const T = {
  appLabel: { en: 'COLD STORE', hi: 'कोल्ड स्टोर' },
  roomTitle: { en: 'Cold Room #01', hi: 'कोल्ड रूम #01' },
  available: { en: 'Available', hi: 'खाली' },
  reserved: { en: 'Reserved', hi: 'बुक' },
  occupied: { en: 'Occupied', hi: 'उपयोग में' },
  coolingOn: { en: 'Cooling ON', hi: 'ठंडक चालू' },
  coolingOff: { en: 'Cooling OFF', hi: 'ठंडक बंद' },
  waiting: { en: 'Waiting', hi: 'प्रतीक्षा में' },
  confirm: { en: 'Confirm', hi: 'पक्का करें' },
  cancel: { en: 'Cancel', hi: 'रद्द करें' },
  done: { en: 'Done', hi: 'हो गया' },
  bay: { en: 'Bay', hi: 'बे' },
  floorMap: { en: 'Floor Map', hi: 'नक्शा' },
  checkInReserve: { en: 'Check-In & Reserve', hi: 'चेक-इन और बुकिंग' },
  dailySummary: { en: 'Daily Summary', hi: 'दैनिक सारांश' },
  reserveBay: { en: 'Reserve Bay', hi: 'बे बुक करें' },
  checkIn: { en: '1-Tap Check-In', hi: '1-टैप चेक-इन' },
  cancelReservation: { en: 'Cancel Reservation', hi: 'बुकिंग रद्द करें' },
  surrenderVacate: { en: 'Surrender & Vacate Early', hi: 'जल्दी खाली करें' },
  pickHarvest: { en: 'What are you bringing?', hi: 'आप क्या ला रहे हैं?' },
  pickDropoff: { en: 'When will you arrive?', hi: 'आप कब आएँगे?' },
  yourName: { en: 'Your name', hi: 'आपका नाम' },
  crateCount: { en: 'How many crates?', hi: 'कितनी टोकरियाँ?' },
  claimCode: { en: '4-Digit Claim Code', hi: '4-अंकों का कोड' },
  checkInSuccess: { en: 'Check-In Success!', hi: 'चेक-इन सफल!' },
  assignedBay: { en: 'Assigned Bay', hi: 'आपका बे' },
  farmer: { en: 'Farmer', hi: 'किसान' },
  findMyBay: { en: 'Find My Bay', hi: 'मेरा बे खोजें' },
  searchByName: { en: 'Search your name', hi: 'अपना नाम खोजें' },
  noBookingFound: { en: 'No booking found on this phone', hi: 'इस फ़ोन पर कोई बुकिंग नहीं मिली' },
  waitlistJoin: { en: 'Join Waitlist (Room Full)', hi: 'प्रतीक्षा सूची में जुड़ें (रूम भरा है)' },
  waitlistJoined: { en: "You're on the waitlist", hi: 'आप प्रतीक्षा सूची में हैं' },
  autoBumpTitle: { en: 'Auto Waitlist Bump!', hi: 'ऑटो वेटलिस्ट बंप!' },
  occupancyRate: { en: 'Occupancy Rate', hi: 'उपयोग दर' },
  totalCrates: { en: 'Total Crates Today', hi: 'आज कुल टोकरियाँ' },
  cratesIn: { en: 'Crates In', hi: 'टोकरी आई' },
  cratesOut: { en: 'Crates Out', hi: 'टोकरी गई' },
  overdueWarnings: { en: 'Spoilage Risk Warnings', hi: 'खराब होने का खतरा' },
  overdue: { en: 'Overdue', hi: 'समय पार' },
  noWarnings: { en: 'No warnings right now', hi: 'अभी कोई चेतावनी नहीं' },
  expectedPickup: { en: 'Expected pickup', hi: 'वापसी का समय' },
  storedSince: { en: 'Stored since', hi: 'से रखा है' },
  yourBay: { en: 'Your Bay', hi: 'आपका बे' },
  close: { en: 'Close', hi: 'बंद करें' },
  roomFull: { en: 'Room is full — join the waitlist', hi: 'रूम भरा है — प्रतीक्षा सूची में जुड़ें' },
  crates: { en: 'Crates', hi: 'टोकरियाँ' },
  temperature: { en: 'Temp', hi: 'तापमान' },
  humidity: { en: 'Humidity', hi: 'नमी' },
  listenCode: { en: 'Listen Code', hi: 'कोड सुनें' },
  back: { en: 'Back', hi: 'वापस' },
  submit: { en: 'Submit', hi: 'जमा करें' },
  phoneOptional: { en: 'Phone (optional)', hi: 'फ़ोन (वैकल्पिक)' },
  reservedFor: { en: 'Reserved for', hi: 'के लिए बुक' },
  dropoffBy: { en: 'Drop-off by', hi: 'लाने का समय' },
  aisleDivider: { en: 'MAIN AISLE · CRATE TROLLEY PATHWAY', hi: 'मुख्य गलियारा · टोकरी ट्रॉली मार्ग' },
  tapGreenToReserve: {
    en: 'To reserve a bay, tap a green bay.',
    hi: 'बे बुक करने के लिए, हरे रंग के बे पर दबाएं।'
  },
  pickExactTime: { en: 'Pick exact date & time', hi: 'सही तारीख और समय चुनें' },
  useThisTime: { en: 'Use This Time', hi: 'यह समय उपयोग करें' },
  selectDate: { en: 'Select Date', hi: 'तारीख चुनें' },
  selectTime: { en: 'Select Time', hi: 'समय चुनें' },
  editReservation: { en: 'Edit Reservation', hi: 'बुकिंग बदलें' },
  saveChanges: { en: 'Save Changes', hi: 'बदलाव सुरक्षित करें' },
  detailsPrivate: {
    en: "This is another farmer's bay. Their name, phone and code are private.",
    hi: 'यह किसी और किसान का बे है। उनका नाम, फ़ोन और कोड निजी है।'
  },
  yourBooking: { en: 'Your Booking', hi: 'आपकी बुकिंग' },
  yourBookings: { en: 'Your Bookings', hi: 'आपकी बुकिंगें' }
};

export function t(key, lang) {
  const entry = T[key];
  if (!entry) return key;
  return entry[lang] || entry.en;
}

export function fruitLabel(fruitKey, lang) {
  const f = FRUITS.find((x) => x.key === fruitKey);
  if (!f) return fruitKey;
  return `${f.icon} ${lang === 'hi' ? f.hi : f.en}`;
}

// Plain fruit name with no emoji — used for speech (some voices read emoji
// as an extra spoken word, e.g. "mango" the picture PLUS "Mango" the text,
// which sounded like the fruit name being said twice) and anywhere the
// emoji is already shown separately as a big icon.
export function fruitName(fruitKey, lang) {
  const f = FRUITS.find((x) => x.key === fruitKey);
  if (!f) return fruitKey;
  return lang === 'hi' ? f.hi : f.en;
}
