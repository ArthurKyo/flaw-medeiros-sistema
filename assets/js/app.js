/* Passo — roteador, shell, login e dados de exemplo */
(function () {
  'use strict';
  const U = UI, esc = U.esc, I = U.icon, V = Views, F = Forms;

  const NAV = [
    ['painel', 'Painel', 'home'],
    ['agenda', 'Agenda', 'calendar'],
    ['pacientes', 'Pacientes', 'paw'],
    ['tutores', 'Tutores', 'users'],
    ['sessoes', 'Sessões', 'pulse'],
    ['financeiro', 'Financeiro', 'wallet'],
    ['ajustes', 'Ajustes', 'settings'],
  ];

  /* pegadas para a tela de login: pares alternados subindo em diagonal */
  const pawSVG = () => {
    let g = '';
    for (let i = 0; i < 9; i++) {
      const left = i % 2 === 0;
      const x = 40 + i * 46 + (left ? 0 : 22), y = 330 - i * 34 + (left ? 0 : 18);
      g += `<g class="pp" style="--i:${i}" transform="translate(${x} ${y}) rotate(${-38 + (left ? -6 : 6)})">
        <ellipse cx="0" cy="8" rx="11" ry="9.5"/><ellipse cx="-12" cy="-6" rx="4.4" ry="5.6"/><ellipse cx="-4.5" cy="-14" rx="4.4" ry="5.8"/><ellipse cx="4.5" cy="-14" rx="4.4" ry="5.8"/><ellipse cx="12" cy="-6" rx="4.4" ry="5.6"/></g>`;
    }
    return `<svg class="auth-paws" viewBox="0 0 480 380" aria-hidden="true">${g}</svg>`;
  };


  /* cachorrinho correndo (desenho original, lado esquerdo = frente) */
  const dogSVG = () => {
    const leg = (cls, x, y, l1, l2, w, paw) => `
      <g class="leg ${cls}-u" style="transform-origin:${x}px ${y}px">
        <line x1="${x}" y1="${y}" x2="${x}" y2="${y + l1}" stroke-width="${w}"/>
        <g class="${cls}-l" style="transform-origin:${x}px ${y + l1}px">
          <line x1="${x}" y1="${y + l1}" x2="${x}" y2="${y + l1 + l2}" stroke-width="${w - 2}"/>
          <ellipse cx="${x - 3}" cy="${y + l1 + l2 + 1}" rx="${paw}" ry="${paw * 0.62}"/>
        </g>
      </g>`;
    const prints = [...Array(6)].map((_, i) => `<g class="dp" style="--i:${i}" transform="translate(${236 + i * 30} ${i % 2 ? 171 : 176}) rotate(-90) scale(.42)"><ellipse cx="0" cy="8" rx="11" ry="9.5"/><ellipse cx="-12" cy="-6" rx="4.4" ry="5.6"/><ellipse cx="-4.5" cy="-14" rx="4.4" ry="5.8"/><ellipse cx="4.5" cy="-14" rx="4.4" ry="5.8"/><ellipse cx="12" cy="-6" rx="4.4" ry="5.6"/></g>`).join('');
    return `
    <div class="auth-dog" aria-hidden="true">
      <svg viewBox="0 0 420 190" class="dog-svg">
        <defs>
          <pattern id="dogDots" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.05" fill="#04161D"/></pattern>
          <linearGradient id="dogShade" x1="0" y1="0" x2="0" y2="1"><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".9"/></linearGradient>
          <mask id="dogMask"><rect width="420" height="190" fill="url(#dogShade)"/></mask>
          <radialGradient id="dogGlow"><stop offset="0" stop-color="#14D9D3" stop-opacity=".2"/><stop offset="1" stop-color="#14D9D3" stop-opacity="0"/></radialGradient>
        </defs>
        <ellipse cx="160" cy="110" rx="170" ry="80" fill="url(#dogGlow)"/>
        <linearGradient id="groundFade" gradientUnits="userSpaceOnUse" x1="-900" y1="0" x2="420" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".55" stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity=".08"/></linearGradient>
        <g class="ground"><line x1="-900" y1="178" x2="440" y2="178" stroke="url(#groundFade)"/></g>
        <g class="prints">${prints}</g>
        <g class="dust"><circle cx="232" cy="170" r="5"/><circle cx="246" cy="166" r="3.5"/><circle cx="226" cy="160" r="2.5"/></g>
        <ellipse class="dog-shadow" cx="150" cy="178" rx="78" ry="5"/>
        <g class="dog">
          <g class="legs-far">
            ${leg('fl2', 112, 110, 30, 30, 12, 7)}
            ${leg('hl2', 186, 104, 34, 30, 14, 7.5)}
          </g>
          <g class="tail" style="transform-origin:214px 84px"><path d="M212 86 C 232 78, 244 66, 252 50" fill="none" stroke-width="10" stroke-linecap="round"/></g>
          <g class="torso">
            <path class="body" d="M88 92 C 88 70, 112 64, 140 66 C 168 68, 196 62, 212 76 C 226 88, 222 112, 204 118 C 184 124, 168 116, 148 118 C 126 120, 104 124, 94 112 C 89 106, 88 100, 88 92 Z"/>
            <path class="body-shade" d="M88 92 C 88 70, 112 64, 140 66 C 168 68, 196 62, 212 76 C 226 88, 222 112, 204 118 C 184 124, 168 116, 148 118 C 126 120, 104 124, 94 112 C 89 106, 88 100, 88 92 Z" fill="url(#dogDots)" mask="url(#dogMask)"/>
            <path class="collar" d="M84 74 C 92 70, 100 72, 104 80 L 98 96 C 94 88, 88 86, 80 88 Z"/>
            <circle class="tag" cx="94" cy="96" r="4"/>
          </g>
          <g class="head">
            <path class="body" d="M58 40 C 72 30, 94 34, 100 50 C 106 64, 100 82, 88 88 C 76 94, 60 88, 50 84 C 38 82, 24 80, 22 70 C 20 62, 30 58, 40 56 C 44 48, 50 44, 58 40 Z"/>
            <path class="body-shade" d="M58 40 C 72 30, 94 34, 100 50 C 106 64, 100 82, 88 88 C 76 94, 60 88, 50 84 C 38 82, 24 80, 22 70 C 20 62, 30 58, 40 56 C 44 48, 50 44, 58 40 Z" fill="url(#dogDots)" mask="url(#dogMask)" opacity=".7"/>
            <ellipse class="nose" cx="24" cy="64" rx="6" ry="5"/>
            <path class="mouth" d="M26 76 C 34 80, 42 80, 48 76" fill="none" stroke-width="2.5" stroke-linecap="round"/>
            <path class="tongue" d="M36 78 C 36 88, 46 90, 46 80 Z"/>
            <circle class="eye" cx="60" cy="54" r="4.2"/><circle class="eye-hi" cx="61.5" cy="52.6" r="1.3"/>
            <g class="ear" style="transform-origin:80px 42px"><path d="M78 40 C 92 36, 104 46, 102 62 C 100 74, 92 80, 86 76 C 82 66, 78 54, 78 40 Z"/></g>
          </g>
          <g class="legs-near">
            ${leg('fl', 104, 108, 30, 30, 13, 7.5)}
            ${leg('hl', 196, 102, 34, 30, 15, 8)}
          </g>
        </g>
      </svg>
    </div>`;
  };

  const App = {
    theme() { return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'; },
    themeBtn(cls = 'gsq') { const l = this.theme() === 'light'; return `<button class="${cls} theme-btn" data-theme-toggle aria-label="${l ? 'Mudar para o modo escuro' : 'Mudar para o modo claro'}" data-tip="${l ? 'Modo escuro' : 'Modo claro'}">${I(l ? 'moon' : 'sun')}</button>`; },
    toggleTheme() {
      const next = this.theme() === 'light' ? 'dark' : 'light', html = document.documentElement;
      html.classList.add('theme-anim');
      html.dataset.theme = next;
      try { localStorage.setItem('fm.theme', next); } catch (e) {}
      const meta = document.querySelector('meta[name=theme-color]'); meta && meta.setAttribute('content', next === 'light' ? '#F4F7F9' : '#070B12');
      document.querySelectorAll('[data-theme-toggle]').forEach(b => { const l = next === 'light'; b.innerHTML = I(l ? 'moon' : 'sun'); b.setAttribute('aria-label', l ? 'Mudar para o modo escuro' : 'Mudar para o modo claro'); b.dataset.tip = l ? 'Modo escuro' : 'Modo claro'; b.classList.remove('spin'); void b.offsetWidth; b.classList.add('spin'); });
      clearTimeout(this._themeT); this._themeT = setTimeout(() => html.classList.remove('theme-anim'), 500);
    },
    mark() { return `<svg viewBox="0 0 32 32" class="brand-mark" aria-hidden="true"><g transform="rotate(-18 16 16)"><ellipse cx="16" cy="20" rx="6.4" ry="5.6"/><ellipse cx="8.4" cy="12.4" rx="2.6" ry="3.3"/><ellipse cx="13" cy="7.6" rx="2.6" ry="3.4"/><ellipse cx="19" cy="7.6" rx="2.6" ry="3.4"/><ellipse cx="23.6" cy="12.4" rx="2.6" ry="3.3"/></g></svg>`; },
    state: { agendaDate: U.today(), agendaView: 'semana', petTab: {}, showCancelled: false },

    go(hash) { if (location.hash === hash) this.refresh(); else location.hash = hash; },

    route() {
      const h = (location.hash || '#/painel').replace(/^#\/?/, '').split('/');
      return { page: h[0] || 'painel', id: h[1] || '' };
    },

    refresh(opts = {}) {
      this._noEnter = true;
      const keep = opts.keepFocus ? document.querySelector(opts.keepFocus) : null;
      const caret = keep ? keep.selectionStart : null;
      this.render();
      if (opts.keepFocus) { const el = document.querySelector(opts.keepFocus); if (el) { el.focus(); try { el.setSelectionRange(caret, caret); } catch (e) {} } }
    },

    render() {
      const root = document.getElementById('root');
      if (!Auth.hasUser()) return this.renderAuth('setup');
      if (!Auth.current()) return this.renderAuth('login');
      const r = this.route();
      let view;
      try {
        if (r.page === 'pacientes' && r.id) view = V.paciente(r.id);
        else if (r.page === 'tutores' && r.id) view = V.tutor(r.id);
        else if (V[r.page]) view = V[r.page]();
        else { location.hash = '#/painel'; return; }
      } catch (err) {
        console.error(err);
        view = { title: 'Erro', html: V.empty('Algo deu errado nesta tela', esc(err.message)) };
      }
      const user = Store.db.user, clinic = Store.db.clinic;
      const prevScroll = this._lastPage === location.hash ? window.scrollY : 0;
      const keepAgendaScroll = r.page === 'agenda';
      if (!keepAgendaScroll) this.state.wkScroll = null;
      const tdy = U.parse(U.today());
      const enter = !this._noEnter; this._noEnter = false;
      root.innerHTML = `
      <div class="shell">
        <aside class="rail" aria-label="Navegação">
          <a class="rail-logo" href="#/painel" aria-label="Flaw Medeiros, ir para o painel">${BrandLogo('mini')}</a>
          <nav class="rail-nav">${NAV.map(([k, n, ic]) => `<a href="#/${k}" class="rail-btn${r.page === k ? ' is-active' : ''}" aria-label="${n}" data-tip="${n}" ${r.page === k ? 'aria-current="page"' : ''}>${I(ic)}</a>`).join('')}</nav>
          <div class="rail-foot">
            <button class="rail-btn" data-logout aria-label="Sair" data-tip="Sair">${I('logout')}</button>
            <a class="rail-me" href="#/ajustes" aria-label="${esc(user.name)}, ajustes da conta" data-tip="${esc(user.name)}">${esc(U.initials(user.name))}</a>
          </div>
        </aside>
        <div class="main main-${r.page}">
          <header class="hdr">
            <div class="hdr-title">
              ${view.back ? `<a class="gsq" href="${view.back}" aria-label="Voltar">${I('left')}</a>` : `<span class="hdr-logo">${BrandLogo('mini')}</span>`}
              <h1>${esc(view.title)}</h1>
            </div>
            <div class="hdr-pills">
              <span class="gpill">${I('home')}<span><b>Clínica:</b> ${esc(clinic.name || 'Fisioterapia animal')}</span></span>
              ${window.Cloud && Cloud.enabled ? `<span class="gpill sync-pill" data-sync data-state="${Cloud.status}"><i></i><span>${Cloud.status === 'ok' ? 'Sincronizado' : 'Nuvem'}</span></span>` : ''}
              <span class="gpill gpill-date">${I('calendar')}<span>${U.DIA_C[tdy.getDay()]}, ${tdy.getDate()} ${U.MES_L[tdy.getMonth()].slice(0, 3)}</span></span>
            </div>
            <div class="hdr-act">${App.themeBtn()}<button class="gsq hdr-search" data-search aria-label="Buscar (Ctrl+K)" data-tip="Buscar  Ctrl K">${I('search')}</button>${view.action || ''}<button class="ybtn" data-quick aria-label="Criar novo">${I('plus')}<span>Novo</span></button><button class="gsq only-mobile" data-logout aria-label="Sair">${I('logout')}</button></div>
          </header>
          <main class="page page-${r.page}${r.id ? ' page-detail' : ''}${enter ? ' enter' : ''}" id="page">${view.html}</main>
        </div>
        <nav class="tabbar" aria-label="Navegação principal">
          ${NAV.slice(0, 2).map(([k, n, ic]) => `<a href="#/${k}" class="${r.page === k ? 'is-active' : ''}">${I(ic)}<span>${n}</span></a>`).join('')}
          <button class="tab-new" data-quick aria-label="Novo">${I('plus')}</button>
          ${NAV.slice(2, 4).map(([k, n, ic]) => `<a href="#/${k}" class="${r.page === k ? 'is-active' : ''}">${I(ic)}<span>${n}</span></a>`).join('')}
          <button type="button" class="${['sessoes', 'ajustes', 'financeiro'].includes(r.page) ? 'is-active' : ''}" data-more>${I('menu')}<span>Mais</span></button>
        </nav>
      </div>`;
      document.title = `${view.docTitle || view.title} | Flaw Medeiros`;
      const page = document.getElementById('page');
      view.mount && view.mount(page);
      if (enter) U.countUp(page, 180);
      window.scrollTo(0, prevScroll);
      this._lastPage = location.hash;
    },

    quickMenu() {
      const m = U.modal({
        title: 'O que você quer criar?', size: 'sm',
        body: `<div class="quick">
          <button data-q="appt">${I('calendar')}<span><b>Agendamento</b><small>Marcar um horário na agenda</small></span></button>
          <button data-q="session">${I('note')}<span><b>Sessão</b><small>Registrar evolução de atendimento</small></span></button>
          <button data-q="pet">${I('paw')}<span><b>Paciente</b><small>Nova ficha com dados do tutor</small></span></button>
          <button data-q="plan">${I('repeat')}<span><b>Plano de sessões</b><small>Pacote com quantidade de sessões</small></span></button>
          <button data-q="tutor">${I('users')}<span><b>Tutor</b><small>Cadastro de contato</small></span></button>
        </div>`,
        onMount: el => el.addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (!b) return; m.close(); setTimeout(() => App.create(b.dataset.q), 120); }),
      });
    },

    create(kind) {
      if (kind === 'appt') F.appt(null, App.route().page === 'agenda' ? { date: App.state.agendaDate } : {});
      if (kind === 'session') F.session();
      if (kind === 'pet') F.pet();
      if (kind === 'tutor') F.tutor();
      if (kind === 'plan') { if (!Store.all('pets').length) { U.toast('Cadastre um paciente antes de criar um plano.', 'error'); return F.pet(); } F.plan(); }
    },

    moreSheet() {
      const m = U.modal({
        title: 'Mais', size: 'sm',
        body: `<div class="quick">
          <a href="#/financeiro">${I('wallet')}<span><b>Financeiro</b><small>Recebimentos, valores em aberto e recibos</small></span></a>
          <button data-more-act="confirm">${I('chat')}<span><b>Confirmar amanhã</b><small>Mensagens prontas no WhatsApp</small></span></button>
          <button data-more-act="search">${I('search')}<span><b>Buscar</b><small>Paciente, tutor ou telefone</small></span></button>
          <a href="#/sessoes">${I('pulse')}<span><b>Sessões</b><small>Prontuário de todas as evoluções</small></span></a>
          <a href="#/ajustes">${I('settings')}<span><b>Ajustes</b><small>Clínica, serviços, senha e backup</small></span></a>
          <button data-logout>${I('logout')}<span><b>Sair</b><small>Encerrar a sessão neste aparelho</small></span></button>
        </div>`,
        onMount: el => el.addEventListener('click', e => { if (e.target.closest('a')) m.close(); const b = e.target.closest('[data-more-act]'); if (b) { m.close(); setTimeout(() => b.dataset.moreAct === 'confirm' ? Extra.confirmations() : Extra.search(), 120); } }),
      });
    },

    showRecovery(code, then) {
      U.modal({
        title: 'Guarde seu código de recuperação', size: 'sm',
        body: `<p class="prose">Se esquecer a senha, este código permite criar uma nova. Ele aparece só agora: anote ou tire um print e guarde em lugar seguro.</p>
          <div class="recovery"><code>${esc(code)}</code><button class="btn btn-soft btn-sm" data-copy>Copiar</button></div>
          <div class="form-actions"><span class="spacer"></span><button class="btn btn-primary" data-close>Já guardei</button></div>`,
        onMount: el => el.querySelector('[data-copy]').addEventListener('click', () => { navigator.clipboard && navigator.clipboard.writeText(code).then(() => U.toast('Código copiado.')); }),
        onClose: then,
      });
    },


    /* movimento da tela de login: contagem dos números e leve paralaxe com o mouse */
    authMotion(root) {
      if (this._authMove) { window.removeEventListener('pointermove', this._authMove); this._authMove = null; }
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) return;
      root.querySelectorAll('[data-count]').forEach((el, i) => {
        const to = Number(el.dataset.count), t0 = performance.now() + 500 + i * 140, dur = 1100;
        el.textContent = '0';
        const tick = now => {
          const p = Math.min(1, Math.max(0, (now - t0) / dur));
          el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      const stage = root.querySelector('.auth-stage');
      if (!stage || !window.matchMedia('(hover: hover) and (min-width: 901px)').matches) return;
      let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
      const loop = () => {
        cx += (tx - cx) * 0.07; cy += (ty - cy) * 0.07;
        stage.style.setProperty('--px', cx.toFixed(3)); stage.style.setProperty('--py', cy.toFixed(3));
        raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.001 ? requestAnimationFrame(loop) : 0;
      };
      this._authMove = e => {
        if (!document.body.contains(stage)) { window.removeEventListener('pointermove', this._authMove); this._authMove = null; return; }
        tx = (e.clientX / window.innerWidth - 0.5) * 2; ty = (e.clientY / window.innerHeight - 0.5) * 2;
        if (!raf) raf = requestAnimationFrame(loop);
      };
      window.addEventListener('pointermove', this._authMove, { passive: true });
    },

    /* ---------- login / primeiro acesso / recuperação ---------- */
    renderAuth(mode) {
      const root = document.getElementById('root');
      const clinic = Store.db.clinic.name;
      const pw = (name, label, ac) => `<label class="field"><span class="field-label">${label}</span><span class="pw"><input type="password" name="${name}" autocomplete="${ac}" required minlength="${name === 'password' && mode === 'login' ? 1 : 8}"><button type="button" class="pw-eye" aria-label="Mostrar senha" data-eye>${I('eye')}</button></span></label>`;
      const cloud = !!(window.Cloud && Cloud.enabled);
      const forms = {
        login: `<form class="auth-form" novalidate data-mode="login">
            <h2>Entrar</h2>
            <p class="auth-sub">Acesse a agenda e as fichas dos pacientes.</p>
            <label class="field"><span class="field-label">E-mail</span><input type="email" name="email" autocomplete="username" required inputmode="email" value="${esc(localStorage.getItem('passo.lastEmail') || '')}"></label>
            ${pw('password', 'Senha', 'current-password')}
            <div class="auth-row"><label class="check-inline"><input type="checkbox" name="remember" checked><span>Manter conectada por 30 dias</span></label><button type="button" class="link" data-mode-to="recover">Esqueci a senha</button></div>
            <p class="auth-err" role="alert" hidden></p>
            <button class="btn btn-primary btn-block" type="submit">Entrar</button>
            ${cloud ? `<p class="auth-alt">Primeira vez aqui? <button type="button" class="link" data-mode-to="setup">Criar conta da clínica</button></p>` : ''}
          </form>`,
        setup: `<form class="auth-form" novalidate data-mode="setup">
            <h2>${cloud ? 'Criar conta' : 'Criar acesso'}</h2>
            <p class="auth-sub">${cloud ? 'Sua conta funciona em qualquer aparelho, com os dados salvos na nuvem.' : 'Primeiro acesso neste aparelho. Crie o login da clínica.'}</p>
            <label class="field"><span class="field-label">Seu nome</span><input name="name" autocomplete="name" required></label>
            <label class="field"><span class="field-label">Nome da clínica</span><input name="clinic" placeholder="Ex.: Flaw Medeiros Fisioterapia Veterinária"></label>
            <label class="field"><span class="field-label">E-mail</span><input type="email" name="email" autocomplete="username" required inputmode="email"></label>
            ${pw('password', 'Senha (mínimo 8 caracteres)', 'new-password')}
            ${pw('confirm', 'Confirme a senha', 'new-password')}
            <p class="auth-err" role="alert" hidden></p>
            <button class="btn btn-primary btn-block" type="submit">${cloud ? 'Criar conta' : 'Criar acesso e entrar'}</button>
            ${cloud ? `<p class="auth-alt">Já tem conta? <button type="button" class="link" data-mode-to="login">Entrar</button></p>` : ''}
          </form>`,
        recover: cloud ? `<form class="auth-form" novalidate data-mode="recover">
            <h2>Esqueci a senha</h2>
            <p class="auth-sub">Enviamos um link para o seu e-mail para criar uma nova senha.</p>
            <label class="field"><span class="field-label">E-mail</span><input type="email" name="email" autocomplete="username" required value="${esc(localStorage.getItem('passo.lastEmail') || '')}"></label>
            <p class="auth-err" role="alert" hidden></p>
            <button class="btn btn-primary btn-block" type="submit">Enviar link</button>
            <button type="button" class="link auth-back" data-mode-to="login">Voltar para o login</button>
          </form>` : `<form class="auth-form" novalidate data-mode="recover">
            <h2>Nova senha</h2>
            <p class="auth-sub">Use o código de recuperação que apareceu quando o acesso foi criado.</p>
            <label class="field"><span class="field-label">E-mail</span><input type="email" name="email" autocomplete="username" required></label>
            <label class="field"><span class="field-label">Código de recuperação</span><input name="code" required placeholder="XXXX-XXXX-XXXX" autocapitalize="characters" spellcheck="false"></label>
            ${pw('password', 'Nova senha', 'new-password')}
            <p class="auth-err" role="alert" hidden></p>
            <button class="btn btn-primary btn-block" type="submit">Salvar nova senha</button>
            <button type="button" class="link auth-back" data-mode-to="login">Voltar para o login</button>
          </form>`,
      };
      forms.newpass = `<form class="auth-form" novalidate data-mode="newpass">
            <h2>Nova senha</h2>
            <p class="auth-sub">Crie a nova senha da sua conta.</p>
            ${pw('password', 'Nova senha (mínimo 8 caracteres)', 'new-password')}
            ${pw('confirm', 'Confirme a senha', 'new-password')}
            <p class="auth-err" role="alert" hidden></p>
            <button class="btn btn-primary btn-block" type="submit">Salvar e entrar</button>
          </form>`;
      forms.notice = `<div class="auth-form"><h2>Confira seu e-mail</h2><p class="auth-sub">${esc(this._notice || '')}</p><button type="button" class="btn btn-primary btn-block" data-mode-to="login">Ir para o login</button></div>`;
      root.innerHTML = `
      <div class="auth">
        <section class="auth-art">
          <div class="auth-brand"><span><b>Flaw Medeiros</b><small>Fisioterapia Veterinária</small></span></div>
          <div class="auth-stage" aria-hidden="true">
            <div class="as-card as-y" style="--z:14">
              <span class="as-k">Atendimentos da semana</span>
              <div class="as-stairs">${[[22, 2, 'dots'], [46, 6, 'stripes'], [70, 11, 'fade']].map(([h, n, tx], i) => `<div style="--h:${h}%;--i:${i}"><b data-count="${n}">${n}</b><i class="tx-${tx}"></i></div>`).join('')}</div>
            </div>
            <div class="as-card as-o" style="--z:26">
              <span class="as-k">Pacote de sessões</span>
              <b class="as-big"><span data-count="9">9</span><small>de 12</small></b>
              <div class="trail trail-md as-trail">${[...Array(12)].map((_, i) => `<i class="${i < 9 ? 'd' : i < 11 ? 's' : ''}" style="--i:${i}"></i>`).join('')}</div>
            </div>
            <div class="as-glass" style="--z:40"><span class="opill"><span class="live-dot"></span>Próximo às 9:30</span><b>Thor</b><small>Reabilitação neurológica</small></div>
          </div>
          ${dogSVG()}
          <h1 class="auth-title" aria-label="Cada passo da reabilitação, registrado.">${(() => { let k = 0; return 'Cada passo da reabilitação, registrado.'.split(' ').map(w => `<span class="w" aria-hidden="true">${[...w].map(c => `<span class="ch" style="--d:${k++}">${esc(c)}</span>`).join('')}</span>`).join(' '); })()}</h1>
          <p class="auth-foot">${esc(clinic || 'Flaw Medeiros Fisioterapia Veterinária')} <button type="button" class="link auth-priv" data-privacy-open>Privacidade</button></p>
        </section>
        <section class="auth-panel"><div class="auth-top">${App.themeBtn()}</div><div class="auth-panel-in"><div class="auth-logo">${BrandLogo('anim hero')}</div>${forms[mode]}</div></section>
      </div>`;
      document.title = 'Entrar | Flaw Medeiros Fisioterapia Veterinária';
      this.authMotion(root);
      const form = root.querySelector('form');
      const err = form ? form.querySelector('.auth-err') : null;
      const fail = msg => { err.hidden = false; err.textContent = msg; form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake'); };
      root.onclick = e => {
        const eye = e.target.closest('[data-eye]');
        if (eye) { const i = eye.previousElementSibling; const show = i.type === 'password'; i.type = show ? 'text' : 'password'; eye.innerHTML = I(show ? 'eyeoff' : 'eye'); eye.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha'); }
        const to = e.target.closest('[data-mode-to]'); if (to) this.renderAuth(to.dataset.modeTo);
        if (e.target.closest('[data-privacy-open]')) Clinic.privacy();
      };
      if (form) setTimeout(() => { const f = form.querySelector('input:not([value=""]):not([type=checkbox])') && mode === 'login' && form.email.value ? form.password : form.querySelector('input'); f && f.focus(); }, 50);
      form && form.addEventListener('submit', async e => {
        e.preventDefault();
        const d = U.formData(form);
        err.hidden = true;
        const btn = form.querySelector('button[type=submit]'), btnTxt = btn.textContent;
        const busy = on => { btn.disabled = on; btn.textContent = on ? 'Aguarde…' : btnTxt; };
        if (mode === 'login') {
          if (!d.email || !d.password) return fail('Informe e-mail e senha.');
          busy(true); const r = await Auth.login(d.email, d.password, d.remember); busy(false);
          if (!r.ok && r.message) return fail(r.message);
          if (!r.ok) {
            if (r.reason === 'locked') return fail(`Muitas tentativas. Tente de novo em ${Auth.lockedFor()} segundos.`);
            return fail(r.left > 0 && r.left < 3 ? `E-mail ou senha incorretos. Mais ${r.left} tentativa${r.left > 1 ? 's' : ''} antes de um bloqueio de 1 minuto.` : 'E-mail ou senha incorretos.');
          }
          localStorage.setItem('passo.lastEmail', d.email.trim().toLowerCase());
          if (!location.hash || location.hash === '#/') location.hash = '#/painel';
          this.render();
        }
        if (mode === 'setup') {
          if (!d.name) return fail('Informe seu nome.');
          if (!/^\S+@\S+\.\S+$/.test(d.email)) return fail('Informe um e-mail válido.');
          if ((d.password || '').length < 8) return fail('A senha precisa ter pelo menos 8 caracteres.');
          if (d.password !== d.confirm) return fail('As senhas não são iguais.');
          busy(true); const code = await Auth.setup(d); busy(false);
          localStorage.setItem('passo.lastEmail', d.email.trim().toLowerCase());
          if (code && code.error) return fail(code.error);
          if (code && code.confirm) { this._notice = `Enviamos um link de confirmação para ${d.email.trim()}. Abra o e-mail, clique no link e depois entre com seu e-mail e senha.`; return this.renderAuth('notice'); }
          location.hash = '#/painel';
          this.render();
          if (typeof code === 'string') this.showRecovery(code);
        }
        if (mode === 'recover' && cloud) {
          if (!/^\S+@\S+\.\S+$/.test(d.email || '')) return fail('Informe um e-mail válido.');
          busy(true); const er = await Auth.sendReset(d.email); busy(false);
          if (er) return fail(er);
          this._notice = `Se existir uma conta com ${d.email.trim()}, você vai receber um link para criar a nova senha. O link abre este site.`;
          return this.renderAuth('notice');
        }
        if (mode === 'newpass') {
          if ((d.password || '').length < 8) return fail('A senha precisa ter pelo menos 8 caracteres.');
          if (d.password !== d.confirm) return fail('As senhas não são iguais.');
          busy(true); const er = await Auth.newPassword(d.password); busy(false);
          if (er) return fail(er);
          U.toast('Senha alterada.'); location.hash = '#/painel'; return this.render();
        }
        if (mode === 'recover') {
          if ((d.password || '').length < 8) return fail('A nova senha precisa ter pelo menos 8 caracteres.');
          if (!Auth.recover(d.email, d.code, d.password)) return fail('E-mail ou código de recuperação não conferem.');
          U.toast('Senha alterada. Entre com a nova senha.');
          this.renderAuth('login');
        }
      });
    },

    async init() {
      Store.load();
      if (window.Cloud && Cloud.enabled) {
        document.getElementById('root').innerHTML = `<div class="boot"><div class="boot-logo">${BrandLogo('anim hero')}</div><p>Conectando…</p></div>`;
        try { await Cloud.init(); } catch (e) { console.error(e); }
        if (Cloud.recovering) { this.bindGlobal(); return this.renderAuth('newpass'); }
      }
      this.bindGlobal();
      this.render();
      setInterval(() => { if (Auth.current() && !document.querySelector('.modal-back') && ['painel', 'agenda'].includes(this.route().page)) this.render(); }, 5 * 60000);
    },
    bindGlobal() {
      if (this._bound) return; this._bound = true;
      window.addEventListener('hashchange', () => this.render());
      document.addEventListener('click', e => {
        if (e.target.closest('[data-logout]')) { Promise.resolve(Auth.logout()).then(() => this.renderAuth('login')); document.querySelectorAll('.modal-back').forEach(m => m.remove()); document.body.classList.remove('no-scroll'); this.renderAuth('login'); return; }
        if (e.target.closest('[data-quick]')) return this.quickMenu();
        if (e.target.closest('[data-more]')) return this.moreSheet();
        if (e.target.closest('[data-search]')) return Extra.search();
        if (e.target.closest('[data-theme-toggle]')) return this.toggleTheme();
        const n = e.target.closest('[data-new]'); if (n) return this.create(n.dataset.new);
      });
      let w = window.innerWidth;
      window.addEventListener('resize', () => { const nw = window.innerWidth; if ((w < 900) !== (nw < 900) && Auth.current() && this.route().page === 'agenda') this.render(); w = nw; });
    },
  };

  /* ---------- dados de exemplo ---------- */
  const Seed = {
    run() {
      const t = U.today(), add = n => U.addDays(t, n);
      const svc = Store.all('services');
      const S = i => (svc[i] || svc[0]).id;
      const tutors = [
        { name: 'Marina Albuquerque', phone: '85988123456', email: 'marina.alb@email.com', city: 'Fortaleza', district: 'Aldeota', street: 'Rua Silva Paulet, 1210', preferred: 'whatsapp', source: 'Indicação de veterinário', emergencyName: 'Rodrigo Albuquerque', emergencyPhone: '85991112233' },
        { name: 'Paulo Henrique Sales', phone: '85996554433', email: 'paulohs@email.com', city: 'Fortaleza', district: 'Meireles', preferred: 'ligacao', source: 'Instagram' },
        { name: 'Luana Freitas', phone: '85987009911', city: 'Eusébio', source: 'Indicação de cliente', notes: 'Prefere horários depois das 16h. Paga por PIX.' },
        { name: 'Dr. Caio Menezes', phone: '85999887766', email: 'caio.menezes@email.com', city: 'Fortaleza', district: 'Cocó', source: 'Google' },
        { name: 'Beatriz Nogueira', phone: '85981234567', city: 'Fortaleza', district: 'Fátima', source: 'Instagram' },
      ].map(x => Store.put('tutors', x));
      const pets = [
        { tutorId: tutors[0].id, name: 'Thor', species: 'cao', breed: 'Dachshund', sex: 'M', birth: add(-365 * 6 - 40), weight: '8.4', size: 'Pequeno', neutered: 'sim', status: 'tratamento', diagnosis: 'DDIV toracolombar, pós-hemilaminectomia T12-T13', complaint: 'Paraparesia após cirurgia, arrasta membros pélvicos ao andar.', history: 'Episódio agudo há 5 semanas. Cirurgia em 3 de outubro. Sensibilidade profunda preservada.', medications: 'Gabapentina 10 mg/kg 2x ao dia', vetName: 'Dra. Helena Pinho', vetClinic: 'Hospital Vet Aldeota', vetPhone: '8532221100', temper: 'Dócil', muzzle: 'nao', handling: 'Evitar pegar pelo tórax. Gosta de petisco de frango.' },
        { tutorId: tutors[1].id, name: 'Mel', species: 'cao', breed: 'Golden Retriever', sex: 'F', birth: add(-365 * 11 - 130), weight: '31.2', size: 'Grande', neutered: 'sim', status: 'tratamento', diagnosis: 'Osteoartrite bilateral de quadril', complaint: 'Rigidez ao levantar pela manhã, cansa em caminhadas curtas.', medications: 'Condroitina + glucosamina', temper: 'Dócil', handling: 'Usar tapete antiderrapante. Hidroterapia com água a 30 °C.' },
        { tutorId: tutors[2].id, name: 'Nina', species: 'gato', breed: 'SRD', sex: 'F', birth: add(-365 * 4 + 3), weight: '3.9', size: 'Pequeno', neutered: 'sim', status: 'tratamento', diagnosis: 'Pós-operatório de fratura de fêmur direito', complaint: 'Não apoia bem o membro pélvico direito.', surgeries: 'Osteossíntese com placa, 20 de setembro', temper: 'Medroso', muzzle: 'as-vezes', handling: 'Ambiente silencioso; usar toalha para conter.' },
        { tutorId: tutors[3].id, name: 'Bento', species: 'cao', breed: 'Bulldog Francês', sex: 'M', birth: add(-365 * 3 - 75), weight: '12.8', size: 'Pequeno', neutered: 'nao', status: 'tratamento', diagnosis: 'Luxação de patela grau II, membro pélvico esquerdo', temper: 'Agitado', handling: 'Sessões curtas, cansa rápido no calor (braquicefálico).' },
        { tutorId: tutors[4].id, name: 'Luna', species: 'cao', breed: 'Border Collie', sex: 'F', birth: add(-365 * 2 - 100), weight: '17.5', size: 'Médio', neutered: 'sim', status: 'avaliacao', diagnosis: 'Claudicação a esclarecer, membro torácico direito', complaint: 'Manca após correr no parque.', temper: 'Ansioso' },
        { tutorId: tutors[0].id, name: 'Pipoca', species: 'coelho', breed: 'Mini Lop', sex: 'F', birth: add(-365 * 5 - 200), weight: '1.8', status: 'alta', diagnosis: 'Fraqueza de membros pélvicos (alta em agosto)', temper: 'Medroso' },
      ].map(x => Store.put('pets', x));
      const plans = [
        Store.put('plans', { petId: pets[0].id, name: 'Reabilitação neurológica, fase 1', serviceId: S(1), total: 12, perWeek: 3, price: 1320, paid: 0, paymentStatus: 'pago', payMethod: 'PIX', start: add(-24), status: 'ativo', goals: 'Recuperar marcha com apoio dos pélvicos; propriocepção.' }),
        Store.put('plans', { petId: pets[1].id, name: 'Hidroterapia para osteoartrite', serviceId: S(2), total: 8, perWeek: 2, price: 1040, paid: 0, paymentStatus: 'parcial', payMethod: 'Cartão de crédito', start: add(-26), status: 'ativo', goals: 'Melhorar amplitude de quadril e tolerância a caminhadas.' }),
        Store.put('plans', { petId: pets[2].id, name: 'Pós-operatório de fêmur', serviceId: S(1), total: 10, perWeek: 2, price: 1100, paid: 0, paymentStatus: 'pendente', payMethod: 'Por sessão', start: add(-14), status: 'ativo' }),
        Store.put('plans', { petId: pets[3].id, name: 'Fortalecimento de quadríceps', serviceId: S(1), total: 6, perWeek: 2, price: 660, paid: 0, paymentStatus: 'pago', payMethod: 'PIX', start: add(-20), status: 'ativo' }),
        Store.put('plans', { petId: pets[5].id, name: 'Reabilitação de membros pélvicos', serviceId: S(1), total: 8, perWeek: 2, price: 800, paid: 0, paymentStatus: 'pago', start: add(-120), status: 'concluido' }),
      ];
      const pay = (pl, d, amount, method, note = '') => { const pet = Store.get('pets', pl.petId); Store.put('payments', { planId: pl.id, petId: pl.petId, tutorId: pet ? pet.tutorId : '', date: add(d), amount, method, note }); };
      pay(plans[0], -24, 660, 'PIX', 'Parcela 1 de 2'); pay(plans[0], -3, 660, 'PIX', 'Parcela 2 de 2');
      pay(plans[1], -26, 520, 'Cartão de crédito', 'Entrada'); pay(plans[2], -2, 330, 'PIX', 'Parcela 1 de 3');
      pay(plans[3], -1, 660, 'PIX');
      pay(plans[4], -120, 400, 'Dinheiro', 'Parcela 1 de 2'); pay(plans[4], -95, 400, 'Dinheiro', 'Parcela 2 de 2');
      const old = Store.put('plans', { petId: pets[1].id, name: 'Avaliação e analgesia', serviceId: S(1), total: 4, perWeek: 2, price: 520, paid: 0, start: add(-70), status: 'concluido' });
      pay(old, -70, 260, 'PIX', 'Parcela 1 de 2'); pay(old, -48, 260, 'PIX', 'Parcela 2 de 2');
      const old2 = Store.put('plans', { petId: pets[3].id, name: 'Avaliação inicial', serviceId: S(0), total: 1, perWeek: 1, price: 180, paid: 0, start: add(-150), status: 'concluido' });
      pay(old2, -150, 180, 'Cartão de débito');
      Store.all('plans').forEach(pl => Store.put('plans', { id: pl.id, paymentStatus: Store.payStatus(pl) }));
      const notes = [
        'Paciente chegou tranquilo. Cinesioterapia passiva e laser na região lombar. Ainda sem apoio voluntário dos pélvicos.',
        'Primeiros esboços de apoio com suporte de toalha. Boa resposta ao TENS, sem sinais de desconforto.',
        'Apoio intermitente do membro pélvico esquerdo. Iniciada estação com bola suíça por 3 minutos.',
        'Deu alguns passos sozinho na esteira aquática. Tutora relata que já tenta levantar em casa.',
        'Marcha com ataxia leve, mas apoiando os dois pélvicos. Aumentado tempo de esteira para 12 minutos.',
        'Cansaço menor. Subiu um degrau baixo com auxílio. Manter exercícios de propriocepção em casa.',
        'Boa evolução, apoio consistente. Reduzida analgesia conforme orientação da veterinária.',
        'Marcha mais firme; ainda cruza os pélvicos em curvas. Introduzido cavaletti baixo.',
      ];
      const mk = (pet, plan, i, date, time, pain, mob, tech) => {
        const a = Store.put('appointments', { petId: pet.id, planId: plan ? plan.id : '', serviceId: plan ? plan.serviceId : S(1), date, time, duration: 45, status: 'realizado' });
        const s = Store.put('sessions', { petId: pet.id, planId: plan ? plan.id : '', appointmentId: a.id, date, time, pain: String(pain), mobility: String(mob), techniques: tech, notes: notes[i % notes.length], homeCare: i % 3 === 0 ? 'Massagem 5 min 2x ao dia; passeios curtos na guia.' : '' });
        Store.put('appointments', { id: a.id, sessionId: s.id });
      };
      // Thor: 8 de 12 feitas
      [-24, -21, -19, -16, -14, -11, -7, -4].forEach((d, i) => mk(pets[0], plans[0], i, add(d), '09:30', Math.max(1, 7 - i), Math.min(4, 1 + Math.floor(i / 2)), ['Cinesioterapia', 'Laserterapia', i > 2 ? 'Hidroterapia' : 'Eletroterapia (TENS/FES)', 'Propriocepção']));
      // Mel: 6 de 8
      [-26, -22, -19, -15, -12, -5].forEach((d, i) => mk(pets[1], plans[1], i + 2, add(d), '16:00', 6 - Math.round(i * 0.6), 3 + (i > 3 ? 1 : 0), ['Hidroterapia', 'Termoterapia', 'Alongamento']));
      // Nina: 3 de 10
      [-14, -10, -7].forEach((d, i) => mk(pets[2], plans[2], i + 1, add(d), '17:00', 6 - i, 2 + i, ['Cinesioterapia', 'Laserterapia', 'Massoterapia']));
      // Bento: 5 de 6
      [-20, -17, -13, -10, -6].forEach((d, i) => mk(pets[3], plans[3], i + 3, add(d), '11:00', 4 - Math.floor(i / 2), 3 + Math.floor(i / 2), ['Fortalecimento', 'Propriocepção', 'Eletroterapia (TENS/FES)']));
      const fut = (pet, plan, d, time, status = 'agendado', serviceId = null, duration = 45) => Store.put('appointments', { petId: pet.id, planId: plan ? plan.id : '', serviceId: serviceId || (plan ? plan.serviceId : S(1)), date: add(d), time, duration, status });
      // atendimento de ontem ainda aberto
      fut(pets[2], plans[2], -1, '17:00', 'confirmado');
      // hoje
      fut(pets[0], plans[0], 0, '09:30', 'confirmado');
      fut(pets[3], plans[3], 0, '11:00', 'agendado');
      fut(pets[4], null, 0, '14:00', 'agendado', S(0), 60);
      fut(pets[1], plans[1], 0, '16:00', 'confirmado', S(2), 40);
      // próximos dias
      fut(pets[0], plans[0], 2, '09:30'); fut(pets[0], plans[0], 4, '09:30');
      fut(pets[2], plans[2], 2, '17:00'); fut(pets[1], plans[1], 3, '16:00', 'agendado', S(2), 40);
      fut(pets[2], plans[2], 5, '10:00'); fut(pets[4], null, 6, '08:30', 'agendado', S(4), 40);
      fut(pets[3], null, -3, '15:00', 'faltou');
      tutors.slice(0, 3).forEach(t => Store.put('tutors', { id: t.id, consent: true, consentAt: Date.now() - 20 * 86400000, consentMsg: true }));
      Store.put('evaluations', { petId: pets[0].id, date: add(-25), kind: 'inicial', pain: '7', weight: '8.1', bcs: '6', temperament: 'Com dor ao manuseio', deep_pain: 'presente', lame: { mpd: '5', mpe: '4', mtd: '0', mte: '0' }, prop: { mpd: 'ausente', mpe: 'diminuida', mtd: 'normal', mte: 'normal' }, gonio: { quadril_d_flex: 62, quadril_d_ext: 140, quadril_e_flex: 60, quadril_e_ext: 145, joelho_d_flex: 50, joelho_d_ext: 138, joelho_e_flex: 48, joelho_e_ext: 140 }, peri: { coxa_d: 15.5, coxa_e: 16.5 }, reflex: { patelar: 'aumentado', flexor: 'normal', panicular: 'diminuido' }, gait: 'Paraparesia não ambulatória, arrasta os membros pélvicos.', tests: 'Dor à palpação toracolombar. Sensibilidade profunda preservada.', plan: 'Cinesioterapia, laserterapia e TENS 3x por semana; iniciar hidroterapia quando houver apoio.' });
      Store.put('evaluations', { petId: pets[0].id, date: add(-4), kind: 'reavaliacao', pain: '2', weight: '8.4', bcs: '5', temperament: 'Colaborativo', deep_pain: 'presente', lame: { mpd: '2', mpe: '1', mtd: '0', mte: '0' }, prop: { mpd: 'diminuida', mpe: 'normal', mtd: 'normal', mte: 'normal' }, gonio: { quadril_d_flex: 55, quadril_d_ext: 152, quadril_e_flex: 54, quadril_e_ext: 155, joelho_d_flex: 45, joelho_d_ext: 148, joelho_e_flex: 44, joelho_e_ext: 150 }, peri: { coxa_d: 17, coxa_e: 17.5 }, reflex: { patelar: 'normal', flexor: 'normal', panicular: 'normal' }, gait: 'Ambulatório com ataxia leve; cruza os pélvicos em curvas.', tests: 'Sem dor à palpação lombar.', plan: 'Manter esteira aquática e propriocepção; introduzir cavaletti e subida de rampa.' });
      Store.put('blocks', { date: U.weekStart(t), start: '12:00', end: '13:30', reason: 'Almoço', repeat: 'weekdays' });
      if (!Store.db.clinic.name) Store.db.clinic.name = 'Flaw Medeiros Fisioterapia Veterinária';
      Store.save();
    },
  };

  window.App = App;
  window.Seed = Seed;
  document.addEventListener('DOMContentLoaded', () => App.init());
})();
