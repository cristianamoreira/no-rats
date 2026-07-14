# No Rats — Contas reais, tarefas livres e convite por link — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover os "perfis locais" (todo membro passa a ter conta própria), tornar a posse de cada rotina configurável (delegada a alguém 👑 ou livre 🎯) e adicionar convite por link com código pré-preenchido.

**Architecture:** SPA React + Vite, estado da "casa" num blob JSON no Supabase, código já modularizado em `frontend/src/{lib,hooks,components}`. As mudanças são todas de frontend; o único ajuste fora do código é a config de URLs do Supabase Auth (passo manual). Cada tarefa termina com `npm --prefix frontend run build` verde e um commit.

**Tech Stack:** React 19, Vite 8, @supabase/supabase-js 2.x. Sem test runner — a verificação é **build + teste manual no navegador**.

## Global Constraints

- Diretório de trabalho do app: `/Users/cristianamoreira/no-rats/frontend`.
- Verificação de cada tarefa: `npm --prefix frontend run build` deve terminar sem erro (0 exit).
- Branch: `feature/contas-reais` (já criado a partir do `main`).
- Não há test runner; **não** invente testes unitários. Use build + checklist manual.
- Domínio de convite (hardcoded): `https://noratsapp.com.br`.
- Estilo do código existente: sem TypeScript, aspas simples, sem ponto-e-vírgula final, componentes com `export default`.
- `routine.ownerId`: `null` significa **livre**; um `memberId` significa **delegada**.
- Crédito de conclusão vai **sempre** para o membro do usuário logado (`me`).

---

## Task 1: Camada de dados — posse por tarefa (livre), penalidade e seeds

Torna a lógica de dados ciente de rotinas livres, sem ainda mudar a UI. Ao final, o app compila e funciona igual ao de hoje, exceto que: rotinas-semente nascem livres, remover membro solta as rotinas dele, e rotina livre vencida não penaliza.

**Files:**
- Modify: `frontend/src/lib/routines.js` (função `seedRoutines`)
- Modify: `frontend/src/hooks/useHousehold.js` (penalidade, `addRoutine`, `removeMember`, `createHousehold`)

**Interfaces:**
- Produces: `seedRoutines()` (sem parâmetro) → array de rotinas com `ownerId: null`.
- Produces: `addRoutine({ title, freq, xp, ownerId })` aceita `ownerId === null` (livre) sem converter para o líder.

- [ ] **Step 1: `seedRoutines` cria rotinas livres**

Em `frontend/src/lib/routines.js`, substituir a função `seedRoutines` inteira por:

```javascript
export function seedRoutines() {
  const starters = [
    { title: 'Lavar a louça', freq: 'diaria' },
    { title: 'Lavar roupa', freq: 'semanal' },
    { title: 'Limpar o banheiro', freq: 'semanal' },
    { title: 'Trocar a roupa de cama', freq: 'quinzenal' },
    { title: 'Faxina geral', freq: 'mensal' },
  ]
  return starters.map((s, i) => ({
    id: 'r' + (Date.now() + i),
    title: s.title,
    freq: s.freq,
    xp: FREQUENCIES[s.freq].xp,
    ownerId: null,
    lastDone: null,
    penalized: false,
  }))
}
```

- [ ] **Step 2: `createHousehold` usa `seedRoutines()` sem argumento**

Em `frontend/src/hooks/useHousehold.js`, dentro de `createHousehold`, trocar:

```javascript
      routines: seedRoutines(myId),
```

por:

```javascript
      routines: seedRoutines(),
```

- [ ] **Step 3: `addRoutine` aceita `ownerId` livre (null)**

Em `frontend/src/hooks/useHousehold.js`, substituir a função `addRoutine` inteira por:

```javascript
  const addRoutine = ({ title, freq, xp, ownerId }) => {
    const t = (title || '').trim()
    if (!t) return showToast('✏️ Dê um nome para a rotina!')
    setData((p) => ({
      ...p,
      routines: [...p.routines, { id: 'r' + Date.now(), title: t, freq, xp: Number(xp) || FREQUENCIES[freq].xp, ownerId: ownerId || null, lastDone: null, penalized: false }],
    }))
    showToast('✅ Rotina criada!')
  }
```

- [ ] **Step 4: penalidade só para rotina delegada**

Em `frontend/src/hooks/useHousehold.js`, no efeito de penalidade (o `useEffect` que percorre `prev.routines` e faz `owner.rats += 1`), trocar a condição:

```javascript
        if (st.kind === 'late' && !r.penalized) {
```

