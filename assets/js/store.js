/* Passo — camada de dados (localStorage) + autenticação local */
(function () {
  'use strict';

  /* ---------- SHA-256 (puro JS, funciona também abrindo via file://) ---------- */
  const K = (() => {
    const k = []; let n = 2;
    while (k.length < 64) {
      let prime = true;
      for (let i = 2; i * i <= n; i++) if (n % i === 0) { prime = false; break; }
      if (prime) { const c = Math.cbrt(n); k.push(Math.floor((c - Math.floor(c)) * 4294967296) >>> 0); }
      n++;
    }
    return k;
  })();
  const rot = (x, n) => (x >>> n) | (x << (32 - n));
  function sha256(str) {
    const bytes = new TextEncoder().encode(String(str));
    const l = bytes.length;
    const len = ((l + 9 + 63) >> 6) << 6;
    const m = new Uint8Array(len); m.set(bytes); m[l] = 0x80;
    const dv = new DataView(m.buffer);
    const bits = l * 8;
    dv.setUint32(len - 4, bits >>> 0);
    dv.setUint32(len - 8, Math.floor(bits / 4294967296));
    let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const W = new Uint32Array(64);
    for (let i = 0; i < len; i += 64) {
      for (let t = 0; t < 16; t++) W[t] = dv.getUint32(i + t * 4);
      for (let t = 16; t < 64; t++) {
        const x = W[t - 15], y = W[t - 2];
        W[t] = (W[t - 16] + (rot(x, 7) ^ rot(x, 18) ^ (x >>> 3)) + W[t - 7] + (rot(y, 17) ^ rot(y, 19) ^ (y >>> 10))) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let t = 0; t < 64; t++) {
        const t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[t] + W[t]) >>> 0;
        const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H = [H[0] + a, H[1] + b, H[2] + c, H[3] + d, H[4] + e, H[5] + f, H[6] + g, H[7] + h].map(v => v >>> 0);
    }
    return H.map(v => v.toString(16).padStart(8, '0')).join('');
  }
  const hashPw = (pw, salt) => { let h = salt + ':' + pw; for (let i = 0; i < 2000; i++) h = sha256(h + salt); return h; };
  const randomHex = (n = 16) => {
    const a = new Uint8Array(n);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return [...a].map(b => b.toString(16).padStart(2, '0')).join('');
  };

  /* ---------- Banco ---------- */
  const KEY = 'passo.db.v1';
  const AUTH = 'passo.auth.v1';
  const LOCK = 'passo.lock.v1';
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const defaultServices = () => ([
    { id: uid(), name: 'Avaliação fisioterapêutica', duration: 60, price: 180, color: 'plum' },
    { id: uid(), name: 'Sessão de fisioterapia', duration: 45, price: 120, color: 'teal' },
    { id: uid(), name: 'Hidroterapia (esteira aquática)', duration: 40, price: 140, color: 'sky' },
    { id: uid(), name: 'Acupuntura', duration: 40, price: 130, color: 'amber' },
    { id: uid(), name: 'Reavaliação', duration: 40, price: 100, color: 'pist' },
  ]);

  const empty = () => ({
    version: 1,
    clinic: { name: '', phone: '', address: '', crmv: '', dayStart: 7, dayEnd: 20 },
    user: null,
    tutors: [], pets: [], plans: [], appointments: [], sessions: [], payments: [], evaluations: [], blocks: [],
    services: defaultServices(),
  });

  const TECHNIQUES = ['Cinesioterapia', 'Hidroterapia', 'Laserterapia', 'Eletroterapia (TENS/FES)', 'Termoterapia', 'Crioterapia', 'Massoterapia', 'Acupuntura', 'Ozonioterapia', 'Ultrassom terapêutico', 'Propriocepção', 'Alongamento', 'Fortalecimento', 'Bandagem'];

  const Store = {
    db: null,
    uid, TECHNIQUES,
    load() {
      try { this.db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { this.db = null; }
      if (!this.db || typeof this.db !== 'object') this.db = empty();
      const base = empty();
      for (const k of Object.keys(base)) if (this.db[k] === undefined) this.db[k] = base[k];
      this.db.clinic = Object.assign(base.clinic, this.db.clinic || {});
      return this.db;
    },
    /* banco limpo (ou a partir de um cache) — usado pela nuvem ao trocar de conta */
    fresh(cache) {
      const base = empty(); base.services = [];
      const db = Object.assign(base, cache || {});
      db.clinic = Object.assign(empty().clinic, (cache && cache.clinic) || {});
      return db;
    },
    defaultServices,
    save() {
      const cloud = window.Cloud && Cloud.enabled && Cloud.clinicId;
      if (cloud) { Cloud.schedule(); return true; }
      try { localStorage.setItem(KEY, JSON.stringify(this.db)); return true; }
      catch (e) { window.UI && UI.toast('O armazenamento do navegador está cheio. Remova fotos grandes ou exporte um backup.', 'error'); return false; }
    },
    all(c) { return this.db[c] || []; },
    get(c, id) { return (this.db[c] || []).find(x => x.id === id) || null; },
    put(c, obj) {
      const list = this.db[c];
      if (!obj.id) { obj.id = uid(); obj.createdAt = Date.now(); obj.updatedAt = Date.now(); list.push(obj); }
      else {
        const i = list.findIndex(x => x.id === obj.id);
        obj.updatedAt = Date.now();
        if (i < 0) { obj.createdAt = obj.createdAt || Date.now(); list.push(obj); }
        else list[i] = Object.assign({}, list[i], obj);
      }
      this.save();
      return this.get(c, obj.id);
    },
    del(c, id) {
      if (c === 'pets') {
        this.db.plans = this.db.plans.filter(x => x.petId !== id);
        this.db.appointments = this.db.appointments.filter(x => x.petId !== id);
        this.db.sessions = this.db.sessions.filter(x => x.petId !== id);
        this.db.evaluations = (this.db.evaluations || []).filter(x => x.petId !== id);
        const planIds = new Set(this.db.plans.filter(x => x.petId === id).map(x => x.id));
        this.db.payments = this.db.payments.filter(x => x.petId !== id && !planIds.has(x.planId));
      }
      if (c === 'plans') {
        this.db.payments = this.db.payments.filter(x => x.planId !== id);
        this.db.sessions.forEach(s => { if (s.planId === id) s.planId = ''; });
        this.db.appointments.forEach(a => { if (a.planId === id) a.planId = ''; });
      }
      if (c === 'sessions') {
        this.db.appointments.forEach(a => { if (a.sessionId === id) { a.sessionId = ''; if (a.status === 'realizado') a.status = 'confirmado'; } });
      }
      if (c === 'appointments') {
        this.db.sessions.forEach(s => { if (s.appointmentId === id) s.appointmentId = ''; });
      }
      this.db[c] = this.db[c].filter(x => x.id !== id);
      this.save();
    },

    /* ---------- consultas de domínio ---------- */
    tutorOf(pet) { return pet ? this.get('tutors', pet.tutorId) : null; },
    petsOf(tutorId) { return this.db.pets.filter(p => p.tutorId === tutorId); },
    plansOf(petId) { return this.db.plans.filter(p => p.petId === petId).sort((a, b) => (b.start || '').localeCompare(a.start || '')); },
    activePlan(petId) { return this.plansOf(petId).find(p => p.status === 'ativo') || null; },
    sessionsOf(petId) { return this.db.sessions.filter(s => s.petId === petId).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))); },
    apptsOf(petId) { return this.db.appointments.filter(a => a.petId === petId).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)); },
    service(id) { return this.get('services', id); },
    /* pagamentos: plan.paid guarda o valor de entrada; os pagamentos registrados somam a ele */
    paymentsOf(planId) { return this.db.payments.filter(x => x.planId === planId).sort((a, b) => (b.date || '').localeCompare(a.date || '')); },
    planPaid(plan) { return (Number(plan.paid) || 0) + this.db.payments.filter(x => x.planId === plan.id).reduce((s, x) => s + (Number(x.amount) || 0), 0); },
    planDue(plan) { return Math.max(0, (Number(plan.price) || 0) - this.planPaid(plan)); },
    payStatus(plan) { const paid = this.planPaid(plan), price = Number(plan.price) || 0; return paid <= 0 && price > 0 ? 'pendente' : paid >= price ? 'pago' : 'parcial'; },
    planStats(plan) {
      const total = Math.max(0, Number(plan.total) || 0);
      const done = this.db.sessions.filter(s => s.planId === plan.id).length;
      const scheduled = this.db.appointments.filter(a => a.planId === plan.id && (a.status === 'agendado' || a.status === 'confirmado') && !a.sessionId).length;
      const remaining = Math.max(0, total - done);
      return { total, done, scheduled: Math.min(scheduled, remaining), remaining, unscheduled: Math.max(0, remaining - scheduled), pct: total ? Math.min(100, Math.round(done / total * 100)) : 0 };
    },
    nextAppt(petId) {
      const now = UI.today() + ' ' + UI.nowTime();
      return this.apptsOf(petId).find(a => (a.date + ' ' + a.time) >= now && (a.status === 'agendado' || a.status === 'confirmado')) || null;
    },
    /* bloqueios de agenda (almoço, férias, feriado); "weekly" repete no mesmo dia da semana até "until" */
    blocksOn(date) {
      const dow = UI.dow(date);
      return (this.db.blocks || []).filter(b => {
        const rep = b.repeat || (b.weekly ? 'weekly' : 'none');
        if (b.date === date) return true;
        if (rep === 'none' || date < b.date || (b.until && date > b.until)) return false;
        return rep === 'weekdays' ? dow >= 1 && dow <= 5 : UI.dow(b.date) === dow;
      })
        .map(b => ({ block: true, id: b.id, date, time: b.start, duration: UI.toMin(b.end) - UI.toMin(b.start), reason: b.reason || 'Bloqueado' }));
    },
    conflicts(appt) {
      const s = UI.toMin(appt.time), e = s + (Number(appt.duration) || 0);
      const overlap = a => { const as = UI.toMin(a.time), ae = as + (Number(a.duration) || 0); return s < ae && as < e; };
      return this.db.appointments.filter(a => a.id !== appt.id && a.date === appt.date && a.status !== 'cancelado' && a.status !== 'faltou').filter(overlap)
        .concat(this.blocksOn(appt.date).filter(overlap));
    },

    /* ---------- backup ---------- */
    exportJSON() { return JSON.stringify(Object.assign({ exportedAt: new Date().toISOString() }, this.db), null, 2); },
    importJSON(text) {
      const data = JSON.parse(text);
      const needed = ['tutors', 'pets', 'plans', 'appointments', 'sessions'];
      if (!needed.every(k => Array.isArray(data[k]))) throw new Error('Arquivo não reconhecido como backup do Passo.');
      const user = this.db.user;
      delete data.exportedAt;
      this.db = Object.assign(empty(), data, { user: user || data.user });
      this.save();
    },
    wipe() { const user = this.db.user, clinic = this.db.clinic; this.db = empty(); this.db.user = user; this.db.clinic = clinic; this.save(); },
  };

  /* ---------- Autenticação local ---------- */
  const Auth = {
    hasUser() { return !!(Store.db && Store.db.user && Store.db.user.hash); },
    setup({ name, email, password, clinic }) {
      const salt = randomHex();
      const recovery = randomHex(6).toUpperCase().match(/.{4}/g).join('-');
      const rsalt = randomHex();
      Store.db.user = { name: name.trim(), email: email.trim().toLowerCase(), salt, hash: hashPw(password, salt), rsalt, rhash: hashPw(recovery.replace(/-/g, ''), rsalt), createdAt: Date.now() };
      if (clinic) Store.db.clinic.name = clinic.trim();
      Store.save();
      this._start(true);
      return recovery;
    },
    lockedFor() {
      try { const l = JSON.parse(localStorage.getItem(LOCK) || '{}'); return l.until && l.until > Date.now() ? Math.ceil((l.until - Date.now()) / 1000) : 0; } catch (e) { return 0; }
    },
    _fail() {
      let l = {}; try { l = JSON.parse(localStorage.getItem(LOCK) || '{}'); } catch (e) {}
      l.count = (l.count || 0) + 1;
      if (l.count >= 5) { l.until = Date.now() + 60000; l.count = 0; }
      localStorage.setItem(LOCK, JSON.stringify(l));
      return 5 - (l.count || 0);
    },
    login(email, password, remember) {
      if (this.lockedFor()) return { ok: false, reason: 'locked' };
      const u = Store.db.user;
      if (!u || u.email !== String(email).trim().toLowerCase() || u.hash !== hashPw(password, u.salt)) {
        const left = this._fail();
        return { ok: false, reason: 'invalid', left };
      }
      localStorage.removeItem(LOCK);
      this._start(remember);
      return { ok: true };
    },
    _start(remember) {
      const token = { email: Store.db.user.email, sig: Store.db.user.hash.slice(0, 16), exp: Date.now() + (remember ? 30 : 0.5) * 86400000 };
      sessionStorage.setItem(AUTH, JSON.stringify(token));
      if (remember) localStorage.setItem(AUTH, JSON.stringify(token)); else localStorage.removeItem(AUTH);
    },
    current() {
      if (!this.hasUser()) return null;
      let t = null;
      try { t = JSON.parse(sessionStorage.getItem(AUTH) || localStorage.getItem(AUTH) || 'null'); } catch (e) {}
      if (!t || t.exp < Date.now() || t.email !== Store.db.user.email || t.sig !== Store.db.user.hash.slice(0, 16)) return null;
      return Store.db.user;
    },
    logout() { sessionStorage.removeItem(AUTH); localStorage.removeItem(AUTH); },
    checkPassword(pw) { const u = Store.db.user; return u && u.hash === hashPw(pw, u.salt); },
    changePassword(pw) { const u = Store.db.user; u.salt = randomHex(); u.hash = hashPw(pw, u.salt); Store.save(); this._start(!!localStorage.getItem(AUTH)); },
    recover(email, code, newPw) {
      const u = Store.db.user;
      if (!u || u.email !== String(email).trim().toLowerCase()) return false;
      if (u.rhash !== hashPw(String(code).toUpperCase().replace(/[^0-9A-F]/g, ''), u.rsalt)) return false;
      u.salt = randomHex(); u.hash = hashPw(newPw, u.salt); Store.save();
      localStorage.removeItem(LOCK);
      return true;
    },
    newRecoveryCode() {
      const u = Store.db.user;
      const code = randomHex(6).toUpperCase().match(/.{4}/g).join('-');
      u.rsalt = randomHex(); u.rhash = hashPw(code.replace(/-/g, ''), u.rsalt); Store.save();
      return code;
    },
  };

  window.Store = Store;
  window.Auth = Auth;
  window._sha256 = sha256;
})();
