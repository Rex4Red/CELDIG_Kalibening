/**
 * CELDIG Configuration
 * Ganti APPS_SCRIPT_URL dengan URL deploy Google Apps Script kamu
 */
const CONFIG = {
  // URL Google Apps Script (ganti setelah deploy)
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxNFONZ7pB6JfMwPtbJ1Tptuh2N1xQWe7O_EXWK56WcVFWUSWhYkJUvZxbsHKj4zXNgsA/exec',

  // Nama aplikasi
  APP_NAME: 'CELDIG',
  APP_TAGLINE: 'Celengan Digital',

  // Leaderboard auto-refresh interval (ms)
  LEADERBOARD_REFRESH: 30000,

  // Quick amount options (Rupiah)
  QUICK_AMOUNTS: [1000, 2000, 5000, 10000],

  // Format Rupiah
  formatRupiah(num) {
    return 'Rp ' + Number(num).toLocaleString('id-ID');
  },

  // Get QR ID from URL (supports both ?id=X and /s/X)
  getQRIdFromURL() {
    // Try query param first (from rewrite)
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('id');
    if (fromQuery) return fromQuery;

    // Fallback: extract from path /s/QR-XXXX
    const match = window.location.pathname.match(/\/s\/(.+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }
};