por:

```javascript
        if (st.kind === 'late' && !r.penalized && r.ownerId) {
```

- [ ] **Step 5: `removeMember` solta as rotinas (viram livres)**

Em `frontend/src/hooks/useHousehold.js`, dentro de `removeMember`, trocar:

```javascript
      const routines = p.routines.map((r) => (r.ownerId === id ? { ...r, ownerId: nextLeader } : r))
```

por:

```javascript
      const routines = p.routines.map((r) => (r.ownerId === id ? { ...r, ownerId: null } : r))
```

- [ ] **Step 6: Build**

Run: `npm --prefix frontend run build`
Expected: termina com `✓ built in ...`, exit 0, sem erros.

- [ ] **Step 7: Commit**

```bash
cd /Users/cristianamoreira/no-rats
git add frontend/src/lib/routines.js frontend/src/hooks/useHousehold.js
git commit -m "feat(rotinas): posse por tarefa — rotinas livres, seeds livres, sem rato em livre"
```

---

## Task 2: Formulário de nova rotina — opção "Livre"

Adiciona a opção "🎯 Livre (qualquer um)" no seletor "De quem é?", como padrão. Nada mais na UI muda ainda.

**Files:**
- Modify: `frontend/src/components/NewRoutinePanel.jsx`

**Interfaces:**
- Consumes: `onAdd({ title, freq, xp, ownerId })` — passa `ownerId: null` quando livre.

- [ ] **Step 1: Reescrever `NewRoutinePanel.jsx`**

Substituir o arquivo `frontend/src/components/NewRoutinePanel.jsx` inteiro por:

```jsx
import { useState } from 'react'
import { FREQUENCIES, SUGGESTIONS } from '../lib/constants'

export default function NewRoutinePanel({ members, onAdd }) {
  const [rTitle, setRTitle] = useState('')
  const [rFreq, setRFreq] = useState('semanal')
  const [rXp, setRXp] = useState(15)
  const [rOwner, setROwner] = useState('') // '' = Livre

  const setFreqForm = (key) => {
    setRFreq(key)
    setRXp(FREQUENCIES[key].xp)
  }
  const useSuggestion = (sug) => {
    setRTitle(sug.title)
    setFreqForm(sug.freq)
  }
  const submit = () => {
    onAdd({ title: rTitle, freq: rFreq, xp: rXp, ownerId: rOwner || null })
    if (rTitle.trim()) setRTitle('')
  }

  return (
    <section className="nr-panel">
      <h2 className="nr-h">Nova rotina</h2>
      <div className="nr-row">
        <input className="nr-input" type="text" placeholder="Ex: Lavar as toalhas, tirar o lixo…" value={rTitle} onChange={(e) => setRTitle(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && submit()} />
        <button className="nr-btn nr-btn-primary" onClick={submit}>Adicionar</button>
      </div>
      <div className="nr-form-grid">
        <div>
          <div className="nr-field-label">Frequência</div>
          <div className="nr-pills">
            {Object.entries(FREQUENCIES).map(([key, f]) => (
              <button key={key} className="nr-pill" onClick={() => setFreqForm(key)} style={rFreq === key ? { background: '#4f46e5', borderColor: '#4f46e5', color: '#fff' } : undefined}>{f.label}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="nr-field-label">Vale quantos XP?</div>
          <input className="nr-num" type="number" min="1" value={rXp} onChange={(e) => setRXp(e.target.value)} />
        </div>
        <div>
          <div className="nr-field-label">De quem é?</div>
          <select className="nr-owner-select" value={rOwner} onChange={(e) => setROwner(e.target.value)}>
            <option value="">🎯 Livre (qualquer um)</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
          </select>
        </div>
      </div>
      <div className="nr-field-label" style={{ marginTop: '16px' }}>💡 Sugestões — toque para preencher</div>
      <div className="nr-suggests">
        {SUGGESTIONS.map((s) => <button key={s.title} className="nr-suggest" onClick={() => useSuggestion(s)}>+ {s.title}</button>)}
      </div>
    </section>
  )
}
```

Nota: removida a prop `leaderId` (não é mais usada — o padrão agora é Livre). O `Dashboard` (Task 3) deixará de passá-la.

- [ ] **Step 2: Build**

Run: `npm --prefix frontend run build`
Expected: exit 0, sem erros.

- [ ] **Step 3: Commit**

```bash
cd /Users/cristianamoreira/no-rats
git add frontend/src/components/NewRoutinePanel.jsx
git commit -m "feat(rotina): opção 'Livre (qualquer um)' no formulário, padrão livre"
```

