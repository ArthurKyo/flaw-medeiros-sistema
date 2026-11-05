/* Passo — formulários (tutor, paciente, plano, agendamento, sessão, serviço) */
(function () {
  'use strict';
  const U = UI, esc = U.esc;

  /* ---------- construtores de campo ---------- */
  const attrs = o => Object.entries(o || {}).filter(([, v]) => v !== false && v != null).map(([k, v]) => v === true ? k : `${k}="${esc(v)}"`).join(' ');
  const F = {
    field(label, control, { span = 1, hint = '', id = '' } = {}) {
      return `<label class="field span-${span}"${id ? ` for="${id}"` : ''}><span class="field-label">${label}</span>${control}${hint ? `<span class="field-hint">${hint}</span>` : ''}</label>`;
    },
    input(name, label, value, o = {}) {
      const { span, hint, type = 'text', ...rest } = o;
      return F.field(label, `<input ${attrs({ type, name, value: value ?? '', ...rest })}>`, { span, hint });
    },
    textarea(name, label, value, o = {}) {
      const { span = 2, hint, rows = 3, ...rest } = o;
      return F.field(label, `<textarea ${attrs({ name, rows, ...rest })}>${esc(value || '')}</textarea>`, { span, hint });
    },
    select(name, label, value, options, o = {}) {
      const { span, hint, placeholder, ...rest } = o;
      const opts = (placeholder ? `<option value="">${esc(placeholder)}</option>` : '') +
        options.map(op => { const [v, t] = Array.isArray(op) ? op : [op, op]; return `<option value="${esc(v)}"${String(v) === String(value ?? '') ? ' selected' : ''}>${esc(t)}</option>`; }).join('');
      return F.field(label, `<select ${attrs({ name, ...rest })}>${opts}</select>`, { span, hint });
    },
    segmented(name, label, value, options, { span = 2 } = {}) {
      return `<fieldset class="field span-${span}"><legend class="field-label">${label}</legend><div class="seg">${options.map(op => {
        const [v, t] = Array.isArray(op) ? op : [op, op];
        return `<label><input type="radio" name="${name}" value="${esc(v)}"${String(v) === String(value ?? '') ? ' checked' : ''}><span>${esc(t)}</span></label>`;
      }).join('')}</div></fieldset>`;
    },
    chips(name, label, values, options, { span = 2 } = {}) {
      const set = new Set(values || []);
      return `<fieldset class="field span-${span}"><legend class="field-label">${label}</legend><div class="chips">${options.map(v =>
        `<label class="chip"><input type="checkbox" name="${name}[]" value="${esc(v)}"${set.has(v) ? ' checked' : ''}><span>${esc(v)}</span></label>`).join('')}</div></fieldset>`;
    },
    scale(name, label, value, max, { span = 1, low = '', high = '' } = {}) {
      let h = '';
      for (let i = 0; i <= max; i++) h += `<label><input type="radio" name="${name}" value="${i}"${String(i) === String(value ?? '') ? ' checked' : ''}><span>${i}</span></label>`;
      return `<fieldset class="field span-${span}"><legend class="field-label">${label}</legend><div class="scale scale-${max}">${h}</div>${low ? `<div class="scale-ends"><span>${low}</span><span>${high}</span></div>` : ''}</fieldset>`;
    },
    section(title, inner, note = '') {
      return `<section class="form-section"><h3>${title}</h3>${note ? `<p class="form-note">${note}</p>` : ''}<div class="form-grid">${inner}</div></section>`;
    },
    actions(label, { del = false, delLabel = 'Excluir' } = {}) {
      return `<div class="form-actions">${del ? `<button type="button" class="btn btn-ghost-danger" data-delete>${U.icon('trash')}${delLabel}</button>` : ''}<span class="spacer"></span><button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="submit" class="btn btn-primary">${label}</button></div>`;
    },
  };

  const SPECIES = [['cao', 'Cão'], ['gato', 'Gato'], ['coelho', 'Coelho'], ['equino', 'Equino'], ['ave', 'Ave'], ['outro', 'Outro']];
  const speciesName = v => (SPECIES.find(s => s[0] === v) || [, 'Outro'])[1];
  const STATUS = { agendado: 'Agendado', confirmado: 'Confirmado', realizado: 'Realizado', faltou: 'Faltou', cancelado: 'Cancelado' };
  const PET_STATUS = [['tratamento', 'Em tratamento'], ['avaliacao', 'Em avaliação'], ['alta', 'Alta'], ['inativo', 'Inativo']];
  const petStatusName = v => (PET_STATUS.find(s => s[0] === v) || [, 'Em tratamento'])[1];

  const bindSubmit = (el, fn) => {
    const form = el.querySelector('form');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      U.$$('.field.invalid', form).forEach(f => f.classList.remove('invalid'));
      const bad = U.$$('[required]', form).filter(i => !i.value.trim());
      if (bad.length) {
        bad.forEach(i => i.closest('.field') && i.closest('.field').classList.add('invalid'));
        bad[0].focus();
        U.toast('Preencha os campos obrigatórios marcados.', 'error');
        return;
      }
      await fn(U.formData(form), form);
    });
    return form;
  };

  /* ================= TUTOR ================= */
  const tutorFields = (t = {}, prefix = '') => {
    const n = k => prefix + k;
    return F.section('Contato',
      F.input(n('name'), 'Nome completo *', t.name, { required: !prefix, span: 2, autocomplete: 'off' }) +
      F.input(n('phone'), 'Celular / WhatsApp *', U.fmtPhone(t.phone), { required: !prefix, 'data-mask': 'phone', inputmode: 'tel', placeholder: '(00) 00000-0000' }) +
      F.input(n('phone2'), 'Outro telefone', U.fmtPhone(t.phone2), { 'data-mask': 'phone', inputmode: 'tel' }) +
      F.input(n('email'), 'E-mail', t.email, { type: 'email', span: 2 }) +
      (prefix ? '' :
        F.input('cpf', 'CPF', t.cpf, { 'data-mask': 'cpf', inputmode: 'numeric' }) +
        F.input('birth', 'Data de nascimento', t.birth, { type: 'date' }) +
        F.select('preferred', 'Prefere ser contatado por', t.preferred || 'whatsapp', [['whatsapp', 'WhatsApp'], ['ligacao', 'Ligação'], ['email', 'E-mail']]) +
        F.select('source', 'Como conheceu a clínica', t.source, ['Indicação de veterinário', 'Indicação de cliente', 'Instagram', 'Google', 'Passou em frente', 'Outro'], { placeholder: 'Selecione' })));
  };

  F.tutor = (t = null, onSaved) => {
    t = t || {};
    const body = `<form novalidate>
      ${tutorFields(t)}
      ${F.section('Endereço',
        F.input('cep', 'CEP', t.cep, { 'data-mask': 'cep', inputmode: 'numeric' }) +
        F.input('city', 'Cidade', t.city) +
        F.input('street', 'Rua e número', t.street, { span: 2 }) +
        F.input('district', 'Bairro', t.district) +
        F.input('complement', 'Complemento', t.complement), 'Útil para atendimentos domiciliares.')}
      ${F.section('Contato de emergência',
        F.input('emergencyName', 'Nome', t.emergencyName) +
        F.input('emergencyPhone', 'Telefone', U.fmtPhone(t.emergencyPhone), { 'data-mask': 'phone', inputmode: 'tel' }))}
      ${F.section('Consentimento (LGPD)',
        `<label class="consent span-2"><input type="checkbox" name="consent"${t.consent ? ' checked' : ''}><span><b>O tutor autorizou o uso dos dados</b><small>Para cadastro, agendamento, prontuário do pet e emissão de documentos.${t.consentAt ? ' Registrado em ' + U.fmtDate(U.iso(new Date(t.consentAt))) + '.' : ''}</small></span></label>
        <label class="consent span-2"><input type="checkbox" name="consentMsg"${t.consentMsg !== false ? ' checked' : ''}><span><b>Aceita receber lembretes por WhatsApp</b><small>Confirmações de horário e avisos sobre o tratamento.</small></span></label>`, 'Pela Lei Geral de Proteção de Dados, registre a autorização do tutor. Você pode imprimir o termo na ficha do tutor.')}
      ${F.section('Observações', F.textarea('notes', 'Anotações sobre o tutor', t.notes, { placeholder: 'Ex.: prefere horários pela manhã, paga por PIX…' }))}
      ${F.actions(t.id ? 'Salvar alterações' : 'Cadastrar tutor', { del: !!t.id })}
    </form>`;
    const m = U.modal({
      title: t.id ? 'Editar tutor' : 'Novo tutor', size: 'lg', body,
      onMount: el => {
        bindSubmit(el, d => {
          d.phone = U.digits(d.phone); d.phone2 = U.digits(d.phone2); d.emergencyPhone = U.digits(d.emergencyPhone);
          if (d.consent && !t.consent) d.consentAt = Date.now();
          if (!d.consent) d.consentAt = null;
          const saved = Store.put('tutors', Object.assign({}, t, d));
          m.close(); U.toast(t.id ? 'Tutor atualizado.' : 'Tutor cadastrado.');
          onSaved ? onSaved(saved) : App.refresh();
        });
        const del = el.querySelector('[data-delete]');
        del && del.addEventListener('click', async () => {
          const pets = Store.petsOf(t.id);
          if (pets.length) { U.toast(`Este tutor tem ${pets.length} paciente(s). Exclua ou transfira os pacientes antes.`, 'error'); return; }
          if (await U.confirm({ title: 'Excluir tutor?', text: `Os dados de ${esc(t.name)} serão apagados.`, ok: 'Excluir', danger: true })) {
            Store.del('tutors', t.id); m.close(); U.toast('Tutor excluído.'); App.go('#/tutores');
          }
        });
      },
    });
  };

  /* ================= PACIENTE ================= */
  F.pet = (p = null, { tutorId = '' } = {}, onSaved) => {
    p = p || { tutorId, species: 'cao', status: 'avaliacao' };
    const tutors = Store.all('tutors').slice().sort((a, b) => a.name.localeCompare(b.name));
    const body = `<form novalidate>
      <div class="pet-form-top">
        <label class="photo-pick" title="Adicionar foto">
          <input type="file" accept="image/*" name="_photo" hidden>
          <span class="photo-prev">${p.photo ? `<img src="${p.photo}" alt="">` : U.icon('camera')}</span>
          <span class="photo-txt">${p.photo ? 'Trocar foto' : 'Adicionar foto'}</span>
        </label>
        <div class="form-grid grow">
          ${F.input('name', 'Nome do paciente *', p.name, { required: true, autocomplete: 'off' })}
          ${F.select('status', 'Situação', p.status, PET_STATUS)}
          ${F.segmented('species', 'Espécie', p.species, SPECIES)}
        </div>
      </div>
      ${F.section('Tutor responsável',
        F.select('tutorId', 'Tutor *', p.tutorId, [...tutors.map(t => [t.id, t.name]), ['__new', '+ Cadastrar novo tutor']], { required: true, placeholder: tutors.length ? 'Selecione o tutor' : 'Nenhum tutor ainda', span: 2 }) +
        `<div class="new-tutor span-2" hidden>${tutorFields({}, 'nt_')}</div>`)}
      ${F.section('Identificação',
        F.input('breed', 'Raça', p.breed, { list: 'breeds', placeholder: 'SRD, Dachshund…' }) +
        F.segmented('sex', 'Sexo', p.sex, [['M', 'Macho'], ['F', 'Fêmea']], { span: 1 }) +
        F.input('birth', 'Nascimento (aprox.)', p.birth, { type: 'date' }) +
        F.input('weight', 'Peso (kg)', p.weight, { inputmode: 'decimal', placeholder: '0,0' }) +
        F.select('size', 'Porte', p.size, ['Mini', 'Pequeno', 'Médio', 'Grande', 'Gigante'], { placeholder: 'Selecione' }) +
        F.select('neutered', 'Castrado', p.neutered, [['sim', 'Sim'], ['nao', 'Não'], ['nd', 'Não sei']], { placeholder: 'Selecione' }) +
        F.input('coat', 'Pelagem / cor', p.coat) +
        F.input('microchip', 'Microchip', p.microchip, { inputmode: 'numeric' }))}
      ${F.section('Quadro clínico',
        F.input('diagnosis', 'Diagnóstico', p.diagnosis, { span: 2, placeholder: 'Ex.: DDIV toracolombar — pós-hemilaminectomia T12-T13' }) +
        F.textarea('complaint', 'Queixa principal', p.complaint, { placeholder: 'O que o tutor relata: dificuldade para subir escadas, arrasta membros…' }) +
        F.textarea('history', 'Histórico clínico', p.history, { placeholder: 'Doenças prévias, exames, evolução até aqui.' }) +
        F.textarea('surgeries', 'Cirurgias', p.surgeries, { span: 1, rows: 2 }) +
        F.textarea('medications', 'Medicações em uso', p.medications, { span: 1, rows: 2 }) +
        F.textarea('allergies', 'Alergias e restrições', p.allergies, { span: 1, rows: 2 }) +
        F.textarea('exams', 'Exames de imagem', p.exams, { span: 1, rows: 2, placeholder: 'RX, TC, RM — datas e achados' }))}
      ${F.section('Veterinário que encaminhou',
        F.input('vetName', 'Nome', p.vetName) +
        F.input('vetClinic', 'Clínica / hospital', p.vetClinic) +
        F.input('vetPhone', 'Telefone', U.fmtPhone(p.vetPhone), { 'data-mask': 'phone', inputmode: 'tel' }) +
        F.input('vetCrmv', 'CRMV', p.vetCrmv))}
      ${F.section('Manejo e comportamento',
        F.select('temper', 'Temperamento', p.temper, ['Dócil', 'Ansioso', 'Medroso', 'Agitado', 'Reativo'], { placeholder: 'Selecione' }) +
        F.select('muzzle', 'Precisa de focinheira', p.muzzle, [['nao', 'Não'], ['as-vezes', 'Às vezes'], ['sim', 'Sim']], { placeholder: 'Selecione' }) +
        F.textarea('handling', 'Cuidados no manejo', p.handling, { placeholder: 'Ex.: não tocar na região lombar sem aviso; gosta de petisco de frango.' }))}
      ${F.section('Observações', F.textarea('notes', 'Anotações gerais', p.notes))}
      ${F.actions(p.id ? 'Salvar ficha' : 'Cadastrar paciente', { del: !!p.id })}
      <datalist id="breeds">${['SRD', 'Dachshund', 'Shih Tzu', 'Bulldog Francês', 'Golden Retriever', 'Labrador', 'Pastor Alemão', 'Lhasa Apso', 'Poodle', 'Yorkshire', 'Pinscher', 'Spitz Alemão', 'Border Collie', 'Rottweiler', 'Pug', 'Beagle', 'Maltês', 'Persa', 'Siamês', 'Maine Coon'].map(b => `<option value="${b}">`).join('')}</datalist>
    </form>`;
    let photo = p.photo || '';
    const m = U.modal({
      title: p.id ? 'Editar ficha do paciente' : 'Novo paciente', size: 'lg', body,
      onMount: el => {
        const sel = el.querySelector('[name=tutorId]');
        const nt = el.querySelector('.new-tutor');
        const toggle = () => {
          const on = sel.value === '__new';
          nt.hidden = !on;
          U.$$('input', nt).forEach(i => { if (['nt_name', 'nt_phone'].includes(i.name)) i.required = on; });
          on && nt.querySelector('input').focus();
        };
        sel.addEventListener('change', toggle);
        if (!tutors.length) { sel.value = '__new'; toggle(); }
        const file = el.querySelector('[name=_photo]');
        file.addEventListener('change', async () => {
          if (!file.files[0]) return;
          try {
            photo = await U.resizeImage(file.files[0]);
            el.querySelector('.photo-prev').innerHTML = `<img src="${photo}" alt="">`;
            el.querySelector('.photo-txt').textContent = 'Trocar foto';
          } catch (e) { U.toast('Não foi possível ler essa imagem.', 'error'); }
        });
        bindSubmit(el, d => {
          if (d.tutorId === '__new') {
            const t = Store.put('tutors', { name: d.nt_name, phone: U.digits(d.nt_phone), phone2: U.digits(d.nt_phone2), email: d.nt_email });
            d.tutorId = t.id;
          }
          Object.keys(d).forEach(k => k.startsWith('nt_') && delete d[k]);
          d.vetPhone = U.digits(d.vetPhone);
          d.weight = d.weight.replace(',', '.');
          d.photo = photo;
          const saved = Store.put('pets', Object.assign({}, p, d));
          m.close(); U.toast(p.id ? 'Ficha atualizada.' : `${saved.name} foi cadastrado.`);
          onSaved ? onSaved(saved) : (p.id ? App.refresh() : App.go('#/pacientes/' + saved.id));
        });
        const del = el.querySelector('[data-delete]');
        del && del.addEventListener('click', async () => {
          if (await U.confirm({ title: `Excluir ${esc(p.name)}?`, text: 'A ficha, os planos, as sessões e os agendamentos deste paciente serão apagados. Essa ação não pode ser desfeita.', ok: 'Excluir paciente', danger: true })) {
            Store.del('pets', p.id); m.close(); U.toast('Paciente excluído.'); App.go('#/pacientes');
          }
        });
      },
    });
  };

  /* ================= PLANO DE TRATAMENTO ================= */
  F.plan = (pl = null, { petId = '', from = null } = {}) => {
    const svc = Store.all('services');
    const base = from ? { petId: from.petId, name: from.name, serviceId: from.serviceId, total: from.total, perWeek: from.perWeek, price: from.price, goals: from.goals } : {};
    pl = pl || Object.assign({ petId, status: 'ativo', start: U.today(), total: 10, perWeek: 2, paymentStatus: 'pendente' }, base);
    const pets = Store.all('pets').slice().sort((a, b) => a.name.localeCompare(b.name));
    const st = pl.id ? Store.planStats(pl) : null;
    const body = `<form novalidate>
      ${F.section('Pacote',
        F.select('petId', 'Paciente *', pl.petId, pets.map(p => [p.id, p.name + (Store.tutorOf(p) ? ' — ' + U.firstName(Store.tutorOf(p).name) : '')]), { required: true, placeholder: 'Selecione', span: 2 }) +
        F.input('name', 'Nome do plano *', pl.name, { required: true, span: 2, placeholder: 'Ex.: Reabilitação pós-cirúrgica — fase 1' }) +
        F.select('serviceId', 'Serviço principal', pl.serviceId, svc.map(s => [s.id, s.name]), { placeholder: 'Selecione' }) +
        F.input('total', 'Quantidade de sessões *', pl.total, { type: 'number', min: st ? st.done : 1, max: 200, required: true, hint: st ? `${st.done} já realizadas` : '' }) +
        F.input('perWeek', 'Sessões por semana', pl.perWeek, { type: 'number', min: 1, max: 7 }) +
        F.input('start', 'Início', pl.start, { type: 'date' }) +
        F.select('status', 'Situação', pl.status, [['ativo', 'Ativo'], ['concluido', 'Concluído'], ['pausado', 'Pausado'], ['cancelado', 'Cancelado']]))}
      ${F.section('Pagamento',
        F.input('price', 'Valor total (R$)', pl.price, { inputmode: 'decimal', placeholder: '0,00' }) +
        F.input('paid', 'Entrada já paga (R$)', pl.paid, { inputmode: 'decimal', placeholder: '0,00', hint: pl.id && Store.paymentsOf(pl.id).length ? `Mais ${U.money(Store.planPaid(pl) - (Number(pl.paid) || 0))} em pagamentos registrados` : 'Parcelas seguintes ficam em Financeiro' }) +
        F.select('payMethod', 'Forma de pagamento', pl.payMethod, ['PIX', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro', 'Transferência', 'Por sessão'], { placeholder: 'Selecione' }))}
      ${F.section('Objetivos', F.textarea('goals', 'Metas do tratamento', pl.goals, { placeholder: 'Ex.: recuperar apoio do membro pélvico esquerdo; caminhar 10 min sem cansaço.' }))}
      ${F.actions(pl.id ? 'Salvar plano' : 'Criar plano', { del: !!pl.id })}
    </form>`;
    const m = U.modal({
      title: pl.id ? 'Editar plano de tratamento' : (from ? 'Renovar pacote' : 'Novo plano de tratamento'), size: 'md', body,
      onMount: el => {
        const svcSel = el.querySelector('[name=serviceId]'), total = el.querySelector('[name=total]'), price = el.querySelector('[name=price]');
        const autoprice = () => { if (pl.id) return; const s = Store.service(svcSel.value); if (s && total.value) price.value = String(s.price * Number(total.value)).replace('.', ','); };
        svcSel.addEventListener('change', autoprice); total.addEventListener('input', autoprice);
        bindSubmit(el, d => {
          const num = v => Number(String(v || '0').replace(/\./g, '').replace(',', '.')) || 0;
          d.total = Math.max(1, Number(d.total) || 1); d.perWeek = Number(d.perWeek) || 0;
          d.price = num(d.price); d.paid = num(d.paid);
          d.paymentStatus = Store.payStatus(Object.assign({}, pl, d, { id: pl.id || '__new' }));
          if (d.status === 'ativo') Store.all('plans').forEach(o => { if (o.petId === d.petId && o.id !== pl.id && o.status === 'ativo') { o.status = 'concluido'; } });
          const saved = Store.put('plans', Object.assign({}, pl, d));
          const pet = Store.get('pets', saved.petId);
          if (pet && saved.status === 'ativo' && pet.status !== 'tratamento') Store.put('pets', { id: pet.id, status: 'tratamento' });
          m.close(); App.refresh();
          if (!pl.id && saved.status === 'ativo') { U.toast('Plano criado. Agora escolha os dias para agendar as sessões.'); setTimeout(() => F.appt(null, { petId: saved.petId, planId: saved.id, serviceId: saved.serviceId || undefined, duration: (Store.service(saved.serviceId) || {}).duration || 45, recur: true }), 250); }
          else U.toast(pl.id ? 'Plano atualizado.' : 'Plano criado.');
        });
        const del = el.querySelector('[data-delete]');
        del && del.addEventListener('click', async () => {
          if (await U.confirm({ title: 'Excluir plano?', text: 'As sessões registradas continuam no prontuário, mas deixam de contar para este pacote.', ok: 'Excluir plano', danger: true })) {
            Store.del('plans', pl.id); m.close(); U.toast('Plano excluído.'); App.refresh();
          }
        });
      },
    });
  };

  /* ================= AGENDAMENTO ================= */
  F.appt = (a = null, preset = {}) => {
    preset = Object.fromEntries(Object.entries(preset || {}).filter(([, v]) => v !== undefined));
    const wantRecur = !!preset.recur; delete preset.recur;
    const svc = Store.all('services');
    a = a || Object.assign({ date: U.today(), time: '09:00', status: 'agendado', serviceId: (svc[1] || svc[0] || {}).id, duration: (svc[1] || svc[0] || {}).duration || 45 }, preset);
    const pets = Store.all('pets').filter(p => p.status !== 'inativo' || p.id === a.petId).sort((x, y) => x.name.localeCompare(y.name));
    if (!pets.length) { U.toast('Cadastre um paciente antes de agendar.', 'error'); F.pet(); return; }
    const planOpts = petId => Store.plansOf(petId).filter(p => p.status === 'ativo' || p.id === a.planId).map(p => { const s = Store.planStats(p); return [p.id, `${p.name} (${s.remaining} restantes)`]; });
    const body = `<form novalidate>
      <div class="form-grid">
        ${F.select('petId', 'Paciente *', a.petId, pets.map(p => [p.id, p.name + (Store.tutorOf(p) ? ' — ' + U.firstName(Store.tutorOf(p).name) : '')]), { required: true, placeholder: 'Selecione o paciente', span: 2 })}
        ${F.select('serviceId', 'Serviço', a.serviceId, svc.map(s => [s.id, s.name]), { span: 2 })}
        ${F.input('date', 'Data *', a.date, { type: 'date', required: true })}
        ${F.input('time', 'Horário *', a.time, { type: 'time', required: true, step: 300 })}
        ${F.input('duration', 'Duração (min)', a.duration, { type: 'number', min: 10, max: 240, step: 5 })}
        ${F.select('status', 'Situação', a.status, Object.entries(STATUS).filter(([k]) => k !== 'realizado' || a.status === 'realizado'))}
        <div class="field span-2 plan-slot"></div>
        ${F.select('place', 'Local', a.place || 'clinica', [['clinica', 'Na clínica'], ['domicilio', 'Domiciliar'], ['online', 'Teleorientação']], { span: 2 })}
        ${F.textarea('notes', 'Observações', a.notes, { rows: 2, placeholder: 'Ex.: trazer exames; chegar 10 min antes para aquecimento.' })}
        <div class="conflict span-2" hidden></div>
        ${a.id ? '' : Extra.recurBlock(a)}
      </div>
      ${a.id ? F.actions('Salvar agendamento', { del: true }) : F.actions('Agendar')}
    </form>`;
    const m = U.modal({
      title: a.id ? 'Editar agendamento' : 'Novo agendamento', size: 'md', body,
      onMount: el => {
        const petSel = el.querySelector('[name=petId]'), svcSel = el.querySelector('[name=serviceId]'), dur = el.querySelector('[name=duration]');
        const slot = el.querySelector('.plan-slot'), conflict = el.querySelector('.conflict');
        const renderPlans = () => {
          const opts = planOpts(petSel.value);
          const active = Store.activePlan(petSel.value);
          const cur = a.id ? a.planId : (active ? active.id : '');
          slot.innerHTML = petSel.value ? `<span class="field-label">Conta para o pacote</span><select name="planId"><option value="">Avulso (não desconta de pacote)</option>${opts.map(([v, t]) => `<option value="${v}"${v === cur ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>` : '';
        };
        const check = () => {
          const d = U.formData(el.querySelector('form'));
          if (!d.date || !d.time) { conflict.hidden = true; return; }
          const c = Store.conflicts({ id: a.id, date: d.date, time: d.time, duration: d.duration });
          conflict.hidden = !c.length;
          if (c.length) conflict.innerHTML = `${U.icon('alert')}<span>Conflito com ${c.map(x => { if (x.block) return `<b>${esc(x.reason)}</b> (bloqueio às ${U.fmtTime(x.time)})`; const p = Store.get('pets', x.petId); return `<b>${esc(p ? p.name : '?')}</b> às ${U.fmtTime(x.time)}`; }).join(', ')}. Você pode agendar mesmo assim.</span>`;
        };
        petSel.addEventListener('change', renderPlans);
        svcSel.addEventListener('change', () => { const s = Store.service(svcSel.value); if (s) dur.value = s.duration; check(); });
        U.$$('[name=date],[name=time],[name=duration]', el).forEach(i => i.addEventListener('input', check));
        renderPlans(); check();
        const recur = a.id ? null : Extra.bindRecur(el, a, {});
        if (recur && wantRecur) { const tg = el.querySelector('[name=_recur]'); tg.checked = true; tg.dispatchEvent(new Event('change', { bubbles: true })); }
        bindSubmit(el, d => {
          d.duration = Number(d.duration) || 45;
          Object.keys(d).forEach(k => k.startsWith('_') && delete d[k]);
          if (recur && recur.active()) {
            const n = recur.create(Object.assign({}, a, d));
            m.close(); U.toast(n ? `${n} ${n === 1 ? 'sessão agendada' : 'sessões agendadas'}.` : 'Nenhuma data disponível com essas opções.', n ? 'ok' : 'error'); App.refresh(); return;
          }
          const saved = Store.put('appointments', Object.assign({}, a, d));
          m.close(); U.toast(a.id ? 'Agendamento atualizado.' : `Agendado para ${U.relDay(saved.date)} às ${U.fmtTime(saved.time)}.`); App.refresh();
        });
        const del = el.querySelector('[data-delete]');
        del && del.addEventListener('click', async () => {
          if (await U.confirm({ title: 'Excluir agendamento?', text: 'Se quiser manter o histórico, use “Cancelado” na situação.', ok: 'Excluir', danger: true })) {
            Store.del('appointments', a.id); m.close(); U.toast('Agendamento excluído.'); App.refresh();
          }
        });
      },
    });
  };

  /* ================= SESSÃO / EVOLUÇÃO ================= */
  F.session = (s = null, { appt = null, petId = '' } = {}) => {
    const pets = Store.all('pets').slice().sort((a, b) => a.name.localeCompare(b.name));
    if (!pets.length) { U.toast('Cadastre um paciente antes de registrar sessões.', 'error'); return; }
    if (!s) {
      const pid = appt ? appt.petId : petId;
      const prev = pid ? Store.sessionsOf(pid).slice(-1)[0] : null;
      const plan = appt && appt.planId ? Store.get('plans', appt.planId) : (pid ? Store.activePlan(pid) : null);
      s = { petId: pid, planId: plan ? plan.id : '', appointmentId: appt ? appt.id : '', date: appt ? appt.date : U.today(), time: appt ? appt.time : U.nowTime(), techniques: prev ? prev.techniques : [], pain: '', mobility: '' };
    }
    const pet = Store.get('pets', s.petId);
    const planList = pid => Store.plansOf(pid).filter(p => p.status === 'ativo' || p.id === s.planId);
    const last = s.petId ? Store.sessionsOf(s.petId).filter(x => x.id !== s.id).slice(-1)[0] : null;
    const body = `<form novalidate>
      ${last ? `<div class="last-note">${U.icon('note')}<div><b>Última sessão, ${U.fmtDM(last.date)}</b><p>${esc(last.notes || 'Sem anotações.')}</p>${last.homeCare ? `<p class="muted">Para casa: ${esc(last.homeCare)}</p>` : ''}</div></div>` : ''}
      <div class="form-grid">
        ${F.select('petId', 'Paciente *', s.petId, pets.map(p => [p.id, p.name]), { required: true, placeholder: 'Selecione', span: 2, disabled: !!appt || undefined })}
        ${appt ? `<input type="hidden" name="petId" value="${s.petId}">` : ''}
        ${F.input('date', 'Data *', s.date, { type: 'date', required: true })}
        ${F.input('time', 'Horário', s.time, { type: 'time' })}
        <div class="field span-2 plan-slot"></div>
      </div>
      ${F.section('Avaliação do dia',
        F.scale('pain', 'Dor percebida', s.pain, 10, { span: 2, low: 'sem dor', high: 'dor máxima' }) +
        F.scale('mobility', 'Mobilidade', s.mobility, 5, { span: 1, low: 'sem apoio', high: 'normal' }) +
        F.input('weight', 'Peso hoje (kg)', s.weight || (pet && pet.weight) || '', { inputmode: 'decimal' }))}
      ${F.section('Condutas', F.chips('techniques', 'Técnicas aplicadas', s.techniques, Store.TECHNIQUES))}
      ${F.section('Evolução',
        F.textarea('notes', 'Como foi a sessão *', s.notes, { required: true, rows: 4, placeholder: 'Resposta ao tratamento, parâmetros usados (tempo, intensidade), comportamento…' }) +
        F.textarea('homeCare', 'Orientações para casa', s.homeCare, { rows: 2, placeholder: 'Exercícios, compressas, restrições.' }))}
      ${F.actions(s.id ? 'Salvar evolução' : 'Registrar sessão', { del: !!s.id })}
    </form>`;
    const m = U.modal({
      title: s.id ? 'Editar sessão' : 'Registrar sessão', subtitle: appt ? `${esc(pet ? pet.name : '')}, ${U.relDay(appt.date)} às ${U.fmtTime(appt.time)}` : '', size: 'lg', body,
      onMount: el => {
        const petSel = el.querySelector('select[name=petId]'), slot = el.querySelector('.plan-slot');
        const render = () => {
          const pid = petSel.value;
          if (!pid) { slot.innerHTML = ''; return; }
          const cur = s.petId === pid ? s.planId : ((Store.activePlan(pid) || {}).id || '');
          slot.innerHTML = `<span class="field-label">Pacote</span><select name="planId"><option value="">Sessão avulsa</option>${planList(pid).map(p => { const st = Store.planStats(p); return `<option value="${p.id}"${p.id === cur ? ' selected' : ''}>${esc(p.name)}: ${st.done} de ${st.total} feitas</option>`; }).join('')}</select>`;
        };
        petSel.addEventListener('change', render); render();
        bindSubmit(el, d => {
          d.pain = d.pain === undefined ? '' : d.pain; d.mobility = d.mobility === undefined ? '' : d.mobility;
          d.weight = (d.weight || '').replace(',', '.');
          const saved = Store.put('sessions', Object.assign({}, s, d));
          if (appt) Store.put('appointments', { id: appt.id, status: 'realizado', sessionId: saved.id, planId: saved.planId });
          if (d.weight && pet) Store.put('pets', { id: pet.id, weight: d.weight });
          m.close();
          let msg = s.id ? 'Evolução atualizada.' : 'Sessão registrada.';
          if (saved.planId) {
            const pl = Store.get('plans', saved.planId), st = Store.planStats(pl);
            if (!s.id) msg = st.remaining === 0 ? `Sessão registrada. O pacote “${pl.name}” foi concluído.` : `Sessão registrada. Restam ${st.remaining} de ${st.total}.`;
            if (st.remaining === 0 && pl.status === 'ativo') Store.put('plans', { id: pl.id, status: 'concluido' });
          }
          U.toast(msg); App.refresh();
        });
        const del = el.querySelector('[data-delete]');
        del && del.addEventListener('click', async () => {
          if (await U.confirm({ title: 'Excluir sessão?', text: 'A evolução será apagada e a sessão volta a ficar disponível no pacote.', ok: 'Excluir sessão', danger: true })) {
            Store.del('sessions', s.id); m.close(); U.toast('Sessão excluída.'); App.refresh();
          }
        });
      },
    });
  };

  /* ================= SERVIÇO ================= */
  F.service = (sv = null) => {
    sv = sv || { duration: 45, color: 'teal' };
    const body = `<form novalidate><div class="form-grid">
      ${F.input('name', 'Nome do serviço *', sv.name, { required: true, span: 2 })}
      ${F.input('duration', 'Duração padrão (min)', sv.duration, { type: 'number', min: 10, step: 5 })}
      ${F.input('price', 'Valor por sessão (R$)', sv.price, { inputmode: 'decimal' })}
      <fieldset class="field span-2"><legend class="field-label">Cor na agenda</legend><div class="swatches">${['plum', 'teal', 'sky', 'amber', 'pist', 'rose'].map(c => `<label><input type="radio" name="color" value="${c}"${c === sv.color ? ' checked' : ''}><span class="sw c-${c}"></span></label>`).join('')}</div></fieldset>
    </div>${F.actions(sv.id ? 'Salvar serviço' : 'Adicionar serviço', { del: !!sv.id })}</form>`;
    const m = U.modal({
      title: sv.id ? 'Editar serviço' : 'Novo serviço', size: 'sm', body,
      onMount: el => {
        bindSubmit(el, d => {
          d.duration = Number(d.duration) || 45; d.price = Number(String(d.price || 0).replace(',', '.')) || 0;
          Store.put('services', Object.assign({}, sv, d)); m.close(); U.toast('Serviço salvo.'); App.refresh();
        });
        const del = el.querySelector('[data-delete]');
        del && del.addEventListener('click', async () => {
          if (Store.all('appointments').some(a => a.serviceId === sv.id)) { U.toast('Esse serviço já foi usado em agendamentos e não pode ser excluído. Renomeie se precisar.', 'error'); return; }
          if (await U.confirm({ title: 'Excluir serviço?', text: esc(sv.name), ok: 'Excluir', danger: true })) { Store.del('services', sv.id); m.close(); App.refresh(); }
        });
      },
    });
  };

  F.SPECIES = SPECIES; F.speciesName = speciesName; F.STATUS = STATUS; F.PET_STATUS = PET_STATUS; F.petStatusName = petStatusName;
  window.Forms = F;
})();
