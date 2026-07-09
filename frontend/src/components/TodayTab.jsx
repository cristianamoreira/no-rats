import { FREQUENCIES } from '../lib/constants'
import { todayStr } from '../lib/dates'
import { getStatus } from '../lib/routines'

export default function TodayTab({ routines, members, active, isLeader, onOpenCheckin, onComplete, onUpdateFreq, onRemoveRoutine }) {
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
            const owner = memberById(r.ownerId)
            const doneToday = r.lastDone === todayStr()
            const ownerIsActive = active && active.id === r.ownerId
            return (
              <div className="nr-task" key={r.id} style={{ borderLeftColor: s.color }}>
                <div style={{ minWidth: 0 }}>
                  <div className="nr-task-head">
                    <span className="nr-task-title">{r.title}</span>
                    <span className="nr-status" style={{ background: s.color }}>{s.label}</span>
                    {owner && <span className="nr-owner-tag" style={{ background: owner.color }}>{owner.emoji} {owner.name}</span>}
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
                  ) : ownerIsActive ? (
                    <button className="nr-btn nr-complete" onClick={() => onComplete(r.id)}>Fiz hoje</button>
                  ) : (
                    <>
                      <button className="nr-btn nr-complete nr-btn-sm" onClick={() => onComplete(r.id)}>Feita</button>
                      <button className="nr-btn nr-steal nr-btn-sm" onClick={() => onComplete(r.id, active.id)} title={`Roubar de ${owner ? owner.name : ''}`}>🥷 Fiz eu</button>
                    </>
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