---

## Task 3: Cada um é si mesmo — remove perfis locais, troca de jogador e crédito a terceiros

Mudança acoplada (precisa ser atômica para o build ficar verde): o hook deixa de expor `active`/`activeId`/`setActiveId`/`addMember` e passa a expor `me`; `completeTask` credita sempre `me`; e todos os componentes que consumiam essa superfície são atualizados.

**Files:**
- Modify: `frontend/src/hooks/useHousehold.js`
- Modify: `frontend/src/components/Dashboard.jsx`
- Modify: `frontend/src/components/Scoreboard.jsx`
- Modify: `frontend/src/components/TodayTab.jsx`
- Modify: `frontend/src/components/CheckinModal.jsx`
- Modify: `frontend/src/components/FamilyPanel.jsx`

**Interfaces:**
- Produces (hook): retorna `me` (membro com `userId === session.user.id`, ou `undefined`). Não retorna mais `activeId`, `setActiveId`, `active`, `addMember`.
- Produces (hook): `completeTask(id, photos)` — sem `creditId`; credita `me`.
- Consumes: `Scoreboard({ members, leaderId, meId })`; `TodayTab({ routines, members, me, isLeader, onOpenCheckin, onComplete, onUpdateFreq, onRemoveRoutine })`; `CheckinModal({ routine, onConfirm, onClose })` com `onConfirm(photos)`; `FamilyPanel({ members, leaderId, houseCode, onRemoveMember, onMakeLeader })`.

- [ ] **Step 1: hook — remover `activeId`/`setActiveId` e o efeito de init**

Em `frontend/src/hooks/useHousehold.js`:

(a) Remover a linha do estado:

```javascript
  const [activeId, setActiveId] = useState(null)
```

(b) Remover o `useEffect` inteiro que inicializa o jogador ativo:

```javascript
  // Pick the active member (yours by default) once data is available.
  useEffect(() => {
    if (data && session) {
      const mine = data.members.find((m) => m.userId === session.user.id)
      setActiveId((prev) => prev || (mine ? mine.id : data.members[0] && data.members[0].id))
    }
  }, [data, session])
```

- [ ] **Step 2: hook — `logout` não mexe mais em `activeId`**

Trocar a função `logout`:

```javascript
  const logout = async () => {
    await supabase.auth.signOut()
    setActiveId(null)
    setHouseCode('')
  }
```

por:

```javascript
  const logout = async () => {
    await supabase.auth.signOut()
    setHouseCode('')
  }
```

- [ ] **Step 3: hook — `createHousehold`/`joinHousehold` não chamam `setActiveId`**

Em `createHousehold`, remover a linha `setActiveId(myId)`.
Em `joinHousehold`, remover a linha `setActiveId(myId)`.
(As duas linhas são idênticas: `    setActiveId(myId)` — apagar ambas.)

- [ ] **Step 4: hook — remover `addMember`**

Remover a função `addMember` inteira:

```javascript
  const addMember = (name, emoji) => {
    const n = (name || '').trim()
    if (!n) return showToast('✏️ Digite o nome!')
    setData((p) => {
      const id = 'm' + Date.now()
      const color = COLORS[p.members.length % COLORS.length]
      return { ...p, members: [...p.members, { id, name: n, emoji, color, xp: 0, rats: 0 }] }
    })
    showToast(`👋 ${n} entrou na família!`)
  }
```

- [ ] **Step 5: hook — `removeMember` não usa mais `activeId`**

Substituir a função `removeMember` inteira por (mantém a regra "rotina do removido vira livre" da Task 1):

```javascript
  const removeMember = (id) => {
    if (data.members.length <= 1) return showToast('Precisa ter ao menos 1 pessoa.')
    setData((p) => {
      const nextMembers = p.members.filter((m) => m.id !== id)
      const nextLeader = p.leaderId === id ? nextMembers[0].id : p.leaderId
      const routines = p.routines.map((r) => (r.ownerId === id ? { ...r, ownerId: null } : r))
      return { ...p, members: nextMembers, leaderId: nextLeader, routines }
    })
  }
```

- [ ] **Step 6: hook — `completeTask(id, photos)` credita sempre `me`**

Substituir a função `completeTask` inteira por:

