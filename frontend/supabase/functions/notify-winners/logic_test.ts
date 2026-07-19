import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  periodWindow, computeWinners,
  winnerBodySelf, winnerBodyOther, ratBody,
} from './logic.ts'

const members = [
  { id: 'a', userId: 'ua', name: 'Cristiana' },
  { id: 'b', userId: 'ub', name: 'Marido' },
  { id: 'c', userId: 'uc', name: 'Filho' },
]

test('periodWindow week: semana anterior (seg-dom) a partir de uma quarta', () => {
  // 2026-07-15 é uma quarta. Semana atual começa 2026-07-13 (seg).
  // Semana anterior: 2026-07-06 a 2026-07-12.
  const w = periodWindow('week', '2026-07-15')
  assert.equal(w.key, '2026-07-06')
  assert.equal(w.label, 'a semana')
  assert.equal(w.inPeriod('2026-07-06'), true)
  assert.equal(w.inPeriod('2026-07-12'), true)
  assert.equal(w.inPeriod('2026-07-05'), false)
  assert.equal(w.inPeriod('2026-07-13'), false)
})

test('periodWindow week: rodando na segunda pega a semana que acabou no domingo', () => {
  // 2026-07-13 é segunda. Semana anterior: 2026-07-06 a 2026-07-12.
  const w = periodWindow('week', '2026-07-13')
  assert.equal(w.key, '2026-07-06')
  assert.equal(w.inPeriod('2026-07-12'), true)
})

test('periodWindow month: mês anterior', () => {
  const w = periodWindow('month', '2026-07-01')
  assert.equal(w.key, '2026-06')
  assert.equal(w.label, 'o mês')
  assert.equal(w.inPeriod('2026-06-30'), true)
  assert.equal(w.inPeriod('2026-07-01'), false)
})

test('periodWindow month: vira o ano (jan -> dez anterior)', () => {
  const w = periodWindow('month', '2026-01-01')
  assert.equal(w.key, '2025-12')
})

test('computeWinners: vencedor único', () => {
  const w = periodWindow('week', '2026-07-13')
  const log = [
    { memberId: 'a', date: '2026-07-07', xp: 30 },
    { memberId: 'b', date: '2026-07-08', xp: 10 },
    { memberId: 'a', date: '2026-07-05', xp: 100 }, // fora da janela, ignora
  ]
  const r = computeWinners(members, log, w.inPeriod)
  assert.equal(r.maxXp, 30)
  assert.deepEqual(r.winners.map((m) => m.id), ['a'])
})

test('computeWinners: empate mantém todos os empatados na ordem dos membros', () => {
  const w = periodWindow('week', '2026-07-13')
  const log = [
    { memberId: 'a', date: '2026-07-07', xp: 20 },
    { memberId: 'b', date: '2026-07-08', xp: 20 },
  ]
  const r = computeWinners(members, log, w.inPeriod)
  assert.equal(r.maxXp, 20)
  assert.deepEqual(r.winners.map((m) => m.id), ['a', 'b'])
})

test('computeWinners: ninguém pontuou -> sem vencedores', () => {
  const w = periodWindow('week', '2026-07-13')
  const r = computeWinners(members, [], w.inPeriod)
  assert.equal(r.maxXp, 0)
  assert.deepEqual(r.winners, [])
})

test('textos das mensagens (sem pontos)', () => {
  assert.equal(winnerBodySelf('week'), '🏆 Você ganhou a semana!')
  assert.equal(winnerBodySelf('month'), '🏆 Você ganhou o mês!')
  assert.equal(winnerBodyOther('week', 'Cristiana'), '🏆 Cristiana ganhou a semana!')
  assert.equal(winnerBodyOther('month', 'Marido'), '🏆 Marido ganhou o mês!')
  assert.equal(ratBody('week'), '🐀 Semana sem pontos… o rato venceu!')
  assert.equal(ratBody('month'), '🐀 Mês sem pontos… o rato venceu!')
})
