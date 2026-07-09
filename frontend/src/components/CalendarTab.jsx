import { useState } from 'react'
import { WD_SHORT } from '../lib/constants'
import { todayStr, addDays, weekStartOf, ddmm } from '../lib/dates'

export default function CalendarTab({ members, log, onLightbox }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selDay, setSelDay] = useState(todayStr())

  const memberById = (id) => members.find((m) => m.id === id)
  const today = todayStr()
  const calStart = addDays(weekStartOf(today), weekOffset * 7)
  const calDays = []
  for (let i = 0; i < 7; i++) calDays.push(addDays(calStart, i))
  const checkinsOn = (date) => log.filter((l) => l.date === date)
  const membersOn = (date) => {
    const ids = [...new Set(checkinsOn(date).map((l) => l.memberId))]
    return ids.map((id) => memberById(id)).filter(Boolean)
  }
  const selCheckins = checkinsOn(selDay)

  return (
    <section>
      <div className="nr-cal-nav">
        <button className="nr-mini" onClick={() => setWeekOffset(weekOffset - 1)}>◀</button>
        <span className="nr-cal-range">{ddmm(calStart)} – {ddmm(addDays(calStart, 6))}</span>
        <button className="nr-mini" onClick={() => setWeekOffset(weekOffset + 1)}>▶</button>
      </div>
      <div className="nr-cal-grid">
        {calDays.map((date, i) => {
          const isToday = date === today
          const isSel = date === selDay
          const ppl = membersOn(date)
          return (
            <button key={date} className={`nr-cal-cell${isSel ? ' sel' : ''}${isToday ? ' today' : ''}`} onClick={() => setSelDay(date)}>
              <div className="nr-cal-wd">{WD_SHORT[i]}</div>
              <div className="nr-cal-day">{date.slice(8, 10)}</div>
              <div className="nr-cal-dots">
                {ppl.slice(0, 4).map((m) => <span key={m.id} className="nr-dot" style={{ background: m.color }} />)}
              </div>
            </button>
          )
        })}
      </div>
      <h2 className="nr-list-title" style={{ marginTop: '20px' }}>
        Check-ins de {selDay === today ? 'hoje' : ddmm(selDay)} · {selCheckins.length}
      </h2>
      {selCheckins.length === 0 ? (
        <div className="nr-empty" style={{ padding: '30px' }}>Nenhum check-in nesse dia.</div>
      ) : (
        <div className="nr-tasks">
          {selCheckins.map((l) => {
            const m = memberById(l.memberId)
            const hasPhoto = l.before || l.after
            return (
              <div className="nr-checkin" key={l.id}>
                <div className="nr-checkin-top">
                  <span>
                    {m && <span className="nr-owner-tag" style={{ background: m.color, marginRight: '8px' }}>{m.emoji} {m.name}</span>}
                    <strong>{l.title}</strong>
                  </span>
                  <span className="nr-xp-pill">+{l.xp} XP</span>
                </div>
                {hasPhoto && (
                  <div className="nr-checkin-photos">
                    {l.before && (
                      <figure className="nr-ba">
                        <img src={l.before} className="nr-ba-img" onClick={() => onLightbox(l.before)} alt="antes" />
                        <figcaption>Antes</figcaption>
                      </figure>
                    )}
                    {l.after && (
                      <figure className="nr-ba">
                        <img src={l.after} className="nr-ba-img" onClick={() => onLightbox(l.after)} alt="depois" />
                        <figcaption>Depois</figcaption>
                      </figure>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