```javascript
  const completeTask = (id, photos) => {
    const today = todayStr()
    const routine = data.routines.find((r) => r.id === id)
    if (!routine) return
    if (routine.lastDone === today) return showToast('✨ Já registrada hoje!')
    const me = data.members.find((m) => m.userId === session.user.id)
    if (!me) return
    const owner = routine.ownerId ? data.members.find((m) => m.id === routine.ownerId) : null
    const entry = { id: 'l' + Date.now(), memberId: me.id, title: routine.title, xp: routine.xp, date: today }
    if (photos) {
      if (photos.before) entry.before = photos.before
      if (photos.after) entry.after = photos.after
    }
    setData((p) => ({
      ...p,
      members: p.members.map((m) => (m.id === me.id ? { ...m, xp: m.xp + routine.xp } : m)),
      routines: p.routines.map((r) => (r.id === id ? { ...r, lastDone: today, penalized: false } : r)),
      log: [...p.log, entry],
    }))
    const photoTag = photos && (photos.before || photos.after) ? ' 📸' : ''
    if (owner && owner.id !== me.id) {
      showToast(`🥷 ${me.name} roubou a tarefa de ${owner.name}! +${routine.xp} XP${photoTag}`)
    } else {
      showToast(`✅ +${routine.xp} XP para ${me.name}${photoTag}`)
    }
  }
```

- [ ] **Step 7: hook — expor `me`, remover `activeId`/`setActiveId`/`addMember` do return**

Localizar o `me` (derivado) e o `return` do hook. Adicionar, logo antes do `return`:

```javascript
  const me = data && session ? data.members.find((m) => m.userId === session.user.id) : undefined
```

Substituir o objeto retornado por:

```javascript
  return {
    loading,
    householdId,
    houseCode,
    data,
    me,
    createHousehold,
    joinHousehold,
    logout,
    removeMember,
    makeLeader,
    addRoutine,
    completeTask,
    updateFreq,
    removeRoutine,
  }
```

- [ ] **Step 8: `Scoreboard.jsx` — só exibição**

Substituir `frontend/src/components/Scoreboard.jsx` inteiro por:

```jsx
export default function Scoreboard({ members, leaderId, meId }) {
  return (
    <section className="nr-scoreboard">
      {members.map((m) => {
        const isMe = m.id === meId
        return (
          <div key={m.id} className="nr-player" style={isMe ? { borderColor: m.color, boxShadow: `0 0 0 3px ${m.color}22` } : undefined}>
            <div className="nr-avatar" style={{ background: m.color }}>{m.emoji}</div>
            <div className="nr-player-name">{m.name} {m.id === leaderId ? '👑' : ''}</div>
            <div className="nr-player-stats">
              <span className="nr-xp-pill">{m.xp} XP</span>
              <span className="nr-rat-pill" style={m.rats > 0 ? { background: '#fee2e2', color: '#ef4444' } : undefined}>🐀 {m.rats}</span>
            </div>
            {isMe && <div className="nr-you">você</div>}
          </div>
        )
      })}
    </section>
  )
}
```

- [ ] **Step 9: `CheckinModal.jsx` — remover "Quem fez?"**

Substituir `frontend/src/components/CheckinModal.jsx` inteiro por:

```jsx
import { useState } from 'react'
import { compressImage } from '../lib/image'

export default function CheckinModal({ routine, onConfirm, onClose }) {
  const [before, setBefore] = useState(null)
  const [after, setAfter] = useState(null)
  const pick = (setter) => (e) => {
    const f = e.target.files && e.target.files[0]
    if (f) compressImage(f, setter)
  }
  return (
    <div className="nr-modal-bg" onClick={onClose}>
      <div className="nr-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="nr-h" style={{ marginBottom: '4px' }}>📸 Check-in</h3>
        <div className="nr-meta" style={{ marginBottom: '16px' }}>{routine.title}</div>
        <div className="nr-photo-slots">
          <label className="nr-photo-slot">
            {before ? <img src={before} className="nr-photo-img" alt="antes" /> : <span className="nr-photo-ph">📷<br />Antes</span>}
            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={pick(setBefore)} />
          </label>
          <label className="nr-photo-slot">
            {after ? <img src={after} className="nr-photo-img" alt="depois" /> : <span className="nr-photo-ph">✨<br />Depois</span>}
            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={pick(setAfter)} />
          </label>
        </div>
        <div className="nr-modal-actions">
          <button className="nr-btn nr-del" onClick={onClose}>Cancelar</button>
          <button className="nr-btn nr-btn-primary" onClick={() => onConfirm({ before, after })}>Registrar check-in</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 10: `TodayTab.jsx` — tag "Livre", botões por posse**

Substituir `frontend/src/components/TodayTab.jsx` inteiro por:

```jsx
import { FREQUENCIES } from '../lib/constants'
import { todayStr } from '../lib/dates'
import { getStatus } from '../lib/routines'

