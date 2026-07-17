# Push do Vencedor (semana/mês) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enviar push notification anunciando o vencedor da semana e do mês (maior XP no período) aos integrantes da casa no No Rats, agendado por GitHub Action.

**Architecture:** Uma Edge Function Deno `notify-winners` calcula o vencedor a partir de `households.data.log`, deduplica por uma tabela `winner_announcements` e dispara web-push a cada membro (vencedor vê "Você ganhou"). Uma GitHub Action a chama em dois horários (segunda / dia 1º). A lógica pura (datas, cálculo do vencedor, textos) fica num módulo separado testável com `node --test`.

**Tech Stack:** Deno (Supabase Edge Functions), `web-push`, Supabase JS (service role), GitHub Actions, Node 24 (só para os testes da lógica pura).

## Global Constraints

- Datas em **UTC**, semana **segunda→domingo** — replicar exatamente `weekStartOf` do app (`frontend/src/lib/dates.js`).
- Mensagens **sem número de pontos**. Textos exatos (copiar verbatim):
  - Vencedor: `🏆 Você ganhou a semana!` / `🏆 Você ganhou o mês!`
  - Outro vencedor: `🏆 {Nome} ganhou a semana!` / `🏆 {Nome} ganhou o mês!`
  - Período vazio: `🐀 Semana sem pontos… o rato venceu!` / `🐀 Mês sem pontos… o rato venceu!`
  - Título do push: `No Rats 🏆` (vencedor) / `No Rats 🐀` (piada).
- **Empate:** um push por vencedor, **em sequência** (`await` entre vencedores).
- **Período vazio** (ninguém pontuou, `maxXp === 0`): só a piada do rato. Empate NÃO dispara piada.
- Autorização da função por header `x-cron-secret` === env `CRON_SECRET`; deploy `--no-verify-jwt`.
- Todos os pushes abrem `https://www.noratsapp.com.br`.
- Sem suíte de testes no repo; a lógica pura é testada com `node --test`, o resto por deploy + `workflow_dispatch` manual.

---

## File Structure

- `frontend/supabase/functions/notify-winners/logic.ts` — **Novo.** Funções puras (datas, janela do período, cálculo do vencedor, textos). Compatível com Deno **e** Node 24 (sem APIs específicas de runtime).
- `frontend/supabase/functions/notify-winners/logic_test.ts` — **Novo.** Testes `node:test` da lógica pura.
- `frontend/supabase/functions/notify-winners/index.ts` — **Novo.** Handler HTTP (Deno): auth, leitura no banco, dedupe, envio dos pushes, limpeza de inscrições mortas.
- `supabase/security.sql` — **Editar.** Append BLOCO D (tabela `winner_announcements`).
- `.github/workflows/vencedores.yml` — **Novo.** Agendador + teste manual.

---

## Task 1: Módulo de lógica pura (datas, vencedor, textos) — TDD

**Files:**
- Create: `frontend/supabase/functions/notify-winners/logic.ts`
- Test: `frontend/supabase/functions/notify-winners/logic_test.ts`

**Interfaces:**
- Consumes: nada.
- Produces (usado pelo `index.ts` da Task 2):
  - `type Member = { id: string; userId: string; name: string; emoji?: string }`
  - `type LogEntry = { memberId: string; date: string; xp: number }`
  - `type Period = 'week' | 'month'`
  - `periodWindow(period: Period, today: string): { key: string; label: string; inPeriod: (date: string) => boolean }`
  - `computeWinners(members: Member[], log: LogEntry[], inPeriod: (d: string) => boolean): { winners: Member[]; maxXp: number }`
  - `winnerBodySelf(period: Period): string`
  - `winnerBodyOther(period: Period, name: string): string`
  - `ratBody(period: Period): string`

- [ ] **Step 1: Escrever os testes que falham**

Criar `frontend/supabase/functions/notify-winners/logic_test.ts`:

```ts
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
```

- [ ] **Step 2: Rodar os testes e confirmar que FALHAM**

Run: `cd "frontend/supabase/functions/notify-winners" && node --test logic_test.ts`
Expected: FALHA com erro de módulo não encontrado (`Cannot find module './logic.ts'`) ou export ausente.
(Se aparecer aviso sobre stripping de tipos, adicione `--experimental-strip-types`: `node --test --experimental-strip-types logic_test.ts`.)

- [ ] **Step 3: Implementar `logic.ts`**

Criar `frontend/supabase/functions/notify-winners/logic.ts`:

```ts
export type Member = { id: string; userId: string; name: string; emoji?: string }
export type LogEntry = { memberId: string; date: string; xp: number }
export type Period = 'week' | 'month'

const MS = 86400000

export function addDaysUTC(dateStr: string, n: number): string {
  return new Date(Date.parse(dateStr) + n * MS).toISOString().slice(0, 10)
}

// Segunda como início da semana, base UTC — igual a weekStartOf() do app.
export function weekStartOf(dateStr: string): string {
  const day = new Date(dateStr + 'T00:00:00Z').getUTCDay() // 0=dom
  const offset = (day + 6) % 7
  return addDaysUTC(dateStr, -offset)
}

export function periodWindow(
  period: Period,
  today: string,
): { key: string; label: string; inPeriod: (date: string) => boolean } {
  if (period === 'week') {
    const start = addDaysUTC(weekStartOf(today), -7) // início da semana anterior
    const end = addDaysUTC(start, 6)
    return { key: start, label: 'a semana', inPeriod: (d) => d >= start && d <= end }
  }
  // month: mês anterior a "today"
  const [y, m] = today.split('-').map(Number)
  const prev = new Date(Date.UTC(y, m - 1, 1))
  prev.setUTCMonth(prev.getUTCMonth() - 1)
  const key = prev.toISOString().slice(0, 7) // 'YYYY-MM'
  return { key, label: 'o mês', inPeriod: (d) => d.slice(0, 7) === key }
}

export function computeWinners(
  members: Member[],
  log: LogEntry[],
  inPeriod: (d: string) => boolean,
): { winners: Member[]; maxXp: number } {
  const totals = new Map<string, number>()
  for (const m of members) totals.set(m.id, 0)
  for (const l of log) {
    if (inPeriod(l.date) && totals.has(l.memberId)) {
      totals.set(l.memberId, (totals.get(l.memberId) as number) + (Number(l.xp) || 0))
    }
  }
  let maxXp = 0
  for (const v of totals.values()) if (v > maxXp) maxXp = v
  const winners = maxXp > 0 ? members.filter((m) => totals.get(m.id) === maxXp) : []
  return { winners, maxXp }
}

function label(period: Period): string {
  return period === 'week' ? 'a semana' : 'o mês'
}
export function winnerBodySelf(period: Period): string {
  return `🏆 Você ganhou ${label(period)}!`
}
export function winnerBodyOther(period: Period, name: string): string {
  return `🏆 ${name} ganhou ${label(period)}!`
}
export function ratBody(period: Period): string {
  return period === 'week'
    ? '🐀 Semana sem pontos… o rato venceu!'
    : '🐀 Mês sem pontos… o rato venceu!'
}
```

- [ ] **Step 4: Rodar os testes e confirmar que PASSAM**

Run: `cd "frontend/supabase/functions/notify-winners" && node --test logic_test.ts`
Expected: PASS (8 testes).

- [ ] **Step 5: Commit**

```bash
git add frontend/supabase/functions/notify-winners/logic.ts frontend/supabase/functions/notify-winners/logic_test.ts
git commit -m "feat(winners): lógica pura de período/vencedor/mensagens (TDD)"
```

---

## Task 2: Edge Function `notify-winners` (handler)

**Files:**
- Create: `frontend/supabase/functions/notify-winners/index.ts`

**Interfaces:**
- Consumes: `periodWindow`, `computeWinners`, `winnerBodySelf`, `winnerBodyOther`, `ratBody`, tipos `Member`/`LogEntry`/`Period` de `./logic.ts` (Task 1).
- Consumes: tabela `winner_announcements` (Task 3) e `push_subscriptions`/`households` (já existem).
- Produces: endpoint `POST /functions/v1/notify-winners` corpo `{ period: 'week' | 'month' }`, resposta `{ households, pushesEnviados }`.

- [ ] **Step 1: Implementar `index.ts`**

Criar `frontend/supabase/functions/notify-winners/index.ts`:

