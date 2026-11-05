/* Flaw Medeiros — nuvem (Supabase): login real, sincronização entre aparelhos,
   fila offline e equipe. Sem configuração em config.js, o sistema segue 100% local. */
(function () {
  'use strict';
  const cfg = window.FM_CONFIG || {};
  const Cloud = { enabled: !!(cfg.supabaseUrl && cfg.supabaseKey && window.supabase && window.supabase.createClient), user: null, clinicId: null, status: 'idle' };
  window.Cloud = Cloud;
  if (!Cloud.enabled) return;

  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'fm.auth' },
  });
  Cloud.sb = sb;
  const COLLS = ['tutors', 'pets', 'plans', 'appointments', 'sessions', 'payments', 'evaluations', 'blocks', 'services'];
  const K = { cache: () => 'fm.cloud.' + Cloud.clinicId, snap: () => 'fm.snap.' + Cloud.clinicId, pull: () => 'fm.pull.' + Cloud.clinicId };
  const redirect = () => location.origin + location.pathname;
  let snap = {}, timer = null, pushing = false, again = false, poll = null;

  /* ---------- indicador de sincronização ---------- */
  const LABEL = { ok: 'Salvo na nuvem', saving: 'Salvando…', offline: 'Sem conexão, salvo neste aparelho', error: 'Erro ao sincronizar', idle: 'Nuvem' };
  Cloud.setStatus = s => {
    Cloud.status = s;
    document.querySelectorAll('[data-sync]').forEach(el => { el.dataset.state = s; el.title = LABEL[s] || ''; const t = el.querySelector('span'); if (t) t.textContent = s === 'ok' ? 'Sincronizado' : s === 'saving' ? 'Salvando' : s === 'offline' ? 'Offline' : s === 'error' ? 'Erro' : 'Nuvem'; });
  };

  /* ---------- sessão ---------- */
  Cloud.init = async () => {
    sb.auth.onAuthStateChange((ev, session) => {
      if (ev === 'PASSWORD_RECOVERY') { Cloud.recovering = true; setTimeout(() => App.renderAuth('newpass'), 0); }
      if (ev === 'SIGNED_OUT') Cloud.stop();
    });
    // volta do link de confirmação/recuperação (?code=...)
    if (/[?&]code=/.test(location.search)) {
      try { await sb.auth.exchangeCodeForSession(new URL(location.href).searchParams.get('code')); } catch (e) {}
      history.replaceState(null, '', location.pathname + location.hash);
    }
    const { data } = await sb.auth.getSession();
    if (data && data.session && !Cloud.recovering) await Cloud.start(data.session.user);
  };

  Cloud.start = async user => {
    Cloud.user = user;
    const meta = user.user_metadata || {};
    const { data: cid, error } = await sb.rpc('ensure_clinic', { clinic_name: meta.clinic || null });
    if (error) { Cloud.user = null; throw error; }
    Cloud.clinicId = cid;
    let cache = null;
    try { cache = JSON.parse(localStorage.getItem(K.cache()) || 'null'); snap = JSON.parse(localStorage.getItem(K.snap()) || '{}'); } catch (e) { snap = {}; }
    Store.db = Store.fresh(cache);
    Store.db.user = { name: meta.name || user.email.split('@')[0], email: user.email, cloud: true };
    if (!cache && meta.clinic) Store.db.clinic.name = meta.clinic;
    try { await Cloud.pull(true); } catch (e) { Cloud.setStatus('offline'); }
    await Cloud.offerMigration();
    if (!Store.db.services.length) { Store.db.services = Store.defaultServices(); Store.save(); }
    clearInterval(poll); poll = setInterval(() => Cloud.pull(), 30000);
    return true;
  };

  Cloud.stop = () => { clearInterval(poll); clearTimeout(timer); Cloud.user = null; Cloud.clinicId = null; snap = {}; Store.db = Store.fresh(null); };

  const persist = () => {
    try { const db = Object.assign({}, Store.db); delete db.user; localStorage.setItem(K.cache(), JSON.stringify(db)); localStorage.setItem(K.snap(), JSON.stringify(snap)); } catch (e) {}
  };

  /* ---------- baixar alterações ---------- */
  const current = () => {
    const m = {};
    COLLS.forEach(c => (Store.db[c] || []).forEach(r => { if (r && r.id) m[c + '|' + r.id] = JSON.stringify(r); }));
    m['meta|clinic'] = JSON.stringify(Store.db.clinic || {});
    return m;
  };
  Cloud.pull = async (full = false) => {
    if (!Cloud.clinicId) return 0;
    const since = full && !localStorage.getItem(K.pull()) ? null : localStorage.getItem(K.pull());
    const cur = current();
    let from = 0, got = 0, changed = false, last = since;
    for (;;) {
      let q = sb.from('records').select('coll,id,data,deleted,updated_at').eq('clinic_id', Cloud.clinicId).order('updated_at', { ascending: true }).order('id').range(from, from + 999);
      if (since) q = q.gt('updated_at', since);
      const { data, error } = await q;
      if (error) { Cloud.setStatus(navigator.onLine ? 'error' : 'offline'); throw error; }
      data.forEach(r => {
        const key = r.coll + '|' + r.id;
        if (snap[key] !== undefined && cur[key] !== undefined && snap[key] !== cur[key]) return; // alteração local ainda não enviada
        if (r.coll === 'meta') { if (r.id === 'clinic' && r.data) { Store.db.clinic = Object.assign(Store.db.clinic || {}, r.data); snap[key] = JSON.stringify(Store.db.clinic); changed = true; } }
        else if (Store.db[r.coll]) {
          const list = Store.db[r.coll], i = list.findIndex(x => x.id === r.id);
          if (r.deleted) { if (i >= 0) { list.splice(i, 1); changed = true; } delete snap[key]; }
          else { const s = JSON.stringify(r.data); if (i < 0) { list.push(r.data); changed = true; } else if (JSON.stringify(list[i]) !== s) { list[i] = r.data; changed = true; } snap[key] = s; }
        }
        last = r.updated_at;
      });
      got += data.length;
      if (data.length < 1000) break;
      from += 1000;
    }
    if (last) localStorage.setItem(K.pull(), last);
    persist();
    if (Cloud.status !== 'saving') Cloud.setStatus('ok');
    if (changed && !full && !document.querySelector('.modal-back') && window.App && Auth.current()) App.refresh();
    return got;
  };

  /* ---------- enviar alterações (por diferença) ---------- */
  Cloud.schedule = () => { persist(); clearTimeout(timer); timer = setTimeout(Cloud.flush, 600); Cloud.setStatus('saving'); };
  Cloud.flush = async () => {
    if (!Cloud.clinicId) return;
    if (pushing) { again = true; return; }
    pushing = true;
    try {
      const cur = current(), ups = [];
      for (const k in cur) if (snap[k] !== cur[k]) { const [coll, ...rest] = k.split('|'); ups.push({ clinic_id: Cloud.clinicId, coll, id: rest.join('|'), data: JSON.parse(cur[k]), deleted: false }); }
      for (const k in snap) if (!(k in cur)) { const [coll, ...rest] = k.split('|'); ups.push({ clinic_id: Cloud.clinicId, coll, id: rest.join('|'), data: null, deleted: true }); }
      for (let i = 0; i < ups.length; i += 400) {
        const chunk = ups.slice(i, i + 400);
        const { error } = await sb.from('records').upsert(chunk, { onConflict: 'clinic_id,coll,id' });
        if (error) throw error;
        chunk.forEach(u => { const k = u.coll + '|' + u.id; if (u.deleted) delete snap[k]; else snap[k] = cur[k]; });
      }
      persist();
      Cloud.setStatus('ok');
    } catch (e) {
      Cloud.setStatus(navigator.onLine ? 'error' : 'offline');
      clearTimeout(timer); timer = setTimeout(Cloud.flush, 10000);
    } finally {
      pushing = false;
      if (again) { again = false; Cloud.flush(); }
    }
  };
  window.addEventListener('online', () => Cloud.flush().then(() => Cloud.pull()));
  window.addEventListener('focus', () => { if (Cloud.clinicId) Cloud.pull().catch(() => {}); });
  window.addEventListener('beforeunload', e => { if (Cloud.status === 'saving') { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- levar dados locais antigos para a nuvem ---------- */
  Cloud.offerMigration = async () => {
    let legacy = null;
    try { legacy = JSON.parse(localStorage.getItem('passo.db.v1') || 'null'); } catch (e) {}
    if (!legacy || localStorage.getItem('fm.migrated.' + Cloud.clinicId)) return;
    const n = (legacy.pets || []).length + (legacy.tutors || []).length;
    const cloudCount = COLLS.reduce((s, c) => s + (c === 'services' ? 0 : (Store.db[c] || []).length), 0);
    if (!n || cloudCount) { localStorage.setItem('fm.migrated.' + Cloud.clinicId, '1'); return; }
    const ok = await UI.confirm({ title: 'Levar os dados deste aparelho para a nuvem?', text: `Encontramos ${(legacy.pets || []).length} pacientes e ${(legacy.tutors || []).length} tutores salvos neste navegador. Enviar tudo para a sua conta, para aparecer também nos outros aparelhos?`, ok: 'Enviar para a nuvem' });
    localStorage.setItem('fm.migrated.' + Cloud.clinicId, '1');
    if (!ok) return;
    COLLS.forEach(c => { if (Array.isArray(legacy[c]) && legacy[c].length) Store.db[c] = legacy[c]; });
    if (legacy.clinic) Store.db.clinic = Object.assign(Store.db.clinic || {}, legacy.clinic);
    Store.save();
    UI.toast('Dados enviados para a nuvem.');
  };

  /* ---------- autenticação (substitui a local) ---------- */
  const msg = e => {
    const m = (e && e.message) || '';
    if (/invalid login/i.test(m)) return 'E-mail ou senha incorretos.';
    if (/email not confirmed/i.test(m)) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
    if (/already registered|already been registered/i.test(m)) return 'Já existe uma conta com esse e-mail. Use Entrar.';
    if (/password should be/i.test(m)) return 'A senha precisa ter pelo menos 8 caracteres.';
    if (/rate limit|too many/i.test(m)) return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.';
    if (/fetch|network/i.test(m)) return 'Sem conexão com a internet.';
    return m || 'Não foi possível concluir. Tente de novo.';
  };
  Object.assign(Auth, {
    cloud: true,
    hasUser: () => true,
    current: () => (Cloud.user && Cloud.clinicId ? Store.db.user : null),
    async login(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email: String(email).trim(), password });
      if (error) return { ok: false, message: msg(error) };
      try { await Cloud.start(data.user); } catch (e) { return { ok: false, message: 'Entrou, mas não foi possível abrir a clínica: ' + msg(e) }; }
      return { ok: true };
    },
    async setup({ name, email, password, clinic }) {
      const { data, error } = await sb.auth.signUp({ email: String(email).trim(), password, options: { data: { name, clinic }, emailRedirectTo: redirect() } });
      if (error) return { error: msg(error) };
      if (data.user && Array.isArray(data.user.identities) && !data.user.identities.length) return { error: 'Já existe uma conta com esse e-mail. Use Entrar.' };
      if (!data.session) return { confirm: true };
      await Cloud.start(data.user);
      return { ok: true };
    },
    async logout() { try { await Cloud.flush(); } catch (e) {} await sb.auth.signOut(); Cloud.stop(); },
    async sendReset(email) { const { error } = await sb.auth.resetPasswordForEmail(String(email).trim(), { redirectTo: redirect() }); return error ? msg(error) : null; },
    async newPassword(pw) { const { data, error } = await sb.auth.updateUser({ password: pw }); if (error) return msg(error); Cloud.recovering = false; await Cloud.start(data.user); return null; },
    async checkPassword(pw) { const { error } = await sb.auth.signInWithPassword({ email: Cloud.user.email, password: pw }); return !error; },
    async changePassword(pw) { const { error } = await sb.auth.updateUser({ password: pw }); if (error) throw new Error(msg(error)); },
    async rename(name) { await sb.auth.updateUser({ data: { name } }); Store.db.user.name = name; },
    lockedFor: () => 0,
    _start() {},
  });

  /* ---------- equipe ---------- */
  Cloud.members = async () => { const { data, error } = await sb.rpc('list_members'); if (error) throw error; return data || []; };
  Cloud.addMember = async email => { const { data, error } = await sb.rpc('add_member', { member_email: email }); if (error) throw new Error(msg(error)); return data; };
  Cloud.removeMember = async id => { const { error } = await sb.rpc('remove_member', { member: id }); if (error) throw new Error(msg(error)); };
  Cloud.isOwner = async () => { const list = await Cloud.members(); const me = list.find(m => m.user_id === Cloud.user.id); return !!(me && me.role === 'owner'); };
})();
