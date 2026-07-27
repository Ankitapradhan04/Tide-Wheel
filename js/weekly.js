/* ============================================================
   WEEKLY CHART — nautical-chart style table, shares data with
   the Tide Wheel (same routine store, two views on one thing)
   ============================================================ */
const TideWeekly = (() => {
  let routines = {}; // day -> routine object

  function buildLegend(){
    const el = document.getElementById('categoryLegendWeekly');
    el.innerHTML = Tide.CATEGORIES.filter(c => c.key !== 'free').map(c =>
      `<span class="legend-item"><span class="legend-swatch" style="background:${c.hex}"></span>${c.label}</span>`
    ).join('');
  }

  function openCellEditor(day, hour, anchorEl){
    document.querySelectorAll('.editor-popover, .overlay-scrim').forEach(n => n.remove());

    const scrim = document.createElement('div');
    scrim.className = 'overlay-scrim';
    scrim.addEventListener('click', () => scrim.remove() || pop.remove());
    document.body.appendChild(scrim);

    const rect = anchorEl.getBoundingClientRect();
    const current = routines[day].hours[hour];
    const pop = document.createElement('div');
    pop.className = 'editor-popover';
    pop.innerHTML = `
      <h4>${Tide.DAY_LABEL[day]} · ${Tide.hourLabel(hour)}</h4>
      <input type="text" maxlength="40" placeholder="What happens this hour?" value="${Tide.escapeHtml(current.activity)}">
      <div class="cat-grid">${Tide.CATEGORIES.map(c => `<div class="cat-swatch${c.key===current.category?' is-selected':''}" data-cat="${c.key}" style="background:${c.hex==='transparent' ? 'rgba(255,255,255,.08)' : c.hex}" title="${c.label}"></div>`).join('')}</div>
      <div class="editor-actions">
        <button class="btn-ghost" data-action="clear">Clear</button>
        <button class="btn-primary" data-action="save">Save</button>
      </div>`;
    document.body.appendChild(pop);

    let left = Math.max(10, Math.min(rect.left, window.innerWidth - 270));
    let top = Math.max(10, Math.min(rect.top + 24, window.innerHeight - 260));
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';

    let selectedCat = current.category;
    pop.querySelectorAll('.cat-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        pop.querySelectorAll('.cat-swatch').forEach(s => s.classList.remove('is-selected'));
        sw.classList.add('is-selected');
        selectedCat = sw.dataset.cat;
      });
    });

    const input = pop.querySelector('input');
    input.focus();
    const close = () => { pop.remove(); scrim.remove(); };

    pop.querySelector('[data-action="save"]').addEventListener('click', async () => {
      routines[day].hours[hour] = { activity: input.value.trim(), category: input.value.trim() ? selectedCat : 'free' };
      await TideDB.put('routine', routines[day]);
      close();
      render(true);
      if (window.TideClock) TideClock.render(true);
      Tide.toast('Hour updated');
    });
    pop.querySelector('[data-action="clear"]').addEventListener('click', async () => {
      routines[day].hours[hour] = { activity:'', category:'free' };
      await TideDB.put('routine', routines[day]);
      close();
      render(true);
      if (window.TideClock) TideClock.render(true);
    });
  }

  async function loadAll(){
    const entries = await Promise.all(Tide.DAYS.map(d => Tide.getRoutine(d)));
    Tide.DAYS.forEach((d,i) => routines[d] = entries[i]);
  }

  function buildTable(){
    const table = document.getElementById('weeklyGrid');
    const today = Tide.todayKey();
    const curHour = new Date().getHours();

    let thead = '<thead><tr><th></th>' + Tide.DAYS.map(d =>
      `<th>${Tide.DAY_SHORT[d]}${d===today ? ' •' : ''}</th>`).join('') + '</tr></thead>';

    let rows = '';
    for (let h = 0; h < 24; h++){
      rows += `<tr><td class="hour-cell-label">${Tide.hourLabel(h)}</td>`;
      Tide.DAYS.forEach(d => {
        const cell = routines[d].hours[h];
        const cat = Tide.catByKey(cell.category);
        const fill = cat.hex === 'transparent' ? 'rgba(255,255,255,.04)' : cat.hex;
        const nowCls = (d === today && h === curHour) ? ' is-now-col' : '';
        rows += `<td class="slot${nowCls}" style="background:${fill}" data-day="${d}" data-hour="${h}" title="${Tide.hourLabel(h)} — ${Tide.escapeHtml(cell.activity || 'Unplanned')}">${cell.activity ? `<span class="slot-text">${Tide.escapeHtml(cell.activity)}</span>` : ''}</td>`;
      });
      rows += '</tr>';
    }
    table.innerHTML = thead + '<tbody>' + rows + '</tbody>';

    table.querySelectorAll('td.slot').forEach(td => {
      td.addEventListener('click', (e) => openCellEditor(td.dataset.day, parseInt(td.dataset.hour,10), e.currentTarget));
    });
  }

  async function render(skipReload){
    if (!skipReload) await loadAll();
    buildLegend();
    buildTable();
  }

  return { render };
})();
