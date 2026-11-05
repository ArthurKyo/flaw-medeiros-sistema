/* Passo — utilitários de interface */
(function () {
  'use strict';
  const U = {};

  U.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.$ = (s, el = document) => el.querySelector(s);
  U.$$ = (s, el = document) => [...el.querySelectorAll(s)];
  U.pad = n => String(n).padStart(2, '0');

  /* ---------- datas ---------- */
  const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const MES_L = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const DIA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const DIA_C = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  U.MES_L = MES_L; U.DIA_C = DIA_C; U.DIA = DIA;
  U.iso = d => `${d.getFullYear()}-${U.pad(d.getMonth() + 1)}-${U.pad(d.getDate())}`;
  U.today = () => U.iso(new Date());
  U.nowTime = () => { const d = new Date(); return `${U.pad(d.getHours())}:${U.pad(d.getMinutes())}`; };
  U.parse = iso => { const [y, m, d] = String(iso).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  U.addDays = (iso, n) => { const d = U.parse(iso); d.setDate(d.getDate() + n); return U.iso(d); };
  U.weekStart = iso => { const d = U.parse(iso); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return U.iso(d); };
  U.dow = iso => U.parse(iso).getDay();
  U.fmtDate = iso => { if (!iso) return '—'; const d = U.parse(iso); return `${d.getDate()} ${MES[d.getMonth()]} ${d.getFullYear()}`; };
  U.fmtDM = iso => { if (!iso) return '—'; const d = U.parse(iso); return `${d.getDate()} ${MES[d.getMonth()]}`; };
  U.fmtLong = iso => { const d = U.parse(iso); return `${DIA[d.getDay()]}, ${d.getDate()} de ${MES_L[d.getMonth()]}`; };
  U.fmtTime = t => t ? t.replace(/^0/, '') : '';
  U.relDay = iso => {
    const t = U.today();
    if (iso === t) return 'hoje';
    if (iso === U.addDays(t, 1)) return 'amanhã';
    if (iso === U.addDays(t, -1)) return 'ontem';
    return U.fmtLong(iso);
  };
  U.age = birth => {
    if (!birth) return '';
    const b = U.parse(birth), n = new Date();
    let m = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth());
    if (n.getDate() < b.getDate()) m--;
    if (m < 0) return '';
    if (m < 12) return m <= 1 ? `${Math.max(m, 0)} mês` : `${m} meses`;
    const y = Math.floor(m / 12);
    return y === 1 ? '1 ano' : `${y} anos`;
  };
  U.toMin = t => { const [h, m] = String(t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  U.fromMin = m => `${U.pad(Math.floor(m / 60))}:${U.pad(m % 60)}`;

  /* ---------- números / contato ---------- */
  U.money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  U.digits = s => String(s || '').replace(/\D/g, '');
  U.fmtPhone = s => {
    const d = U.digits(s);
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return s || '';
  };
  U.wa = (phone, msg) => { let d = U.digits(phone); if (d.length <= 11) d = '55' + d; return `https://wa.me/${d}${msg ? '?text=' + encodeURIComponent(msg) : ''}`; };
  U.initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  U.firstName = name => String(name || '').trim().split(/\s+/).filter(w => !/^(dr|dra|sr|sra)\.?$/i.test(w))[0] || '';
  U.norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  /* ---------- máscaras ---------- */
  U.bindMasks = root => {
    U.$$('[data-mask="phone"]', root).forEach(i => i.addEventListener('input', () => {
      const d = U.digits(i.value).slice(0, 11);
      let v = d;
      if (d.length > 2) v = `(${d.slice(0, 2)}) ${d.slice(2)}`;
      if (d.length > 6) v = `(${d.slice(0, 2)}) ${d.slice(2, d.length === 11 ? 7 : 6)}-${d.slice(d.length === 11 ? 7 : 6)}`;
      i.value = v;
    }));
    U.$$('[data-mask="cpf"]', root).forEach(i => i.addEventListener('input', () => {
      const d = U.digits(i.value).slice(0, 11);
      i.value = d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }));
    U.$$('[data-mask="cep"]', root).forEach(i => i.addEventListener('input', () => {
      const d = U.digits(i.value).slice(0, 8);
      i.value = d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d;
    }));
  };

  /* ---------- formulários ---------- */
  U.formData = form => {
    const o = {};
    U.$$('input, select, textarea', form).forEach(el => {
      if (!el.name || el.disabled) return;
      if (el.name.endsWith('[]')) {
        const k = el.name.slice(0, -2);
        o[k] = o[k] || [];
        if (el.checked) o[k].push(el.value);
      } else if (el.type === 'checkbox') o[el.name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
      else if (el.type === 'file') { /* tratado à parte */ }
      else o[el.name] = el.value.trim();
    });
    return o;
  };

  U.resizeImage = (file, max = 520) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });

  U.download = (name, text, type = 'application/json') => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  /* ---------- toast ---------- */
  U.toast = (msg, type = 'ok') => {
    const root = document.getElementById('toast-root');
    const t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.setAttribute('role', type === 'error' ? 'alert' : 'status');
    t.innerHTML = `${U.icon(type === 'error' ? 'alert' : 'check')}<span>${U.esc(msg)}</span>`;
    root.appendChild(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, type === 'error' ? 5200 : 3200);
  };

  /* ---------- modal ---------- */
  const stack = [];
  U.modal = ({ title, body, size = 'md', onMount, onClose, subtitle = '' }) => {
    const root = document.getElementById('modal-root');
    const back = document.createElement('div');
    back.className = 'modal-back';
    const prevFocus = document.activeElement;
    back.innerHTML = `
      <div class="modal modal-${size}" role="dialog" aria-modal="true" aria-labelledby="mt-${stack.length}">
        <header class="modal-head">
          <div><h2 id="mt-${stack.length}">${U.esc(title)}</h2>${subtitle ? `<p class="modal-sub">${subtitle}</p>` : ''}</div>
          <button class="icon-btn" data-close aria-label="Fechar">${U.icon('x')}</button>
        </header>
        <div class="modal-body">${body}</div>
      </div>`;
    root.appendChild(back);
    document.body.classList.add('no-scroll');
    requestAnimationFrame(() => back.classList.add('in'));
    const api = {
      el: back.querySelector('.modal'),
      close() {
        const i = stack.indexOf(api); if (i >= 0) stack.splice(i, 1);
        back.classList.remove('in');
        setTimeout(() => back.remove(), 220);
        if (!stack.length) document.body.classList.remove('no-scroll');
        if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) {}
        onClose && onClose();
      },
    };
    stack.push(api);
    back.addEventListener('mousedown', e => { if (e.target === back) api.close(); });
    U.$$('[data-close]', back).forEach(b => b.addEventListener('click', e => { e.preventDefault(); api.close(); }));
    U.bindMasks(back);
    onMount && onMount(api.el, api);
    setTimeout(() => { const f = api.el.querySelector('[autofocus], input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea'); f && window.innerWidth > 700 && f.focus(); }, 60);
    return api;
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && stack.length) stack[stack.length - 1].close(); });

  U.confirm = ({ title, text, ok = 'Confirmar', danger = false }) => new Promise(res => {
    let answered = false;
    const m = U.modal({
      title, size: 'sm',
      body: `<p class="confirm-text">${text}</p>
        <div class="form-actions"><button class="btn btn-ghost" data-close>Voltar</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${U.esc(ok)}</button></div>`,
      onMount: el => el.querySelector('[data-ok]').addEventListener('click', () => { answered = true; m.close(); res(true); }),
      onClose: () => { if (!answered) res(false); },
    });
  });

  /* ---------- ícones (traço 1.75, desenhados para o app) ---------- */
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    paw: '<ellipse cx="12" cy="16" rx="4.2" ry="3.6"/><circle cx="6" cy="10.5" r="1.9"/><circle cx="9.6" cy="6.6" r="1.9"/><circle cx="14.4" cy="6.6" r="1.9"/><circle cx="18" cy="10.5" r="1.9"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M15.5 4.8a3.3 3.3 0 0 1 0 6.4M18 14.8c2 .7 3.2 2.4 3.5 5.2"/>',
    pulse: '<path d="M2.5 12h4l2.5-6 4 12 2.5-6h6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    phone: '<path d="M5 3.5h3.2l1.6 4.2-2.1 1.4a11 11 0 0 0 7.2 7.2l1.4-2.1 4.2 1.6V19a1.5 1.5 0 0 1-1.6 1.5C10.6 20 4 13.4 3.5 5.1A1.5 1.5 0 0 1 5 3.5z"/>',
    chat: '<path d="M4 19.5 5.3 16A8 8 0 1 1 8 18.7z"/><path d="M9 10.5c.3 1.9 2.4 4 4.5 4.5l1-1.2 1.8.8"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13M10 11v5.5M14 11v5.5"/>',
    logout: '<path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M10 16.5 5.5 12 10 7.5M5.5 12H15"/>',
    left: '<path d="m15 5-7 7 7 7"/>',
    right: '<path d="m9 5 7 7-7 7"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    note: '<path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20z"/><path d="M14 3.5V8h4M9 12h6M9 15.5h6"/>',
    alert: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.1"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    eyeoff: '<path d="M4 4l16 16M10 6c.6-.2 1.3-.3 2-.3 6 0 9.5 6.3 9.5 6.3a17 17 0 0 1-3 3.6M6.6 7.5A16 16 0 0 0 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1"/>',
    download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>',
    upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    more: '<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>',
    camera: '<path d="M4 8h3l1.8-2.5h6.4L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.4"/>',
    repeat: '<path d="M4 11V9a3 3 0 0 1 3-3h12l-3-3M20 13v2a3 3 0 0 1-3 3H5l3 3"/>',
    wallet: '<path d="M4 7.5h14.5A1.5 1.5 0 0 1 20 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z"/><path d="M4 7.5 15.5 4v3.5M16 14h.1"/>',
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    list: '<path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.1M4.5 12h.1M4.5 17.5h.1"/>',
    sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
    columns: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M9.2 4.5v15M14.8 4.5v15"/>',
  };
  U.icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

  /* contagem animada dos números [data-count] (data-format="money" para reais) */
  U.countUp = (root, delay = 0) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    U.$$('[data-count]', root).forEach((el, i) => {
      const to = Number(el.dataset.count) || 0, money = el.dataset.format === 'money';
      const fmt = v => money ? U.money(v) : String(Math.round(v));
      if (reduce || !to) { el.textContent = fmt(to); return; }
      const t0 = performance.now() + delay + Math.min(i, 14) * 45, dur = 900 + Math.min(600, to * 8);
      el.textContent = fmt(0);
      const tick = now => {
        const k = Math.min(1, Math.max(0, (now - t0) / dur));
        el.textContent = fmt(to * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(tick); else el.textContent = fmt(to);
      };
      requestAnimationFrame(tick);
    });
  };

  window.UI = U;
})();
