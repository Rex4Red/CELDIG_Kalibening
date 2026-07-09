/**
 * CELDIG — Leaderboard Logic (Projector Mode)
 */
(function () {
  const AVATARS = ['🐱','🐶','🐰','🐻','🦊','🐼','🐨','🐯','🦁','🐸','🐵','🐧'];
  const SUBTITLES = {
    weekly: 'Bintang Terbanyak Minggu Ini! 🎉',
    monthly: 'Bintang Terbanyak Bulan Ini! 🌟',
    all: 'Bintang Terbanyak Sepanjang Masa! 🏅'
  };
  let currentPeriod = 'weekly';

  // --- Sparkle background ---
  function createSparkles() {
    const container = document.getElementById('sparkles');
    for (let i = 0; i < 50; i++) {
      const s = document.createElement('div');
      s.className = 'sparkle';
      s.style.left = Math.random() * 100 + '%';
      s.style.top = Math.random() * 100 + '%';
      s.style.animationDelay = Math.random() * 3 + 's';
      s.style.animationDuration = (2 + Math.random() * 3) + 's';
      s.style.width = s.style.height = (2 + Math.random() * 4) + 'px';
      container.appendChild(s);
    }
  }

  // --- Period tabs ---
  document.querySelectorAll('.period-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentPeriod = tab.dataset.period;
      document.getElementById('lbSubtitle').textContent = SUBTITLES[currentPeriod];
      loadLeaderboard();
    });
  });

  // --- Load Leaderboard ---
  async function loadLeaderboard() {
    const podium = document.getElementById('podium');
    const grid = document.getElementById('rankGrid');

    try {
      const res = await API.getLeaderboard(currentPeriod);
      const data = res.leaderboard || [];

      if (!data.length) {
        podium.innerHTML = '<p style="color:rgba(255,255,255,0.5);padding:40px;">Belum ada data</p>';
        grid.innerHTML = '';
        return;
      }

      renderPodium(data.slice(0, 3));
      renderRankList(data.slice(3, 10));
    } catch (err) {
      podium.innerHTML = '<p style="color:rgba(255,255,255,0.5);padding:40px;">Gagal memuat data 😿</p>';
    }
  }

  // --- Render Podium ---
  function renderPodium(top3) {
    const podium = document.getElementById('podium');
    const medals = ['🥇', '🥈', '🥉'];
    const barClasses = ['gold', 'silver', 'bronze'];
    // Display order: 2nd, 1st, 3rd
    const order = [1, 0, 2];
    const maxPoints = top3[0]?.points || 1;

    let html = '';
    order.forEach((idx) => {
      const s = top3[idx];
      if (!s) return;
      const avatar = AVATARS[idx % AVATARS.length];
      html += `
        <div class="podium-slot animate-slide-up" style="animation-delay:${idx * 0.2}s">
          ${idx === 0 ? '<div style="font-size:28px;margin-bottom:4px;">👑</div>' : ''}
          <div class="podium-avatar">${avatar}</div>
          <div class="podium-name">${s.name}</div>
          <div class="podium-points">${s.points} ⭐</div>
          <div class="podium-bar ${barClasses[idx]}">${idx + 1}</div>
        </div>
      `;
    });

    podium.innerHTML = html;
  }

  // --- Render Rank List ---
  function renderRankList(rest) {
    const grid = document.getElementById('rankGrid');
    const maxPts = rest[0]?.points || 1;

    grid.innerHTML = rest.map((s, i) => {
      const rank = i + 4;
      const avatar = AVATARS[rank % AVATARS.length];
      const barWidth = Math.max(10, (s.points / maxPts) * 100);
      return `
        <div class="rank-item animate-slide-up" style="animation-delay:${(i + 3) * 0.1}s">
          <div class="rank-num">${rank}</div>
          <div class="rank-avatar">${avatar}</div>
          <div style="flex:1">
            <div class="rank-name">${s.name}</div>
            <div class="rank-bar" style="width:${barWidth}%"></div>
          </div>
          <div class="rank-score">${s.points} ⭐</div>
        </div>
      `;
    }).join('');
  }

  // --- Init ---
  createSparkles();
  loadLeaderboard();

  // Auto-refresh
  setInterval(loadLeaderboard, CONFIG.LEADERBOARD_REFRESH);
})();
