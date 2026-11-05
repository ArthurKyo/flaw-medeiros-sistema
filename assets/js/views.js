/* Passo — telas */
(function () {
  'use strict';
  const U = UI, esc = U.esc, F = Forms, I = U.icon;
  const V = {};

  /* ---------- componentes ---------- */
  V.avatar = (pet, size = 'md') => pet ? `<span class="avatar av-${size} sp-${pet.species || 'outro'}">${pet.photo ? `<img src="${pet.photo}" alt="">` : esc(U.initials(pet.name).slice(0, 1))}</span>` : `<span class="avatar av-${size}">?</span>`;

  V.trail = (plan, size = 'md') => {
    const st = Store.planStats(plan);
    let dots = '';
    for (let i = 0; i < st.total; i++) dots += `<i class="${i < st.done ? 'd' : i < st.done + st.scheduled ? 's' : ''}" style="--di:${i * 45}"></i>`;
    return `<div class="trail trail-${size}" role="img" aria-label="${st.done} de ${st.total} sessões feitas, ${st.scheduled} agendadas, ${st.remaining} restantes">${dots}</div>`;
  };
  V.trailLegend = plan => {
    const st = Store.planStats(plan);
    return `<div class="trail-legend"><span><i class="d"></i>${st.done} feitas</span><span><i class="s"></i>${st.scheduled} agendadas</span><span><i></i>${st.unscheduled} a agendar</span></div>`;
  };


  /* número da sessão de um agendamento dentro do pacote */
  V.sessNo = a => {
    if (!a || !a.planId) return null;
    const pl = Store.get('plans', a.planId); if (!pl) return null;
    const total = Number(pl.total) || 0;
    const ses = Store.all('sessions').filter(x => x.planId === pl.id).sort((x, y) => (x.date + (x.time || '')).localeCompare(y.date + (y.time || '')));
    let n;
    if (a.sessionId) n = ses.findIndex(x => x.id === a.sessionId) + 1;
    else n = ses.length + Store.all('appointments').filter(x => x.planId === pl.id && !x.sessionId && (x.status === 'agendado' || x.status === 'confirmado') && (x.date + x.time) < (a.date + a.time)).length + 1;
    if (n <= 0) return null;
    return { n, total, left: Math.max(0, total - n), over: n > total, plan: pl };
  };
  V.sessLabel = a => { const s = V.sessNo(a); if (!s) return ''; return s.over ? `Sessão extra (${s.n} de ${s.total})` : `Sessão ${s.n} de ${s.total}`; };

  /* anel de progresso: feitas (aqua), agendadas (magenta) e o número que falta no centro */
  V.ring = (plan, size = 'md') => {
    const st = Store.planStats(plan);
    const done = st.total ? st.done / st.total * 100 : 0, sch = st.total ? st.scheduled / st.total * 100 : 0;
    return `<span class="ring ring-${size}" role="img" aria-label="Faltam ${st.remaining} de ${st.total} sessões">
      <svg viewBox="0 0 44 44"><circle class="ring-track" cx="22" cy="22" r="18"/>
        <circle class="ring-sch" cx="22" cy="22" r="18" pathLength="100" style="--a:${(done + sch).toFixed(1)}" stroke-dasharray="${(done + sch).toFixed(1)} 100"/>
        <circle class="ring-done" cx="22" cy="22" r="18" pathLength="100" style="--a:${done.toFixed(1)}" stroke-dasharray="${done.toFixed(1)} 100"/></svg>
      <span class="ring-n"><b data-count="${st.remaining}">${st.remaining}</b><small>${st.remaining === 1 ? 'falta' : 'faltam'}</small></span></span>`;
  };

  V.pill = status => `<span class="pill st-${status}">${F.STATUS[status] || status}</span>`;
  V.emptyArt = () => `<svg class="empty-art" viewBox="0 0 120 60" aria-hidden="true">${[0, 1, 2, 3].map(i => `<g transform="translate(${12 + i * 28} ${i % 2 ? 14 : 30}) rotate(${i % 2 ? 8 : -8})"><ellipse cx="8" cy="12" rx="6" ry="5"/><circle cx="1.5" cy="5" r="2.2"/><circle cx="6" cy="1" r="2.2"/><circle cx="11" cy="1" r="2.2"/><circle cx="15" cy="5" r="2.2"/></g>`).join('')}</svg>`;
  V.empty = (title, text, btn = '') => `<div class="empty"><svg class="empty-art" viewBox="0 0 120 60" aria-hidden="true">${[0, 1, 2, 3].map(i => `<g transform="translate(${12 + i * 28} ${i % 2 ? 14 : 30}) rotate(${i % 2 ? 8 : -8})"><ellipse cx="8" cy="12" rx="6" ry="5"/><circle cx="1.5" cy="5" r="2.2"/><circle cx="6" cy="1" r="2.2"/><circle cx="11" cy="1" r="2.2"/><circle cx="15" cy="5" r="2.2"/></g>`).join('')}</svg><h3>${title}</h3><p>${text}</p>${btn}</div>`;

  const svcName = id => (Store.service(id) || {}).name || 'Atendimento';
  const svcColor = id => (Store.service(id) || {}).color || 'plum';

  /* ---------- detalhe do agendamento ---------- */
  V.apptSheet = id => {
    const a = Store.get('appointments', id); if (!a) return;
    const p = Store.get('pets', a.petId), t = Store.tutorOf(p), plan = a.planId ? Store.get('plans', a.planId) : null;
    const clinic = Store.db.clinic.name || 'clínica';
    const msg = t && p ? `Olá, ${U.firstName(t.name)}! Passando para lembrar do atendimento de ${p.name} ${U.relDay(a.date) === 'hoje' ? 'hoje' : U.relDay(a.date) === 'amanhã' ? 'amanhã' : 'na ' + U.fmtLong(a.date)} às ${U.fmtTime(a.time)}, na ${clinic}. Podemos confirmar?` : '';
    const open = a.status === 'agendado' || a.status === 'confirmado';
    const st = plan ? Store.planStats(plan) : null;
    const m = U.modal({
      title: p ? p.name : 'Agendamento', subtitle: `${U.relDay(a.date)}, ${U.fmtTime(a.time)} às ${U.fmtTime(U.fromMin(U.toMin(a.time) + Number(a.duration || 0)))}`, size: 'sm',
      body: `
        <div class="sheet">
          <div class="sheet-row">${V.avatar(p, 'lg')}<div><b>${esc(svcName(a.serviceId))}</b><span class="muted">${p ? esc(F.speciesName(p.species) + (p.breed ? ', ' + p.breed : '')) : ''}</span></div>${V.pill(a.status)}</div>
          ${t ? `<div class="sheet-contact"><span>Tutor: <b>${esc(t.name)}</b></span><div class="row-actions">
            <a class="btn btn-wa btn-sm" href="${U.wa(t.phone, msg)}" target="_blank" rel="noopener">${I('chat')}Lembrar no WhatsApp</a>
            <a class="icon-btn" href="tel:${U.digits(t.phone)}" aria-label="Ligar">${I('phone')}</a></div></div>` : ''}
          ${plan ? (() => { const sn = V.sessNo(a); return `<div class="sheet-plan">${V.ring(plan, 'md')}<div><span class="muted">${esc(plan.name)}</span><b class="sheet-plan-n">${sn ? (sn.over ? `Sessão extra, além das ${sn.total} do pacote` : `Esta é a sessão ${sn.n} de ${sn.total}`) : ''}</b><span class="sheet-plan-after">${sn && !sn.over ? (sn.left === 0 ? 'É a última do pacote. Vale oferecer a renovação.' : `Depois dela, ${sn.left === 1 ? 'falta 1 sessão' : `faltam ${sn.left} sessões`}.`) : ''}</span>${V.trail(plan, 'sm')}</div></div>`; })() : '<p class="muted small">Atendimento avulso, não desconta de pacote.</p>'}
          ${a.notes ? `<p class="sheet-notes">${esc(a.notes)}</p>` : ''}
          ${plan && Store.planDue(plan) > 0 ? `<button class="sheet-due" data-act="pay">${I('wallet')}<span>Saldo do pacote em aberto: <b>${U.money(Store.planDue(plan))}</b></span><em>Receber</em></button>` : ''}
          ${open ? `<div class="sheet-actions">
            <button class="btn btn-primary" data-act="done">${I('check')}Registrar sessão</button>
            ${a.status === 'agendado' ? `<button class="btn btn-soft" data-act="confirm">Marcar como confirmado</button>` : ''}
            <div class="sheet-minor"><button class="link" data-act="miss">Faltou</button><button class="link" data-act="cancel">Cancelar</button><button class="link" data-act="edit">Editar ou remarcar</button></div>
          </div>` : `<div class="sheet-actions">
            ${a.sessionId ? `<button class="btn btn-soft" data-act="session">${I('note')}Ver evolução</button>` : ''}
            ${a.status !== 'realizado' ? `<button class="btn btn-soft" data-act="reopen">Reabrir agendamento</button>` : ''}
            <div class="sheet-minor"><button class="link" data-act="edit">Editar</button>${p ? `<a class="link" href="#/pacientes/${p.id}">Abrir ficha</a>` : ''}</div></div>`}
          ${open && p ? `<a class="link sheet-link" href="#/pacientes/${p.id}">Abrir ficha de ${esc(p.name)}</a>` : ''}
        </div>`,
      onMount: el => {
        el.addEventListener('click', e => {
          const b = e.target.closest('[data-act]'); if (!b) { if (e.target.closest('a[href^="#"]')) m.close(); return; }
          const act = b.dataset.act;
          if (act === 'done') { m.close(); F.session(null, { appt: a }); }
          if (act === 'confirm') { Store.put('appointments', { id: a.id, status: 'confirmado' }); m.close(); U.toast('Confirmado.'); App.refresh(); }
          if (act === 'miss') { Store.put('appointments', { id: a.id, status: 'faltou' }); m.close(); U.toast('Falta registrada. A sessão não foi descontada do pacote.'); App.refresh(); }
          if (act === 'cancel') { Store.put('appointments', { id: a.id, status: 'cancelado' }); m.close(); U.toast('Agendamento cancelado.'); App.refresh(); }
          if (act === 'reopen') { Store.put('appointments', { id: a.id, status: 'agendado' }); m.close(); App.refresh(); }
          if (act === 'edit') { m.close(); F.appt(a); }
          if (act === 'pay') { m.close(); F.payment({ planId: plan.id }); }
          if (act === 'session') { m.close(); F.session(Store.get('sessions', a.sessionId), { appt: null }); }
        });
      },
    });
  };

  /* ---------- texturas e gráficos decorativos (estilo dither) ---------- */
  V.patterns = () => `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <pattern id="pt-dots" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.3" fill="#04161D"/></pattern>
    <pattern id="pt-stripes" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2.4" height="6" fill="#04161D"/></pattern>
    <pattern id="pt-grid" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#04161D"/></pattern>
    <linearGradient id="pt-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#04161D"/><stop offset="1" stop-color="#04161D" stop-opacity=".15"/></linearGradient>
  </defs></svg>`;

  const arc = (cx, cy, r, a0, a1) => {
    const p = a => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${a0 - a1 > Math.PI ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };
  V.halfDonut = segs => {
    const total = segs.reduce((s, x) => s + x.v, 0) || 1;
    let a = Math.PI, out = '';
    const gap = 0.035;
    segs.forEach(sg => {
      if (!sg.v) return;
      const span = Math.PI * sg.v / total;
      out += `<path class="seg" style="--s:${segs.indexOf(sg)}" pathLength="1" d="${arc(100, 100, 70, a - gap / 2, a - span + gap / 2)}" stroke="${sg.fill}" stroke-width="44" fill="none"/>`;
      a -= span;
    });
    if (!segs.some(s => s.v)) out = `<path d="${arc(100, 100, 70, Math.PI, 0)}" stroke="url(#pt-dots)" stroke-width="44" fill="none" opacity=".35"/>`;
    return `<svg viewBox="0 0 200 104" class="half-donut" aria-hidden="true">${out}</svg>`;
  };

  /* ================= PAINEL ================= */
  V.painel = () => {
    const S = App.state;
    const user = Store.db.user, today = U.today(), h = new Date().getHours(), now = U.nowTime();
    const greet = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    const appts = Store.all('appointments');
    const todays = appts.filter(a => a.date === today && a.status !== 'cancelado').sort((a, b) => a.time.localeCompare(b.time));
    const open = a => a.status === 'agendado' || a.status === 'confirmado';
    const queue = todays.filter(open);
    const nextIdx = Math.max(0, queue.findIndex(a => U.fromMin(U.toMin(a.time) + Number(a.duration || 0)) >= now));
    let qi = S.queueIdx == null ? nextIdx : Math.min(S.queueIdx, Math.max(0, queue.length - 1));
    let focus = queue[qi];
    let upcomingLabel = '';
    if (!focus) {
      focus = appts.filter(a => open(a) && a.date > today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
      if (focus) upcomingLabel = U.relDay(focus.date);
    }
    const pending = appts.filter(a => open(a) && (a.date < today || (a.date === today && U.fromMin(U.toMin(a.time) + Number(a.duration)) < now))).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

    // semana
    const wk = U.weekStart(today), wkEnd = U.addDays(wk, 6);
    const wkA = appts.filter(a => a.date >= wk && a.date <= wkEnd);
    const st4 = [
      ['Faltas', wkA.filter(a => a.status === 'faltou').length, 'dots'],
      ['A confirmar', wkA.filter(a => a.status === 'agendado').length, 'grid'],
      ['Confirmados', wkA.filter(a => a.status === 'confirmado').length, 'stripes'],
      ['Realizados', wkA.filter(a => a.status === 'realizado').length, 'fade'],
    ];
    const max = Math.max(1, ...st4.map(x => x[1]));

    // pacotes
    const plans = Store.all('plans');
    const active = plans.filter(p => p.status === 'ativo').map(p => ({ p, st: Store.planStats(p) }));
    const ending = active.filter(x => x.st.remaining <= 2).sort((a, b) => a.st.remaining - b.st.remaining);
    const segs = [
      { k: 'Em dia', v: active.length - ending.length, fill: '#04161D', sw: 'sw-solid' },
      { k: 'Terminando', v: ending.length, fill: 'url(#pt-stripes)', sw: 'sw-stripes' },
      { k: 'Concluídos', v: plans.filter(p => p.status === 'concluido').length, fill: 'url(#pt-dots)', sw: 'sw-dots' },
      { k: 'Pausados', v: plans.filter(p => p.status === 'pausado').length, fill: 'url(#pt-grid)', sw: 'sw-grid' },
    ];
    const receivable = plans.filter(p => p.status !== 'cancelado').reduce((s, p) => s + Store.planDue(p), 0);

    // próximo paciente
    let focusHtml;
    if (focus) {
      const p = Store.get('pets', focus.petId), t = Store.tutorOf(p), pl = focus.planId ? Store.get('plans', focus.planId) : null;
      const pst = pl ? Store.planStats(pl) : null;
      const mins = focus.date === today ? U.toMin(focus.time) - U.toMin(now) : null;
      const when = upcomingLabel ? `${upcomingLabel[0].toUpperCase() + upcomingLabel.slice(1)}, ${U.fmtTime(focus.time)}` : mins != null && mins <= 0 && mins > -Number(focus.duration) ? 'Em atendimento' : mins != null && mins > 0 && mins < 60 ? `Em ${mins} min` : `Às ${U.fmtTime(focus.time)}`;
      focusHtml = `
        <div class="nx-stack">
          <article class="nx-card" data-appt="${focus.id}" tabindex="0" role="button" aria-label="Abrir atendimento de ${esc(p ? p.name : '')}">
            <div class="nx-photo">${p && p.photo ? `<img src="${p.photo}" alt="">` : `<span class="nx-orb">${esc(U.initials(p ? p.name : '?').slice(0, 1))}</span>`}</div>
            ${pl ? `<div class="nx-ring">${V.ring(pl, 'md')}</div>` : ''}<a class="gsq nx-star" href="#/pacientes/${p ? p.id : ''}" aria-label="Abrir ficha">${I('right')}</a>
            <div class="nx-body">
              <span class="opill">${I('clock')}${when}</span>
              <h3>${esc(p ? p.name : '?')}</h3>
              <p>${esc(svcName(focus.serviceId))}</p>
              <div class="nx-meta"><span>${V.sessLabel(focus) || 'Avulso'}</span>${t ? `<span>Tutor ${esc(U.firstName(t.name))}</span>` : ''}</div>
            </div>
            <button class="ysq nx-go" data-done="${focus.id}" aria-label="Registrar sessão de ${esc(p ? p.name : '')}">${I('note')}</button>
          </article>
        </div>`;
    } else {
      focusHtml = `<div class="nx-empty">${V.emptyArt()}<p>Nenhum atendimento marcado nos próximos dias.</p><button class="ybtn" data-new="appt">${I('plus')}<span>Agendar</span></button></div>`;
    }

    // rota do dia
    const sH = Number(Store.db.clinic.dayStart) || 7, eH = Number(Store.db.clinic.dayEnd) || 20;
    const pos = t => Math.min(100, Math.max(0, (U.toMin(t) - sH * 60) / ((eH - sH) * 60) * 100));
    const nowPos = pos(now);
    const wave = (() => { let d = 'M0 50'; for (let x = 0; x <= 1000; x += 25) d += ` L${x} ${(50 + Math.sin(x / 1000 * Math.PI * 3) * 16).toFixed(1)}`; return d; })();
    const waveY = pct => 50 + Math.sin(pct / 100 * Math.PI * 3) * 16;
    const nodes = todays.map((a, i) => {
      const p = Store.get('pets', a.petId), x = pos(a.time), y = waveY(x);
      const isNext = queue[nextIdx] && queue[nextIdx].id === a.id && a.time >= now.slice(0, 5) ? true : (queue[nextIdx] && queue[nextIdx].id === a.id);
      const cls = a.status === 'realizado' ? 'is-done' : a.status === 'faltou' ? 'is-miss' : isNext ? 'is-next' : '';
      return `<button class="rt-node ${cls} ${i % 2 ? 'lbl-down' : 'lbl-up'}" style="--n:${i};left:${(2 + x * 0.96).toFixed(2)}%;top:${(16 + y * 0.62).toFixed(2)}%" data-appt="${a.id}" aria-label="${esc(p ? p.name : '')} às ${U.fmtTime(a.time)}">
        <span class="rt-dot">${p && p.photo ? `<img src="${p.photo}" alt="">` : esc(U.initials(p ? p.name : '?').slice(0, 1))}</span>
        <span class="rt-lbl"><b>${esc(p ? p.name : '?')}</b><small>${U.fmtTime(a.time)}</small></span></button>`;
    }).join('');
    const ticks = []; for (let hh = sH; hh <= eH; hh += 2) ticks.push(`<span style="left:${(hh - sH) / (eH - sH) * 100}%">${hh}h</span>`);

    // tabela de pacientes em tratamento
    const rows = Store.all('pets').filter(p => p.status === 'tratamento' || p.status === 'avaliacao').map(p => {
      const pl = Store.activePlan(p.id), st = pl ? Store.planStats(pl) : null, nx = Store.nextAppt(p.id), t = Store.tutorOf(p);
      const hasPending = pending.some(a => a.petId === p.id);
      const tag = hasPending ? ['ypill', 'Sessão a registrar'] : st && st.remaining <= 2 ? ['opill', st.remaining === 0 ? 'Pacote concluído' : 'Fim do pacote'] : p.status === 'avaliacao' ? ['gpill-s', 'Em avaliação'] : ['bpill', 'Em dia'];
      return { p, pl, st, nx, t, tag, sort: (nx ? nx.date + nx.time : '9999') };
    }).sort((a, b) => a.sort.localeCompare(b.sort));

    const lim = U.addDays(today, 7);
    const upcoming = appts.filter(a => open(a) && ((a.date === today && U.fromMin(U.toMin(a.time) + Number(a.duration || 0)) >= now) || (a.date > today && a.date <= lim))).sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));
    const groups = []; upcoming.forEach(a => { const g = groups.find(x => x[0] === a.date); g ? g[1].push(a) : groups.push([a.date, [a]]); });
    const dayTitle = d => { const r = U.relDay(d); return r === 'hoje' ? 'Hoje' : r === 'amanhã' ? 'Amanhã' : r[0].toUpperCase() + r.slice(1); };
    let lead;
    if (!Store.all('pets').length) lead = 'Comece cadastrando o primeiro paciente.';
    else if (!todays.length) lead = 'Nenhum atendimento hoje.';
    else lead = `${queue.length ? `${queue.length} de ${todays.length} atendimentos pela frente hoje.` : `Os ${todays.length} atendimentos de hoje já passaram.`}`;

    return {
      title: 'Painel',
      html: `${V.patterns()}
      <p class="greet"><b>${greet}, ${esc(U.firstName(user.name))}.</b> ${lead}</p>
      ${(() => { const al = Extra.alerts(); return al.length ? `<div class="alerts">${al.map((x, i) => x.href ? `<a class="alert al-${x.tone}" href="${x.href}" style="--k:${i}">${I(x.ic)}<span>${esc(x.t)}</span></a>` : `<button class="alert al-${x.tone}" data-alert="${x.act}" style="--k:${i}">${I(x.ic)}<span>${esc(x.t)}</span></button>`).join('')}</div>` : ''; })()}
      ${!Store.all('pets').length ? `<div class="hello-cta"><button class="ybtn" data-new="pet">${I('plus')}<span>Cadastrar paciente</span></button><button class="gbtn" data-seed>Ver com dados de exemplo</button></div>` : ''}
      <div class="bento">
        <section class="ycard b-week reveal" style="--r:0">
          <header class="c-head"><h2>Semana</h2><a class="csq" href="#/agenda" aria-label="Abrir agenda">${I('columns')}</a></header>
          <div class="stairs">${st4.map(([k, v, tx], i) => `<div class="stair" style="--h:${Math.round(16 + v / max * 62)}%"><div class="stair-n"><b data-count="${v}">${v}</b><span>${k}</span></div><i class="tx-${tx}"></i></div>`).join('')}</div>
        </section>
        <section class="ocard b-plans reveal" style="--r:1">
          <header class="c-head"><h2>Pacotes</h2><a class="csq" href="#/pacientes" aria-label="Ver pacientes">${I('list')}</a></header>
          <div class="plans-viz">
            <ul class="legend">${segs.map(s => `<li><i class="${s.sw}"></i>${s.k}<b data-count="${s.v}">${s.v}</b></li>`).join('')}</ul>
            <div class="donut-wrap"><span class="ypill donut-badge"><span data-count="${active.length}">${active.length}</span> ativos</span>${V.halfDonut(segs)}</div>
          </div>
          <p class="plans-foot"><span data-count="${receivable}" data-format="money">${U.money(receivable)}</span> a receber</p>
        </section>
        <section class="glass b-next reveal" style="--r:2">
          <header class="c-head"><h2>${upcomingLabel ? 'Próximo atendimento' : 'Fila de hoje'}</h2>
            ${queue.length > 1 ? `<div class="dashes" role="group" aria-label="Fila de atendimentos">${queue.map((a, i) => `<button class="${i === qi ? 'is-on' : ''}" data-q-idx="${i}" aria-label="${esc((Store.get('pets', a.petId) || {}).name || '')}, ${U.fmtTime(a.time)}"></button>`).join('')}</div>` : ''}
            <a class="gsq" href="#/agenda" aria-label="Abrir agenda">${I('right')}</a></header>
          ${focusHtml}
        </section>
        <section class="glass b-route reveal" style="--r:3">
          <header class="c-head"><h2>Rota do dia</h2>${pending.length ? `<button class="opill opill-btn" data-appt="${pending[0].id}">${I('alert')}${pending.length === 1 ? '1 sessão a registrar' : pending.length + ' sessões a registrar'}</button>` : ''}<a class="gsq" href="#/agenda" aria-label="Abrir agenda">${I('right')}</a></header>
          ${todays.length ? `<div class="route-scroll"><div class="route">
            <div class="route-map" aria-hidden="true"></div>
            <svg class="route-line" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true"><path d="${wave}"/></svg>
            ${nowPos > 0 && nowPos < 100 ? `<span class="rt-now" style="left:${(2 + nowPos * 0.96).toFixed(2)}%"><em>agora</em></span>` : ''}
            ${nodes}
            <div class="route-ticks">${ticks.join('')}</div>
          </div></div>` : `<div class="route route-empty"><div class="route-map" aria-hidden="true"></div><p>Sem atendimentos hoje. Use Novo para agendar.</p></div>`}
        </section>
      </div>

      <div class="duo">
        <section class="glass upc reveal" style="--r:4">
          <header class="c-head"><h2>Próximos atendimentos</h2><span class="c-sub">${upcoming.length ? `${upcoming.length} nos próximos 7 dias` : ''}</span><a class="gsq" href="#/agenda" aria-label="Abrir agenda">${I('calendar')}</a></header>
          ${upcoming.length ? groups.map(([day, list]) => `<div class="upc-day">
            <h3>${dayTitle(day)}<span>${list.length === 1 ? '1 atendimento' : list.length + ' atendimentos'}</span></h3>
            <ul>${list.map((a, j) => { const p = Store.get('pets', a.petId), t = Store.tutorOf(p), sn = V.sessNo(a); return `<li style="--k:${j}"><button class="upc-row" data-appt="${a.id}">
              <time>${U.fmtTime(a.time)}<small>${a.duration} min</small></time>
              ${V.avatar(p)}
              <span class="upc-main"><b>${esc(p ? p.name : '?')}</b><small>${esc(svcName(a.serviceId))}${t ? ', ' + esc(U.firstName(t.name)) : ''}</small></span>
              <span class="upc-sess">${sn ? (sn.over ? '<em class="sess-chip sess-extra">extra</em>' : `<em class="sess-chip${sn.left <= 1 ? ' sess-last' : ''}">${sn.n}<i>/${sn.total}</i></em><small>${sn.left === 0 ? 'última sessão' : sn.left === 1 ? 'falta 1 depois' : `faltam ${sn.left} depois`}</small>`) : '<small class="muted">avulso</small>'}</span>
              ${V.pill(a.status)}
            </button></li>`; }).join('')}</ul></div>`).join('') : V.empty('Agenda livre', 'Nenhum atendimento nos próximos 7 dias.', `<button class="ybtn" data-new="appt">${I('plus')}<span>Agendar</span></button>`)}
        </section>
        <section class="glass left reveal" style="--r:5">
          <header class="c-head"><h2>Sessões restantes</h2><span class="c-sub">${active.length ? `${active.length} ${active.length === 1 ? 'pacote ativo' : 'pacotes ativos'}` : ''}</span><a class="gsq" href="#/pacientes" aria-label="Ver pacientes">${I('paw')}</a></header>
          ${active.length ? `<ul class="left-list">${active.slice().sort((x, y) => x.st.remaining - y.st.remaining).map(({ p: pl, st }, j) => { const pet = Store.get('pets', pl.petId), nx = pet ? Store.nextAppt(pet.id) : null; return `<li style="--k:${j}">
            <a class="left-row" href="#/pacientes/${pet ? pet.id : ''}">
              ${V.ring(pl, 'md')}
              <span class="left-main"><b>${esc(pet ? pet.name : '?')}</b><small>${esc(pl.name)}</small>
                <span class="left-bar"><i class="b-done" style="--w:${st.total ? st.done / st.total * 100 : 0}%"></i><i class="b-sch" style="--w:${st.total ? st.scheduled / st.total * 100 : 0}%"></i></span>
                <small class="left-meta">${st.done} feitas, ${st.scheduled} agendadas${st.unscheduled ? `, <b>${st.unscheduled} sem horário</b>` : ''}</small>
              </span>
              <span class="left-side">${nx ? `<small>Próxima</small><span>${U.relDay(nx.date) === 'hoje' || U.relDay(nx.date) === 'amanhã' ? U.relDay(nx.date) : U.fmtDM(nx.date)}, ${U.fmtTime(nx.time)}</span>` : '<small class="warn">Sem horário marcado</small>'}</span>
            </a>
            ${st.remaining <= 2 ? `<button class="renew" data-renew="${pl.id}">${I('repeat')}${st.remaining === 0 ? 'Renovar pacote' : 'Renovar'}</button>` : st.unscheduled ? `<button class="renew renew-soft" data-sched="${pet ? pet.id : ''}" data-plan="${pl.id}">${I('calendar')}Agendar</button>` : ''}
          </li>`; }).join('')}</ul>` : V.empty('Nenhum pacote ativo', 'Crie um plano na ficha do paciente para acompanhar quantas sessões faltam.')}
        </section>
      </div>`,
      mount(root) {
        root.addEventListener('click', e => {
          if (e.target.closest('[data-alert="confirm"]')) return Extra.confirmations();
          const qd = e.target.closest('[data-q-idx]'); if (qd) { S.queueIdx = Number(qd.dataset.qIdx); return App.refresh(); }
          const dn = e.target.closest('[data-done]'); if (dn) { e.stopPropagation(); return F.session(null, { appt: Store.get('appointments', dn.dataset.done) }); }
          if (e.target.closest('.nx-star')) return;
          const rn = e.target.closest('[data-renew]'); if (rn) { e.preventDefault(); return F.plan(null, { from: Store.get('plans', rn.dataset.renew) }); }
          const sc = e.target.closest('[data-sched]'); if (sc) { e.preventDefault(); return F.appt(null, { petId: sc.dataset.sched, planId: sc.dataset.plan }); }
          const ap = e.target.closest('[data-appt]'); if (ap) return V.apptSheet(ap.dataset.appt);
          if (e.target.closest('[data-seed]')) { Seed.run(); App.refresh(); U.toast('Dados de exemplo carregados. Você pode apagá-los em Ajustes.'); }
        });
        root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-appt]')) V.apptSheet(e.target.dataset.appt); });
      },
    };
  };

  /* ================= AGENDA ================= */
  V.agenda = () => {
    const S = App.state;
    const mobile = window.matchMedia('(max-width: 899px)').matches;
    const view = mobile && S.agendaView === 'semana' ? 'dia' : S.agendaView;
    const date = S.agendaDate;
    const wk = U.weekStart(date);
    const days = [...Array(7)].map((_, i) => U.addDays(wk, i));
    const today = U.today();
    const appts = Store.all('appointments');
    const startH = Number(Store.db.clinic.dayStart) || 7, endH = Number(Store.db.clinic.dayEnd) || 20;
    const HOUR = 64;
    const showCancel = S.showCancelled;
    const visible = a => showCancel || a.status !== 'cancelado';

    const d0 = U.parse(days[0]), d6 = U.parse(days[6]);
    const range = d0.getMonth() === d6.getMonth() ? `${d0.getDate()} a ${d6.getDate()} de ${U.MES_L[d6.getMonth()]}` : `${d0.getDate()} ${U.MES_L[d0.getMonth()].slice(0, 3)} a ${d6.getDate()} ${U.MES_L[d6.getMonth()].slice(0, 3)}`;

    const layout = list => {
      const items = list.map(a => ({ a, s: U.toMin(a.time), e: U.toMin(a.time) + Math.max(20, Number(a.duration) || 45) })).sort((x, y) => x.s - y.s || y.e - x.e);
      let cluster = [], maxEnd = -1; const out = [];
      const flush = () => { const lanes = []; cluster.forEach(it => { let l = lanes.findIndex(end => end <= it.s); if (l < 0) { l = lanes.length; lanes.push(0); } lanes[l] = it.e; it.lane = l; }); cluster.forEach(it => { it.lanes = lanes.length; out.push(it); }); cluster = []; };
      items.forEach(it => { if (it.s >= maxEnd && cluster.length) flush(); cluster.push(it); maxEnd = Math.max(maxEnd, it.e); });
      if (cluster.length) flush();
      return out;
    };

    let body = '';
    if (view === 'semana') {
      const hours = []; for (let h = startH; h < endH; h++) hours.push(h);
      const nowMin = U.toMin(U.nowTime());
      body = `<div class="wk" style="--hour:${HOUR}px;--rows:${endH - startH}">
        <div class="wk-head"><span></span>${days.map(d => { const dt = U.parse(d); return `<button class="wk-day${d === today ? ' is-today' : ''}" data-day="${d}"><span>${U.DIA_C[dt.getDay()]}</span><b>${dt.getDate()}</b></button>`; }).join('')}</div>
        <div class="wk-scroll"><div class="wk-body">
          <div class="wk-hours">${hours.map(h => `<span>${h}h</span>`).join('')}</div>
          ${days.map(d => `<div class="wk-col${d === today ? ' is-today' : ''}${U.dow(d) === 0 ? ' is-sun' : ''}" data-date="${d}">
            ${d === today && nowMin >= startH * 60 && nowMin <= endH * 60 ? `<span class="wk-now" style="top:${(nowMin - startH * 60) / 60 * HOUR}px"></span>` : ''}
            ${Store.blocksOn(d).map(b => { const bs = U.toMin(b.time) - startH * 60; if (bs + b.duration <= 0 || bs >= (endH - startH) * 60) return ''; const top = Math.max(0, bs) / 60 * HOUR, h = (Math.min(b.duration + Math.min(0, bs), (endH - startH) * 60 - Math.max(0, bs))) / 60 * HOUR; return `<button class="wk-block" data-block="${b.id}" style="top:${top}px;height:${h}px" aria-label="Bloqueio: ${esc(b.reason)}"><span>${esc(b.reason)}</span></button>`; }).join('')}
            ${layout(appts.filter(a => a.date === d && visible(a))).map(({ a, s, e, lane, lanes }) => {
              const p = Store.get('pets', a.petId);
              const top = (s - startH * 60) / 60 * HOUR, hgt = Math.max(26, (e - s) / 60 * HOUR - 3);
              return `<button class="ev c-${svcColor(a.serviceId)} st-${a.status}${hgt < 44 ? ' ev-short' : ''}" data-appt="${a.id}" style="top:${top}px;height:${hgt}px;left:calc(${lane / lanes * 100}% + 3px);width:calc(${100 / lanes}% - 6px)">
                <b>${esc(p ? p.name : '?')}${(() => { const sn = V.sessNo(a); return sn && !sn.over ? ` <em class="ev-sess">${sn.n}/${sn.total}</em>` : ''; })()}</b><span>${U.fmtTime(a.time)} ${esc(svcName(a.serviceId))}</span></button>`;
            }).join('')}
          </div>`).join('')}
        </div></div>
      </div>`;
    } else if (view === 'mes') {
      body = Clinic.monthView(date);
    } else {
      const list = appts.filter(a => a.date === date && visible(a)).sort((a, b) => a.time.localeCompare(b.time));
      const dayBlocks = Store.blocksOn(date);
      body = `<div class="daystrip">${days.map(d => { const dt = U.parse(d); const n = appts.filter(a => a.date === d && a.status !== 'cancelado').length; return `<button class="ds${d === date ? ' is-sel' : ''}${d === today ? ' is-today' : ''}" data-day="${d}" aria-pressed="${d === date}"><span>${U.DIA_C[dt.getDay()]}</span><b>${dt.getDate()}</b><i>${n ? n : ''}</i></button>`; }).join('')}</div>
      <section class="panel day-panel">
        <header class="panel-head"><h2>${U.relDay(date) === U.fmtLong(date) ? U.fmtLong(date) : U.relDay(date)[0].toUpperCase() + U.relDay(date).slice(1) + ', ' + U.fmtLong(date).split(', ')[1]}</h2><button class="btn btn-soft btn-sm" data-new-at="${date}">${I('plus')}Agendar</button></header>
        ${dayBlocks.length ? `<ul class="day-blocks">${dayBlocks.map(b => `<li><button data-block="${b.id}">${I('clock')}<span><b>${esc(b.reason)}</b> das ${U.fmtTime(b.time)} às ${U.fmtTime(U.fromMin(U.toMin(b.time) + b.duration))}</span></button></li>`).join('')}</ul>` : ''}
        ${list.length ? `<ol class="timeline">${list.map(a => { const p = Store.get('pets', a.petId), t = Store.tutorOf(p); return `<li class="tl-item" data-appt="${a.id}" tabindex="0" role="button">
          <time>${U.fmtTime(a.time)}<small>${a.duration} min</small></time><span class="tl-bar c-${svcColor(a.serviceId)}"></span>${V.avatar(p)}
          <div class="tl-main"><b>${esc(p ? p.name : '?')}</b><span>${esc(svcName(a.serviceId))}${V.sessLabel(a) ? ', ' + V.sessLabel(a).toLowerCase() : ''}</span></div>${V.pill(a.status)}</li>`; }).join('')}</ol>` : V.empty('Nenhum atendimento neste dia', 'Toque em Agendar para marcar um horário.')}
      </section>`;
    }

    return {
      title: 'Agenda',
      html: `
      <div class="toolbar">
        <div class="tb-nav">
          <button class="icon-btn" data-nav="-1" aria-label="${view === 'semana' ? 'Semana anterior' : view === 'mes' ? 'Mês anterior' : 'Dia anterior'}">${I('left')}</button>
          <button class="btn btn-ghost btn-sm" data-nav="0">Hoje</button>
          <button class="icon-btn" data-nav="1" aria-label="${view === 'semana' ? 'Próxima semana' : view === 'mes' ? 'Próximo mês' : 'Próximo dia'}">${I('right')}</button>
          <h2 class="tb-title">${view === 'semana' ? range : U.MES_L[U.parse(date).getMonth()] + ' ' + U.parse(date).getFullYear()}</h2>
        </div>
        <div class="tb-right">
          <button class="btn btn-ghost btn-sm" data-block-new>${I('clock')}Bloquear horário</button>
          <button class="btn btn-soft btn-sm" data-confirm-next>${I('chat')}Confirmar ${U.relDay(Extra.nextDay())}</button>
          <label class="check-inline"><input type="checkbox" data-cancelled ${showCancel ? 'checked' : ''}><span>Mostrar cancelados</span></label>
          <div class="seg seg-sm" role="group" aria-label="Visualização">
            <label><input type="radio" name="v" value="dia" ${view === 'dia' ? 'checked' : ''}><span>${I('list')}Dia</span></label>
            ${mobile ? '' : `<label><input type="radio" name="v" value="semana" ${view === 'semana' ? 'checked' : ''}><span>${I('columns')}Semana</span></label>`}
            <label><input type="radio" name="v" value="mes" ${view === 'mes' ? 'checked' : ''}><span>${I('calendar')}Mês</span></label></div>
        </div>
      </div>
      ${body}
      ${view === 'semana' ? `<p class="hint">Clique num horário vazio para agendar e arraste um atendimento para remarcar. A cor indica o serviço; áreas listradas são horários bloqueados.</p>` : ''}`,
      mount(root) {
        if (view === 'semana') Clinic.bindDrag(root, { startH, endH, HOUR });
        const sc = root.querySelector('.wk-scroll');
        if (sc) { const target = Math.max(0, (Math.min(new Date().getHours(), endH - 3) - startH - 1) * HOUR); sc.scrollTop = S.wkScroll != null ? S.wkScroll : target; sc.addEventListener('scroll', () => { S.wkScroll = sc.scrollTop; }); }
        root.addEventListener('click', e => {
          if (e.target.closest('[data-confirm-next]')) return Extra.confirmations();
          const ap = e.target.closest('[data-appt]'); if (ap) return V.apptSheet(ap.dataset.appt);
          const nav = e.target.closest('[data-nav]');
          if (nav) { const n = Number(nav.dataset.nav); if (n === 0) S.agendaDate = U.today(); else if (view === 'mes') { const dd = U.parse(date); S.agendaDate = U.iso(new Date(dd.getFullYear(), dd.getMonth() + n, 1)); } else S.agendaDate = U.addDays(date, n * (view === 'semana' ? 7 : 1)); return App.refresh(); }
          if (e.target.closest('[data-block-new]')) return F.block(null, { date: view === 'dia' ? date : U.today() });
          const bl = e.target.closest('[data-block]'); if (bl) return F.block(Store.get('blocks', bl.dataset.block));
          const day = e.target.closest('[data-day]'); if (day) { S.agendaDate = day.dataset.day; if (view !== 'dia') S.agendaView = 'dia'; return App.refresh(); }
          const na = e.target.closest('[data-new-at]'); if (na) return F.appt(null, { date: na.dataset.newAt });
          const col = e.target.closest('.wk-col');
          if (col && e.target === col) {
            const y = e.clientY - col.getBoundingClientRect().top;
            const min = Math.floor((startH * 60 + y / HOUR * 60) / 30) * 30;
            F.appt(null, { date: col.dataset.date, time: U.fromMin(Math.min(min, endH * 60 - 30)) });
          }
        });
        root.addEventListener('change', e => {
          if (e.target.name === 'v') { S.agendaView = e.target.value; App.refresh(); }
          if (e.target.matches('[data-cancelled]')) { S.showCancelled = e.target.checked; App.refresh(); }
        });
        root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('li[data-appt]')) V.apptSheet(e.target.dataset.appt); });
      },
    };
  };

  /* ================= PACIENTES ================= */
  V.pacientes = () => {
    const S = App.state;
    const q = U.norm(S.petQuery || ''), sp = S.petSpecies || '', stf = S.petStatus || '';
    const pets = Store.all('pets').filter(p => {
      const t = Store.tutorOf(p);
      if (sp && p.species !== sp) return false;
      if (stf && p.status !== stf) return false;
      if (q && !U.norm([p.name, p.breed, p.diagnosis, t && t.name, t && t.phone].join(' ')).includes(q)) return false;
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
    const counts = {}; Store.all('pets').forEach(p => counts[p.species] = (counts[p.species] || 0) + 1);

    const list = pets.map(p => {
      const t = Store.tutorOf(p), pl = Store.activePlan(p.id), nx = Store.nextAppt(p.id), st = pl ? Store.planStats(pl) : null;
      return `<a class="prow" href="#/pacientes/${p.id}">
        ${V.avatar(p)}
        <div class="prow-id"><b>${esc(p.name)}</b><span>${esc([F.speciesName(p.species), p.breed, U.age(p.birth)].filter(Boolean).join(', '))}</span></div>
        <div class="prow-dx"><span class="muted">${esc(p.diagnosis || 'Sem diagnóstico registrado')}</span></div>
        <div class="prow-tutor">${t ? `<span>${esc(t.name)}</span><small>${esc(U.fmtPhone(t.phone))}</small>` : '<span class="muted">Sem tutor</span>'}</div>
        <div class="prow-plan">${pl ? `${V.trail(pl, 'sm')}<small>${st.remaining === 0 ? 'Pacote concluído' : `Restam ${st.remaining} de ${st.total}`}</small>` : `<small class="muted">${F.petStatusName(p.status)}</small>`}</div>
        <div class="prow-next">${nx ? `<small>Próximo</small><span>${U.relDay(nx.date) === 'hoje' || U.relDay(nx.date) === 'amanhã' ? U.relDay(nx.date) : U.fmtDM(nx.date)}, ${U.fmtTime(nx.time)}</span>` : '<small class="muted">Sem horário marcado</small>'}</div>
      </a>`;
    }).join('');

    return {
      title: 'Pacientes',
      action: `<button class="btn btn-primary" data-new="pet">${I('plus')}<span>Novo paciente</span></button>`,
      html: `
      <div class="filters">
        <label class="search">${I('search')}<input type="search" placeholder="Buscar por nome, raça, diagnóstico ou tutor" value="${esc(S.petQuery || '')}" data-q aria-label="Buscar pacientes"></label>
        <div class="filter-row">
          <div class="chips chips-filter" role="group" aria-label="Espécie">
            <label class="chip"><input type="radio" name="sp" value="" ${!sp ? 'checked' : ''}><span>Todos <em>${Store.all('pets').length}</em></span></label>
            ${F.SPECIES.filter(([k]) => counts[k]).map(([k, n]) => `<label class="chip"><input type="radio" name="sp" value="${k}" ${sp === k ? 'checked' : ''}><span>${n} <em>${counts[k]}</em></span></label>`).join('')}
          </div>
          <select data-status aria-label="Situação"><option value="">Qualquer situação</option>${F.PET_STATUS.map(([k, n]) => `<option value="${k}" ${stf === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
        </div>
      </div>
      ${pets.length ? `<div class="plist"><div class="plist-head"><span></span><span>Paciente</span><span>Diagnóstico</span><span>Tutor</span><span>Pacote</span><span>Agenda</span></div>${list}</div>`
        : Store.all('pets').length ? V.empty('Nenhum paciente encontrado', 'Tente outro termo ou limpe os filtros.') : V.empty('Nenhum paciente ainda', 'Cadastre o primeiro paciente com a ficha clínica e o contato do tutor.', `<button class="btn btn-primary" data-new="pet">${I('plus')}Cadastrar paciente</button>`)}`,
      mount(root) {
        const qi = root.querySelector('[data-q]');
        let tm; qi && qi.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { S.petQuery = qi.value; App.refresh({ keepFocus: '[data-q]' }); }, 180); });
        root.addEventListener('change', e => {
          if (e.target.name === 'sp') { S.petSpecies = e.target.value; App.refresh(); }
          if (e.target.matches('[data-status]')) { S.petStatus = e.target.value; App.refresh(); }
        });
      },
    };
  };

  /* ---------- gráfico de evolução ---------- */
  V.evoChart = sessions => {
    const pts = sessions.filter(s => s.pain !== '' && s.pain != null);
    if (pts.length < 2) return `<p class="panel-empty">O gráfico aparece a partir de duas sessões com dor registrada.</p>`;
    const W = 560, H = 170, px = 28, py = 18;
    const x = i => px + (i * (W - px * 2)) / (pts.length - 1);
    const y = v => py + (1 - v / 10) * (H - py * 2);
    const ym = v => py + (1 - v / 5) * (H - py * 2);
    const line = pts.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(Number(s.pain)).toFixed(1)}`).join(' ');
    const mob = pts.filter(s => s.mobility !== '' && s.mobility != null);
    const mline = pts.map((s, i) => s.mobility !== '' && s.mobility != null ? [x(i), ym(Number(s.mobility))] : null).filter(Boolean).map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    const first = Number(pts[0].pain), lastV = Number(pts[pts.length - 1].pain);
    const delta = lastV - first;
    return `<div class="evo">
      <p class="evo-sum">${delta < 0 ? `A dor caiu de <b>${first}</b> para <b>${lastV}</b> em ${pts.length} sessões.` : delta > 0 ? `A dor subiu de <b>${first}</b> para <b>${lastV}</b>. Vale reavaliar a conduta.` : `Dor estável em <b>${lastV}</b> nas últimas ${pts.length} sessões.`}</p>
      <svg viewBox="0 0 ${W} ${H}" class="evo-svg" role="img" aria-label="Evolução da dor e da mobilidade por sessão">
        ${[0, 5, 10].map(v => `<line x1="${px}" x2="${W - px}" y1="${y(v)}" y2="${y(v)}" class="evo-grid"/><text x="${px - 8}" y="${y(v) + 4}" class="evo-ax" text-anchor="end">${v}</text>`).join('')}
        ${mob.length > 1 ? `<path d="${mline}" class="evo-mob"/>` : ''}
        <path d="${line}" class="evo-pain" pathLength="1"/>
        ${pts.map((s, i) => `<circle cx="${x(i)}" cy="${y(Number(s.pain))}" r="4" class="evo-dot"><title>${U.fmtDM(s.date)}: dor ${s.pain}${s.mobility !== '' ? ', mobilidade ' + s.mobility : ''}</title></circle>`).join('')}
        <text x="${px}" y="${H - 2}" class="evo-ax">${U.fmtDM(pts[0].date)}</text><text x="${W - px}" y="${H - 2}" class="evo-ax" text-anchor="end">${U.fmtDM(pts[pts.length - 1].date)}</text>
      </svg>
      <div class="evo-legend"><span class="lg-pain">Dor (0 a 10)</span>${mob.length > 1 ? '<span class="lg-mob">Mobilidade (0 a 5)</span>' : ''}</div>
    </div>`;
  };

  /* ================= FICHA DO PACIENTE ================= */
  V.paciente = id => {
    const p = Store.get('pets', id);
    if (!p) return { title: 'Paciente', html: V.empty('Paciente não encontrado', 'Ele pode ter sido excluído.', '<a class="btn btn-ghost" href="#/pacientes">Voltar para pacientes</a>') };
    const S = App.state, tab = S.petTab[id] || 'geral';
    const t = Store.tutorOf(p), plans = Store.plansOf(id), active = Store.activePlan(id), sessions = Store.sessionsOf(id), appts = Store.apptsOf(id);
    const today = U.today();
    const upcoming = appts.filter(a => a.date >= today && (a.status === 'agendado' || a.status === 'confirmado'));
    const st = active ? Store.planStats(active) : null;
    const dl = rows => `<dl class="dl">${rows.filter(r => r[1]).map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('') || '<p class="panel-empty">Nada registrado ainda.</p>'}</dl>`;
    const nEval = Clinic.evalsOf(id).length;
    const tabs = [['geral', 'Visão geral'], ['ficha', 'Ficha clínica'], ['avaliacao', `Avaliações${nEval ? ' (' + nEval + ')' : ''}`], ['tratamento', `Sessões (${sessions.length})`], ['agenda', 'Agenda']];

    const tutorCard = t ? `<section class="panel tutor-card">
      <header class="panel-head"><h2>Tutor</h2><a class="link" href="#/tutores/${t.id}">Ver ficha</a></header>
      <p class="tc-name">${esc(t.name)}</p>
      <p class="tc-phone">${esc(U.fmtPhone(t.phone))}${t.preferred && t.preferred !== 'whatsapp' ? ` <small>prefere ${t.preferred === 'ligacao' ? 'ligação' : 'e-mail'}</small>` : ''}</p>
      <div class="tc-actions">
        <a class="btn btn-wa btn-sm" href="${U.wa(t.phone, `Olá, ${U.firstName(t.name)}! Aqui é da ${Store.db.clinic.name || 'clínica'}, sobre o tratamento de ${p.name}.`)}" target="_blank" rel="noopener">${I('chat')}WhatsApp</a>
        <a class="btn btn-ghost btn-sm" href="tel:${U.digits(t.phone)}">${I('phone')}Ligar</a>
        ${t.email ? `<a class="btn btn-ghost btn-sm" href="mailto:${esc(t.email)}">${I('mail')}E-mail</a>` : ''}
      </div>
      ${t.emergencyName ? `<p class="tc-em">Emergência: ${esc(t.emergencyName)}, ${esc(U.fmtPhone(t.emergencyPhone))}</p>` : ''}
    </section>` : `<section class="panel"><p class="panel-empty">Sem tutor vinculado. Edite a ficha para vincular.</p></section>`;

    let content = '';
    if (tab === 'geral') {
      content = `<div class="pgrid">
        <div class="pgrid-main">
          <section class="panel plan-hero">
            ${active ? `<header class="panel-head"><h2>${esc(active.name)}</h2><button class="icon-btn" data-edit-plan="${active.id}" aria-label="Editar plano">${I('edit')}</button></header>
              <div class="ph-count"><b data-count="${st.remaining}">${st.remaining}</b><span>${st.remaining === 1 ? 'sessão restante' : 'sessões restantes'}<br>de ${st.total} no pacote</span></div>
              ${V.trail(active, 'lg')}${V.trailLegend(active)}
              <div class="ph-foot">
                <span>${active.perWeek ? `${active.perWeek}x por semana, ` : ''}desde ${U.fmtDM(active.start)}</span>
                ${(() => { const ps = Store.payStatus(active); return `<span class="pay pay-${ps}">${ps === 'pago' ? 'Pago' : ps === 'parcial' ? `Pago ${U.money(Store.planPaid(active))} de ${U.money(active.price)}` : `${U.money(active.price)} pendente`}</span>`; })()}
              </div>
              <div class="ph-actions"><button class="btn btn-primary btn-sm" data-session>${I('note')}Registrar sessão</button><button class="btn btn-soft btn-sm" data-appt-new>${I('calendar')}Agendar</button>${st.unscheduled ? `<button class="btn btn-soft btn-sm" data-sched-all>${I('repeat')}Agendar as ${st.unscheduled} restantes</button>` : ''}${Store.planDue(active) > 0 ? `<button class="btn btn-soft btn-sm" data-pay-plan="${active.id}">${I('wallet')}Receber ${U.money(Store.planDue(active))}</button>` : ''}${st.remaining <= 2 ? `<button class="btn btn-ghost btn-sm" data-renew="${active.id}">${I('repeat')}Renovar pacote</button>` : ''}</div>`
              : `<header class="panel-head"><h2>Pacote de sessões</h2></header><p class="panel-empty">Nenhum pacote ativo. Crie um plano para acompanhar quantas sessões faltam.</p><div class="ph-actions"><button class="btn btn-primary btn-sm" data-plan-new>${I('plus')}Criar plano</button><button class="btn btn-soft btn-sm" data-session>Registrar sessão avulsa</button></div>`}
          </section>
          <section class="panel">
            <header class="panel-head"><h2>Evolução</h2></header>
            ${V.evoChart(sessions)}
          </section>
        </div>
        <div class="pgrid-side">
          ${tutorCard}
          <section class="panel">
            <header class="panel-head"><h2>Próximos horários</h2><button class="icon-btn" data-appt-new aria-label="Agendar">${I('plus')}</button></header>
            ${upcoming.length ? `<ul class="mini-list">${upcoming.slice(0, 5).map(a => `<li><button data-appt="${a.id}"><span><b>${U.relDay(a.date) === 'hoje' || U.relDay(a.date) === 'amanhã' ? U.relDay(a.date)[0].toUpperCase() + U.relDay(a.date).slice(1) : U.fmtLong(a.date)}</b><small>${U.fmtTime(a.time)}, ${esc(svcName(a.serviceId))}</small></span>${V.pill(a.status)}</button></li>`).join('')}</ul>` : '<p class="panel-empty">Nenhum horário marcado.</p>'}
          </section>
          ${(p.handling || p.temper || p.muzzle === 'sim' || p.allergies) ? `<section class="panel panel-care"><header class="panel-head"><h2>Atenção no manejo</h2></header>
            ${p.temper ? `<p><b>${esc(p.temper)}</b>${p.muzzle === 'sim' ? ', usar focinheira' : p.muzzle === 'as-vezes' ? ', focinheira às vezes' : ''}</p>` : ''}
            ${p.handling ? `<p>${esc(p.handling)}</p>` : ''}${p.allergies ? `<p>Alergias: ${esc(p.allergies)}</p>` : ''}</section>` : ''}
        </div>
      </div>`;
    } else if (tab === 'ficha') {
      content = `<div class="ficha">
        <section class="panel"><header class="panel-head"><h2>Identificação</h2><button class="btn btn-ghost btn-sm" data-edit-pet>${I('edit')}Editar ficha</button></header>
          ${dl([['Espécie', F.speciesName(p.species)], ['Raça', p.breed], ['Sexo', p.sex === 'M' ? 'Macho' : p.sex === 'F' ? 'Fêmea' : ''], ['Nascimento', p.birth ? `${U.fmtDate(p.birth)} (${U.age(p.birth)})` : ''], ['Peso', p.weight ? String(p.weight).replace('.', ',') + ' kg' : ''], ['Porte', p.size], ['Castrado', { sim: 'Sim', nao: 'Não', nd: 'Não informado' }[p.neutered]], ['Pelagem', p.coat], ['Microchip', p.microchip], ['Situação', F.petStatusName(p.status)]])}</section>
        <section class="panel"><header class="panel-head"><h2>Quadro clínico</h2></header>
          ${dl([['Diagnóstico', p.diagnosis], ['Queixa principal', p.complaint], ['Histórico', p.history], ['Cirurgias', p.surgeries], ['Medicações', p.medications], ['Alergias', p.allergies], ['Exames de imagem', p.exams]])}</section>
        <section class="panel"><header class="panel-head"><h2>Veterinário que encaminhou</h2></header>
          ${dl([['Nome', p.vetName], ['Clínica', p.vetClinic], ['Telefone', U.fmtPhone(p.vetPhone)], ['CRMV', p.vetCrmv]])}</section>
        <section class="panel"><header class="panel-head"><h2>Manejo</h2></header>
          ${dl([['Temperamento', p.temper], ['Focinheira', { sim: 'Sim', nao: 'Não', 'as-vezes': 'Às vezes' }[p.muzzle]], ['Cuidados', p.handling], ['Observações', p.notes]])}</section>
      </div>`;
    } else if (tab === 'avaliacao') {
      content = Clinic.evalTab(id);
    } else if (tab === 'tratamento') {
      content = `<div class="treat">
        <section class="panel">
          <header class="panel-head"><h2>Planos de tratamento</h2><button class="btn btn-soft btn-sm" data-plan-new>${I('plus')}Novo plano</button></header>
          ${plans.length ? `<ul class="plans">${plans.map(pl => { const s = Store.planStats(pl); return `<li class="plan plan-${pl.status}">
            <div class="plan-top"><b>${esc(pl.name)}</b><span class="plan-st">${{ ativo: 'Ativo', concluido: 'Concluído', pausado: 'Pausado', cancelado: 'Cancelado' }[pl.status]}</span><button class="icon-btn" data-edit-plan="${pl.id}" aria-label="Editar plano">${I('edit')}</button></div>
            ${V.trail(pl, 'sm')}
            <div class="plan-meta"><span>${s.done} de ${s.total} sessões</span><span>início ${U.fmtDM(pl.start)}</span>${(() => { const ps = Store.payStatus(pl); return `<span class="pay pay-${ps}">${ps === 'pago' ? 'Pago' : ps === 'parcial' ? `Parcial, ${U.money(Store.planPaid(pl))} de ${U.money(pl.price)}` : `Pendente, ${U.money(pl.price)}`}</span>`; })()}</div>
            ${pl.goals ? `<p class="plan-goals">${esc(pl.goals)}</p>` : ''}
          </li>`; }).join('')}</ul>` : '<p class="panel-empty">Nenhum plano criado.</p>'}
        </section>
        <section class="panel">
          <header class="panel-head"><h2>Prontuário de sessões</h2><button class="btn btn-primary btn-sm" data-session>${I('plus')}Registrar sessão</button></header>
          ${sessions.length ? `<ol class="evo-list">${sessions.slice().reverse().map((s, i) => { const pl = s.planId ? Store.get('plans', s.planId) : null; const idx = pl ? Store.all('sessions').filter(x => x.planId === pl.id).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))).findIndex(x => x.id === s.id) + 1 : 0; return `<li>
            <button class="evo-item" data-edit-session="${s.id}">
              <div class="evo-date"><b>${U.fmtDM(s.date)}</b><small>${pl ? `sessão ${idx} de ${pl.total}` : 'avulsa'}</small></div>
              <div class="evo-body">
                <div class="evo-tags">${s.pain !== '' && s.pain != null ? `<span class="tag tag-pain">dor ${s.pain}</span>` : ''}${s.mobility !== '' && s.mobility != null ? `<span class="tag">mobilidade ${s.mobility}</span>` : ''}${(s.techniques || []).map(t => `<span class="tag tag-t">${esc(t)}</span>`).join('')}</div>
                <p>${esc(s.notes)}</p>${s.homeCare ? `<p class="muted small">Para casa: ${esc(s.homeCare)}</p>` : ''}
              </div></button></li>`; }).join('')}</ol>` : V.empty('Nenhuma sessão registrada', 'Ao concluir um atendimento na agenda, a evolução aparece aqui.')}
        </section>
      </div>`;
    } else {
      content = `<section class="panel">
        <header class="panel-head"><h2>Histórico de agendamentos</h2><button class="btn btn-soft btn-sm" data-appt-new>${I('plus')}Agendar</button></header>
        ${appts.length ? `<ul class="mini-list mini-list-wide">${appts.slice().reverse().map(a => `<li><button data-appt="${a.id}"><span><b>${U.fmtDate(a.date)}, ${U.fmtTime(a.time)}</b><small>${esc(svcName(a.serviceId))}${a.planId && Store.get('plans', a.planId) ? ', ' + esc(Store.get('plans', a.planId).name) : ''}</small></span>${V.pill(a.status)}</button></li>`).join('')}</ul>` : V.empty('Sem agendamentos', 'Marque o primeiro horário deste paciente.')}
      </section>`;
    }

    return {
      title: 'Pacientes', docTitle: p.name, back: '#/pacientes',
      html: `
      <header class="phead">
        ${V.avatar(p, 'xl')}
        <div class="phead-txt">
          <h1>${esc(p.name)}</h1>
          <p>${esc([F.speciesName(p.species), p.breed, p.sex === 'M' ? 'macho' : p.sex === 'F' ? 'fêmea' : '', U.age(p.birth), p.weight ? String(p.weight).replace('.', ',') + ' kg' : ''].filter(Boolean).join(', '))}</p>
          ${p.diagnosis ? `<p class="phead-dx">${esc(p.diagnosis)}</p>` : ''}
        </div>
        <div class="phead-act"><span class="pstatus ps-${p.status}">${F.petStatusName(p.status)}</span><button class="btn btn-soft btn-sm" data-report>${I('download')}Relatório</button><button class="btn btn-ghost btn-sm" data-edit-pet>${I('edit')}Editar</button></div>
      </header>
      <nav class="tabs" role="tablist">${tabs.map(([k, n]) => `<button role="tab" aria-selected="${k === tab}" data-tab="${k}">${n}</button>`).join('')}</nav>
      ${content}`,
      mount(root) {
        root.addEventListener('click', e => {
          const g = s => e.target.closest(s);
          if (g('[data-tab]')) { S.petTab[id] = g('[data-tab]').dataset.tab; return App.refresh(); }
          if (g('[data-edit-pet]')) return F.pet(p);
          if (g('[data-report]')) return Extra.report(id);
          if (g('[data-eval-new]')) return F.evaluation(null, { petId: id });
          if (g('[data-eval]')) return F.evaluation(Store.get('evaluations', g('[data-eval]').dataset.eval));
          if (g('[data-pay-plan]')) return F.payment({ planId: g('[data-pay-plan]').dataset.payPlan });
          if (g('[data-sched-all]')) {
            const last = Store.apptsOf(id).filter(a => a.status !== 'cancelado').slice(-1)[0];
            const date = last && last.date >= U.today() ? U.addDays(last.date, 1) : U.addDays(U.today(), 1);
            return F.appt(null, { petId: id, planId: active ? active.id : '', serviceId: active && active.serviceId ? active.serviceId : (last ? last.serviceId : undefined), date, time: last ? last.time : undefined, duration: last ? last.duration : undefined, recur: true });
          }
          if (g('[data-edit-plan]')) return F.plan(Store.get('plans', g('[data-edit-plan]').dataset.editPlan));
          if (g('[data-plan-new]')) return F.plan(null, { petId: id });
          if (g('[data-renew]')) return F.plan(null, { from: Store.get('plans', g('[data-renew]').dataset.renew) });
          if (g('[data-session]')) return F.session(null, { petId: id });
          if (g('[data-edit-session]')) return F.session(Store.get('sessions', g('[data-edit-session]').dataset.editSession));
          if (g('[data-appt-new]')) return F.appt(null, { petId: id, planId: active ? active.id : '' });
          if (g('[data-appt]')) return V.apptSheet(g('[data-appt]').dataset.appt);
        });
      },
    };
  };

  /* ================= TUTORES ================= */
  V.tutores = () => {
    const S = App.state, q = U.norm(S.tutorQuery || '');
    const list = Store.all('tutors').filter(t => !q || U.norm([t.name, t.phone, t.email, t.city, ...Store.petsOf(t.id).map(p => p.name)].join(' ')).includes(q)).sort((a, b) => a.name.localeCompare(b.name));
    return {
      title: 'Tutores',
      action: `<button class="btn btn-primary" data-new="tutor">${I('plus')}<span>Novo tutor</span></button>`,
      html: `
      <div class="filters"><label class="search">${I('search')}<input type="search" placeholder="Buscar por nome, telefone, e-mail ou pet" value="${esc(S.tutorQuery || '')}" data-q aria-label="Buscar tutores"></label></div>
      ${list.length ? `<div class="tgrid">${list.map(t => { const pets = Store.petsOf(t.id); return `<article class="tcard">
        <a class="tcard-main" href="#/tutores/${t.id}"><span class="tav">${esc(U.initials(t.name))}</span><span><b>${esc(t.name)}</b><small>${esc(U.fmtPhone(t.phone))}${t.city ? ', ' + esc(t.city) : ''}</small></span></a>
        <div class="tcard-pets">${pets.length ? pets.map(p => `<a href="#/pacientes/${p.id}" class="tpet">${V.avatar(p, 'xs')}${esc(p.name)}</a>`).join('') : '<span class="muted small">Nenhum pet vinculado</span>'}</div>
        <div class="tcard-act"><a class="icon-btn icon-wa" href="${U.wa(t.phone)}" target="_blank" rel="noopener" aria-label="WhatsApp de ${esc(t.name)}">${I('chat')}</a><a class="icon-btn" href="tel:${U.digits(t.phone)}" aria-label="Ligar para ${esc(t.name)}">${I('phone')}</a>${t.email ? `<a class="icon-btn" href="mailto:${esc(t.email)}" aria-label="E-mail">${I('mail')}</a>` : ''}</div>
      </article>`; }).join('')}</div>` : Store.all('tutors').length ? V.empty('Nenhum tutor encontrado', 'Tente outro termo.') : V.empty('Nenhum tutor ainda', 'Os tutores também podem ser cadastrados junto com o paciente.', `<button class="btn btn-primary" data-new="tutor">${I('plus')}Cadastrar tutor</button>`)}`,
      mount(root) {
        const qi = root.querySelector('[data-q]');
        let tm; qi && qi.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { S.tutorQuery = qi.value; App.refresh({ keepFocus: '[data-q]' }); }, 180); });
      },
    };
  };

  V.tutor = id => {
    const t = Store.get('tutors', id);
    if (!t) return { title: 'Tutor', html: V.empty('Tutor não encontrado', '', '<a class="btn btn-ghost" href="#/tutores">Voltar</a>') };
    const pets = Store.petsOf(id);
    const plans = Store.all('plans').filter(pl => pets.some(p => p.id === pl.petId));
    const total = plans.reduce((s, p) => s + (p.price || 0), 0), paid = plans.reduce((s, p) => s + Store.planPaid(p), 0);
    const appts = Store.all('appointments').filter(a => pets.some(p => p.id === a.petId));
    const missed = appts.filter(a => a.status === 'faltou').length;
    const addr = [t.street, t.complement, t.district, t.city, t.cep].filter(Boolean).join(', ');
    return {
      title: 'Tutores', docTitle: t.name, back: '#/tutores',
      html: `
      <header class="phead">
        <span class="tav tav-xl">${esc(U.initials(t.name))}</span>
        <div class="phead-txt"><h1>${esc(t.name)}</h1><p>${pets.length === 1 ? 'Tutor de ' + esc(pets[0].name) : pets.length ? `Tutor de ${pets.length} pets` : 'Sem pets vinculados'}${t.source ? `, chegou por ${esc(t.source.toLowerCase())}` : ''}</p></div>
        <div class="phead-act"><button class="btn btn-ghost btn-sm" data-edit>${I('edit')}Editar</button></div>
      </header>
      <div class="pgrid">
        <div class="pgrid-main">
          <section class="panel"><header class="panel-head"><h2>Pets</h2><button class="btn btn-soft btn-sm" data-new-pet>${I('plus')}Adicionar pet</button></header>
            ${pets.length ? `<ul class="mini-list mini-list-wide">${pets.map(p => { const pl = Store.activePlan(p.id); const s = pl ? Store.planStats(pl) : null; return `<li><a href="#/pacientes/${p.id}" class="mini-pet">${V.avatar(p)}<span><b>${esc(p.name)}</b><small>${esc(p.diagnosis || F.speciesName(p.species))}</small></span>${pl ? `<span class="mini-trail">${V.trail(pl, 'sm')}<small>restam ${s.remaining}</small></span>` : `<small class="muted">${F.petStatusName(p.status)}</small>`}</a></li>`; }).join('')}</ul>` : '<p class="panel-empty">Nenhum pet ainda.</p>'}
          </section>
          <section class="panel"><header class="panel-head"><h2>Financeiro</h2></header>
            <div class="fin"><div><small>Contratado</small><b>${U.money(total)}</b></div><div><small>Pago</small><b>${U.money(paid)}</b></div><div><small>Em aberto</small><b class="${total - paid > 0 ? 'warn' : ''}">${U.money(Math.max(0, total - paid))}</b></div><div><small>Faltas</small><b>${missed}</b></div></div>
          </section>
          ${t.notes ? `<section class="panel"><header class="panel-head"><h2>Observações</h2></header><p class="prose">${esc(t.notes)}</p></section>` : ''}
        </div>
        <div class="pgrid-side">
          <section class="panel tutor-card"><header class="panel-head"><h2>Contato</h2></header>
            <p class="tc-phone">${esc(U.fmtPhone(t.phone))}</p>
            <div class="tc-actions"><a class="btn btn-wa btn-sm" href="${U.wa(t.phone)}" target="_blank" rel="noopener">${I('chat')}WhatsApp</a><a class="btn btn-ghost btn-sm" href="tel:${U.digits(t.phone)}">${I('phone')}Ligar</a></div>
            <dl class="dl dl-compact">${[['Outro telefone', U.fmtPhone(t.phone2)], ['E-mail', t.email], ['CPF', t.cpf], ['Nascimento', t.birth ? U.fmtDate(t.birth) : ''], ['Prefere', { whatsapp: 'WhatsApp', ligacao: 'Ligação', email: 'E-mail' }[t.preferred]], ['Endereço', addr], ['Emergência', t.emergencyName ? `${t.emergencyName}, ${U.fmtPhone(t.emergencyPhone)}` : '']].filter(r => r[1]).map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
            ${addr ? `<a class="link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}" target="_blank" rel="noopener">${I('pin')}Abrir no mapa</a>` : ''}
          </section>
          <section class="panel lgpd">
            <header class="panel-head"><h2>Dados e LGPD</h2></header>
            <p class="lgpd-st ${t.consent ? 'ok' : 'no'}">${I(t.consent ? 'check' : 'alert')}<span>${t.anonymized ? 'Dados pessoais anonimizados.' : t.consent ? `Consentimento registrado${t.consentAt ? ' em ' + U.fmtDate(U.iso(new Date(t.consentAt))) : ''}.` : 'Consentimento ainda não registrado.'}</span></p>
            <div class="btn-row">
              <button class="btn btn-soft btn-sm" data-term>${I('note')}Imprimir termo</button>
              <button class="btn btn-ghost btn-sm" data-export-t>${I('download')}Exportar dados</button>
              ${t.anonymized ? '' : `<button class="btn btn-ghost-danger btn-sm" data-anon>${I('trash')}Anonimizar</button>`}
            </div>
          </section>
        </div>
      </div>`,
      mount(root) {
        root.addEventListener('click', e => {
          if (e.target.closest('[data-edit]')) F.tutor(t);
          if (e.target.closest('[data-term]')) Clinic.consentTerm(t.id);
          if (e.target.closest('[data-export-t]')) Clinic.exportTutor(t.id);
          if (e.target.closest('[data-anon]')) Clinic.anonymizeTutor(t.id);
          if (e.target.closest('[data-new-pet]')) F.pet(null, { tutorId: t.id });
        });
      },
    };
  };

  /* ================= SESSÕES (prontuário geral) ================= */
  V.sessoes = () => {
    const S = App.state, q = U.norm(S.sessQuery || '');
    const month = S.sessMonth || U.today().slice(0, 7);
    const all = Store.all('sessions').filter(s => (s.date || '').startsWith(month)).filter(s => { const p = Store.get('pets', s.petId); return !q || U.norm([p && p.name, s.notes, (s.techniques || []).join(' ')].join(' ')).includes(q); }).sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
    const [y, m] = month.split('-').map(Number);
    const shift = n => { const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${U.pad(d.getMonth() + 1)}`; };
    const tech = {}; all.forEach(s => (s.techniques || []).forEach(t => tech[t] = (tech[t] || 0) + 1));
    const topTech = Object.entries(tech).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return {
      title: 'Sessões',
      action: `<button class="btn btn-primary" data-new="session">${I('plus')}<span>Registrar sessão</span></button>`,
      html: `
      <div class="toolbar">
        <div class="tb-nav"><button class="icon-btn" data-m="-1" aria-label="Mês anterior">${I('left')}</button><h2 class="tb-title">${U.MES_L[m - 1]} ${y}</h2><button class="icon-btn" data-m="1" aria-label="Próximo mês">${I('right')}</button></div>
        <label class="search search-sm">${I('search')}<input type="search" placeholder="Buscar paciente, técnica ou anotação" value="${esc(S.sessQuery || '')}" data-q aria-label="Buscar sessões"></label>
      </div>
      <p class="sess-sum">${all.length ? `${all.length} ${all.length === 1 ? 'sessão registrada' : 'sessões registradas'} neste mês${topTech.length ? `. Técnicas mais usadas: ${topTech.map(([t, n]) => `${esc(t.toLowerCase())} (${n})`).join(', ')}.` : '.'}` : ''}</p>
      ${all.length ? `<section class="panel"><ol class="evo-list">${all.map(s => { const p = Store.get('pets', s.petId); return `<li><button class="evo-item" data-edit-session="${s.id}">
        <div class="evo-date"><b>${U.fmtDM(s.date)}</b><small>${U.fmtTime(s.time || '')}</small></div>
        <div class="evo-who">${V.avatar(p, 'sm')}<b>${esc(p ? p.name : '?')}</b></div>
        <div class="evo-body"><div class="evo-tags">${s.pain !== '' && s.pain != null ? `<span class="tag tag-pain">dor ${s.pain}</span>` : ''}${(s.techniques || []).map(t => `<span class="tag tag-t">${esc(t)}</span>`).join('')}</div><p>${esc(s.notes)}</p></div>
      </button></li>`; }).join('')}</ol></section>` : V.empty('Nenhuma sessão neste mês', 'As sessões aparecem aqui quando você registra a evolução de um atendimento.')}`,
      mount(root) {
        root.addEventListener('click', e => {
          const mm = e.target.closest('[data-m]'); if (mm) { S.sessMonth = shift(Number(mm.dataset.m)); return App.refresh(); }
          const es = e.target.closest('[data-edit-session]'); if (es) F.session(Store.get('sessions', es.dataset.editSession));
        });
        const qi = root.querySelector('[data-q]');
        let tm; qi && qi.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { S.sessQuery = qi.value; App.refresh({ keepFocus: '[data-q]' }); }, 180); });
      },
    };
  };

  /* ================= AJUSTES ================= */
  V.ajustes = () => {
    const c = Store.db.clinic, u = Store.db.user;
    const used = (() => { try { return (localStorage.getItem('passo.db.v1') || '').length * 2; } catch (e) { return 0; } })();
    return {
      title: 'Ajustes',
      html: `
      <div class="settings">
        <section class="panel">
          <header class="panel-head"><h2>Clínica</h2></header>
          <form data-clinic class="form-grid">
            ${F.input('name', 'Nome da clínica', c.name, { span: 2 })}
            ${F.input('phone', 'Telefone', U.fmtPhone(c.phone), { 'data-mask': 'phone' })}
            ${F.input('crmv', 'CREFITO / CRMV', c.crmv)}
            ${F.input('address', 'Endereço', c.address, { span: 2 })}
            ${F.select('dayStart', 'Agenda começa às', c.dayStart, [5, 6, 7, 8, 9, 10].map(h => [h, h + 'h']))}
            ${F.select('dayEnd', 'Agenda termina às', c.dayEnd, [17, 18, 19, 20, 21, 22, 23].map(h => [h, h + 'h']))}
            <div class="form-actions span-2"><span class="spacer"></span><button class="btn btn-primary" type="submit">Salvar dados da clínica</button></div>
          </form>
        </section>
        <section class="panel">
          <header class="panel-head"><h2>Serviços</h2><button class="btn btn-soft btn-sm" data-svc-new>${I('plus')}Novo serviço</button></header>
          <ul class="svc-list">${Store.all('services').map(s => `<li><button data-svc="${s.id}"><span class="sw c-${s.color}"></span><b>${esc(s.name)}</b><small>${s.duration} min</small><small>${U.money(s.price)}</small>${I('edit')}</button></li>`).join('')}</ul>
        </section>
        <section class="panel">
          <header class="panel-head"><h2>Acesso</h2></header>
          <form data-account class="form-grid">
            ${F.input('name', 'Seu nome', u.name)}
            ${F.input('email', 'E-mail de login', u.email, { type: 'email', readonly: u.cloud || undefined, hint: u.cloud ? 'Conta na nuvem. Para trocar o e-mail, fale com o suporte.' : '' })}
            ${F.input('current', 'Senha atual', '', { type: 'password', autocomplete: 'current-password' })}
            ${F.input('next', 'Nova senha', '', { type: 'password', autocomplete: 'new-password', hint: 'Mínimo de 8 caracteres. Deixe em branco para manter.' })}
            <div class="form-actions span-2">${u.cloud ? '' : '<button type="button" class="btn btn-ghost" data-recovery>Gerar novo código de recuperação</button>'}<span class="spacer"></span><button class="btn btn-primary" type="submit">Salvar acesso</button></div>
          </form>
        </section>
        ${u.cloud ? `<section class="panel" data-team>
          <header class="panel-head"><h2>Equipe</h2><span class="sync-pill" data-sync data-state="${Cloud.status}"><i></i><span>Nuvem</span></span></header>
          <p class="prose">Quem estiver na equipe entra com o próprio e-mail e senha e vê a mesma agenda e as mesmas fichas.</p>
          <ul class="team-list"><li class="muted">Carregando…</li></ul>
          <form class="team-add search" hidden><input type="email" placeholder="E-mail da pessoa (ela precisa ter criado a conta)" aria-label="E-mail para adicionar à equipe"><button class="btn btn-soft btn-sm" type="submit">Adicionar</button></form>
        </section>` : ''}
        <section class="panel">
          <header class="panel-head"><h2>Dados e backup</h2></header>
          <p class="prose">${u.cloud ? 'Os dados ficam na nuvem e sincronizam sozinhos entre os aparelhos. Exporte um backup de vez em quando como cópia extra de segurança.' : `Os dados ficam salvos neste navegador (${(used / 1024).toFixed(0)} KB usados). Exporte um backup toda semana e guarde no Drive ou no computador. Para usar em outro aparelho, importe o arquivo lá.`}</p>
          <div class="btn-row">
            <button class="btn btn-soft" data-export>${I('download')}Exportar backup</button>
            <label class="btn btn-ghost">${I('upload')}Importar backup<input type="file" accept="application/json,.json" data-import hidden></label>
            <button class="btn btn-ghost" data-seed>Carregar dados de exemplo</button>
            <button class="btn btn-ghost" data-privacy>Privacidade (LGPD)</button>
            <button class="btn btn-ghost-danger" data-wipe>${I('trash')}Apagar todos os dados</button>
          </div>
        </section>
      </div>`,
      mount(root) {
        U.bindMasks(root);
        root.querySelector('[data-clinic]').addEventListener('submit', e => {
          e.preventDefault(); const d = U.formData(e.target); d.phone = U.digits(d.phone); d.dayStart = Number(d.dayStart); d.dayEnd = Number(d.dayEnd);
          if (d.dayEnd <= d.dayStart) return U.toast('O horário de término precisa ser depois do início.', 'error');
          Object.assign(Store.db.clinic, d); Store.save(); U.toast('Dados da clínica salvos.'); App.refresh();
        });
        root.querySelector('[data-account]').addEventListener('submit', async e => {
          e.preventDefault(); const d = U.formData(e.target);
          if (!/^\S+@\S+\.\S+$/.test(d.email)) return U.toast('Informe um e-mail válido.', 'error');
          const emailChanged = !u.cloud && d.email.toLowerCase() !== u.email;
          if (d.next && d.next.length < 8) return U.toast('A nova senha precisa ter pelo menos 8 caracteres.', 'error');
          if ((d.next || emailChanged) && !(await Auth.checkPassword(d.current))) return U.toast('Senha atual incorreta.', 'error');
          try {
            if (u.cloud) { if (d.name && d.name !== u.name) await Auth.rename(d.name); if (d.next) await Auth.changePassword(d.next); }
            else { u.name = d.name || u.name; u.email = d.email.toLowerCase(); Store.save(); if (d.next) Auth.changePassword(d.next); else Auth._start(!!localStorage.getItem('passo.auth.v1')); }
            U.toast('Acesso atualizado.'); App.refresh();
          } catch (err) { U.toast(err.message || 'Não foi possível atualizar.', 'error'); }
        });
        const team = root.querySelector('[data-team]');
        if (team && window.Cloud && Cloud.enabled) {
          const draw = async () => {
            try {
              const list = await Cloud.members(), owner = list.some(m => m.user_id === Cloud.user.id && m.role === 'owner');
              team.querySelector('.team-list').innerHTML = list.map(m => `<li><span class="tav tav-sm">${esc(U.initials(m.email))}</span><span><b>${esc(m.email)}</b><small>${m.role === 'owner' ? 'Dona da clínica' : 'Equipe'}${m.user_id === Cloud.user.id ? ' (você)' : ''}</small></span>${owner && m.role !== 'owner' ? `<button class="icon-btn" data-rm="${m.user_id}" aria-label="Remover ${esc(m.email)}">${I('trash')}</button>` : ''}</li>`).join('');
              team.querySelector('.team-add').hidden = !owner;
            } catch (err) { team.querySelector('.team-list').innerHTML = `<li class="muted">Não foi possível carregar a equipe.</li>`; }
          };
          draw();
          team.addEventListener('submit', async e => {
            e.preventDefault(); const email = e.target.querySelector('input').value.trim(); if (!email) return;
            try { const r = await Cloud.addMember(email); U.toast(r === 'ok' ? 'Pessoa adicionada à equipe.' : r === 'self' ? 'Esse é o seu próprio e-mail.' : 'Não há conta com esse e-mail. Peça para a pessoa criar a conta neste site primeiro.', r === 'ok' ? 'ok' : 'error'); e.target.reset(); draw(); }
            catch (err) { U.toast(err.message, 'error'); }
          });
          team.addEventListener('click', async e => { const b = e.target.closest('[data-rm]'); if (!b) return; if (await U.confirm({ title: 'Remover da equipe?', text: 'A pessoa perde o acesso aos dados da clínica.', ok: 'Remover', danger: true })) { try { await Cloud.removeMember(b.dataset.rm); draw(); } catch (err) { U.toast(err.message, 'error'); } } });
        }
        root.addEventListener('click', async e => {
          const g = s => e.target.closest(s);
          if (g('[data-svc-new]')) F.service();
          if (g('[data-svc]')) F.service(Store.service(g('[data-svc]').dataset.svc));
          if (g('[data-privacy]')) Clinic.privacy();
          if (g('[data-export]')) { U.download(`passo-backup-${U.today()}.json`, Store.exportJSON()); U.toast('Backup exportado.'); }
          if (g('[data-seed]')) { if (await U.confirm({ title: 'Carregar dados de exemplo?', text: 'Serão adicionados pacientes, tutores, planos e agendamentos fictícios para você explorar o app. Os seus dados atuais continuam.', ok: 'Carregar' })) { Seed.run(); U.toast('Dados de exemplo carregados.'); App.go('#/painel'); } }
          if (g('[data-wipe]')) { if (await U.confirm({ title: 'Apagar todos os dados?', text: 'Pacientes, tutores, planos, sessões e agendamentos serão removidos deste navegador. Seu login continua. Exporte um backup antes se quiser guardar.', ok: 'Apagar tudo', danger: true })) { Store.wipe(); U.toast('Dados apagados.'); App.go('#/painel'); } }
          if (g('[data-recovery]')) { const code = Auth.newRecoveryCode(); App.showRecovery(code); }
        });
        root.querySelector('[data-import]').addEventListener('change', async e => {
          const f = e.target.files[0]; if (!f) return;
          try {
            const txt = await f.text();
            if (await U.confirm({ title: 'Importar backup?', text: 'Os dados atuais deste navegador serão substituídos pelos do arquivo.', ok: 'Importar', danger: true })) { Store.importJSON(txt); U.toast('Backup importado.'); App.go('#/painel'); }
          } catch (err) { U.toast(err.message || 'Arquivo inválido.', 'error'); }
          e.target.value = '';
        });
      },
    };
  };

  window.Views = V;
})();
