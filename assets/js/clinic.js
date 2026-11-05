/* Flaw Medeiros — avaliação fisioterapêutica estruturada, LGPD,
   bloqueios de agenda, visão mensal e arrastar para remarcar */
(function () {
  'use strict';
  const U = UI, esc = U.esc, I = U.icon, F = Forms, V = Views, X = Extra;
  const C = {};

  /* ================= AVALIAÇÃO FISIOTERAPÊUTICA ================= */
  const LIMBS = [['mtd', 'Torácico D'], ['mte', 'Torácico E'], ['mpd', 'Pélvico D'], ['mpe', 'Pélvico E']];
  const JOINTS = [['ombro', 'Ombro'], ['cotovelo', 'Cotovelo'], ['carpo', 'Carpo'], ['quadril', 'Quadril'], ['joelho', 'Joelho'], ['tarso', 'Tarso']];
  const LAME = [['0', '0, sem claudicação'], ['1', '1, quase imperceptível'], ['2', '2, leve, apoia sempre'], ['3', '3, moderada'], ['4', '4, apoio eventual'], ['5', '5, sem apoio']];
  const PROP = [['normal', 'Normal'], ['diminuida', 'Diminuída'], ['ausente', 'Ausente']];
  const REFLEX = [['normal', 'Normal'], ['aumentado', 'Aumentado'], ['diminuido', 'Diminuído'], ['ausente', 'Ausente']];
  C.LIMBS = LIMBS; C.JOINTS = JOINTS;
  const n = v => v === '' || v == null ? null : Number(String(v).replace(',', '.'));

  F.evaluation = (ev = null, { petId = '' } = {}) => {
    const pet = Store.get('pets', ev ? ev.petId : petId); if (!pet) return;
    const prev = Store.all('evaluations').filter(x => x.petId === pet.id).length;
    ev = ev || { petId: pet.id, date: U.today(), kind: prev ? 'reavaliacao' : 'inicial', weight: pet.weight || '', lame: {}, prop: {}, gonio: {}, peri: {}, reflex: {} };
    const g = (j, side, kind) => ((ev.gonio || {})[`${j}_${side}_${kind}`] ?? '');
    const body = `<form novalidate>
      <div class="form-grid">
        ${F.input('date', 'Data *', ev.date, { type: 'date', required: true })}
        ${F.select('kind', 'Tipo', ev.kind, [['inicial', 'Avaliação inicial'], ['reavaliacao', 'Reavaliação'], ['alta', 'Avaliação de alta']])}
      </div>
      ${F.section('Estado geral',
        F.scale('pain', 'Dor (0 a 10)', ev.pain, 10, { span: 2, low: 'sem dor', high: 'dor máxima' }) +
        F.input('weight', 'Peso (kg)', ev.weight, { inputmode: 'decimal' }) +
        F.select('bcs', 'Escore corporal (1 a 9)', ev.bcs, [...Array(9)].map((_, i) => [String(i + 1), `${i + 1}${i + 1 === 5 ? ', ideal' : i + 1 < 4 ? ', abaixo' : i + 1 > 6 ? ', acima' : ''}`]), { placeholder: 'Selecione' }) +
        F.select('temperament', 'Comportamento na avaliação', ev.temperament, ['Colaborativo', 'Ansioso', 'Com dor ao manuseio', 'Agressivo'], { placeholder: 'Selecione', span: 2 }))}
      ${F.section('Claudicação e propriocepção', `<div class="ev-grid span-2">
        <span></span><b>Claudicação</b><b>Propriocepção</b>
        ${LIMBS.map(([k, t]) => `<span>${t}</span>
          <select name="lame_${k}"><option value="">—</option>${LAME.map(([v, l]) => `<option value="${v}"${String((ev.lame || {})[k] ?? '') === v ? ' selected' : ''}>${l}</option>`).join('')}</select>
          <select name="prop_${k}"><option value="">—</option>${PROP.map(([v, l]) => `<option value="${v}"${(ev.prop || {})[k] === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`).join('')}
      </div>`, 'Escala de claudicação de 0 (normal) a 5 (sem apoio do membro).')}
      ${F.section('Goniometria (graus)', `<div class="gonio span-2"><span></span><b>Flexão D</b><b>Extensão D</b><b>Flexão E</b><b>Extensão E</b>
        ${JOINTS.map(([k, t]) => `<span>${t}</span>${['d_flex', 'd_ext', 'e_flex', 'e_ext'].map(x => { const [side, kind] = x.split('_'); return `<input name="g_${k}_${side}_${kind}" inputmode="numeric" value="${esc(g(k, side, kind))}" aria-label="${t} ${kind === 'flex' ? 'flexão' : 'extensão'} ${side.toUpperCase()}">`; }).join('')}`).join('')}
      </div>`, 'Preencha só as articulações avaliadas.')}
      ${F.section('Perimetria (cm) e reflexos',
        F.input('peri_coxa_d', 'Coxa D', (ev.peri || {}).coxa_d, { inputmode: 'decimal' }) + F.input('peri_coxa_e', 'Coxa E', (ev.peri || {}).coxa_e, { inputmode: 'decimal' }) +
        F.input('peri_braco_d', 'Braço D', (ev.peri || {}).braco_d, { inputmode: 'decimal' }) + F.input('peri_braco_e', 'Braço E', (ev.peri || {}).braco_e, { inputmode: 'decimal' }) +
        F.select('ref_patelar', 'Reflexo patelar', (ev.reflex || {}).patelar, REFLEX, { placeholder: '—' }) + F.select('ref_flexor', 'Reflexo flexor', (ev.reflex || {}).flexor, REFLEX, { placeholder: '—' }) +
        F.select('ref_panicular', 'Reflexo cutâneo do tronco', (ev.reflex || {}).panicular, REFLEX, { placeholder: '—' }) + F.select('deep_pain', 'Dor profunda', ev.deep_pain, [['presente', 'Presente'], ['ausente', 'Ausente']], { placeholder: '—' }))}
      ${F.section('Achados e plano',
        F.textarea('gait', 'Marcha e postura', ev.gait, { rows: 2, placeholder: 'Ex.: ataxia leve dos pélvicos, cruza membros em curvas.' }) +
        F.textarea('tests', 'Testes especiais e palpação', ev.tests, { rows: 2, placeholder: 'Ex.: gaveta negativa, dor à palpação lombar.' }) +
        F.textarea('plan', 'Conduta e objetivos', ev.plan, { rows: 2 }))}
      ${F.actions(ev.id ? 'Salvar avaliação' : 'Registrar avaliação', { del: !!ev.id })}
    </form>`;
    const m = U.modal({
      title: ev.id ? 'Editar avaliação' : 'Avaliação fisioterapêutica', subtitle: esc(pet.name), size: 'lg', body,
      onMount: el => {
        el.querySelector('form').addEventListener('submit', e => {
          e.preventDefault();
          const d = U.formData(e.target);
          const out = { petId: pet.id, date: d.date || U.today(), kind: d.kind, pain: d.pain ?? '', weight: (d.weight || '').replace(',', '.'), bcs: d.bcs, temperament: d.temperament, deep_pain: d.deep_pain, gait: d.gait, tests: d.tests, plan: d.plan, lame: {}, prop: {}, gonio: {}, peri: {}, reflex: {} };
          Object.entries(d).forEach(([k, v]) => {
            if (v === '' || v == null) return;
            if (k.startsWith('lame_')) out.lame[k.slice(5)] = v;
            else if (k.startsWith('prop_')) out.prop[k.slice(5)] = v;
            else if (k.startsWith('g_')) out.gonio[k.slice(2)] = n(v);
            else if (k.startsWith('peri_')) out.peri[k.slice(5)] = n(v);
            else if (k.startsWith('ref_')) out.reflex[k.slice(4)] = v;
          });
          Store.put('evaluations', Object.assign({}, ev, out));
          if (out.weight) Store.put('pets', { id: pet.id, weight: out.weight });
          m.close(); U.toast(ev.id ? 'Avaliação atualizada.' : 'Avaliação registrada.'); App.refresh();
        });
        const del = el.querySelector('[data-delete]');
        del && del.addEventListener('click', async () => {
          if (await U.confirm({ title: 'Excluir avaliação?', text: `Avaliação de ${U.fmtDate(ev.date)}.`, ok: 'Excluir', danger: true })) { Store.del('evaluations', ev.id); m.close(); App.refresh(); }
        });
      },
    });
  };

  C.evalsOf = petId => Store.all('evaluations').filter(x => x.petId === petId).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const maxLame = ev => { const v = Object.values(ev.lame || {}).map(Number).filter(x => !isNaN(x)); return v.length ? Math.max(...v) : null; };
  const kindName = k => ({ inicial: 'Avaliação inicial', reavaliacao: 'Reavaliação', alta: 'Avaliação de alta' }[k] || 'Avaliação');

  /* linhas de comparação entre a primeira e a última avaliação */
  C.compareRows = (a, b) => {
    const rows = [];
    const push = (label, x, y, unit = '', better = 'down') => {
      if (x == null && y == null) return;
      const dx = x != null && y != null ? Math.round((y - x) * 10) / 10 : null;
      const good = dx == null || dx === 0 ? 'eq' : (better === 'down' ? dx < 0 : dx > 0) ? 'up' : 'down';
      rows.push({ label, x: x == null ? '—' : String(x).replace('.', ',') + unit, y: y == null ? '—' : String(y).replace('.', ',') + unit, d: dx == null ? '' : (dx > 0 ? '+' : '') + String(dx).replace('.', ',') + unit, good });
    };
    push('Dor (0 a 10)', n(a.pain), n(b.pain));
    push('Claudicação máxima (0 a 5)', maxLame(a), maxLame(b));
    LIMBS.forEach(([k, t]) => { const x = n((a.lame || {})[k]), y = n((b.lame || {})[k]); if (x != null || y != null) push(`Claudicação ${t.toLowerCase()}`, x, y); });
    JOINTS.forEach(([j, t]) => ['d', 'e'].forEach(side => ['flex', 'ext'].forEach(kind => {
      const key = `${j}_${side}_${kind}`, x = (a.gonio || {})[key], y = (b.gonio || {})[key];
      // flexão: ângulo menor = mais amplitude; extensão: ângulo maior = mais amplitude
      if (x != null || y != null) push(`${t} ${side.toUpperCase()}, ${kind === 'flex' ? 'flexão' : 'extensão'}`, x, y, '°', kind === 'flex' ? 'down' : 'up');
    })));
    [['coxa_d', 'Perimetria coxa D'], ['coxa_e', 'Perimetria coxa E'], ['braco_d', 'Perimetria braço D'], ['braco_e', 'Perimetria braço E']].forEach(([k, t]) => push(t, (a.peri || {})[k], (b.peri || {})[k], ' cm', 'up'));
    push('Peso', n(a.weight), n(b.weight), ' kg', 'eq');
    return rows;
  };

  C.evalTab = petId => {
    const list = C.evalsOf(petId);
    const first = list[0], last = list[list.length - 1];
    const rows = list.length > 1 ? C.compareRows(first, last) : [];
    return `<div class="treat">
      ${list.length > 1 ? `<section class="panel">
        <header class="panel-head"><h2>Comparativo</h2><span class="c-sub">${U.fmtDM(first.date)} → ${U.fmtDM(last.date)}</span></header>
        <div class="cmp" role="table"><div class="cmp-r cmp-h" role="row"><span>Medida</span><span>${esc(kindName(first.kind))}</span><span>${esc(kindName(last.kind))}</span><span>Variação</span></div>
        ${rows.map((r, i) => `<div class="cmp-r" role="row" style="--k:${i}"><span>${esc(r.label)}</span><span>${r.x}</span><span>${r.y}</span><span class="cmp-d cmp-${r.good}">${r.d || '—'}</span></div>`).join('')}</div>
        <p class="hint">Verde indica melhora. Na goniometria, flexão com ângulo menor e extensão com ângulo maior significam mais amplitude.</p>
      </section>` : ''}
      <section class="panel">
        <header class="panel-head"><h2>Avaliações</h2><button class="btn btn-primary btn-sm" data-eval-new>${I('plus')}Nova avaliação</button></header>
        ${list.length ? `<ol class="evo-list">${list.slice().reverse().map(ev => `<li><button class="evo-item" data-eval="${ev.id}">
          <div class="evo-date"><b>${U.fmtDM(ev.date)}</b><small>${esc(kindName(ev.kind))}</small></div>
          <div class="evo-body"><div class="evo-tags">${ev.pain !== '' && ev.pain != null ? `<span class="tag tag-pain">dor ${ev.pain}</span>` : ''}${maxLame(ev) != null ? `<span class="tag">claudicação ${maxLame(ev)}</span>` : ''}${ev.bcs ? `<span class="tag">escore ${ev.bcs}</span>` : ''}${Object.keys(ev.gonio || {}).length ? `<span class="tag tag-t">goniometria</span>` : ''}${Object.keys(ev.peri || {}).length ? `<span class="tag tag-t">perimetria</span>` : ''}</div>
          <p>${esc(ev.gait || ev.plan || 'Sem observações.')}</p></div></button></li>`).join('')}</ol>` : V.empty('Nenhuma avaliação ainda', 'Registre a avaliação inicial para acompanhar a evolução com números: dor, claudicação, goniometria e perimetria.', `<button class="btn btn-primary" data-eval-new>${I('plus')}Avaliação inicial</button>`)}
      </section>
    </div>`;
  };

  /* bloco para o relatório impresso */
  C.reportBlock = petId => {
    const list = C.evalsOf(petId); if (!list.length) return '';
    const first = list[0], last = list[list.length - 1];
    if (list.length === 1) return `<div class="box"><h3>${esc(kindName(first.kind))} (${U.fmtDate(first.date)})</h3>${first.gait ? `<p><b>Marcha:</b> ${esc(first.gait)}</p>` : ''}${first.plan ? `<p><b>Conduta:</b> ${esc(first.plan)}</p>` : ''}</div>`;
    const rows = C.compareRows(first, last);
    return `<div class="box"><h3>Comparativo de avaliações: ${U.fmtDate(first.date)} e ${U.fmtDate(last.date)}</h3>
      <table><thead><tr><th>Medida</th><th>Inicial</th><th>Atual</th><th>Variação</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${esc(r.label)}</td><td>${r.x}</td><td>${r.y}</td><td style="font-weight:700;color:${r.good === 'up' ? '#1E8E5A' : r.good === 'down' ? '#C8106A' : '#4A5B66'}">${r.d || '—'}</td></tr>`).join('')}
      </tbody></table>${last.plan ? `<p style="margin-top:8px"><b>Conduta atual:</b> ${esc(last.plan)}</p>` : ''}</div>`;
  };

  /* ================= LGPD ================= */
  C.consentTerm = tutorId => {
    const t = Store.get('tutors', tutorId); if (!t) return;
    const c = Store.db.clinic, pets = Store.petsOf(t.id).map(p => p.name).join(', ');
    X.printDoc('Termo de consentimento', `<div class="head"><div class="logo">${BrandLogo('hero')}</div><div class="who"><b>${esc(c.name || 'Flaw Medeiros Fisioterapia Veterinária')}</b>${c.crmv ? esc(c.crmv) : ''}</div></div>
      <div class="title"><h1>Termo de consentimento para tratamento de dados</h1></div>
      <p>Eu, <b>${esc(t.name)}</b>${t.cpf ? `, CPF ${esc(t.cpf)}` : ''}, tutor(a) de <b>${esc(pets || '________')}</b>, autorizo a <b>${esc(c.name || 'Flaw Medeiros Fisioterapia Veterinária')}</b> a coletar e tratar meus dados pessoais e os dados clínicos do(s) animal(is) acima, conforme a Lei nº 13.709/2018 (LGPD), para as seguintes finalidades:</p>
      <ul><li>cadastro, agendamento e confirmação de atendimentos;</li><li>registro do prontuário, das avaliações e da evolução do tratamento;</li><li>emissão de recibos, relatórios e comunicação com o médico-veterinário responsável;</li><li>envio de lembretes e avisos sobre o tratamento por WhatsApp, telefone ou e-mail${t.consentMsg === false ? ' (não autorizado)' : ''}.</li></ul>
      <p>Os dados não serão vendidos nem compartilhados com terceiros para fins comerciais. Posso, a qualquer momento, pedir acesso, correção, cópia ou exclusão dos meus dados, ressalvada a guarda do prontuário exigida pela legislação profissional.</p>
      <p>Fotos e vídeos do animal poderão ser registrados para acompanhamento clínico. Uso em divulgação: ( ) autorizo  ( ) não autorizo.</p>
      <div class="sign" style="justify-content:space-between"><div>${esc(t.name)}<br>Tutor(a)</div><div>${esc(c.name || 'Flaw Medeiros Fisioterapia Veterinária')}</div></div>
      <p class="foot">Local e data: ______________________, ____/____/______</p>`);
  };

  C.exportTutor = tutorId => {
    const t = Store.get('tutors', tutorId); if (!t) return;
    const pets = Store.petsOf(t.id), ids = new Set(pets.map(p => p.id)), plans = Store.all('plans').filter(p => ids.has(p.petId)), pids = new Set(plans.map(p => p.id));
    const data = { exportadoEm: new Date().toISOString(), clinica: Store.db.clinic.name, tutor: t, pets, planos: plans,
      sessoes: Store.all('sessions').filter(s => ids.has(s.petId)), agendamentos: Store.all('appointments').filter(a => ids.has(a.petId)),
      avaliacoes: Store.all('evaluations').filter(e => ids.has(e.petId)), pagamentos: Store.all('payments').filter(x => pids.has(x.planId)) };
    U.download(`dados-${U.norm(t.name).replace(/[^a-z0-9]+/g, '-')}-${U.today()}.json`, JSON.stringify(data, null, 2));
    U.toast('Arquivo com os dados do tutor exportado.');
  };

  C.anonymizeTutor = async tutorId => {
    const t = Store.get('tutors', tutorId); if (!t) return;
    if (!(await U.confirm({ title: 'Anonimizar este tutor?', text: `Nome, telefones, e-mail, CPF e endereço de <b>${esc(t.name)}</b> serão apagados de forma definitiva. O histórico clínico dos pets fica guardado, sem identificar o tutor. Use quando o tutor pedir a exclusão dos dados.`, ok: 'Anonimizar', danger: true }))) return;
    const keep = { id: t.id, createdAt: t.createdAt };
    Store.db.tutors = Store.db.tutors.map(x => x.id === t.id ? Object.assign(keep, { name: `Tutor anonimizado ${t.id.slice(-4).toUpperCase()}`, phone: '', anonymized: true, anonymizedAt: Date.now() }) : x);
    Store.save(); U.toast('Dados pessoais removidos.'); App.refresh();
  };

  C.privacy = () => {
    const c = Store.db.clinic.name || 'Flaw Medeiros Fisioterapia Veterinária';
    U.modal({
      title: 'Privacidade e proteção de dados', size: 'md',
      body: `<div class="prose privacy">
        <p><b>${esc(c)}</b> usa este sistema para organizar o atendimento dos pacientes. Os dados são tratados conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</p>
        <h3>Quais dados</h3><p>Dados de contato do tutor (nome, telefone, e-mail, CPF e endereço, quando informados) e dados clínicos do animal (ficha, avaliações, sessões, fotos e pagamentos).</p>
        <h3>Para quê</h3><p>Agendamento, prontuário, emissão de recibos e relatórios, comunicação com o tutor e com o médico-veterinário responsável.</p>
        <h3>Onde ficam</h3><p>Nesta versão, os dados ficam salvos somente no navegador deste aparelho e nos arquivos de backup exportados pela clínica. O acesso exige login com senha.</p>
        <h3>Direitos do tutor</h3><p>Pedir acesso, cópia, correção ou exclusão dos dados. Na ficha do tutor há os botões <b>Exportar dados</b> e <b>Anonimizar</b> para atender esses pedidos.</p>
        <h3>Boas práticas da clínica</h3><p>Registrar o consentimento de cada tutor, não compartilhar a senha, sair do sistema em computadores de uso comum e exportar o backup toda semana para um local seguro.</p>
      </div>`,
    });
  };

  /* ================= BLOQUEIOS DE AGENDA ================= */
  F.block = (b = null, preset = {}) => {
    b = b || Object.assign({ date: App.state.agendaDate || U.today(), start: '12:00', end: '13:30', reason: 'Almoço', repeat: 'none' }, preset);
    const body = `<form novalidate><div class="form-grid">
      ${F.input('reason', 'Motivo', b.reason, { span: 2, list: 'block-reasons' })}
      ${F.input('date', 'Data *', b.date, { type: 'date', required: true })}
      <span></span>
      ${F.input('start', 'Das *', b.start, { type: 'time', required: true, step: 300 })}
      ${F.input('end', 'Até *', b.end, { type: 'time', required: true, step: 300 })}
      ${F.select('repeat', 'Repetir', b.repeat || (b.weekly ? 'weekly' : 'none'), [['none', 'Só nesta data'], ['weekly', 'Toda semana neste dia'], ['weekdays', 'Todos os dias úteis (seg a sex)']], { span: 2 })}
      ${F.input('until', 'Repetir até (opcional)', b.until, { type: 'date' })}
      <datalist id="block-reasons"><option value="Almoço"><option value="Férias"><option value="Feriado"><option value="Curso"><option value="Atendimento externo"></datalist>
    </div>${F.actions(b.id ? 'Salvar bloqueio' : 'Bloquear horário', { del: !!b.id })}</form>`;
    const m = U.modal({
      title: b.id ? 'Editar bloqueio' : 'Bloquear horário', size: 'sm', body,
      onMount: el => {
        el.querySelector('form').addEventListener('submit', e => {
          e.preventDefault(); const d = U.formData(e.target);
          if (!d.date || !d.start || !d.end || U.toMin(d.end) <= U.toMin(d.start)) return U.toast('Confira a data e os horários do bloqueio.', 'error');
          Store.put('blocks', Object.assign({}, b, d)); m.close(); U.toast('Horário bloqueado.'); App.refresh();
        });
        const del = el.querySelector('[data-delete]');
        del && del.addEventListener('click', () => { Store.del('blocks', b.id); m.close(); U.toast('Bloqueio removido.'); App.refresh(); });
      },
    });
  };

  /* ================= VISÃO MENSAL ================= */
  C.monthView = date => {
    const d = U.parse(date), first = new Date(d.getFullYear(), d.getMonth(), 1);
    const start = U.weekStart(U.iso(first)), today = U.today(), m = d.getMonth();
    const appts = Store.all('appointments').filter(a => a.status !== 'cancelado');
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const day = U.addDays(start, i), dd = U.parse(day);
      if (i === 35 && dd.getMonth() !== m) break;
      const list = appts.filter(a => a.date === day).sort((a, b) => a.time.localeCompare(b.time));
      const blocked = Store.blocksOn(day).length;
      cells += `<button class="mc${dd.getMonth() !== m ? ' is-out' : ''}${day === today ? ' is-today' : ''}" data-day="${day}" aria-label="${U.fmtLong(day)}: ${list.length} atendimentos">
        <span class="mc-n">${dd.getDate()}</span>${blocked ? `<i class="mc-block" title="Horário bloqueado"></i>` : ''}
        ${list.slice(0, 3).map(a => { const p = Store.get('pets', a.petId); return `<span class="mc-ev st-${a.status}"><em>${U.fmtTime(a.time)}</em>${esc(p ? p.name : '?')}</span>`; }).join('')}
        ${list.length > 3 ? `<span class="mc-more">+${list.length - 3}</span>` : ''}</button>`;
    }
    return `<div class="month"><div class="month-h">${['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map(x => `<span>${x}</span>`).join('')}</div><div class="month-g">${cells}</div></div>`;
  };

  /* ================= ARRASTAR PARA REMARCAR (semana) ================= */
  const D = { drag: null, root: null, ctx: null };
  C.bindDrag = (root, ctx) => {
    D.root = root; D.ctx = ctx;
    root.addEventListener('pointerdown', e => {
      const ev = e.target.closest('.ev[data-appt]'); if (!ev || e.button !== 0 || e.pointerType === 'touch') return;
      const r = ev.getBoundingClientRect();
      D.drag = { ev, id: ev.dataset.appt, x0: e.clientX, y0: e.clientY, off: e.clientY - r.top, moved: false };
    });
  };
  window.addEventListener('pointermove', e => {
    const drag = D.drag; if (!drag) return;
    const { startH, endH, HOUR } = D.ctx;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    if (!drag.moved) { drag.moved = true; drag.ev.classList.add('is-drag'); document.body.classList.add('dragging'); }
    drag.ev.style.transform = `translate(${dx}px, ${dy}px)`;
    const col = document.elementsFromPoint(e.clientX, e.clientY).find(x => x.classList && x.classList.contains('wk-col'));
    D.root.querySelectorAll('.wk-col.drop').forEach(c => c !== col && c.classList.remove('drop'));
    if (col) {
      col.classList.add('drop');
      const top = e.clientY - drag.off - col.getBoundingClientRect().top;
      const min = Math.max(startH * 60, Math.min(endH * 60 - 15, Math.round((startH * 60 + top / HOUR * 60) / 15) * 15));
      drag.target = { date: col.dataset.date, time: U.fromMin(min) };
      drag.ev.dataset.when = `${U.DIA_C[U.dow(col.dataset.date)]} ${U.fmtTime(U.fromMin(min))}`;
    }
  });
  window.addEventListener('pointerup', async () => {
    const d = D.drag; if (!d) return;
    D.drag = null;
    document.body.classList.remove('dragging');
    if (!d.moved) return;
    d.ev.addEventListener('click', ev => { ev.stopPropagation(); ev.preventDefault(); }, { capture: true, once: true });
    const a = Store.get('appointments', d.id);
    if (!d.target || !a || (d.target.date === a.date && d.target.time === a.time)) { App.refresh(); return; }
    const c = Store.conflicts(Object.assign({}, a, d.target));
    if (c.length && !(await U.confirm({ title: 'Horário ocupado', text: `Já existe ${c[0].block ? 'um bloqueio (' + esc(c[0].reason) + ')' : 'outro atendimento'} nesse horário. Remarcar mesmo assim?`, ok: 'Remarcar' }))) { App.refresh(); return; }
    Store.put('appointments', Object.assign({ id: a.id }, d.target));
    const p = Store.get('pets', a.petId);
    U.toast(`${p ? p.name : 'Atendimento'} remarcado para ${U.relDay(d.target.date)} às ${U.fmtTime(d.target.time)}.`);
    App.refresh();
  });

  window.Clinic = C;
})();
