/**
 * CELDIG — Admin Dashboard Logic
 */
(function () {
  const PIN_LENGTH = 4;
  const AVATARS = ['🐱', '🐶', '🐰', '🐻', '🦊', '🐼', '🐨', '🐯', '🦁', '🐸', '🐵', '🐧'];
  const AVATAR_COLORS = [
    'rgba(76,201,240,0.15)', 'rgba(255,159,28,0.15)', 'rgba(247,37,133,0.15)',
    'rgba(6,214,160,0.15)', 'rgba(58,134,255,0.15)', 'rgba(255,215,0,0.15)'
  ];

  // --- PIN Setup ---
  const pinContainer = document.getElementById('pinContainer');
  const pinInputs = [];

  for (let i = 0; i < PIN_LENGTH; i++) {
    const input = document.createElement('input');
    input.type = 'password';
    input.inputMode = 'numeric';
    input.maxLength = 1;
    input.className = 'pin-dot';
    input.addEventListener('input', (e) => {
      if (e.target.value && i < PIN_LENGTH - 1) pinInputs[i + 1].focus();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && i > 0) pinInputs[i - 1].focus();
    });
    pinInputs.push(input);
    pinContainer.appendChild(input);
  }
  pinInputs[0].focus();

  // --- PIN Submit ---
  document.getElementById('pinSubmit').addEventListener('click', verifyPin);
  pinInputs[PIN_LENGTH - 1].addEventListener('input', () => setTimeout(verifyPin, 100));

  async function verifyPin() {
    const pin = pinInputs.map(i => i.value).join('');
    if (pin.length !== PIN_LENGTH) return;

    const btn = document.getElementById('pinSubmit');
    btn.disabled = true;
    btn.textContent = 'Memverifikasi...';

    try {
      const res = await API.verifyPin(pin);
      if (res.valid) {
        sessionStorage.setItem('celdig_auth', '1');
        showDashboard();
      } else {
        document.getElementById('pinError').classList.remove('hidden');
        pinInputs.forEach(i => { i.value = ''; });
        pinInputs[0].focus();
      }
    } catch (err) {
      alert('Gagal verifikasi: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Masuk';
    }
  }

  // --- Check auth on load ---
  if (sessionStorage.getItem('celdig_auth') === '1') {
    showDashboard();
  }

  // --- Show Dashboard ---
  function showDashboard() {
    document.getElementById('pinScreen').classList.add('hidden');
    document.getElementById('dashboardScreen').classList.remove('hidden');
    loadStats();
    loadStudents();
  }

  // --- Logout ---
  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('celdig_auth');
    location.reload();
  });

  // --- Load Stats ---
  async function loadStats() {
    try {
      const stats = await API.getStats();
      document.getElementById('statTotal').textContent = CONFIG.formatRupiah(stats.totalSavings || 0);
      document.getElementById('statStudents').textContent = stats.totalStudents || 0;
      document.getElementById('statDeposits').textContent = stats.totalDeposits || 0;
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  // --- Load Students ---
  async function loadStudents() {
    const container = document.getElementById('studentList');
    try {
      const res = await API.getStudents();
      const students = res.students || [];
      document.getElementById('studentCount').textContent = `${students.length} siswa`;

      if (!students.length) {
        container.innerHTML = '<p class="text-secondary text-center body" style="padding:24px;">Belum ada siswa terdaftar</p>';
        return;
      }

      container.innerHTML = students.map((s, i) => `
        <div class="student-item">
          <div class="student-avatar" style="background:${AVATAR_COLORS[i % AVATAR_COLORS.length]}">
            ${AVATARS[i % AVATARS.length]}
          </div>
          <div class="student-info">
            <div class="name">${s.name}</div>
            <div class="meta">${s.className || '-'}</div>
          </div>
          <div class="student-saldo">
            <div class="amount">${CONFIG.formatRupiah(s.balance || 0)}</div>
            <div class="poin">⭐ ${s.points || 0}</div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = '<p class="text-secondary text-center">Gagal memuat data</p>';
    }
  }

  // --- Generate QR ---
  document.getElementById('generateBtn').addEventListener('click', async () => {
    const qty = parseInt(document.getElementById('qrQuantity').value) || 10;
    if (qty < 1 || qty > 50) return alert('Jumlah harus 1-50');

    const btn = document.getElementById('generateBtn');
    btn.disabled = true;
    btn.textContent = 'Generating...';

    try {
      const res = await API.generateQRs(qty);
      // Store QR IDs and redirect to print page
      sessionStorage.setItem('celdig_print_qrs', JSON.stringify(res.qrIds || []));
      window.open('/print-qr', '_blank');
    } catch (err) {
      alert('Gagal generate QR: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '🖨️ Cetak QR';
    }
  });

  // --- Open Spreadsheet (placeholder) ---
  document.getElementById('openSheetBtn').addEventListener('click', () => {
    alert('Fitur ini akan membuka Google Spreadsheet kamu. Ganti URL di config.js setelah setup.');
  });
})();