```ts
// Edge Function: anuncia por push o vencedor da semana/mês aos membros da casa.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push@3.6.7"
import {
  periodWindow, computeWinners,
  winnerBodySelf, winnerBodyOther, ratBody,
  type Member, type LogEntry, type Period,
} from "./logic.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:contato@noratsapp.com.br"
const CRON_SECRET = Deno.env.get("CRON_SECRET")!

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } })
}

const URL_APP = "https://www.noratsapp.com.br"

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  try {
    if ((req.headers.get("x-cron-secret") || "") !== CRON_SECRET) {
      return json({ error: "não autorizado" }, 401)
    }
    const { period } = await req.json() as { period?: Period }
    if (period !== "week" && period !== "month") {
      return json({ error: "period deve ser 'week' ou 'month'" }, 400)
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const today = new Date().toISOString().slice(0, 10)
    const pw = periodWindow(period, today)

    // Casas com ao menos uma inscrição de push.
    const { data: subRows } = await admin.from("push_subscriptions").select("household_id")
    const householdIds = [...new Set((subRows || []).map((r: any) => r.household_id))]

    const stale: string[] = []
    let pushesEnviados = 0
    let casasAnunciadas = 0

    for (const hid of householdIds) {
      const { data: hh } = await admin.from("households").select("data").eq("id", hid).maybeSingle()
      const data = (hh?.data || {}) as { members?: Member[]; log?: LogEntry[] }
      const members = data.members || []
      const log = data.log || []
      const { winners } = computeWinners(members, log, pw.inPeriod)

      // Dedupe: insere o registro do período; se já existia, pula a casa.
      const { data: inserted } = await admin
        .from("winner_announcements")
        .upsert(
          { household_id: hid, period_type: period, period_key: pw.key, winner_ids: winners.map((w) => w.id) },
          { onConflict: "household_id,period_type,period_key", ignoreDuplicates: true },
        )
        .select()
      if (!inserted || inserted.length === 0) continue // já anunciado
      casasAnunciadas++

      // Inscrições da casa.
      const { data: subs } = await admin
        .from("push_subscriptions")
        .select("id, user_id, subscription")
        .eq("household_id", hid)
      const subList = subs || []
      if (subList.length === 0) continue

      const send = async (sub: any, title: string, body: string) => {
        try {
          await webpush.sendNotification(sub.subscription, JSON.stringify({ title, body, url: URL_APP }))
          pushesEnviados++
        } catch (err: any) {
          const code = err?.statusCode
          if (code === 404 || code === 410) stale.push(sub.id)
        }
      }

      if (winners.length === 0) {
        // Ninguém pontuou: piada do rato para todos.
        await Promise.all(subList.map((s: any) => send(s, "No Rats 🐀", ratBody(period))))
      } else {
        // Um push por vencedor, em sequência (estilo Gym Rats).
        for (const w of winners) {
          await Promise.all(subList.map((s: any) => {
            const body = s.user_id === w.userId ? winnerBodySelf(period) : winnerBodyOther(period, w.name)
            return send(s, "No Rats 🏆", body)
          }))
        }
      }
    }

    if (stale.length) await admin.from("push_subscriptions").delete().in("id", stale)
    return json({ households: casasAnunciadas, pushesEnviados })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
```

- [ ] **Step 2: Checagem de sintaxe/tipos com Node (rápida, sem Supabase)**

A validação de runtime é por deploy (Task 5). Aqui só confirmamos que o arquivo é sintaticamente válido e importa a lógica certa:

Run: `cd "frontend/supabase/functions/notify-winners" && node --check --experimental-strip-types index.ts 2>/dev/null && echo "sintaxe OK" || echo "revisar sintaxe"`
Expected: `sintaxe OK` (as importações `https://`/`npm:` são de Deno e são ignoradas pelo `--check` de sintaxe; se o `--check` reclamar dos specifiers remotos, pule este step — a validação real é o deploy na Task 5).

- [ ] **Step 3: Commit**

```bash
git add frontend/supabase/functions/notify-winners/index.ts
git commit -m "feat(winners): Edge Function notify-winners (push do vencedor)"
```

---

## Task 3: Tabela `winner_announcements` (dedupe) no `security.sql`

**Files:**
- Modify: `supabase/security.sql` (append ao final, antes de "Estado final esperado" se preferir; pode ser no fim do arquivo)

- [ ] **Step 1: Adicionar o BLOCO D ao `supabase/security.sql`**

Acrescentar este bloco ao arquivo:

```sql
-- ============================================================================
-- BLOCO D — Registro/dedupe dos anúncios de vencedor (aplicar 1x no SQL Editor)
-- ============================================================================
-- Usado pela Edge Function notify-winners para não anunciar o mesmo período duas
-- vezes e para guardar quem venceu. Só a função (service role) acessa.

create table if not exists public.winner_announcements (
  household_id uuid not null,
  period_type  text not null check (period_type in ('week','month')),
  period_key   text not null,
  winner_ids   jsonb not null default '[]',
  created_at   timestamptz not null default now(),
  primary key (household_id, period_type, period_key)
);
alter table public.winner_announcements enable row level security;
-- Sem policies: clientes ficam bloqueados; a Edge Function usa service role.
```

- [ ] **Step 2: Aplicar no Supabase**

Abrir o SQL Editor do projeto (`https://supabase.com/dashboard/project/drhhimvxtqrvuumqhkgr/sql/new`), colar o BLOCO D e rodar (**Run**).

- [ ] **Step 3: Verificar que a tabela existe e RLS está ligada**

No SQL Editor, rodar:

```sql
select relrowsecurity from pg_class where relname = 'winner_announcements';
```
Expected: uma linha com `true` (RLS habilitada).

- [ ] **Step 4: Commit**

```bash
git add supabase/security.sql
git commit -m "feat(winners): tabela winner_announcements (dedupe) — BLOCO D"
```

---

## Task 4: GitHub Action `vencedores.yml`

