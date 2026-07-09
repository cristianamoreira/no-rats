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
  const { data, houseCode, activeId, setActiveId } = hh
  const [tab, setTab] = useState('hoje')
  const [modalRoutine, setModalRoutine] = useState(null)
  const [lightbox, setLightbox] = useState(null)

  const members = data.members
  const leaderId = data.leaderId
  const routines = data.routines
  const log = data.log
  const active = members.find((m) => m.id === activeId) || members[0]
  const isLeader = active && active.id === leaderId

  return (
    <div className="nr-app">
      {modalRoutine && (
        <CheckinModal
          routine={modalRoutine}
          members={members}
          defaultCredit={modalRoutine.ownerId}
          onConfirm={(cid, photos) => {
            hh.completeTask(modalRoutine.id, cid, photos)
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
          Placar geral <span style={{ color: '#94a3b8', fontWeight: 500 }}>· você é {active ? active.name : ''}</span>
        </div>

        <Scoreboard members={members} leaderId={leaderId} activeId={activeId} onSelect={setActiveId} />

        {isLeader && (
          <FamilyPanel
            members={members}
            leaderId={leaderId}
            houseCode={houseCode}
            onAddMember={hh.addMember}
            onRemoveMember={hh.removeMember}
            onMakeLeader={hh.makeLeader}
          />
        )}

        {isLeader && (
          <NewRoutinePanel members={members} leaderId={leaderId} onAdd={hh.addRoutine} />
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
            active={active}
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
