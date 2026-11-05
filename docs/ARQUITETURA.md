# Arquitetura e modelo de dados

## Ordem de carregamento

`index.html` carrega os scripts nesta ordem. Cada script expõe um objeto global usado pelos seguintes:

| Arquivo | Expõe | Responsabilidade |
|---|---|---|
| `store.js` | `Store`, `Auth` | Banco em `localStorage`, consultas de domínio, backup, autenticação |
| `ui.js` | `UI` | Datas em pt-BR, moeda, máscaras, modal, confirmação, aviso, ícones, `countUp` |
| `brand.js` | `BrandLogo()` | SVG do logo; `BrandLogo('anim hero')` anima, `BrandLogo('mini')` é a versão pequena |
| `forms.js` | `Forms` | Formulários e validação |
| `views.js` | `Views` | Telas e componentes (anel, trilha, gráfico de evolução) |
| `features.js` | `Extra` | Financeiro, impressão, confirmações, busca, recorrência, avisos |
| `clinic.js` | `Clinic` | Avaliações, LGPD, bloqueios, visão mensal, arrastar |
| `app.js` | `App`, `Seed` | Rotas, estrutura da tela, login, tema, dados de exemplo |

## Fluxo de uma tela

```
hashchange → App.render()
  ├─ sem usuário      → renderAuth('setup')
  ├─ sem sessão       → renderAuth('login')
  └─ Views[pagina]()  → { title, html, action?, back?, mount(root) }
        └─ App monta a estrutura (barra lateral, topo, barra inferior) e chama mount()
App.refresh() → redesenha sem animações de entrada (usado após salvar dados)
```

## Coleções (`Store.db`)

```js
clinic:  { name, phone, address, crmv, dayStart, dayEnd }
user:    { name, email, salt, hash, rsalt, rhash }   // senha e código de recuperação só em hash

tutors:  { id, name, phone, phone2, email, cpf, birth, preferred, source,
           cep, city, street, district, complement, emergencyName, emergencyPhone, notes,
           consent, consentAt, consentMsg, anonymized }
pets:    { id, tutorId, name, species, breed, sex, birth, weight, size, neutered, coat, microchip,
           photo (dataURL), status, diagnosis, complaint, history, surgeries, medications, allergies,
           exams, vetName, vetClinic, vetPhone, vetCrmv, temper, muzzle, handling, notes }
plans:   { id, petId, name, serviceId, total, perWeek, start, status, price, paid (entrada),
           payMethod, paymentStatus, goals }
appointments: { id, petId, planId, serviceId, date 'AAAA-MM-DD', time 'HH:MM', duration, status,
           place, notes, sessionId, reminderAt }
sessions: { id, petId, planId, appointmentId, date, time, pain, mobility, weight, techniques[],
           notes, homeCare }
payments: { id, planId, petId, tutorId, date, amount, method, note }
evaluations: { id, petId, date, kind, pain, weight, bcs, temperament, deep_pain,
           lame{mtd,mte,mpd,mpe}, prop{…}, gonio{'quadril_d_flex': 60, …}, peri{coxa_d,…},
           reflex{patelar,flexor,panicular}, gait, tests, plan }
blocks:  { id, date, start, end, reason, repeat: 'none' | 'weekly' | 'weekdays', until }
services: { id, name, duration, price, color }
```

## Regras de negócio

- **Sessões do pacote** (`Store.planStats`):
  - `done` = sessões registradas com o `planId`;
  - `scheduled` = agendamentos abertos do pacote;
  - `remaining` = `total − done`.
- **Número da sessão de um agendamento** (`Views.sessNo`): sessões já feitas + agendamentos anteriores do mesmo pacote + 1.
- **Registrar sessão a partir de um agendamento**: marca o agendamento como `realizado`, vincula `sessionId` e, se for a última sessão, conclui o pacote.
- **Falta** não desconta do pacote.
- **Pago** (`Store.planPaid`) = entrada (`plan.paid`) + soma de `payments`. A situação do pagamento é calculada a cada consulta.
- **Conflitos** (`Store.conflicts`): cruzam os horários com outros agendamentos (exceto cancelados e faltas) e com os bloqueios.

## Autenticação local

- `hash = sha256` repetido 2.000 vezes sobre `salt:senha` (SHA-256 em JavaScript puro, que funciona também em `file://`).
- A sessão fica em `sessionStorage`, ou em `localStorage` por 30 dias com "manter conectada". Ela é invalidada quando a senha muda.
- Cinco erros seguidos geram um bloqueio de 60 segundos.

## Migração futura para a nuvem

Para levar os dados à nuvem (Supabase), basta trocar as funções `load`, `save`, `put` e `del` do `store.js` por chamadas à API, mantendo um cache local. As telas continuam iguais, porque só acessam os dados pelo `Store`.
