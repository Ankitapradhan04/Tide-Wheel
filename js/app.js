/* ============================================================
   TIDEWATCH — shared state, constants and small utilities
   ============================================================ */
const Tide = {
  DAYS: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],
  DAY_LABEL: { monday:'Monday', tuesday:'Tuesday', wednesday:'Wednesday', thursday:'Thursday', friday:'Friday', saturday:'Saturday', sunday:'Sunday' },
  DAY_SHORT: { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun' },

  CATEGORIES: [
    { key:'sleep',    label:'Sleep',        color:'var(--cat-sleep)',    hex:'#2c4870' },
    { key:'work',     label:'Work / Study', color:'var(--cat-work)',     hex:'#1c7c8c' },
    { key:'exercise', label:'Exercise',     color:'var(--cat-exercise)', hex:'#ff8b6a' },
    { key:'meals',    label:'Meals',        color:'var(--cat-meals)',    hex:'#e8a33d' },
    { key:'care',     label:'Personal care',color:'var(--cat-care)',     hex:'#4fd8c4' },
    { key:'leisure',  label:'Leisure',      color:'var(--cat-leisure)',  hex:'#8e7cc3' },
    { key:'commute',  label:'Commute',      color:'var(--cat-commute)',  hex:'#7a8b99' },
    { key:'free',     label:'Unplanned',    color:'transparent',         hex:'transparent' }
  ],

  state: {
    selectedClockDay: null,   // set in main.js on init
    selectedCalDate: null,    // 'YYYY-MM-DD'
    calViewYear: null,
    calViewMonth: null,       // 0-11
    reminderFilter: 'upcoming'
  },

  catByKey(key){
    return this.CATEGORIES.find(c => c.key === key) || this.CATEGORIES[this.CATEGORIES.length - 1];
  },

  todayKey(){
    const idx = new Date().getDay(); // 0 = Sunday
    return this.DAYS[(idx + 6) % 7];
  },

  pad2(n){ return String(n).padStart(2, '0'); },

  hourLabel(h){
    const period = h < 12 ? 'AM' : 'PM';
    let hr = h % 12; if (hr === 0) hr = 12;
    return `${hr}${period}`;
  },

  formatDateKey(d){
    return `${d.getFullYear()}-${this.pad2(d.getMonth()+1)}-${this.pad2(d.getDate())}`;
  },

  emptyRoutine(day){
    return { day, hours: Array.from({length:24}, () => ({ activity:'', category:'free' })) };
  },

  async getRoutine(day){
    const r = await TideDB.get('routine', day);
    return r || this.emptyRoutine(day);
  },

  toast(msg){
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2600);
  },

  escapeHtml(str){
    return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
};
