/**
 * CELDIG — Scan Page Logic
 * Handles QR registration and deposit flow
 */
(function () {
  const qrId = CONFIG.getQRIdFromURL();

  // DOM references
  const $loading = document.getElementById('loadingState');
  const $error = document.getElementById('errorState');
  const $errorMsg = document.getElementById('errorMessage');
  const $register = document.getElementById('registerState');
  const $deposit = document.getElementById('depositState');
  const $overlay = document.getElementById('successOverlay');

  // Current child data
  let childData = null;

  // --- Init ---
  async function init() {
    if (!qrId) {
      showError('QR Code tidak valid. Pastikan kamu memindai QR yang benar.');
      return;
    }

    try {
      const res = await API.getChild(qrId);

      if (res.registered) {
        childData = res;
        showDepositView(res);
      } else {
        showRegisterView();
      }
    } catch (err) {
      showError('Gagal memuat data. Periksa koneksi internet kamu. 😅');
    }
  }

  // --- Views ---
  function showError(msg) {
    $loading.classList.add('hidden');
    $errorMsg.textContent = msg;
    $error.classList.remove('hidden');
  }

  function showRegisterView() {
    $loading.classList.add('hidden');
    $register.classList.remove('hidden');
  }

  function showDepositView(data) {
    $loading.classList.add('hidden');
    $deposit.classList.remove('hidden');

    document.getElementById('childName').textContent = data.name;
    document.getElementById('childClass').textContent = data.className || '-';
    document.getElementById('childBalance').textContent = CONFIG.formatRupiah(data.balance || 0);
    document.getElementById('childPoints').textContent = `⭐ ${data.points || 0} poin`;
    document.getElementById('childDeposits').textContent = `${data.depositCount || 0} kali nabung`;

    renderQuickAmounts();
    renderHistory(data.history || []);
  }

  // --- Quick Amount Chips ---
  function renderQuickAmounts() {
    const container = document.getElementById('quickAmounts');
    const input = document.getElementById('depositAmount');
    container.innerHTML = '';

    CONFIG.QUICK_AMOUNTS.forEach(amount => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = CONFIG.formatRupiah(amount);
      chip.addEventListener('click', () => {
        input.value = amount;
        container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
      container.appendChild(chip);
    });
  }

  // --- History ---
  function renderHistory(history) {
    const container = document.getElementById('historyList');
    if (!history.length) return;

    container.innerHTML = history.slice(0, 5).map(h => {
      const date = new Date(h.created_at);
      const dateStr = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="student-item">
          <div class="student-avatar" style="background:rgba(6,214,160,0.1);">💰</div>
          <div class="student-info">
            <div class="name">${CONFIG.formatRupiah(h.amount)}</div>
            <div class="meta">${dateStr} • ${timeStr}</div>
          </div>
          <div class="badge badge-success">+1 ⭐</div>
        </div>
      `;
    }).join('');
  }

  // --- Register Form ---
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('studentName').value.trim();
    const cls = document.getElementById('studentClass').value;
    if (!name) return alert('Nama siswa harus diisi!');

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Mendaftarkan...';

    try {
      await API.register(qrId, name, cls);
      // Reload to show deposit view
      const res = await API.getChild(qrId);
      childData = res;
      $register.classList.add('hidden');
      showDepositView(res);
    } catch (err) {
      alert('Gagal mendaftarkan: ' + err.message);
      btn.disabled = false;
      btn.textContent = '✨ Daftarkan Siswa';
    }
  });

  // --- Deposit Form ---
  document.getElementById('depositForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseInt(document.getElementById('depositAmount').value);
    if (!amount || amount < 500) return alert('Nominal minimal Rp 500');

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Menyimpan...';

    try {
      const operator = 'Guru'; // Could be dynamic later
      const res = await API.deposit(qrId, amount, operator);

      // Show success overlay
      showSuccess(childData.name, amount, res.newBalance, res.newPoints);

      // Update displayed data immediately (optimistic)
      childData.balance = res.newBalance;
      childData.points = res.newPoints;
      childData.depositCount = (childData.depositCount || 0) + 1;

      // Add new deposit to history instantly
      if (!childData.history) childData.history = [];
      childData.history.unshift({
        amount: amount,
        created_at: new Date().toISOString()
      });

      // Update balance & points display right away
      document.getElementById('childBalance').textContent = CONFIG.formatRupiah(res.newBalance);
      document.getElementById('childPoints').textContent = `⭐ ${res.newPoints} poin`;
      document.getElementById('childDeposits').textContent = `${childData.depositCount} kali nabung`;
      renderHistory(childData.history);
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '💰 Simpan Tabungan';
      document.getElementById('depositAmount').value = '';
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    }
  });

  // --- Success Overlay ---
  function showSuccess(name, amount, newBalance, newPoints) {
    document.getElementById('successName').textContent = name;
    document.getElementById('successAmount').textContent = '+' + CONFIG.formatRupiah(amount);
    document.getElementById('successBalance').textContent = 'Saldo baru: ' + CONFIG.formatRupiah(newBalance);
    document.getElementById('successPoints').textContent = `⭐ +1 poin (total: ${newPoints} poin)`;
    $overlay.classList.add('active');
    spawnConfetti();
  }

  document.getElementById('successClose').addEventListener('click', async () => {
    $overlay.classList.remove('active');
    // Re-fetch fresh data from server to ensure full sync
    try {
      const fresh = await API.getChild(qrId);
      childData = fresh;
      showDepositView(fresh);
    } catch(e) {
      // Fallback to local data if fetch fails
      showDepositView(childData);
    }
  });

  // --- Confetti ---
  function spawnConfetti() {
    const colors = ['#4CC9F0', '#FF9F1C', '#F72585', '#06D6A0', '#FFD700', '#3A86FF'];
    for (let i = 0; i < 40; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.left = Math.random() * 100 + 'vw';
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.animationDuration = (2 + Math.random() * 2) + 's';
      el.style.animationDelay = Math.random() * 0.5 + 's';
      el.style.width = (6 + Math.random() * 8) + 'px';
      el.style.height = (6 + Math.random() * 8) + 'px';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 4000);
    }
  }

  // --- Start ---
  init();
})();
