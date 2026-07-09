/**
 * CELDIG API Wrapper
 * Handles all communication with Google Apps Script backend
 */
const API = {
  /**
   * Base fetch wrapper with error handling
   */
  async request(action, params = {}, method = 'GET') {
    const url = new URL(CONFIG.APPS_SCRIPT_URL);

    if (method === 'GET') {
      url.searchParams.set('action', action);
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    try {
      const options = { redirect: 'follow' };

      if (method === 'POST') {
        options.method = 'POST';
        options.headers = { 'Content-Type': 'text/plain' };
        options.body = JSON.stringify({ action, ...params });
      }

      const res = await fetch(url.toString(), options);
      const data = await res.json();

      if (data.error) throw new Error(data.error);
      return data;
    } catch (err) {
      console.error(`API Error [${action}]:`, err);
      throw err;
    }
  },

  /** Cek data anak berdasarkan QR ID */
  async getChild(qrId) {
    return this.request('getChild', { qrId });
  },

  /** Daftarkan siswa baru ke QR ID */
  async register(qrId, name, className) {
    return this.request('register', { qrId, name, className }, 'POST');
  },

  /** Catat setoran tabungan */
  async deposit(qrId, amount, operator) {
    return this.request('deposit', { qrId, amount: Number(amount), operator }, 'POST');
  },

  /** Ambil statistik dashboard */
  async getStats() {
    return this.request('getStats');
  },

  /** Ambil daftar semua siswa */
  async getStudents() {
    return this.request('getStudents');
  },

  /** Ambil data leaderboard */
  async getLeaderboard(period = 'all') {
    return this.request('getLeaderboard', { period });
  },

  /** Generate QR IDs baru */
  async generateQRs(count) {
    return this.request('generateQRs', { count: Number(count) }, 'POST');
  },

  /** Ambil daftar QR untuk cetak */
  async getQRList(status = 'unregistered') {
    return this.request('getQRList', { status });
  },

  /** Verifikasi PIN admin */
  async verifyPin(pin) {
    return this.request('verifyPin', { pin }, 'POST');
  },

  /** Ambil riwayat setoran anak */
  async getHistory(qrId) {
    return this.request('getHistory', { qrId });
  },

  /** Hapus 1 siswa + setorannya */
  async deleteStudent(qrId) {
    return this.request('deleteStudent', { qrId }, 'POST');
  }
};
