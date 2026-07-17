# Spec — Push do vencedor da semana e do mês

**Data:** 2026-07-17
**Projeto:** No Rats (PWA React+Vite + Supabase)
**Status:** desenho aprovado, aguardando revisão do spec

## Objetivo

Ao final de cada semana e de cada mês, enviar uma push notification aos integrantes
da casa anunciando quem venceu o período (maior XP ganho no período). É um gancho de
engajamento: celebra o vencedor e provoca a família a competir.

## Decisões (aprovadas)

- **Critério do vencedor:** maior XP **ganho no período** (não o acumulado). Reaproveita
  exatamente a conta que o `RankingTab` já faz a partir de `households.data.log`.
- **Semana:** segunda→domingo (igual ao `weekStartOf` do app, base UTC). Anúncio da
  **semana anterior**, disparado toda segunda.
- **Mês:** mês-calendário (`YYYY-MM`, base UTC). Anúncio do **mês anterior**, disparado
  no dia 1º.
- **Destinatários:** todos os membros com push ativo recebem. O próprio vencedor recebe
  a versão "Você ganhou".
- **Sem pontos no texto:** a mensagem diz só que venceu, sem o número de XP.
- **Empate (estilo Gym Rats):** cada vencedor gera um push **separado**, enviados em
  sequência (um sobe logo após o outro). No push de um vencedor, ele mesmo vê "Você
  ganhou"; os demais veem "Fulano ganhou".
- **Período vazio** (ninguém pontuou): manda a piada do rato para todos. A piada só
  ocorre quando *ninguém* pontuou — empate não dispara piada.
- **Agendador:** GitHub Action (a Cristiana domina do Tênis Ideal; permite rodar manual
  para testar e ver logs).

## Textos das mensagens

| Situação | Título | Corpo |
|---|---|---|
| Vencedor (semana) | `No Rats 🏆` | `🏆 Você ganhou a semana!` |
| Vencedor (mês) | `No Rats 🏆` | `🏆 Você ganhou o mês!` |
| Sobre outro vencedor (semana) | `No Rats 🏆` | `🏆 {Nome} ganhou a semana!` |
| Sobre outro vencedor (mês) | `No Rats 🏆` | `🏆 {Nome} ganhou o mês!` |
| Ninguém pontuou (semana) | `No Rats 🐀` | `🐀 Semana sem pontos… o rato venceu!` |
| Ninguém pontuou (mês) | `No Rats 🐀` | `🐀 Mês sem pontos… o rato venceu!` |

Todos abrem `https://www.noratsapp.com.br` ao tocar.

## Arquitetura

Três peças novas, nenhuma mexe no fluxo existente:

### 1. Edge Function `notify-winners` (irmã da `notify-task`)

- **Endpoint:** `POST /functions/v1/notify-winners`, corpo `{ "period": "week" | "month" }`.
- **Deploy sem verificação de JWT** (`verify_jwt = false`) — quem chama é o agendador,
  não um usuário logado. A autorização é feita por um **segredo compartilhado**.
- **Autorização:** header `x-cron-secret` deve bater com a env `CRON_SECRET`. Caso
  contrário, responde `401`. (Sem o segredo, ninguém consegue disparar pushes.)
- Roda com `SUPABASE_SERVICE_ROLE_KEY` (mesmas VAPID envs já usadas pela `notify-task`).

**Lógica por chamada (`period`):**

1. Calcular o período anterior encerrado (funções de data inline em Deno, mesma
   convenção UTC do app):
   - `week`: `lastWeekStart = weekStartOf(hojeUTC) - 7 dias`; `lastWeekEnd = lastWeekStart + 6 dias`.
     `period_key = lastWeekStart` (ex.: `2026-07-06`).
   - `month`: `prevMonth = mês anterior a hojeUTC` (ex.: `2026-06`). `period_key = prevMonth`.
2. Buscar as casas que têm ao menos uma inscrição de push
   (`select distinct household_id from push_subscriptions`) e, para cada uma,
   `households.data` (membros + log).
3. Somar o XP de cada membro no período a partir de `data.log`
   (`memberId` + `date` na janela). Definir `maxXp` e `winners = membros com xp === maxXp`
   (`winner_ids: []` quando `maxXp === 0`).
