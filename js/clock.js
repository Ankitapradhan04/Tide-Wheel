/* ============================================================
   TIDE WHEEL — 24 hour circular routine editor
   ============================================================ */
const TideClock = (() => {
  const CX = 260, CY = 260, R_OUT = 248, R_IN = 128;
  let currentRoutine = null;
  let openPopover = null;

  function polar(cx, cy, r, angleDeg){
    const a = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }

  function wedgePath(rInner, rOuter, startDeg, endDeg){
    const p1 = polar(CX, CY, rOuter, startDeg);
    const p2 = polar(CX, CY, rOuter, endDeg);
    const p3 = polar(CX, CY, rInner, endDeg);
    const p4 = polar(CX, CY, rInner, startDeg);
    const large = (endDeg - startDeg) % 360 > 180 ? 1 : 0;
    return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}
            A ${rOuter} ${rOuter} 0 ${large} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}
            L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}
            A ${rInner} ${rInner} 0 ${large} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)} Z`;
  }

  function buildDayPicker(){
    const wrap = document.getElementById('clockDayPicker');
    wrap.innerHTML = '';
    Tide.DAYS.forEach(day => {
      const btn = document.createElement('button');
      btn.className = 'day-pill' + (day === Tide.state.selectedClockDay ? ' is-active' : '');
      btn.textContent = Tide.DAY_SHORT[day];
      btn.setAttribute('role','tab');
      btn.setAttribute('aria-selected', day === Tide.state.selectedClockDay);
      btn.addEventListener('click', () => {
        Tide.state.selectedClockDay = day;
        render();
      });
      wrap.appendChild(btn);
    });
  }

  function buildLegend(targetId){
    const el = document.getElementById(targetId);
    if (!el) return;
    el.innerHTML = Tide.CATEGORIES.filter(c => c.key !== 'free').map(c =>
      `<span class="legend-item"><span class="legend-swatch" style="background:${c.hex}"></span>${c.label}</span>`
    ).join('');
  }

  function buildDepthBars(routine){
    const el = document.getElementById('depthBars');
    const counts = {};
    Tide.CATEGORIES.forEach(c => counts[c.key] = 0);
    routine.hours.forEach(h => counts[h.category || 'free']++);
    const rows = Tide.CATEGORIES.filter(c => c.key !== 'free').map(c => {
      const hrs = counts[c.key] || 0;
      const pct = Math.round((hrs / 24) * 100);
      return `<div class="depth-bar-row">
        <span>${c.label}</span>
        <span class="depth-bar-track"><span class="depth-bar-fill" style="width:${pct}%;background:${c.hex}"></span></span>
        <span>${hrs}h</span>
      </div>`;
    }).join('');
    el.innerHTML = rows;
  }

  function nowAngle(){
    const d = new Date();
    return (d.getHours() + d.getMinutes()/60) * 15;
  }

  function buildSvg(routine){
    const svg = document.getElementById('clockSvg');
    const isToday = Tide.state.selectedClockDay === Tide.todayKey();
    const curHour = new Date().getHours();
    let parts = [`<circle class="wheel-ring" cx="${CX}" cy="${CY}" r="${R_OUT}"/>`,
                 `<circle class="wheel-ring" cx="${CX}" cy="${CY}" r="${R_IN}"/>`];

    for (let h = 0; h < 24; h++){
      const start = h * 15, end = start + 15;
      const cat = Tide.catByKey(routine.hours[h].category);
      const fill = cat.hex === 'transparent' ? 'rgba(255,255,255,0.04)' : cat.hex;
      const isNow = isToday && h === curHour;
      parts.push(`<path class="hour-wedge${isNow ? ' is-now' : ''}" data-hour="${h}" d="${wedgePath(R_IN, R_OUT, start, end)}" fill="${fill}" opacity="${cat.key==='free' ? '1' : '0.88'}"><title>${Tide.hourLabel(h)} — ${routine.hours[h].activity || 'Unplanned'}</title></path>`);

      // tick + label every 3 hours
      if (h % 3 === 0){
        const tickOuter = polar(CX, CY, R_OUT + 14, start);
        parts.push(`<text class="hour-label" x="${tickOuter.x.toFixed(1)}" y="${tickOuter.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle">${Tide.hourLabel(h)}</text>`);
      }
      // activity glyph if present and there's room
      const label = routine.hours[h].activity;
      if (label){
        const mid = (start + end) / 2;
        const pos = polar(CX, CY, (R_IN + R_OUT)/2, mid);
        const short = label.length > 9 ? label.slice(0,8) + '…' : label;
        parts.push(`<text class="wedge-glyph" x="${pos.x.toFixed(1)}" y="${pos.y.toFixed(1)}" fill="#fff" transform="rotate(${mid} ${pos.x.toFixed(1)} ${pos.y.toFixed(1)})" dominant-baseline="middle">${Tide.escapeHtml(short)}</text>`);
      }
    }

    if (isToday){
      const tip = polar(CX, CY, R_OUT + 6, nowAngle());
      const tail = polar(CX, CY, R_IN - 14, nowAngle());
      parts.push(`<line class="now-needle" x1="${tail.x.toFixed(1)}" y1="${tail.y.toFixed(1)}" x2="${tip.x.toFixed(1)}" y2="${tip.y.toFixed(1)}"/>`);
      parts.push(`<circle cx="${CX}" cy="${CY}" r="4" fill="var(--ocean-aqua)"/>`);
    }

    svg.innerHTML = parts.join('');

    svg.querySelectorAll('.hour-wedge').forEach(el => {
      el.addEventListener('click', (e) => openEditor(parseInt(el.dataset.hour,10), e.currentTarget));
    });
  }

  function updateNowClock(){
    const d = new Date();
    const t = document.getElementById('clockNowTime');
    if (t) t.textContent = `${Tide.pad2(d.getHours())}:${Tide.pad2(d.getMinutes())}`;
  }

  function closePopover(){
    if (openPopover){ openPopover.remove(); openPopover = null; }
    const scrim = document.querySelector('.overlay-scrim');
    if (scrim) scrim.remove();
  }

  function openEditor(hour, anchorEl){
    closePopover();
    const rect = anchorEl.getBoundingClientRect();
    const stageRect = document.querySelector('.clock-stage').getBoundingClientRect();

    const scrim = document.createElement('div');
    scrim.className = 'overlay-scrim';
    scrim.addEventListener('click', closePopover);
    document.body.appendChild(scrim);

    const pop = document.createElement('div');
    pop.className = 'editor-popover';
    const current = currentRoutine.hours[hour];
    pop.innerHTML = `
      <h4>${Tide.hourLabel(hour)} – ${Tide.hourLabel((hour+1)%24)}</h4>
      <input type="text" maxlength="40" placeholder="What happens this hour?" value="${Tide.escapeHtml(current.activity)}">
      <div class="cat-grid">${Tide.CATEGORIES.map(c => `<div class="cat-swatch${c.key===current.category?' is-selected':''}" data-cat="${c.key}" style="background:${c.hex==='transparent' ? 'rgba(255,255,255,.08)' : c.hex}" title="${c.label}"></div>`).join('')}</div>
      <div class="editor-actions">
        <button class="btn-ghost" data-action="clear">Clear</button>
        <button class="btn-primary" data-action="save">Save</button>
      </div>`;
    document.body.appendChild(pop);

    let left = rect.left + rect.width/2 - 130;
    let top = rect.top + rect.height/2 + 10;
    left = Math.max(10, Math.min(left, window.innerWidth - 270));
    top = Math.max(10, Math.min(top, window.innerHeight - 260));
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    openPopover = pop;

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

    pop.querySelector('[data-action="save"]').addEventListener('click', async () => {
      currentRoutine.hours[hour] = { activity: input.value.trim(), category: input.value.trim() ? selectedCat : 'free' };
      await TideDB.put('routine', currentRoutine);
      closePopover();
      render(true);
      if (window.TideWeekly) TideWeekly.render();
      Tide.toast('Hour updated');
    });
    pop.querySelector('[data-action="clear"]').addEventListener('click', async () => {
      currentRoutine.hours[hour] = { activity:'', category:'free' };
      await TideDB.put('routine', currentRoutine);
      closePopover();
      render(true);
      if (window.TideWeekly) TideWeekly.render();
    });
  }

  async function render(skipDayPicker){
    if (!skipDayPicker) buildDayPicker();
    currentRoutine = await Tide.getRoutine(Tide.state.selectedClockDay);
    buildSvg(currentRoutine);
    buildLegend('categoryLegend');
    buildDepthBars(currentRoutine);
    updateNowClock();
    buildCopyControls();
  }

  function buildCopyControls(){
    const from = document.getElementById('copyDayFrom');
    const to = document.getElementById('copyDayTo');
    if (from.options.length) return; // already built once
    Tide.DAYS.forEach(d => {
      from.add(new Option(Tide.DAY_LABEL[d], d));
      to.add(new Option(Tide.DAY_LABEL[d], d));
    });
    from.value = Tide.state.selectedClockDay;
    to.value = Tide.DAYS[(Tide.DAYS.indexOf(Tide.state.selectedClockDay)+1) % 7];

    document.getElementById('copyDayBtn').addEventListener('click', async () => {
      if (from.value === to.value){ Tide.toast("Pick two different days"); return; }
      const src = await Tide.getRoutine(from.value);
      const copy = { day: to.value, hours: src.hours.map(h => ({...h})) };
      await TideDB.put('routine', copy);
      Tide.toast(`Copied ${Tide.DAY_LABEL[from.value]} → ${Tide.DAY_LABEL[to.value]}`);
      if (to.value === Tide.state.selectedClockDay) render(true);
      if (window.TideWeekly) TideWeekly.render();
    });
  }

  return { render, closePopover };
})();
