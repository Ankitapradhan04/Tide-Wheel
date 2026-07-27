/* ============================================================
   CALENDAR — month grid, day notes, and "buoys" marking days
   that have a reminder attached
   ============================================================ */
const TideCalendar = (() => {
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  let eventsByDate = {};   // 'YYYY-MM-DD' -> [event,...]
  let reminderDates = new Set();

  function buildWeekdayRow(){
    const el = document.getElementById('calWeekdays');
    if (el.childElementCount) return;
    el.innerHTML = Tide.DAYS.map(d => `<span>${Tide.DAY_SHORT[d]}</span>`).join('');
  }

  async function loadData(){
    const [events, reminders] = await Promise.all([
      TideDB.getAll('calendarEvents'), TideDB.getAll('reminders')
    ]);
    eventsByDate = {};
    events.forEach(e => {
      (eventsByDate[e.date] = eventsByDate[e.date] || []).push(e);
    });
    reminderDates = new Set(reminders.map(r => r.date));
  }

  function buildGrid(){
    const y = Tide.state.calViewYear, m = Tide.state.calViewMonth;
    document.getElementById('calMonthLabel').textContent = `${MONTH_NAMES[m]} ${y}`;

    const firstOfMonth = new Date(y, m, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(y, m+1, 0).getDate();
    const daysInPrevMonth = new Date(y, m, 0).getDate();
    const todayKey = Tide.formatDateKey(new Date());

    const cells = [];
    for (let i = 0; i < startOffset; i++){
      const dayNum = daysInPrevMonth - startOffset + i + 1;
      cells.push({ dayNum, outside:true, dateKey:null });
    }
    for (let d = 1; d <= daysInMonth; d++){
      const dateKey = `${y}-${Tide.pad2(m+1)}-${Tide.pad2(d)}`;
      cells.push({ dayNum:d, outside:false, dateKey });
    }
    while (cells.length % 7 !== 0){
      cells.push({ dayNum: cells.length - startOffset - daysInMonth + 1, outside:true, dateKey:null });
    }

    const grid = document.getElementById('calGrid');
    grid.innerHTML = cells.map(c => {
      if (c.outside) return `<div class="cal-day is-outside"><span class="cal-daynum">${c.dayNum}</span></div>`;
      const isToday = c.dateKey === todayKey;
      const isSelected = c.dateKey === Tide.state.selectedCalDate;
      const hasEvents = (eventsByDate[c.dateKey] || []).length > 0;
      const hasReminder = reminderDates.has(c.dateKey);
      let dots = '';
      if (hasEvents) dots += `<span class="cal-dot"></span>`;
      if (hasReminder) dots += `<span class="cal-dot buoy"></span>`;
      return `<div class="cal-day${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}" data-date="${c.dateKey}">
        <span class="cal-daynum">${c.dayNum}</span>
        <span class="cal-dots">${dots}</span>
      </div>`;
    }).join('');

    grid.querySelectorAll('.cal-day[data-date]').forEach(el => {
      el.addEventListener('click', () => {
        Tide.state.selectedCalDate = el.dataset.date;
        renderSide();
        buildGrid();
      });
    });
  }

  function niceDate(dateKey){
    if (!dateKey) return '';
    const [y,m,d] = dateKey.split('-').map(Number);
    const dt = new Date(y, m-1, d);
    return dt.toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' });
  }

  function renderSide(){
    const dateKey = Tide.state.selectedCalDate;
    document.getElementById('calSideDate').textContent = dateKey ? niceDate(dateKey) : 'Select a day';
    const list = document.getElementById('calSideEvents');
    const form = document.getElementById('calEventForm');

    if (!dateKey){ list.innerHTML = ''; form.style.display = 'none'; return; }
    form.style.display = 'flex';

    const evs = eventsByDate[dateKey] || [];
    list.innerHTML = evs.length ? evs.map(e =>
      `<div class="cal-event-item"><span>${Tide.escapeHtml(e.title)}</span><button data-id="${e.id}" aria-label="Delete note">✕</button></div>`
    ).join('') : `<p style="color:var(--text-1); font-size:.8rem;">No notes yet for this day.</p>`;

    list.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await TideDB.delete('calendarEvents', Number(btn.dataset.id));
        await loadData();
        renderSide();
        buildGrid();
      });
    });
  }

  function wireForm(){
    const form = document.getElementById('calEventForm');
    if (form.dataset.wired) return;
    form.dataset.wired = '1';
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('calEventTitle');
      const title = input.value.trim();
      if (!title || !Tide.state.selectedCalDate) return;
      await TideDB.put('calendarEvents', { date: Tide.state.selectedCalDate, title });
      input.value = '';
      await loadData();
      renderSide();
      buildGrid();
      Tide.toast('Added to calendar');
    });
  }

  function wireNav(){
    document.getElementById('calPrev').addEventListener('click', () => shiftMonth(-1));
    document.getElementById('calNext').addEventListener('click', () => shiftMonth(1));
    document.getElementById('calToday').addEventListener('click', () => {
      const n = new Date();
      Tide.state.calViewYear = n.getFullYear();
      Tide.state.calViewMonth = n.getMonth();
      Tide.state.selectedCalDate = Tide.formatDateKey(n);
      buildGrid(); renderSide();
    });
  }

  function shiftMonth(delta){
    let m = Tide.state.calViewMonth + delta;
    let y = Tide.state.calViewYear;
    if (m < 0){ m = 11; y--; } else if (m > 11){ m = 0; y++; }
    Tide.state.calViewMonth = m; Tide.state.calViewYear = y;
    buildGrid();
  }

  async function render(){
    if (Tide.state.calViewYear === null){
      const n = new Date();
      Tide.state.calViewYear = n.getFullYear();
      Tide.state.calViewMonth = n.getMonth();
      Tide.state.selectedCalDate = Tide.formatDateKey(n);
      wireNav();
    }
    buildWeekdayRow();
    await loadData();
    buildGrid();
    renderSide();
    wireForm();
  }

  return { render, refreshBuoys: loadData };
})();
