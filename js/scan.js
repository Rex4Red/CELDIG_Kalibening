/**
 * CELDIG — Scan Page Logic
 * Handles QR registration, deposit, and withdrawal flow
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
  const $withdrawOverlay = document.getElementById('withdrawOverlay');

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
    renderQuickWithdrawAmounts();
    renderHistory(data.history || []);
  }

  // --- Quick Amount Chips (Deposit) ---
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

  // --- Quick Amount Chips (Withdraw) ---
  function renderQuickWithdrawAmounts() {
    const container = document.getElementById('quickWithdrawAmounts');
    const input = document.getElementById('withdrawAmount');
    if (!container) return;
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

  // --- History (supports deposits & withdrawals) ---
  function renderHistory(history) {
    const container = document.getElementById('historyList');
    if (!history.length) {
      container.innerHTML = '<p class="text-secondary text-center caption">Belum ada riwayat</p>';
      return;
    }

    container.innerHTML = history.slice(0, 8).map(h => {
      const date = new Date(h.created_at);
      const dateStr = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const isWithdraw = h.amount < 0;
      const absAmount = Math.abs(h.amount);

      if (isWithdraw) {
        return `
          <div class="student-item">
            <div class="student-avatar" style="background:rgba(247,37,133,0.1);">💸</div>
            <div class="student-info">
              <div class="name" style="color:#F72585;">-${CONFIG.formatRupiah(absAmount)}</div>
              <div class="meta">${dateStr} • ${timeStr}</div>
            </div>
            <div class="badge" style="background:rgba(247,37,133,0.1); color:#F72585;">Penarikan</div>
          </div>
        `;
      } else {
        return `
          <div class="student-item">
            <div class="student-avatar" style="background:rgba(6,214,160,0.1);">💰</div>
            <div class="student-info">
              <div class="name">${CONFIG.formatRupiah(absAmount)}</div>
              <div class="meta">${dateStr} • ${timeStr}</div>
            </div>
            <div class="badge badge-success">+1 ⭐</div>
          </div>
        `;
      }
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
      const operator = 'Guru';
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
      document.getElementById('quickAmounts').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    }
  });

  // --- Withdraw Form ---
  document.getElementById('withdrawForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseInt(document.getElementById('withdrawAmount').value);
    if (!amount || amount < 500) return alert('Nominal minimal Rp 500');

    // Confirm withdrawal
    const currentBalance = childData.balance || 0;
    if (amount > currentBalance) {
      return alert(`Saldo tidak mencukupi!\nSaldo saat ini: ${CONFIG.formatRupiah(currentBalance)}\nJumlah penarikan: ${CONFIG.formatRupiah(amount)}`);
    }

    if (!confirm(`Yakin ingin menarik ${CONFIG.formatRupiah(amount)} dari tabungan ${childData.name}?`)) return;

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Memproses...';

    try {
      const operator = 'Guru';
      const res = await API.withdraw(qrId, amount, operator);

      if (res.error) {
        alert(res.error);
        return;
      }

      // Show withdraw success overlay
      showWithdrawSuccess(childData.name, amount, res.newBalance);

      // Update local data immediately
      childData.balance = res.newBalance;
      childData.points = res.newPoints;

      // Add withdrawal to history (negative amount)
      if (!childData.history) childData.history = [];
      childData.history.unshift({
        amount: -amount,
        created_at: new Date().toISOString()
      });

      // Update display
      document.getElementById('childBalance').textContent = CONFIG.formatRupiah(res.newBalance);
      document.getElementById('childPoints').textContent = `⭐ ${res.newPoints} poin`;
      renderHistory(childData.history);
    } catch (err) {
      alert('Gagal menarik tabungan: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '💸 Ambil Tabungan';
      document.getElementById('withdrawAmount').value = '';
      const wdChips = document.getElementById('quickWithdrawAmounts');
      if (wdChips) wdChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    }
  });

  // --- Deposit Success Overlay ---
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
    try {
      const fresh = await API.getChild(qrId);
      childData = fresh;
      showDepositView(fresh);
    } catch(e) {
      showDepositView(childData);
    }
  });

  // --- Withdraw Success Overlay ---
  function showWithdrawSuccess(name, amount, newBalance) {
    document.getElementById('withdrawName').textContent = name;
    document.getElementById('withdrawSuccessAmount').textContent = '-' + CONFIG.formatRupiah(amount);
    document.getElementById('withdrawBalance').textContent = 'Sisa saldo: ' + CONFIG.formatRupiah(newBalance);
    $withdrawOverlay.classList.add('active');
  }

  document.getElementById('withdrawClose').addEventListener('click', async () => {
    $withdrawOverlay.classList.remove('active');
    try {
      const fresh = await API.getChild(qrId);
      childData = fresh;
      showDepositView(fresh);
    } catch(e) {
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
