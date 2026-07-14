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

export default function Dashboard({ hh, showToast }) {
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
            showToast={showToast}
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
