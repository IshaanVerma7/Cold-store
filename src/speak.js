// Free, client-side text-to-speech using the browser's built-in SpeechSynthesis
// API — no paid TTS API, no network payload, works offline once the page has
// loaded. This backs every speaker icon in the design (header, bay cards,
// claim code) for low-literacy users.
export function speak(text, lang) {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch (e) {
    // Non-critical: speech is a convenience, never block the UI on it.
  }
}
