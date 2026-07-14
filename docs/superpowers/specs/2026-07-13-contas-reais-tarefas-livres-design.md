# Design — No Rats: contas reais, tarefas livres e convite por link

**Data:** 2026-07-13
**Status:** Aprovado (brainstorm) — aguardando revisão da spec
**Escopo:** Frontend (React + Vite) + 1 ajuste de config no Supabase Auth. Sem mudanças de schema no banco.

## Contexto e motivação

Hoje uma "casa" (household) guarda um array `members` num blob JSON. O líder pode
"adicionar pessoas" que **não têm conta** (`userId` ausente) — os chamados *perfis
locais*. Esses perfis pontuam e recebem tarefas, mas não fazem login sozinhos: só
existem dentro da sessão de quem está logado, que pode "virar" qualquer membro
(troca de jogador ativo) e registrar em nome dele.

Decisão de produto (brainstorm): **todo membro terá a própria conta**. Cada pessoa
tem o próprio celular e entra na casa por convite. Isso elimina os perfis locais e
toda a complexidade de "agir como outro". Em paralelo, o modelo de posse de tarefa
passa a ser **por tarefa** (delegada a alguém **ou** livre), e o convite ganha um
**link** que pré-preenche o código.

Não há dados reais em produção ainda (tudo é teste), então **não há migração**.

## Regras de negócio

### Membros
- Todo membro tem `userId`. A **única** forma de entrar numa casa é por convite
  (`join_household` via código). O fluxo "adicionar pessoa sem conta" é **removido**.
- O usuário logado é sempre representado pelo **seu próprio** membro (`userId ===
  session.user.id`). Não existe mais "trocar o jogador ativo".

### Rotinas — posse por tarefa
- `routine.ownerId`:
  - **preenchido** com o `id` de um membro → rotina **delegada** 👑
  - **`null`** (ou ausente) → rotina **livre** 🎯 (qualquer um pega)
- Rotinas-semente (`seedRoutines`) da casa nova nascem **livres** (`ownerId: null`).
- Ao **remover um membro**, as rotinas dele viram **livres** (`ownerId: null`),
  em vez de serem transferidas ao líder.

### Pontuação e penalidade
- Concluir qualquer rotina credita **sempre o usuário logado** (`me.id`).
  - Rotina sua (delegada a você) → "Fiz hoje".
  - Rotina delegada a **outro** → "🥷 Fiz eu" (roubo): pontos pra você; toast de roubo.
  - Rotina **livre** → "Fiz eu" (pega): pontos pra você; toast normal.
- **🐀 Rato:** apenas rotina **delegada** vencida (`kind === 'late'`, `!penalized`,
  `ownerId != null`) penaliza o **dono** com +1 rato. Rotina **livre** vencida **não
  penaliza ninguém** — só aparece como "atrasada" (lembrete visual).

## Modelo de dados (JSON da household — inalterado em forma)

```
{
  members:  [{ id, userId, name, emoji, color, xp, rats }],   // userId sempre presente
  leaderId: <memberId>,
  routines: [{ id, title, freq, xp, ownerId|null, lastDone, penalized }],
  log:      [{ id, memberId, title, xp, date, before?, after? }]
}
```

Única mudança semântica: `routine.ownerId` passa a ser **anulável** (`null` = livre).
`normalizeData` deve preservar `ownerId` como está (inclusive `null`).

## Mudanças por arquivo (estrutura modular já existente)

### `lib/routines.js`
- `seedRoutines(ownerId)` → passa a ignorar o dono e criar rotinas com `ownerId: null`.
  Renomear para `seedRoutines()` (sem parâmetro).
- `getStatus` — inalterado (não usa dono).

### `hooks/useHousehold.js`
- **Remover** `addMember`.
- Expor `me` = membro cujo `userId === session.user.id` (substitui `active`/`activeId`
  e `setActiveId`). Remover a troca de jogador ativo.
- `completeTask(id, photos)` — remover o parâmetro `creditId`. Crédito **sempre** vai
  para `me.id`. Toast: se a rotina era **delegada a outro**, mensagem de roubo 🥷;
  senão, mensagem normal.
- Efeito de penalidade — adicionar guarda `&& r.ownerId` para **não** penalizar livres.
- `addRoutine({ title, freq, xp, ownerId })` — aceitar `ownerId: null` (livre).
- `removeMember(id)` — rotinas do removido passam a `ownerId: null` (livre).
- `createHousehold` — usar `seedRoutines()` (rotinas livres); membro criador com `userId`.
- `joinHousehold` — inalterado (continua sendo o único caminho de entrada).

### `components/Dashboard.jsx` (fiação)
- Deixar de passar `activeId`/`setActiveId`/`onSelect` para o `Scoreboard`; passar `me`.
- `TodayTab` recebe `me` em vez de `active`.
- `CheckinModal` `onConfirm` deixa de repassar `creditId` (chama `completeTask(id, photos)`).
- Remover o estado/props ligados à troca de jogador ativo.

