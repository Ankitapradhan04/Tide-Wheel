/* ============================================================
   TIDEWATCH — app bootstrap and chrome (tabs, theme, data menu)
   ============================================================ */
(function(){

  function spawnBubbles(){
    const wrap = document.querySelector('.bubbles');
    const count = window.innerWidth < 640 ? 8 : 16;
    for (let i = 0; i < count; i++){
      const b = document.createElement('span');
      b.className = 'bubble';
      const size = 6 + Math.random() * 22;
      b.style.width = size + 'px';
      b.style.height = size + 'px';
      b.style.left = Math.random() * 100 + '%';
      b.style.setProperty('--drift', (Math.random()*60 - 30) + 'px');
      b.style.animationDuration = (14 + Math.random() * 16) + 's';
      b.style.animationDelay = (Math.random() * 20) + 's';
      wrap.appendChild(b);
    }
  }

  function wireTabs(){
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(btn => {
      btn.addEventListener('click', () => switchView(btn.dataset.view));
    });
  }

  async function switchView(view){
    document.querySelectorAll('.tab-btn').forEach(b => {
      const active = b.dataset.view === view;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', active);
    });
    document.querySelectorAll('.view').forEach(v => v.classList.remove('is-active'));
    document.getElementById('view-' + view).classList.add('is-active');
    if (view === 'clock') await TideClock.render();
    if (view === 'weekly') await TideWeekly.render();
    if (view === 'calendar') await TideCalendar.render();
    if (view === 'reminders') await TideReminders.render();
  }

  async function wireTheme(){
    const stored = await TideDB.get('settings', 'theme');
    const theme = (stored && stored.value) || 'deep';
    applyTheme(theme);
    document.getElementById('themeToggle').addEventListener('click', async () => {
      const cur = document.documentElement.getAttribute('data-theme') === 'shallow' ? 'shallow' : 'deep';
      const next = cur === 'deep' ? 'shallow' : 'deep';
      applyTheme(next);
      await TideDB.put('settings', { key:'theme', value: next });
    });
  }
  function applyTheme(theme){
    if (theme === 'shallow') document.documentElement.setAttribute('data-theme', 'shallow');
    else document.documentElement.removeAttribute('data-theme');
  }

  function wireDataMenu(){
    const btn = document.getElementById('dataMenuBtn');
    const menu = document.getElementById('dataMenu');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
    });
    document.addEventListener('click', (e) => {
      if (!menu.hidden && !menu.contains(e.target)) menu.hidden = true;
    });

    document.getElementById('exportBtn').addEventListener('click', async () => {
      const data = await TideDB.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tidewatch-backup-${Tide.formatDateKey(new Date())}.json`;
      a.click();
      URL.revokeObjectURL(url);
      menu.hidden = true;
      Tide.toast('Backup downloaded');
    });

    document.getElementById('importInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await TideDB.importAll(data);
        Tide.toast('Backup restored');
        menu.hidden = true;
        location.reload();
      } catch (err){
        Tide.toast('That file could not be read');
      }
      e.target.value = '';
    });

    document.getElementById('printBtn').addEventListener('click', async () => {
      menu.hidden = true;
      await switchView('weekly');
      setTimeout(() => window.print(), 150);
    });

    document.getElementById('resetBtn').addEventListener('click', async () => {
      menu.hidden = true;
      if (!confirm('This clears every schedule, reminder and note stored in this browser. This cannot be undone. Continue?')) return;
      await TideDB.clearAll();
      Tide.toast('All data cleared');
      setTimeout(() => location.reload(), 500);
    });
  }

  async function init(){
    spawnBubbles();
    Tide.state.selectedClockDay = Tide.todayKey();
    wireTabs();
    await wireTheme();
    wireDataMenu();
    TideReminders.init();
    await TideClock.render();
    await TideReminders.render(); // populates the nav badge on load
    setInterval(() => { if (document.getElementById('view-clock').classList.contains('is-active')) TideClock.render(true); }, 60000);
    setInterval(async () => { await TideReminders.render(); }, 60000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