**Files:**
- Create: `.github/workflows/vencedores.yml`

**Interfaces:**
- Consumes: endpoint da função (Task 2), secret `NORATS_CRON_SECRET`.

- [ ] **Step 1: Criar o workflow**

Criar `.github/workflows/vencedores.yml`:

```yaml
name: Push de vencedores (semana/mês)

on:
  schedule:
    - cron: '0 11 * * 1'   # toda segunda 11:00 UTC (~08h BRT) — semana
    - cron: '0 11 1 * *'   # todo dia 1º 11:00 UTC (~08h BRT) — mês
  workflow_dispatch:
    inputs:
      period:
        description: 'Testar manualmente: week, month ou both'
        default: 'both'

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Chamar notify-winners
        env:
          FN_URL: https://drhhimvxtqrvuumqhkgr.supabase.co/functions/v1/notify-winners
          CRON_SECRET: ${{ secrets.NORATS_CRON_SECRET }}
          PERIOD: ${{ github.event.inputs.period || 'both' }}
        run: |
          set -euo pipefail
          call() {
            echo "== período: $1 =="
            curl -fsS -X POST "$FN_URL" \
              -H "x-cron-secret: $CRON_SECRET" \
              -H "Content-Type: application/json" \
              -d "{\"period\":\"$1\"}"
            echo
          }
          if [ "$PERIOD" = "both" ] || [ "$PERIOD" = "week" ]; then call week; fi
          if [ "$PERIOD" = "both" ] || [ "$PERIOD" = "month" ]; then call month; fi
```

- [ ] **Step 2: Criar o secret no GitHub**

Gerar um segredo aleatório e guardá-lo como secret do repo `NORATS_CRON_SECRET`:

```bash
# gera um valor aleatório (copie a saída)
openssl rand -hex 24
# cria o secret no repo (gh CLI)
gh secret set NORATS_CRON_SECRET
# (cole o valor quando pedir; guarde-o também para usar como CRON_SECRET na Task 5)
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/vencedores.yml
git commit -m "feat(winners): GitHub Action agenda push de vencedores"
```

---

## Task 5: Deploy + verificação end-to-end (manual)

**Files:** nenhum (deploy + configuração + teste manual).

- [ ] **Step 1: Definir o secret `CRON_SECRET` na função (mesmo valor da Task 4)**

```bash
# na raiz de frontend/ (onde há supabase/)
cd frontend
supabase functions secrets set CRON_SECRET=<o_mesmo_valor_do_NORATS_CRON_SECRET> --project-ref drhhimvxtqrvuumqhkgr
```
(As envs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_*` já existem do `notify-task`.)

- [ ] **Step 2: Deploy da função SEM verificação de JWT**

```bash
cd frontend
supabase functions deploy notify-winners --no-verify-jwt --project-ref drhhimvxtqrvuumqhkgr
```
Expected: deploy concluído sem erro.

- [ ] **Step 3: Verificar a autorização (segredo errado deve dar 401)**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://drhhimvxtqrvuumqhkgr.supabase.co/functions/v1/notify-winners \
  -H "x-cron-secret: errado" -H "Content-Type: application/json" \
  -d '{"period":"week"}'
```
Expected: `401`.

- [ ] **Step 4: Disparo real via GitHub Action (teste manual)**

No GitHub: aba **Actions → "Push de vencedores" → Run workflow**, escolher `period = week` e rodar. Conferir nos logs a resposta `{"households":N,"pushesEnviados":M}` (HTTP 200). Um integrante com push ativo e XP na semana anterior deve receber a notificação.

- [ ] **Step 5: Verificar a idempotência (dedupe)**

Rodar o workflow de novo com `period = week`. A resposta deve vir com `households: 0` (nenhuma casa reanunciada), confirmando o dedupe pela `winner_announcements`.

- [ ] **Step 6 (opcional): limpar o registro de teste para reanunciar**

Se quiser testar de novo o envio, apagar o registro do período no SQL Editor:

```sql
delete from public.winner_announcements where period_type = 'week' and period_key = '<AAAA-MM-DD-da-semana>';
```

---

## Self-Review (preenchido pelo autor do plano)

- **Cobertura do spec:** período/vencedor/empate/vazio → Task 1 (testado); envio + destinatários + "Você ganhou" → Task 2; dedupe/tabela → Tasks 2+3; agendador + secret → Tasks 4+5; auth por x-cron-secret + no-verify-jwt → Tasks 2+5. Sem lacunas.
- **Sem placeholders:** todos os steps trazem código/comando concretos. `{Nome}`/`<valor>` são interpolações intencionais.
- **Consistência de tipos:** `Member/LogEntry/Period` e as funções (`periodWindow`, `computeWinners`, `winnerBodySelf/Other`, `ratBody`) são idênticas entre Task 1 (definição/testes) e Task 2 (uso).