### `components/Scoreboard.jsx`
- Vira **somente exibição**. Remover `onSelect`/troca. Destacar o membro que é o
  usuário logado (`me`). Cartões deixam de ser clicáveis para troca.

### `components/FamilyPanel.jsx` → "Família & Convite"
- **Remover** o formulário de adicionar pessoa (emoji + nome + botão + `addMember`).
- Manter: caixa do **código** + botão **"Convidar"** (copia o link de convite —
  ver seção Convite) + lista de membros com **promover a líder** e **remover**.

### `components/NewRoutinePanel.jsx`
- Campo "De quem é?" ganha a opção **"🎯 Livre (qualquer um)"** com valor que
  represente `null` (ex.: string vazia mapeada para `null` no submit).
- **Livre** é o padrão ao abrir o formulário.

### `components/TodayTab.jsx`
- Tag da rotina: mostra o dono **ou** "Livre 🎯" quando `ownerId == null`.
- Botões de ação:
  - `ownerId == null` (livre): **"Fiz eu"** → `onComplete(r.id)`.
  - `ownerId === me.id` (sua): **"Fiz hoje"** → `onComplete(r.id)`.
  - `ownerId === outro` (delegada): **"🥷 Fiz eu"** → `onComplete(r.id)`.
  - Remover o botão "Feita" (creditar o dono), já que não creditamos mais terceiros.
- Botão 📸 (check-in com foto) permanece; abre o modal.

### `components/CheckinModal.jsx`
- **Remover** o seletor "Quem fez?". Modal fica: fotos antes/depois + Cancelar/Confirmar.
- `onConfirm(photos)` — sem `creditId`.

### Convite por link — `App.jsx` + `HouseholdSetup.jsx`
- **Formato do link:** `https://noratsapp.com.br/entrar?casa=CODIGO`.
- **Ler o código:** ao carregar, `App` lê `casa` de `window.location.search`
  (independente do path — o rewrite do Vercel já serve o `index.html` em qualquer rota).
  - Guardar em estado; se o usuário ainda não estiver logado, persistir em
    `sessionStorage` para sobreviver ao fluxo de cadastro/login.
- **Pré-preencher:** quando o usuário está **logado e sem casa**, renderizar
  `HouseholdSetup` já em modo **"Entrar numa casa"** com o campo de código preenchido
  (nova prop `initialCode` + `initialMode='join'`).
- **Gerar o convite:** botão "Convidar" monta o link com o `houseCode` e copia via
  `navigator.clipboard`; se `navigator.share` existir (mobile), usa o compartilhamento
  nativo com uma mensagem pronta.
- Após entrar na casa com sucesso, limpar o `casa` da URL (`history.replaceState`).

### Supabase (config, fora do código)
- Em **Authentication → URL Configuration**, adicionar `https://noratsapp.com.br` como
  Site URL e `https://noratsapp.com.br/**` em Redirect URLs (para os emails de
  confirmação apontarem ao domínio novo). Passo manual, documentado — não é código.

## Casos de borda
- **Membros legados sem `userId`** (de testes): aparecem no placar mas nunca são `me`;
  o líder pode removê-los. Sem tratamento especial.
- **Rotina cujo dono foi removido:** já coberto — vira livre.
- **`me` inexistente** (usuário logado sem membro correspondente): não deve acontecer
  no fluxo novo (só se entra virando membro), mas o código deve degradar sem quebrar
  (ex.: placar sem destaque, ações que dependem de `me` desabilitadas).
- **Link com código inválido/expirado:** o `join_household` já retorna erro tratado
  ("Código inválido"); o campo pré-preenchido apenas facilita, a validação é a mesma.

## Verificação (testes manuais)
1. **Convite fim-a-fim:** líder copia o link → em aba anônima, novo cadastro abre com o
   código preenchido → entra na casa.
2. **Sem perfis locais:** confirmar que não existe mais "adicionar pessoa"; a única
   entrada é por convite.
3. **Rotina livre:** criar rotina livre → aparece "Livre 🎯" → outra pessoa faz →
   ganha os pontos; deixar vencer → fica "atrasada" **sem** dar rato a ninguém.
4. **Rotina delegada:** delegar a alguém → deixar vencer → o **dono** ganha 🐀; outro
   faz antes → "🥷 Fiz eu" credita quem fez.
5. **Placar:** confirmar que não dá mais pra "virar" outro jogador; só o logado é você.
6. **Remoção de membro:** remover alguém com rotina delegada → a rotina vira livre.
7. **Build:** `npm --prefix frontend run build` sem erros.

## Fora de escopo (YAGNI)
- "Reivindicar" um perfil local existente com uma conta (não há perfis locais).
- PIN por perfil / aprovação de entrada pelo líder.
- Roteamento client-side completo (basta ler o query param `casa`).
- Owner levar rato ao ter a tarefa roubada (roubo não penaliza; só o vencimento penaliza).
