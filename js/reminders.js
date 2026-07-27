/* ============================================================
   REMINDERS — add, filter, complete, delete; optional live
   browser notifications while the tab stays open
   ============================================================ */
const TideReminders = (() => {
  let all = [];
  let notifyTimer = null;
  const alerted = new Set();

  function priorityLabel(p){
    return { low:'Low tide', medium:'Rising tide', high:'High tide' }[p] || p;
  }

  function isPast(r){
    const dt = new Date(`${r.date}T${r.time}`);
    return dt.getTime() < Date.now();
  }

  function applyFilter(list){
    const f = Tide.state.reminderFilter;
    if (f === 'all') return list;
    if (f === 'high') return list.filter(r => r.priority === 'high' && !r.done);
    if (f === 'done') return list.filter(r => r.done);
    // upcoming
    return list.filter(r => !r.done);
  }

  function sortList(list){
    return [...list].sort((a,b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
  }

  function updateBadge(){
    const count = all.filter(r => !r.done && !isPast(r)).length;
    const badge = document.getElementById('reminderCount');
    badge.textContent = count;
    badge.hidden = count === 0;
  }

  function renderList(){
    const listEl = document.getElementById('reminderList');
    const emptyEl = document.getElementById('reminderEmpty');
    const shown = sortList(applyFilter(all));

    if (!shown.length){
      listEl.innerHTML = '';
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;

    listEl.innerHTML = shown.map(r => {
      const dt = new Date(`${r.date}T${r.time}`);
      const dateStr = dt.toLocaleDateString(undefined, { month:'short', day:'numeric' });
      const timeStr = dt.toLocaleTimeString(undefined, { hour:'numeric', minute:'2-digit' });
      const overdue = !r.done && isPast(r);
      return `<li class="reminder-item priority-${r.priority}${r.done ? ' is-done' : ''}">
        <input type="checkbox" class="reminder-check" data-id="${r.id}" ${r.done ? 'checked' : ''} aria-label="Mark complete">
        <div class="reminder-body">
          <span class="reminder-text">${Tide.escapeHtml(r.text)}</span>
          <span class="reminder-meta">${dateStr} · ${timeStr} · ${priorityLabel(r.priority)}${overdue ? ' · overdue' : ''}</span>
        </div>
        <button class="reminder-del" data-id="${r.id}" aria-label="Delete reminder">✕</button>
      </li>`;
    }).join('');

    listEl.querySelectorAll('.reminder-check').forEach(cb => {
      cb.addEventListener('change', async () => {
        const id = Number(cb.dataset.id);
        const r = all.find(x => x.id === id);
        r.done = cb.checked;
        await TideDB.put('reminders', r);
        renderList();
        updateBadge();
      });
    });
    listEl.querySelectorAll('.reminder-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.id);
        await TideDB.delete('reminders', id);
        all = all.filter(x => x.id !== id);
        renderList();
        updateBadge();
        if (window.TideCalendar) TideCalendar.refreshBuoys().then(() => TideCalendar.render());
      });
    });
  }

  function wireFilters(){
    document.querySelectorAll('#reminderFilters .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#reminderFilters .chip').forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        Tide.state.reminderFilter = chip.dataset.filter;
        renderList();
      });
    });
  }

  function wireForm(){
    const form = document.getElementById('reminderForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = document.getElementById('reminderText').value.trim();
      const date = document.getElementById('reminderDate').value;
      const time = document.getElementById('reminderTime').value;
      const priority = document.getElementById('reminderPriority').value;
      if (!text || !date || !time) return;

      const id = await TideDB.put('reminders', { text, date, time, priority, done:false, createdAt: Date.now() });
      all.push({ id, text, date, time, priority, done:false });
      form.reset();
      document.getElementById('reminderPriority').value = 'medium';
      renderList();
      updateBadge();
      Tide.toast('Reminder added');
      if (window.TideCalendar) TideCalendar.refreshBuoys().then(() => TideCalendar.render());
    });
  }

  function wireNotifyToggle(){
    const toggle = document.getElementById('notifyToggle');
    toggle.addEventListener('change', async () => {
      if (toggle.checked){
        if (!('Notification' in window)){
          Tide.toast('Notifications are not supported in this browser');
          toggle.checked = false; return;
        }
        const perm = await Notification.requestPermission();
        if (perm !== 'granted'){
          Tide.toast('Notification permission was not granted');
          toggle.checked = false; return;
        }
        startNotifyLoop();
      } else {
        stopNotifyLoop();
      }
      await TideDB.put('settings', { key:'notify', value: toggle.checked });
    });
  }

  function startNotifyLoop(){
    if (notifyTimer) return;
    checkDue();
    notifyTimer = setInterval(checkDue, 20000);
  }
  function stopNotifyLoop(){
    clearInterval(notifyTimer);
    notifyTimer = null;
  }

  function checkDue(){
    const now = Date.now();
    all.forEach(r => {
      if (r.done || alerted.has(r.id)) return;
      const due = new Date(`${r.date}T${r.time}`).getTime();
      if (due <= now && now - due < 5 * 60000){
        alerted.add(r.id);
        try {
          new Notification('🌊 Tidewatch reminder', { body: r.text, tag: 'tide-' + r.id });
        } catch (err) { /* notifications unsupported/blocked, fail quietly */ }
        Tide.toast(`Reminder: ${r.text}`);
      }
    });
  }

  async function restoreNotifySetting(){
    const s = await TideDB.get('settings', 'notify');
    const toggle = document.getElementById('notifyToggle');
    if (s && s.value && 'Notification' in window && Notification.permission === 'granted'){
      toggle.checked = true;
      startNotifyLoop();
    }
  }

  async function render(){
    all = await TideDB.getAll('reminders');
    renderList();
    updateBadge();
  }

  function init(){
    // default the date field to today for convenience
    document.getElementById('reminderDate').value = Tide.formatDateKey(new Date());
    wireForm();
    wireFilters();
    wireNotifyToggle();
    restoreNotifySetting();
  }

  return { render, init, updateBadge };
})();
