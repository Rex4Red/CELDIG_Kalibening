/**
 * CELDIG — Leaderboard Logic (with localStorage cache for speed)
 */
(function () {
  const AVATARS = ['🐱','🐶','🐰','🐻','🦊','🐼','🐨','🐯','🦁','🐸','🐵','🐧'];
  const SUBTITLES = {
    weekly: 'Bintang Terbanyak Minggu Ini! 🎉',
    monthly: 'Bintang Terbanyak Bulan Ini! 🌟',
    all: 'Bintang Terbanyak Sepanjang Masa! 🏅'
  };
  const CACHE_KEY = 'celdig_lb_cache';
  const CACHE_TTL = 30000; // 30s cache freshness
  let currentPeriod = 'weekly';

  // --- Cache helpers ---
  function getCached(period) {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const cache = JSON.parse(raw);
      if (cache[period]) return cache[period].data;
    } catch(e) {}
    return null;
  }

  function setCache(period, data) {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      const cache = raw ? JSON.parse(raw) : {};
      cache[period] = { data, ts: Date.now() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch(e) {}
  }

  // --- Sparkle background ---
  function createSparkles() {
    const container = document.getElementById('sparkles');
    if (!container) return;
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

  // --- Load Leaderboard (cache-first strategy) ---
  async function loadLeaderboard() {
    const podium = document.getElementById('podium');
    const grid = document.getElementById('rankGrid');

    // 1) Show cached data INSTANTLY if available
    const cached = getCached(currentPeriod);
    if (cached && cached.length) {
      renderPodium(cached.slice(0, 3));
      renderRankList(cached.slice(3, 10));
    } else if (!cached) {
      // Only show loading spinner on very first load (no cache at all)
      podium.innerHTML = '<div class="loading-state"><div class="spinner"></div><p style="color:rgba(255,255,255,0.6)">Memuat ranking...</p></div>';
      grid.innerHTML = '';
    }

    // 2) Fetch fresh data in background
    try {
      const res = await API.getLeaderboard(currentPeriod);
      const data = res.leaderboard || [];

      // Save to cache
      setCache(currentPeriod, data);

      if (!data.length) {
        podium.innerHTML = '<p style="color:rgba(255,255,255,0.5);padding:40px;">Belum ada data</p>';
        grid.innerHTML = '';
        return;
      }

      renderPodium(data.slice(0, 3));
      renderRankList(data.slice(3, 10));
    } catch (err) {
      // If we already showed cached data, don't show error
      if (!cached) {
        podium.innerHTML = '<p style="color:rgba(255,255,255,0.5);padding:40px;">Gagal memuat data 😿</p>';
      }
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