4. **Dedupe (após calcular os vencedores):** inserir em `winner_announcements`
   `(household_id, period_type, period_key, winner_ids)` com `ignoreDuplicates`. Se o
   insert **conflitou** (já existia) → **pula** essa casa (já anunciada); se inseriu →
   segue para o envio. Isso torna a função idempotente e grava quem venceu na mesma
   operação.
5. Enviar os pushes:
   - **Se `maxXp === 0`** (ninguém pontuou): um push da piada do rato para todas as
     inscrições da casa.
   - **Senão**, para **cada** vencedor `W` (em sequência, `await` entre eles), enviar a
     todos os membros com inscrição: se o destinatário é `W` → "Você ganhou"; senão →
     "{nome de W} ganhou". Dentro de um mesmo vencedor, envia em paralelo entre membros.
6. Limpeza de inscrições mortas (404/410) igual à `notify-task` (deleta as `stale`).
7. Responder `{ households: N, pushesEnviados: M }`.

**Mapa membro → inscrições:** `data.members[].userId` é o `auth.uid`; a tabela
`push_subscriptions` é keyed por `user_id`. Junta-se por aí.

### 2. Tabela `winner_announcements` (dedupe + registro)

```sql
create table if not exists public.winner_announcements (
  household_id uuid not null,
  period_type  text not null check (period_type in ('week','month')),
  period_key   text not null,
  winner_ids   jsonb not null default '[]',
  created_at   timestamptz not null default now(),
  primary key (household_id, period_type, period_key)
);
alter table public.winner_announcements enable row level security;
-- Sem policies: só a Edge Function (service role) acessa; clientes ficam bloqueados.
```

Vai como **BLOCO D** no `supabase/security.sql` (versionado). Além do dedupe, guarda
quem venceu cada período — útil se um dia quisermos mostrar o vencedor dentro do app.

### 3. GitHub Action `.github/workflows/vencedores.yml`

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
        run: |
          call() {
            echo "== período: $1 =="
            curl -sS -X POST "$FN_URL" \
              -H "x-cron-secret: $CRON_SECRET" \
              -H "Content-Type: application/json" \
              -d "{\"period\":\"$1\"}"
            echo
          }
          P="${{ github.event.inputs.period || 'both' }}"
          [ "$P" = "both" ] || [ "$P" = "week" ]  && call week  || true
          [ "$P" = "both" ] || [ "$P" = "month" ] && call month || true
```

- Cada disparo chama a função para **os dois períodos**; a própria função decide se há
  algo a anunciar (dedupe por `period_key`). Assim não importa qual dos dois `cron`
  disparou, e um mês que cai numa segunda-feira anuncia semana **e** mês (dois pushes),
  sem risco de duplicar.
- **Timezone:** o app grava datas em UTC, então os limites de período são UTC. `11:00 UTC`
  ≈ 08:00 BRT, um horário amigável de segunda de manhã / início do mês.

## Segredos e configuração

| Onde | Nome | Valor |
|---|---|---|
| GitHub repo secrets | `NORATS_CRON_SECRET` | string aleatória gerada pela Cristiana |
| Supabase function env | `CRON_SECRET` | **o mesmo** valor acima |
| Supabase function env | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_*` | já existem (usados pela `notify-task`) |

Deploy: `supabase functions deploy notify-winners --no-verify-jwt` (CLI v2, sem Docker).

## Casos-limite

- **Ninguém pontuou:** piada do rato (um push a todos). Registra `winner_ids: []`.
- **Empate:** N vencedores → N pushes por membro, em sequência.
- **Casa sem inscrições de push:** não entra na iteração (nada a enviar).
- **Membro sem inscrição:** simplesmente não recebe; não quebra o resto.
- **Função chamada duas vezes / fora de hora:** dedupe por `winner_announcements`
  garante 1 anúncio por período por casa.
- **Inscrição expirada (404/410):** removida da tabela, como na `notify-task`.

## Fora de escopo (YAGNI)

- Mostrar o vencedor dentro do app (o registro em `winner_announcements` já deixa a
  porta aberta, mas a UI não faz parte deste spec).
- Prêmios/recompensas por vitória.
- Configurar horário do disparo por usuário.

## Arquivos

- **Novo:** `frontend/supabase/functions/notify-winners/index.ts`
- **Novo:** `.github/workflows/vencedores.yml`
- **Editar:** `supabase/security.sql` (append BLOCO D — tabela `winner_announcements`)
- **Config:** secret `NORATS_CRON_SECRET` (GitHub) + `CRON_SECRET` (Supabase) + deploy
  `--no-verify-jwt`.
