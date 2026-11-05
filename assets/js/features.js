/* Flaw Medeiros — recursos extras: financeiro, recibo, relatório de evolução,
   confirmações de amanhã, busca rápida e agendamento do pacote inteiro */
(function () {
  'use strict';
  const U = UI, esc = U.esc, I = U.icon, F = Forms, V = Views;
  const X = {};
  const METHODS = ['PIX', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro', 'Transferência'];
  const num = v => Number(String(v || '0').replace(/\./g, '').replace(',', '.')) || 0;
  const svcName = id => (Store.service(id) || {}).name || 'Atendimento';
  const clinic = () => Store.db.clinic;

  /* ================= AGENDAR O PACOTE INTEIRO ================= */
  /* gera datas semanais a partir de uma data inicial, nos dias escolhidos */
  X.recurDates = ({ start, time, duration, days, count, skipBusy, ignoreId }) => {
    const out = [], skipped = [];
    if (!start || !days.length || count < 1) return { out, skipped };
    let d = start, guard = 0;
    while (out.length < count && guard < 400) {
      if (days.includes(U.dow(d))) {
        const busy = Store.conflicts({ id: ignoreId, date: d, time, duration });
        if (busy.length && skipBusy) skipped.push(d); else out.push({ date: d, busy: busy.length > 0 });
      }
      d = U.addDays(d, 1); guard++;
    }
    return { out, skipped };
  };

  X.recurBlock = (a) => `
    <div class="recur span-2">
      <label class="recur-toggle"><input type="checkbox" name="_recur"><span><b>Agendar o pacote inteiro</b><small>Repete toda semana nos dias escolhidos</small></span></label>
      <div class="recur-body" hidden>
        <fieldset class="field"><legend class="field-label">Dias da semana</legend>
          <div class="chips">${[[1, 'Seg'], [2, 'Ter'], [3, 'Qua'], [4, 'Qui'], [5, 'Sex'], [6, 'Sáb']].map(([v, t]) => `<label class="chip"><input type="checkbox" name="_days[]" value="${v}"${U.dow(a.date || U.today()) === v ? ' checked' : ''}><span>${t}</span></label>`).join('')}</div>
        </fieldset>
        <div class="form-grid">
          ${F.input('_count', 'Quantas sessões', 8, { type: 'number', min: 1, max: 60 })}
          <label class="check-inline recur-skip"><input type="checkbox" name="_skip" checked><span>Pular horários já ocupados</span></label>
        </div>
        <div class="recur-preview" aria-live="polite"></div>
      </div>
    </div>`;

  X.bindRecur = (el, a, { onDone }) => {
    const box = el.querySelector('.recur'); if (!box) return null;
    const tog = box.querySelector('[name=_recur]'), body = box.querySelector('.recur-body'), prev = box.querySelector('.recur-preview');
    const read = () => {
      const d = U.formData(el.querySelector('form'));
      return { start: d.date, time: d.time, duration: Number(d.duration) || 45, days: (d._days || []).map(Number), count: Math.min(60, Number(d._count) || 0), skipBusy: !!d._skip, ignoreId: a.id };
    };
    const fillCount = () => {
      const planSel = el.querySelector('[name=planId]');
      const pl = planSel && planSel.value ? Store.get('plans', planSel.value) : null;
      if (pl) { const st = Store.planStats(pl); box.querySelector('[name=_count]').value = Math.max(1, st.unscheduled || st.remaining || 1); }
    };
    const render = () => {
      if (!tog.checked) return;
      const r = read(), { out, skipped } = X.recurDates(r);
      if (!r.days.length) { prev.innerHTML = '<p class="muted small">Escolha pelo menos um dia da semana.</p>'; return; }
      prev.innerHTML = `<p class="recur-sum"><b>${out.length} ${out.length === 1 ? 'sessão' : 'sessões'}</b> de ${U.fmtDM(out[0] ? out[0].date : r.start)} a ${U.fmtDM(out.length ? out[out.length - 1].date : r.start)}, às ${U.fmtTime(r.time)}${skipped.length ? `. ${skipped.length} ${skipped.length === 1 ? 'dia pulado' : 'dias pulados'} por conflito` : ''}.</p>
        <div class="recur-dates">${out.map((x, i) => `<span class="${x.busy ? 'busy' : ''}" style="--k:${i}">${U.DIA_C[U.dow(x.date)]} ${U.fmtDM(x.date)}</span>`).join('')}</div>`;
    };
    tog.addEventListener('change', () => { body.hidden = !tog.checked; if (tog.checked) { fillCount(); render(); } });
    el.addEventListener('input', e => { if (box.contains(e.target) || ['date', 'time', 'duration'].includes(e.target.name)) render(); });
    el.addEventListener('change', e => { if (e.target.name === 'planId' && tog.checked) { fillCount(); render(); } else if (box.contains(e.target)) render(); });
    return {
      active: () => tog.checked,
      create: base => {
        const r = read(), { out } = X.recurDates(r);
        out.forEach(x => Store.put('appointments', Object.assign({}, base, { id: undefined, date: x.date })));
        onDone && onDone(out.length, out);
        return out.length;
      },
    };
  };

  /* ================= PAGAMENTOS ================= */
  F.payment = ({ planId = '', payment = null } = {}) => {
    const plans = Store.all('plans').filter(p => p.status !== 'cancelado' && (Store.planDue(p) > 0 || p.id === planId || (payment && p.id === payment.planId)));
    if (!plans.length) { U.toast('Nenhum pacote com valor em aberto.', 'error'); return; }
    const pay = payment || { planId: planId || plans[0].id, date: U.today(), method: 'PIX' };
    const label = p => { const pet = Store.get('pets', p.petId); return `${pet ? pet.name : '?'}: ${p.name} (falta ${U.money(Store.planDue(p))})`; };
    const due = id => { const p = Store.get('plans', id); return p ? Store.planDue(p) + (payment && payment.planId === id ? Number(payment.amount) || 0 : 0) : 0; };
    const body = `<form novalidate><div class="form-grid">
      ${F.select('planId', 'Pacote *', pay.planId, plans.map(p => [p.id, label(p)]), { required: true, span: 2 })}
      ${F.input('amount', 'Valor recebido (R$) *', pay.amount != null ? String(pay.amount).replace('.', ',') : String(due(pay.planId)).replace('.', ','), { inputmode: 'decimal', required: true })}
      ${F.input('date', 'Data *', pay.date, { type: 'date', required: true })}
      ${F.segmented('method', 'Forma de pagamento', pay.method, METHODS)}
      ${F.input('note', 'Observação', pay.note, { span: 2, placeholder: 'Ex.: parcela 2 de 3' })}
      <div class="pay-due span-2"></div>
    </div>${F.actions(payment ? 'Salvar pagamento' : 'Registrar pagamento', { del: !!payment })}</form>`;
    const m = U.modal({
      title: payment ? 'Editar pagamento' : 'Registrar pagamento', size: 'md', body,
      onMount: el => {
        const sel = el.querySelector('[name=planId]'), amt = el.querySelector('[name=amount]'), info = el.querySelector('.pay-due');
        const show = () => { const p = Store.get('plans', sel.value); if (!p) return; info.innerHTML = `<span>Valor do pacote <b>${U.money(p.price)}</b></span><span>Já pago <b>${U.money(Store.planPaid(p) - (payment && payment.planId === p.id ? Number(payment.amount) || 0 : 0))}</b></span><span>Em aberto <b class="warn">${U.money(due(p.id))}</b></span>`; };
        sel.addEventListener('change', () => { amt.value = String(due(sel.value)).replace('.', ','); show(); });
        show();
        el.querySelector('form').addEventListener('submit', e => {
          e.preventDefault();
          const d = U.formData(e.target); d.amount = num(d.amount);
          if (!d.amount || d.amount <= 0) return U.toast('Informe o valor recebido.', 'error');
          const p = Store.get('plans', d.planId);
          d.petId = p.petId; const pet = Store.get('pets', p.petId); d.tutorId = pet ? pet.tutorId : '';
          const saved = Store.put('payments', Object.assign({}, payment || {}, d));
          Store.put('plans', { id: p.id, paymentStatus: Store.payStatus(p) });
          m.close(); App.refresh();
          X.payToast(saved);
        });
        const del = el.querySelector('[data-delete]');
        del && del.addEventListener('click', async () => {
          if (await U.confirm({ title: 'Excluir pagamento?', text: `${U.money(payment.amount)} de ${U.fmtDate(payment.date)}.`, ok: 'Excluir', danger: true })) {
            Store.del('payments', payment.id); const p = Store.get('plans', payment.planId); p && Store.put('plans', { id: p.id, paymentStatus: Store.payStatus(p) });
            m.close(); U.toast('Pagamento excluído.'); App.refresh();
          }
        });
      },
    });
  };
  X.payToast = pay => {
    const root = document.getElementById('toast-root');
    const t = document.createElement('div');
    t.className = 'toast toast-ok toast-action';
    t.innerHTML = `${I('check')}<span>Pagamento de ${U.money(pay.amount)} registrado.</span><button class="link">Gerar recibo</button>`;
    t.querySelector('button').addEventListener('click', () => X.receipt(pay.id));
    root.appendChild(t); requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, 7000);
  };

  /* ================= JANELA DE IMPRESSÃO (recibo e relatório) ================= */
  const printCSS = `
    @page { size: A4; margin: 16mm; }
    * { box-sizing: border-box; }
    body { font: 400 12.5px/1.5 'Urbanist', 'Inter', system-ui, sans-serif; color: #10202B; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    h1, h2, h3 { margin: 0; font-weight: 600; }
    .doc { max-width: 760px; margin: 0 auto; padding: 24px; }
    .head { display: flex; align-items: center; gap: 18px; padding-bottom: 16px; border-bottom: 2px solid transparent; border-image: linear-gradient(90deg, #20437D, #0284A4, #00ECE2) 1; }
    .head .logo { width: 150px; flex: none; }
    .head .logo svg { width: 100%; height: auto; }
    .head .who { flex: 1; text-align: right; color: #4A5B66; font-size: 12px; }
    .head .who b { display: block; font-size: 15px; color: #10202B; }
    .lg-ink, .lg-name use, .lg-sub path { fill: #1B2A33; } .lg-hole { fill: #fff; } .lg-circle { fill: none; stroke: #F52187; stroke-width: 1.5; } .lg-shine { display: none; }
    .title { margin: 22px 0 14px; display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
    .title h1 { font-size: 26px; font-weight: 400; letter-spacing: -.02em; }
    .title span { color: #6B7C86; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 24px; margin-bottom: 16px; }
    .grid div { border-bottom: 1px solid #E3ECEF; padding: 6px 0; }
    .grid dt { font-size: 11px; color: #6B7C86; } .grid dd { margin: 0; font-weight: 600; }
    dl { margin: 0; }
    .box { border: 1px solid #DCE7EB; border-radius: 12px; padding: 14px 16px; margin: 14px 0; }
    .box h3 { font-size: 13.5px; margin-bottom: 8px; color: #0284A4; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 12px 0; }
    .kpis div { background: #F2F8FA; border-radius: 10px; padding: 10px 12px; }
    .kpis b { display: block; font-size: 20px; font-weight: 600; } .kpis small { color: #6B7C86; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; font-size: 11px; color: #6B7C86; font-weight: 600; border-bottom: 1px solid #DCE7EB; padding: 6px 6px; }
    td { padding: 8px 6px; border-bottom: 1px solid #EEF3F5; vertical-align: top; }
    td.n { white-space: nowrap; font-weight: 600; }
    .tag { display: inline-block; padding: 1px 7px; border-radius: 999px; background: #E6F7F8; color: #0B6E7E; font-size: 10.5px; margin: 0 3px 3px 0; }
    .amount { font-size: 34px; font-weight: 300; letter-spacing: -.02em; margin: 6px 0 2px; }
    .sign { margin-top: 54px; display: flex; justify-content: flex-end; }
    .sign div { width: 280px; border-top: 1px solid #10202B; text-align: center; padding-top: 6px; font-size: 12px; }
    .foot { margin-top: 26px; font-size: 10.5px; color: #8796A0; text-align: center; }
    .evo-grid { stroke: #E3ECEF; } .evo-ax { font: 600 10px sans-serif; fill: #6B7C86; }
    .evo-pain { fill: none; stroke: #0284A4; stroke-width: 2.5; } .evo-mob { fill: none; stroke: #F52187; stroke-width: 2; stroke-dasharray: 5 6; }
    .evo-dot { fill: #fff; stroke: #0284A4; stroke-width: 2; } .evo-sum { margin: 0 0 6px; } .evo-legend { font-size: 11px; color: #4A5B66; display: flex; gap: 16px; }
    .bar-print { position: sticky; top: 0; background: #10202B; color: #fff; padding: 10px 16px; display: flex; gap: 10px; align-items: center; justify-content: center; font-size: 13px; }
    .bar-print button { font: inherit; font-weight: 600; background: #14D9D3; color: #04161D; border: 0; border-radius: 8px; padding: 8px 16px; cursor: pointer; }
    @media print { .bar-print { display: none; } .doc { padding: 0; } }
  `;
  X.printDoc = (title, inner) => {
    const w = window.open('', '_blank');
    if (!w) { U.toast('O navegador bloqueou a nova janela. Permita pop-ups para este site.', 'error'); return; }
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title>
      <link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;500;600;700&display=swap" rel="stylesheet"><style>${printCSS}</style></head>
      <body><div class="bar-print">Pronto para imprimir ou salvar em PDF <button onclick="window.print()">Imprimir / salvar PDF</button></div><div class="doc">${inner}</div>
      <script>setTimeout(function(){ window.print(); }, 700);<\/script></body></html>`);
    w.document.close();
  };
  const docHead = () => {
    const c = clinic();
    return `<div class="head"><div class="logo">${BrandLogo('hero')}</div><div class="who"><b>${esc(c.name || 'Flaw Medeiros Fisioterapia Veterinária')}</b>${c.crmv ? esc(c.crmv) + '<br>' : ''}${c.phone ? esc(U.fmtPhone(c.phone)) + '<br>' : ''}${c.address ? esc(c.address) : ''}</div></div>`;
  };

  X.receipt = payId => {
    const pay = Store.get('payments', payId); if (!pay) return;
    const pl = Store.get('plans', pay.planId), pet = Store.get('pets', pay.petId), t = pet ? Store.tutorOf(pet) : null, c = clinic();
    const n = String(Store.all('payments').slice().sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).findIndex(x => x.id === pay.id) + 1).padStart(4, '0');
    X.printDoc(`Recibo ${n}`, `${docHead()}
      <div class="title"><h1>Recibo nº ${n}</h1><span>${U.fmtDate(pay.date)}</span></div>
      <div class="box"><small>Valor recebido</small><div class="amount">${U.money(pay.amount)}</div><small>${esc(pay.method || '')}${pay.note ? ', ' + esc(pay.note) : ''}</small></div>
      <p>Recebi de <b>${esc(t ? t.name : '—')}</b>${t && t.cpf ? `, CPF ${esc(t.cpf)},` : ''} a importância acima referente a <b>${esc(pl ? pl.name : 'atendimento')}</b> (${pl ? pl.total + ' sessões de ' + esc(svcName(pl.serviceId).toLowerCase()) : ''}) do paciente <b>${esc(pet ? pet.name : '—')}</b>${pet ? ` (${esc(F.speciesName(pet.species).toLowerCase())}${pet.breed ? ', ' + esc(pet.breed) : ''})` : ''}.</p>
      ${pl ? `<dl class="grid"><div><dt>Valor do pacote</dt><dd>${U.money(pl.price)}</dd></div><div><dt>Total pago até agora</dt><dd>${U.money(Store.planPaid(pl))}</dd></div><div><dt>Saldo em aberto</dt><dd>${U.money(Store.planDue(pl))}</dd></div><div><dt>Situação</dt><dd>${{ pago: 'Quitado', parcial: 'Pagamento parcial', pendente: 'Pendente' }[Store.payStatus(pl)]}</dd></div></dl>` : ''}
      <div class="sign"><div>${esc(c.name || 'Flaw Medeiros Fisioterapia Veterinária')}${c.crmv ? '<br>' + esc(c.crmv) : ''}</div></div>
      <p class="foot">Documento gerado em ${U.fmtDate(U.today())}.</p>`);
  };

  X.report = petId => {
    const p = Store.get('pets', petId); if (!p) return;
    const t = Store.tutorOf(p), plans = Store.plansOf(petId), ses = Store.sessionsOf(petId), c = clinic();
    const pl = Store.activePlan(petId) || plans[0];
    const st = pl ? Store.planStats(pl) : null;
    const withPain = ses.filter(s => s.pain !== '' && s.pain != null);
    const tech = {}; ses.forEach(s => (s.techniques || []).forEach(x => tech[x] = (tech[x] || 0) + 1));
    const topT = Object.entries(tech).sort((a, b) => b[1] - a[1]).slice(0, 6);
    X.printDoc(`Relatório de evolução, ${p.name}`, `${docHead()}
      <div class="title"><h1>Relatório de evolução</h1><span>${U.fmtDate(U.today())}</span></div>
      <dl class="grid">
        <div><dt>Paciente</dt><dd>${esc(p.name)}, ${esc([F.speciesName(p.species), p.breed, p.sex === 'M' ? 'macho' : p.sex === 'F' ? 'fêmea' : '', U.age(p.birth), p.weight ? String(p.weight).replace('.', ',') + ' kg' : ''].filter(Boolean).join(', '))}</dd></div>
        <div><dt>Tutor</dt><dd>${esc(t ? t.name : '—')}${t ? ', ' + esc(U.fmtPhone(t.phone)) : ''}</dd></div>
        <div><dt>Diagnóstico</dt><dd>${esc(p.diagnosis || '—')}</dd></div>
        <div><dt>Veterinário responsável</dt><dd>${esc([p.vetName, p.vetClinic].filter(Boolean).join(', ') || '—')}</dd></div>
      </dl>
      ${pl ? `<div class="kpis"><div><b>${st.done}</b><small>sessões realizadas</small></div><div><b>${st.remaining}</b><small>sessões restantes</small></div><div><b>${withPain.length ? withPain[0].pain + ' → ' + withPain[withPain.length - 1].pain : '—'}</b><small>dor, início → atual</small></div><div><b>${ses.length ? U.fmtDM(ses[0].date) : '—'}</b><small>início do tratamento</small></div></div>
      <div class="box"><h3>${esc(pl.name)}</h3>${pl.goals ? `<p><b>Objetivos:</b> ${esc(pl.goals)}</p>` : ''}${p.complaint ? `<p><b>Queixa inicial:</b> ${esc(p.complaint)}</p>` : ''}${topT.length ? `<p><b>Condutas mais usadas:</b> ${topT.map(([x, n]) => `${esc(x)} (${n})`).join(', ')}.</p>` : ''}</div>` : ''}
      ${window.Clinic ? Clinic.reportBlock(petId) : ''}
      ${withPain.length > 1 ? `<div class="box"><h3>Evolução da dor e da mobilidade</h3>${V.evoChart(ses)}</div>` : ''}
      <div class="box"><h3>Sessões</h3>${ses.length ? `<table><thead><tr><th>Data</th><th>Dor</th><th>Mob.</th><th>Condutas e evolução</th></tr></thead><tbody>
        ${ses.map(s => `<tr><td class="n">${U.fmtDate(s.date)}</td><td>${s.pain !== '' && s.pain != null ? s.pain : '—'}</td><td>${s.mobility !== '' && s.mobility != null ? s.mobility : '—'}</td><td>${(s.techniques || []).map(x => `<span class="tag">${esc(x)}</span>`).join('')}<div>${esc(s.notes || '')}</div>${s.homeCare ? `<div style="color:#6B7C86">Para casa: ${esc(s.homeCare)}</div>` : ''}</td></tr>`).join('')}
      </tbody></table>` : '<p>Nenhuma sessão registrada.</p>'}</div>
      ${p.handling ? `<div class="box"><h3>Cuidados no manejo</h3><p>${esc(p.handling)}</p></div>` : ''}
      <div class="sign"><div>${esc(c.name || 'Flaw Medeiros Fisioterapia Veterinária')}${c.crmv ? '<br>' + esc(c.crmv) : ''}</div></div>
      <p class="foot">Escalas: dor de 0 (sem dor) a 10 (dor máxima); mobilidade de 0 (sem apoio) a 5 (normal).</p>`);
  };

  /* ================= CONFIRMAÇÕES DO PRÓXIMO DIA ================= */
  X.nextDay = () => { let d = U.addDays(U.today(), 1); for (let i = 0; i < 7; i++) { if (Store.all('appointments').some(a => a.date === d && a.status !== 'cancelado')) return d; d = U.addDays(d, 1); } return U.addDays(U.today(), 1); };
  X.pendingConfirm = () => { const d = U.addDays(U.today(), 1); return Store.all('appointments').filter(a => a.date === d && a.status === 'agendado').length; };
  X.confirmations = () => {
    const day = X.nextDay();
    const draw = () => {
      const list = Store.all('appointments').filter(a => a.date === day && a.status !== 'cancelado').sort((a, b) => a.time.localeCompare(b.time));
      const c = clinic().name || 'Flaw Medeiros Fisioterapia Veterinária';
      return list.length ? `<p class="conf-lead">${list.filter(a => a.status === 'confirmado').length} de ${list.length} confirmados para ${U.relDay(day)}.</p><ul class="conf">${list.map(a => {
        const p = Store.get('pets', a.petId), t = Store.tutorOf(p), sn = V.sessNo(a);
        const msg = t && p ? `Olá, ${U.firstName(t.name)}! Aqui é da ${c}. Passando para confirmar o atendimento de ${p.name} ${U.relDay(day) === 'amanhã' ? 'amanhã' : 'na ' + U.fmtLong(day)} às ${U.fmtTime(a.time)}${sn && !sn.over ? ` (sessão ${sn.n} de ${sn.total})` : ''}. Podemos confirmar?` : '';
        return `<li class="${a.status === 'confirmado' ? 'is-ok' : ''}">
          <time>${U.fmtTime(a.time)}</time>${V.avatar(p, 'sm')}
          <span class="conf-main"><b>${esc(p ? p.name : '?')}</b><small>${esc(t ? t.name : 'sem tutor')}${a.reminderAt ? ', lembrete enviado' : ''}</small></span>
          ${a.status === 'confirmado' ? `<span class="pill st-confirmado">${I('check')}Confirmado</span>` : `
            ${t ? `<a class="btn btn-wa btn-sm" href="${U.wa(t.phone, msg)}" target="_blank" rel="noopener" data-sent="${a.id}">${I('chat')}<span>WhatsApp</span></a>` : ''}
            <button class="btn btn-soft btn-sm" data-ok="${a.id}">${I('check')}<span>Confirmar</span></button>`}
        </li>`; }).join('')}</ul>` : V.empty('Nada para confirmar', `Não há atendimentos marcados para ${U.relDay(day)}.`);
    };
    const m = U.modal({
      title: 'Confirmar atendimentos', subtitle: U.fmtLong(day), size: 'md', body: `<div class="conf-wrap">${draw()}</div>`,
      onMount: el => el.addEventListener('click', e => {
        const s = e.target.closest('[data-sent]'); if (s) { Store.put('appointments', { id: s.dataset.sent, reminderAt: Date.now() }); setTimeout(() => { el.querySelector('.conf-wrap').innerHTML = draw(); }, 300); }
        const o = e.target.closest('[data-ok]'); if (o) { Store.put('appointments', { id: o.dataset.ok, status: 'confirmado' }); el.querySelector('.conf-wrap').innerHTML = draw(); U.toast('Confirmado.'); }
      }),
      onClose: () => App.refresh(),
    });
  };

  /* ================= BUSCA RÁPIDA (Ctrl+K) ================= */
  X.search = () => {
    if (document.querySelector('.modal-search')) return;
    let sel = 0, results = [];
    const find = q => {
      q = U.norm(q.trim()); const out = [];
      const qd = U.digits(q);
      Store.all('pets').forEach(p => { const t = Store.tutorOf(p); const hay = U.norm([p.name, p.breed, p.diagnosis, t && t.name].join(' ')); if (!q || hay.includes(q) || (qd.length > 3 && t && U.digits(t.phone).includes(qd))) out.push({ k: 'pet', id: p.id, h: `#/pacientes/${p.id}`, t: p.name, s: [F.speciesName(p.species), p.breed, t && t.name].filter(Boolean).join(', '), av: V.avatar(p, 'sm') }); });
      Store.all('tutors').forEach(t => { const hay = U.norm([t.name, t.email].join(' ')); if (q && (hay.includes(q) || (qd.length > 3 && U.digits(t.phone).includes(qd)))) out.push({ k: 'tutor', id: t.id, h: `#/tutores/${t.id}`, t: t.name, s: U.fmtPhone(t.phone), av: `<span class="tav tav-sm">${esc(U.initials(t.name))}</span>` }); });
      const acts = [['Novo agendamento', 'calendar', 'appt'], ['Registrar sessão', 'note', 'session'], ['Novo paciente', 'paw', 'pet'], ['Registrar pagamento', 'wallet', 'pay'], ['Confirmar atendimentos de amanhã', 'chat', 'confirm']];
      acts.forEach(([n, ic, a]) => { if (!q || U.norm(n).includes(q)) out.push({ k: 'act', a, t: n, s: 'Ação', av: `<span class="srch-ic">${I(ic)}</span>` }); });
      return out.slice(0, 12);
    };
    const m = U.modal({
      title: 'Buscar', size: 'md',
      body: `<label class="search srch-in">${I('search')}<input type="search" placeholder="Paciente, tutor, telefone ou ação" autofocus></label><ul class="srch-res" role="listbox"></ul><p class="srch-hint">Use ↑ ↓ para navegar e Enter para abrir.</p>`,
      onMount: el => {
        el.classList.add('modal-search');
        const inp = el.querySelector('input'), ul = el.querySelector('.srch-res');
        const draw = () => {
          results = find(inp.value); sel = Math.min(sel, Math.max(0, results.length - 1));
          ul.innerHTML = results.length ? results.map((r, i) => `<li role="option" aria-selected="${i === sel}" data-i="${i}">${r.av}<span><b>${esc(r.t)}</b><small>${esc(r.s || '')}</small></span><em>${{ pet: 'Paciente', tutor: 'Tutor', act: 'Ação' }[r.k]}</em></li>`).join('') : '<li class="srch-empty">Nada encontrado.</li>';
        };
        const go = r => { if (!r) return; m.close(); setTimeout(() => { if (r.k === 'act') { if (r.a === 'pay') F.payment(); else if (r.a === 'confirm') X.confirmations(); else App.create(r.a); } else App.go(r.h); }, 60); };
        inp.addEventListener('input', () => { sel = 0; draw(); });
        inp.addEventListener('keydown', e => {
          if (e.key === 'ArrowDown') { sel = Math.min(results.length - 1, sel + 1); draw(); e.preventDefault(); }
          if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
          if (e.key === 'Enter') { go(results[sel]); e.preventDefault(); }
        });
        ul.addEventListener('click', e => { const li = e.target.closest('[data-i]'); li && go(results[Number(li.dataset.i)]); });
        draw(); setTimeout(() => inp.focus(), 80);
      },
    });
  };
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && Auth.current()) { e.preventDefault(); X.search(); }
  });

  /* ================= AVISOS DO PAINEL ================= */
  X.alerts = () => {
    const today = U.today(), out = [];
    const nd = U.addDays(today, 1), toConfirm = Store.all('appointments').filter(a => a.date === nd && a.status === 'agendado').length;
    if (toConfirm) out.push({ ic: 'chat', tone: 'm', t: `${toConfirm} ${toConfirm === 1 ? 'atendimento' : 'atendimentos'} de amanhã para confirmar`, act: 'confirm' });
    Store.all('pets').forEach(p => {
      if (!p.birth || p.status === 'inativo') return;
      const b = U.parse(p.birth), y = new Date().getFullYear();
      for (const yy of [y, y + 1]) { const d = U.iso(new Date(yy, b.getMonth(), b.getDate())); if (d >= today && d <= U.addDays(today, 7)) { out.push({ ic: 'paw', tone: 'a', t: `${p.name} faz ${yy - b.getFullYear()} ${yy - b.getFullYear() === 1 ? 'ano' : 'anos'} ${U.relDay(d)}`, href: `#/pacientes/${p.id}` }); break; } }
    });
    Store.all('pets').filter(p => p.status === 'tratamento').forEach(p => {
      const last = Store.sessionsOf(p.id).slice(-1)[0], nx = Store.nextAppt(p.id);
      if (!nx && last && last.date < U.addDays(today, -21)) out.push({ ic: 'clock', tone: 'm', t: `${p.name} está sem retorno desde ${U.fmtDM(last.date)}`, href: `#/pacientes/${p.id}` });
    });
    const noConsent = Store.all('tutors').filter(t => !t.consent && !t.anonymized).length;
    if (noConsent) out.push({ ic: 'note', tone: 'a', t: `${noConsent} ${noConsent === 1 ? 'tutor sem consentimento' : 'tutores sem consentimento'} LGPD`, href: '#/tutores' });
    const due = Store.all('plans').filter(pl => pl.status !== 'cancelado' && Store.planDue(pl) > 0);
    if (due.length) out.push({ ic: 'wallet', tone: 'g', t: `${due.length} ${due.length === 1 ? 'pacote' : 'pacotes'} com pagamento em aberto`, href: '#/financeiro' });
    return out;
  };

  /* ================= TELA FINANCEIRO ================= */
  V.financeiro = () => {
    const S = App.state;
    const today = U.today(), month = S.finMonth || today.slice(0, 7);
    const [y, mo] = month.split('-').map(Number);
    const shift = n => { const d = new Date(y, mo - 1 + n, 1); return `${d.getFullYear()}-${U.pad(d.getMonth() + 1)}`; };
    const pays = Store.all('payments');
    const plans = Store.all('plans');
    // recebimentos de entrada (plan.paid) contam no mês de início do pacote
    const entries = plans.filter(p => Number(p.paid) > 0).map(p => ({ id: 'e-' + p.id, planId: p.id, petId: p.petId, date: p.start || today, amount: Number(p.paid), method: p.payMethod || 'Entrada', entry: true }));
    const all = [...pays, ...entries];
    const inMonth = all.filter(x => (x.date || '').startsWith(month)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const received = inMonth.reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const prevM = shift(-1), prevRec = all.filter(x => (x.date || '').startsWith(prevM)).reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const open = plans.filter(p => p.status !== 'cancelado' && Store.planDue(p) > 0).map(p => ({ p, due: Store.planDue(p) })).sort((a, b) => b.due - a.due);
    const toReceive = open.reduce((s, x) => s + x.due, 0);
    const sold = plans.filter(p => (p.start || '').startsWith(month)).reduce((s, p) => s + (Number(p.price) || 0), 0);
    const sessM = Store.all('sessions').filter(s => (s.date || '').startsWith(month)).length;
    const months = [...Array(6)].map((_, i) => shift(i - 5));
    const series = months.map(mm => all.filter(x => (x.date || '').startsWith(mm)).reduce((s, x) => s + (Number(x.amount) || 0), 0));
    const max = Math.max(1, ...series);
    const delta = prevRec ? Math.round((received - prevRec) / prevRec * 100) : null;
    const byMethod = {}; inMonth.forEach(x => byMethod[x.method || 'Outro'] = (byMethod[x.method || 'Outro'] || 0) + Number(x.amount || 0));
    const c = clinic().name || 'Flaw Medeiros Fisioterapia Veterinária';
    return {
      title: 'Financeiro',
      action: `<button class="btn btn-primary" data-pay>${I('plus')}<span>Registrar pagamento</span></button>`,
      html: `
      <div class="toolbar">
        <div class="tb-nav"><button class="icon-btn" data-m="-1" aria-label="Mês anterior">${I('left')}</button><h2 class="tb-title">${U.MES_L[mo - 1]} ${y}</h2><button class="icon-btn" data-m="1" aria-label="Próximo mês">${I('right')}</button></div>
      </div>
      <div class="fin-kpis">
        <section class="ycard reveal" style="--r:0"><small>Recebido no mês</small><b data-count="${received}" data-format="money">${U.money(received)}</b><span>${delta == null ? 'Sem dados do mês anterior' : `${delta >= 0 ? '+' : ''}${delta}% em relação a ${U.MES_L[Number(prevM.slice(5)) - 1]}`}</span></section>
        <section class="ocard reveal" style="--r:1"><small>A receber</small><b data-count="${toReceive}" data-format="money">${U.money(toReceive)}</b><span>${open.length} ${open.length === 1 ? 'pacote em aberto' : 'pacotes em aberto'}</span></section>
        <section class="glass reveal" style="--r:2"><small>Pacotes vendidos no mês</small><b data-count="${sold}" data-format="money">${U.money(sold)}</b><span>${plans.filter(p => (p.start || '').startsWith(month)).length} novos pacotes</span></section>
        <section class="glass reveal" style="--r:3"><small>Sessões realizadas</small><b data-count="${sessM}">${sessM}</b><span>${sessM >= 5 && received ? `${U.money(received / sessM)} por sessão` : 'no mês'}</span></section>
      </div>
      <div class="duo">
        <section class="glass reveal" style="--r:4">
          <header class="c-head"><h2>Recebimentos por mês</h2><span class="c-sub">últimos 6 meses</span></header>
          <div class="mchart">${months.map((mm, i) => `<button class="mbar${mm === month ? ' is-on' : ''}" data-month="${mm}" style="--h:${Math.max(3, series[i] / max * 100)}%;--k:${i}" aria-label="${U.MES_L[Number(mm.slice(5)) - 1]}: ${U.money(series[i])}"><em>${series[i] ? U.money(series[i]).replace(',00', '') : ''}</em><i></i><span>${U.MES_L[Number(mm.slice(5)) - 1].slice(0, 3)}</span></button>`).join('')}</div>
          ${Object.keys(byMethod).length ? `<div class="methods">${Object.entries(byMethod).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<span><i style="--w:${Math.round(v / received * 100)}%"></i><b>${esc(k)}</b>${U.money(v)}</span>`).join('')}</div>` : ''}
        </section>
        <section class="glass reveal" style="--r:5">
          <header class="c-head"><h2>Em aberto</h2><span class="c-sub">${U.money(toReceive)}</span></header>
          ${open.length ? `<ul class="due-list">${open.map(({ p, due }, j) => { const pet = Store.get('pets', p.petId), t = pet ? Store.tutorOf(pet) : null; const msg = t ? `Olá, ${U.firstName(t.name)}! Aqui é da ${c}. Tudo bem? Passando para lembrar do saldo de ${U.money(due)} referente ao pacote de ${pet.name}. Posso enviar a chave PIX?` : ''; return `<li style="--k:${j}">
            ${V.avatar(pet, 'sm')}<span class="due-main"><b>${esc(pet ? pet.name : '?')}</b><small>${esc(p.name)}${t ? ', ' + esc(U.firstName(t.name)) : ''}</small><span class="left-bar"><i class="b-done" style="--w:${p.price ? Store.planPaid(p) / p.price * 100 : 0}%"></i></span></span>
            <span class="due-v"><b>${U.money(due)}</b><small>de ${U.money(p.price)}</small></span>
            <span class="due-act">${t ? `<a class="icon-btn icon-wa" href="${U.wa(t.phone, msg)}" target="_blank" rel="noopener" aria-label="Lembrar ${esc(t.name)} no WhatsApp">${I('chat')}</a>` : ''}<button class="btn btn-soft btn-sm" data-pay="${p.id}">${I('wallet')}<span>Receber</span></button></span>
          </li>`; }).join('')}</ul>` : V.empty('Tudo quitado', 'Nenhum pacote com saldo em aberto.')}
        </section>
      </div>
      <section class="glass reveal" style="--r:6;margin-top:16px">
        <header class="c-head"><h2>Recebimentos de ${U.MES_L[mo - 1]}</h2><span class="c-sub">${inMonth.length} ${inMonth.length === 1 ? 'lançamento' : 'lançamentos'}</span></header>
        ${inMonth.length ? `<ul class="pay-list">${inMonth.map(x => { const pet = Store.get('pets', x.petId), pl = Store.get('plans', x.planId), t = pet ? Store.tutorOf(pet) : null; return `<li>
          <time>${U.fmtDM(x.date)}</time>${V.avatar(pet, 'sm')}
          <span class="due-main"><b>${esc(t ? t.name : pet ? pet.name : '?')}</b><small>${esc(pet ? pet.name : '')}${pl ? ', ' + esc(pl.name) : ''}</small></span>
          <span class="pay-m">${esc(x.method || '')}${x.entry ? ' (entrada)' : ''}</span>
          <b class="pay-v">${U.money(x.amount)}</b>
          <span class="due-act">${x.entry ? '' : `<button class="icon-btn" data-receipt="${x.id}" aria-label="Gerar recibo">${I('note')}</button><button class="icon-btn" data-edit-pay="${x.id}" aria-label="Editar pagamento">${I('edit')}</button>`}</span>
        </li>`; }).join('')}</ul>` : V.empty('Nenhum recebimento neste mês', 'Use Registrar pagamento para lançar um valor.')}
      </section>`,
      mount(root) {
        root.addEventListener('click', e => {
          const g = s => e.target.closest(s);
          if (g('[data-m]')) { S.finMonth = shift(Number(g('[data-m]').dataset.m)); return App.go('#/financeiro'); }
          if (g('[data-month]')) { S.finMonth = g('[data-month]').dataset.month; return App.go('#/financeiro'); }
          if (g('[data-receipt]')) return X.receipt(g('[data-receipt]').dataset.receipt);
          if (g('[data-edit-pay]')) return F.payment({ payment: Store.get('payments', g('[data-edit-pay]').dataset.editPay) });
          if (g('[data-pay]')) return F.payment({ planId: g('[data-pay]').dataset.pay || '' });
        });
      },
    };
  };
  // o botão de ação no cabeçalho fica fora do "page"; trata aqui
  document.addEventListener('click', e => { const b = e.target.closest('.hdr [data-pay]'); if (b) F.payment(); });

  window.Extra = X;
})();
