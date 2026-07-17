import { FREQUENCIES } from '../lib/constants'
import { todayStr } from '../lib/dates'
import { getStatus, freqLabel } from '../lib/routines'

export default function TodayTab({ routines, members, me, log = [], isLeader, onOpenCheckin, onUndo, onUpdateFreq, onRemoveRoutine }) {
  const memberById = (id) => members.find((m) => m.id === id)
  // Quem concluiu o check-in de hoje desta rotina (usa lastDoneBy; cai no log para dados antigos).
  const todayDoerId = (r) => {
    if (r.lastDoneBy) return r.lastDoneBy
    const e = [...log].reverse().find((l) => l.title === r.title && l.date === todayStr())
    return e ? e.memberId : null
  }
  const withStatus = routines.map((r) => ({ ...r, status: getStatus(r) }))
  withStatus.sort((a, b) => b.status.sort - a.status.sort)

  const changeFreq = (r, value) => {
    if (value === 'custom') {
      const cur = r.freq === 'custom' ? r.customDays : 10
      const ans = window.prompt('A cada quantos dias?', String(cur || 10))
      if (ans === null) return
      onUpdateFreq(r.id, 'custom', Math.max(1, Math.round(Number(ans)) || 7))
    } else {
      onUpdateFreq(r.id, value)
    }
  }

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
                      <span className="nr-owner-tag" style={{ background: '#8C93A1' }}>🎯 Livre</span>
                    ) : owner ? (
                      <span className="nr-owner-tag" style={{ background: owner.color }}>{owner.emoji} {owner.name}</span>
                    ) : null}
                  </div>
                  <div className="nr-meta">{s.last}{s.sub ? ` · ${s.sub}` : ''} · {freqLabel(r)} · vale {r.xp} XP</div>
                  {isLeader && (
                    <div className="nr-freq-row">
                      <span className="nr-freq-lbl">Frequência:</span>
                      <select className="nr-freq" value={r.freq === 'custom' ? 'custom' : r.freq} onChange={(e) => changeFreq(r, e.target.value)}>
                        {Object.entries(FREQUENCIES).map(([key, f]) => <option key={key} value={key}>{f.label}</option>)}
                        <option value="custom">{r.freq === 'custom' ? freqLabel(r) : 'Personalizada…'}</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="nr-actions">
                  {doneToday ? (
                    <>
                      <button className="nr-btn nr-done-today">✓ Feita hoje</button>
                      {(isLeader || (me && todayDoerId(r) === me.id)) && (
                        <button className="nr-btn nr-del nr-btn-sm" title="Desfazer marcação" onClick={() => onUndo(r.id)}>↩️ Desfazer</button>
                      )}
                    </>
                  ) : free || mine ? (
                    <button className="nr-btn nr-complete" onClick={() => onOpenCheckin(r)}>📸 Feito por mim</button>
                  ) : (
                    <button className="nr-btn nr-steal" onClick={() => onOpenCheckin(r)} title={`Roubar de ${owner ? owner.name : ''}`}>🥷 Feito por mim</button>
                  )}
                  {isLeader && <button className="nr-btn nr-del nr-btn-sm" title="Excluir" onClick={() => onRemoveRoutine(r.id)}>🗑️</button>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