export default function TodayTab({ routines, members, me, isLeader, onOpenCheckin, onComplete, onUpdateFreq, onRemoveRoutine }) {
  const memberById = (id) => members.find((m) => m.id === id)
  const withStatus = routines.map((r) => ({ ...r, status: getStatus(r) }))
  withStatus.sort((a, b) => b.status.sort - a.status.sort)

  return (
    <section>
      <h2 className="nr-list-title">Rotinas da casa · {routines.length}</h2>
      {routines.length === 0 ? (
        <div className="nr-empty"><div style={{ fontSize: '34px', marginBottom: '8px' }}>🧹</div>Nenhuma rotina ainda.</div>
      ) : (
        <div className="nr-tasks">
          {withStatus.map((r) => {
            const s = r.status
            const free = !r.ownerId
            const owner = free ? null : memberById(r.ownerId)
            const doneToday = r.lastDone === todayStr()
            const mine = me && r.ownerId === me.id
            return (
              <div className="nr-task" key={r.id} style={{ borderLeftColor: s.color }}>
                <div style={{ minWidth: 0 }}>
                  <div className="nr-task-head">
                    <span className="nr-task-title">{r.title}</span>
                    <span className="nr-status" style={{ background: s.color }}>{s.label}</span>
                    {free ? (
                      <span className="nr-owner-tag" style={{ background: '#64748b' }}>🎯 Livre</span>
                    ) : owner ? (
                      <span className="nr-owner-tag" style={{ background: owner.color }}>{owner.emoji} {owner.name}</span>
                    ) : null}
                  </div>
                  <div className="nr-meta">{s.last}{s.sub ? ` · ${s.sub}` : ''} · vale {r.xp} XP</div>
                  {isLeader && (
                    <div className="nr-freq-row">
                      <span className="nr-freq-lbl">Frequência:</span>
                      <select className="nr-freq" value={r.freq} onChange={(e) => onUpdateFreq(r.id, e.target.value)}>
                        {Object.entries(FREQUENCIES).map(([key, f]) => <option key={key} value={key}>{f.label}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                <div className="nr-actions">
                  {!doneToday && (
                    <button className="nr-btn nr-photo-btn nr-btn-sm" title="Check-in com foto" onClick={() => onOpenCheckin(r)}>📸</button>
                  )}
                  {doneToday ? (
                    <button className="nr-btn nr-done-today">✓ Feita hoje</button>
                  ) : free || mine ? (
                    <button className="nr-btn nr-complete" onClick={() => onComplete(r.id)}>{mine ? 'Fiz hoje' : 'Fiz eu'}</button>
                  ) : (
                    <button className="nr-btn nr-steal" onClick={() => onComplete(r.id)} title={`Roubar de ${owner ? owner.name : ''}`}>🥷 Fiz eu</button>
                  )}
                  {isLeader && <button className="nr-btn nr-del" title="Excluir" onClick={() => onRemoveRoutine(r.id)}>🗑️</button>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 11: `FamilyPanel.jsx` — remover formulário de adicionar pessoa**

Substituir `frontend/src/components/FamilyPanel.jsx` inteiro por (o botão "Convidar" entra na Task 4):

```jsx
export default function FamilyPanel({ members, leaderId, houseCode, onRemoveMember, onMakeLeader }) {
  return (
    <section className="nr-panel">
      <h2 className="nr-h">👑 Família <span className="nr-hint">(só o líder vê isto)</span></h2>
      <div className="nr-code-box">
        Código da casa: <strong>{houseCode}</strong> <span className="nr-hint">— compartilhe pra família entrar</span>
      </div>
      <div className="nr-member-chips">
        {members.map((m) => (
          <div key={m.id} className="nr-member-chip" style={{ borderColor: m.color }}>
            <span>{m.emoji} {m.name} {m.id === leaderId ? '👑' : ''}</span>
            {m.id !== leaderId && <button className="nr-mini" title="Tornar líder" onClick={() => onMakeLeader(m.id)}>👑</button>}
            <button className="nr-mini" title="Remover" onClick={() => onRemoveMember(m.id)}>✕</button>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 12: `Dashboard.jsx` — fiação com `me`**

Substituir `frontend/src/components/Dashboard.jsx` inteiro por:

```jsx
import { useState } from 'react'
import RatLogo from './RatLogo'
import Scoreboard from './Scoreboard'
import FamilyPanel from './FamilyPanel'
import NewRoutinePanel from './NewRoutinePanel'
import TodayTab from './TodayTab'
import CalendarTab from './CalendarTab'
import RankingTab from './RankingTab'
import CheckinModal from './CheckinModal'
import Lightbox from './Lightbox'

export default function Dashboard({ hh }) {
  const { data, houseCode, me } = hh
  const [tab, setTab] = useState('hoje')
  const [modalRoutine, setModalRoutine] = useState(null)
  const [lightbox, setLightbox] = useState(null)

  const members = data.members
  const leaderId = data.leaderId
  const routines = data.routines
  const log = data.log
  const isLeader = me && me.id === leaderId

  return (
    <div className="nr-app">
      {modalRoutine && (
        <CheckinModal
          routine={modalRoutine}
          onConfirm={(photos) => {
            hh.completeTask(modalRoutine.id, photos)
            setModalRoutine(null)
          }}
          onClose={() => setModalRoutine(null)}
        />
      )}

      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}

      <header className="nr-hero">
        <button className="nr-logout" onClick={hh.logout}>Sair</button>
        <div className="nr-logo"><RatLogo /></div>
        <h1 className="nr-wordmark">No Rats</h1>
        <p className="nr-tagline">O jogo de manter a casa em ordem — em família</p>
      </header>

      <main className="nr-container">
        <div className="nr-field-label" style={{ marginBottom: '12px', fontSize: '15px', color: '#334155' }}>
          Placar geral <span style={{ color: '#94a3b8', fontWeight: 500 }}>· você é {me ? me.name : ''}</span>
        </div>

        <Scoreboard members={members} leaderId={leaderId} meId={me && me.id} />

        {isLeader && (
          <FamilyPanel
            members={members}
            leaderId={leaderId}
            houseCode={houseCode}
            onRemoveMember={hh.removeMember}
            onMakeLeader={hh.makeLeader}
          />
        )}

        {isLeader && (
          <NewRoutinePanel members={members} onAdd={hh.addRoutine} />
        )}

        <div className="nr-toggle">
          <button className={tab === 'hoje' ? 'active' : ''} onClick={() => setTab('hoje')}>Hoje</button>
          <button className={tab === 'calendario' ? 'active' : ''} onClick={() => setTab('calendario')}>Calendário</button>
          <button className={tab === 'ranking' ? 'active' : ''} onClick={() => setTab('ranking')}>Ranking</button>
        </div>

        {tab === 'hoje' && (
          <TodayTab
            routines={routines}
            members={members}
            me={me}
            isLeader={isLeader}
            onOpenCheckin={setModalRoutine}
            onComplete={hh.completeTask}
            onUpdateFreq={hh.updateFreq}
            onRemoveRoutine={hh.removeRoutine}
          />
        )}

        {tab === 'calendario' && (
          <CalendarTab members={members} log={log} onLightbox={setLightbox} />
        )}

        {tab === 'ranking' && (
          <RankingTab members={members} log={log} />
        )}

        <footer className="nr-footer">No Rats · dados salvos na nuvem 🔐 · casa {houseCode}</footer>
      </main>
    </div>
  )
}
```

- [ ] **Step 13: Build**

Run: `npm --prefix frontend run build`
Expected: exit 0, sem erros (nenhuma referência a `activeId`, `active`, `addMember`, `setActiveId`, `creditId`).

- [ ] **Step 14: Commit**

```bash
cd /Users/cristianamoreira/no-rats
git add frontend/src/hooks/useHousehold.js frontend/src/components/Dashboard.jsx frontend/src/components/Scoreboard.jsx frontend/src/components/TodayTab.jsx frontend/src/components/CheckinModal.jsx frontend/src/components/FamilyPanel.jsx
git commit -m "feat(conta): cada um age como si mesmo — remove perfis locais, troca de jogador e crédito a terceiros"
```

---

## Task 4: Convite por link (código pré-preenchido)

Adiciona o botão "Convidar" (copia/compartilha o link) e faz o app ler `?casa=CODIGO` para pré-preencher a tela de entrada.

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/HouseholdSetup.jsx`
- Modify: `frontend/src/components/FamilyPanel.jsx`
- Modify: `frontend/src/components/Dashboard.jsx` (passar `showToast` ao `FamilyPanel`)

**Interfaces:**
- Consumes: `HouseholdSetup({ onCreate, onJoin, onLogout, initialCode, initialMode })`.
- Consumes: `FamilyPanel({ ..., houseCode, showToast })`.

- [ ] **Step 1: `App.jsx` — ler `?casa`, persistir, pré-preencher, limpar URL**

Substituir `frontend/src/App.jsx` inteiro por:

```jsx
import { useState, useEffect } from 'react'
import { useToast } from './hooks/useToast'
import { useAuth } from './hooks/useAuth'
import { useHousehold } from './hooks/useHousehold'
import AuthScreen from './components/AuthScreen'
import HouseholdSetup from './components/HouseholdSetup'
import Dashboard from './components/Dashboard'
import Toast from './components/Toast'

function readInviteCode() {
  try {
    const url = new URL(window.location.href)
    const c = url.searchParams.get('casa')
    if (c) {
      sessionStorage.setItem('norats_invite', c)
      url.searchParams.delete('casa')
      window.history.replaceState({}, '', url.pathname + url.search)
      return c.toUpperCase()
    }
    return (sessionStorage.getItem('norats_invite') || '').toUpperCase()
  } catch (e) {
    return ''
  }
}

export default function App() {
  const { toast, showToast } = useToast()
  const { session, authReady } = useAuth()
  const hh = useHousehold(session, showToast)
  const [inviteCode] = useState(readInviteCode)

  useEffect(() => {
    if (hh.householdId) {
      try { sessionStorage.removeItem('norats_invite') } catch (e) {}
    }
  }, [hh.householdId])

  let screen
  if (!authReady || hh.loading) {
    screen = <div className="nr-auth"><div className="nr-spinner">🐭 Carregando…</div></div>
  } else if (!session) {
    screen = <AuthScreen />
  } else if (!hh.householdId || !hh.data) {
    screen = (
      <HouseholdSetup
        onCreate={hh.createHousehold}
        onJoin={hh.joinHousehold}
        onLogout={hh.logout}
        initialCode={inviteCode}
        initialMode={inviteCode ? 'join' : 'create'}
      />
    )
  } else {
    screen = <Dashboard hh={hh} showToast={showToast} />
  }

  return (
    <>
      {screen}
      <Toast toast={toast} />
    </>
  )
}
```

- [ ] **Step 2: `HouseholdSetup.jsx` — aceitar `initialCode`/`initialMode`**

Em `frontend/src/components/HouseholdSetup.jsx`, trocar a assinatura e os dois `useState` iniciais.

Trocar:

```jsx
export default function HouseholdSetup({ onCreate, onJoin, onLogout }) {
  const [mode, setMode] = useState('create')
  const [casa, setCasa] = useState('Minha casa')
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('👩')
  const [code, setCode] = useState('')
```

por:

```jsx
export default function HouseholdSetup({ onCreate, onJoin, onLogout, initialCode = '', initialMode = 'create' }) {
  const [mode, setMode] = useState(initialMode)
  const [casa, setCasa] = useState('Minha casa')
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('👩')
  const [code, setCode] = useState(initialCode)
```

- [ ] **Step 3: `FamilyPanel.jsx` — botão "Convidar"**

Substituir `frontend/src/components/FamilyPanel.jsx` inteiro por:

```jsx
export default function FamilyPanel({ members, leaderId, houseCode, onRemoveMember, onMakeLeader, showToast }) {
  const inviteLink = `https://noratsapp.com.br/entrar?casa=${houseCode}`
  const invite = async () => {
    const msg = `Entra na nossa casa no No Rats! ${inviteLink}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'No Rats', text: 'Entra na nossa casa no No Rats!', url: inviteLink })
      } else {
        await navigator.clipboard.writeText(msg)
        showToast && showToast('🔗 Convite copiado!')
      }
    } catch (e) {
      /* usuário cancelou o compartilhamento — sem ação */
    }
  }
  return (
    <section className="nr-panel">
      <h2 className="nr-h">👑 Família <span className="nr-hint">(só o líder vê isto)</span></h2>
      <div className="nr-code-box">
        Código da casa: <strong>{houseCode}</strong> <span className="nr-hint">— compartilhe pra família entrar</span>
      </div>
      <div className="nr-row">
        <button className="nr-btn nr-btn-primary" onClick={invite}>🔗 Convidar</button>
      </div>
      <div className="nr-member-chips">
        {members.map((m) => (
          <div key={m.id} className="nr-member-chip" style={{ borderColor: m.color }}>
            <span>{m.emoji} {m.name} {m.id === leaderId ? '👑' : ''}</span>
            {m.id !== leaderId && <button className="nr-mini" title="Tornar líder" onClick={() => onMakeLeader(m.id)}>👑</button>}
            <button className="nr-mini" title="Remover" onClick={() => onRemoveMember(m.id)}>✕</button>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: `Dashboard.jsx` — receber `showToast` e repassar ao `FamilyPanel`**

Em `frontend/src/components/Dashboard.jsx`:

(a) Trocar a assinatura:

```jsx
export default function Dashboard({ hh }) {
```

por:

```jsx
export default function Dashboard({ hh, showToast }) {
```

(b) Trocar o uso do `FamilyPanel`:

```jsx
          <FamilyPanel
            members={members}
            leaderId={leaderId}
            houseCode={houseCode}
            onRemoveMember={hh.removeMember}
            onMakeLeader={hh.makeLeader}
          />
```

por:

```jsx
          <FamilyPanel
            members={members}
            leaderId={leaderId}
            houseCode={houseCode}
            onRemoveMember={hh.removeMember}
            onMakeLeader={hh.makeLeader}
            showToast={showToast}
          />
```

- [ ] **Step 5: Build**

Run: `npm --prefix frontend run build`
Expected: exit 0, sem erros.

- [ ] **Step 6: Commit**

```bash
cd /Users/cristianamoreira/no-rats
git add frontend/src/App.jsx frontend/src/components/HouseholdSetup.jsx frontend/src/components/FamilyPanel.jsx frontend/src/components/Dashboard.jsx
git commit -m "feat(convite): link com código pré-preenchido + botão Convidar (compartilhar/copiar)"
```

---

## Task 5: Verificação final, config do Supabase e PR

Fecha a feature: build limpo, ajuste manual do Supabase Auth, checklist manual e push/PR.

**Files:** nenhum arquivo de código novo.

- [ ] **Step 1: Build limpo do zero**

Run: `npm --prefix frontend run build`
Expected: `✓ built in ...`, exit 0.

- [ ] **Step 2: Ajuste manual no Supabase (documentar no PR)**

No painel do Supabase → **Authentication → URL Configuration**:
- **Site URL:** `https://noratsapp.com.br`
- **Redirect URLs:** adicionar `https://noratsapp.com.br/**` (manter a URL do vercel.app também).
Salvar. (Passo manual — não é código, mas é pré-requisito pro convite/login no domínio novo.)

- [ ] **Step 3: Checklist manual (no preview do Vercel ou `npm --prefix frontend run dev`)**

Verificar, um a um (spec §Verificação):
1. Não existe mais "adicionar pessoa" no painel da família; só o botão Convidar + código.
2. Criar rotina **Livre** → aparece tag "🎯 Livre" → botão "Fiz eu" credita quem clicou.
3. Rotina livre vencida → fica vermelha ("atrasada") **sem** dar 🐀 a ninguém.
4. Rotina **delegada** a outro → botão "🥷 Fiz eu" credita você (roubo).
5. Rotina delegada vencida → o **dono** ganha 🐀.
6. Placar não deixa mais "virar" outro jogador (cartões não são clicáveis); só você tem o selo "você".
7. Remover um membro com rotina delegada → a rotina vira "🎯 Livre".
8. Convite: copiar o link → abrir em aba anônima → tela "Entrar numa casa" já com o código preenchido.

- [ ] **Step 4: Push e abrir PR**

```bash
cd /Users/cristianamoreira/no-rats
git push -u origin feature/contas-reais
```
Depois abrir o PR `feature/contas-reais` → `main` pela interface do GitHub (ou informar a Cristiana o link `https://github.com/cristianamoreira/no-rats/pull/new/feature/contas-reais`). O push exige credencial do GitHub (token) — se não houver, gerar bundle como fallback.

---

## Self-review (cobertura da spec)

- Membros só com conta / entrada só por convite → Task 3 (remove `addMember`) + Task 4 (convite).
- `me` = usuário logado, sem troca de jogador → Task 3.
- `ownerId` anulável (livre) → Task 1 (dados) + Task 2 (form) + Task 3 (TodayTab).
- Seeds livres → Task 1.
- Remover membro → rotina vira livre → Task 1 (lógica) + Task 3 (removeMember sem activeId).
- Crédito sempre pra `me`; roubo só em delegada de outro → Task 3 (`completeTask`).
- Rato só em delegada vencida → Task 1 (guarda `&& r.ownerId`).
- Sem "Quem fez?" no check-in → Task 3 (CheckinModal).
- Placar só exibição → Task 3 (Scoreboard).
- Convite por link + pré-preenchimento + limpar URL → Task 4.
- Config Supabase Auth URLs → Task 5 (manual).
- `normalizeData` preserva `ownerId` null → sem mudança necessária (já faz spread do array como está); coberto implicitamente.
