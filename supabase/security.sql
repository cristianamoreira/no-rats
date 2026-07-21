-- No Rats — modelo de segurança (RLS) do Supabase
-- =================================================
-- Este arquivo documenta e versiona as policies e funções de segurança do
-- projeto. Rode os blocos no SQL Editor do Supabase na ordem indicada.
--
-- Tabelas:
--   households(id uuid pk, name text, code text, data jsonb, updated_at timestamptz)
--   memberships(user_id uuid, household_id uuid, created_at timestamptz)
--
-- Princípio: um usuário só lê/escreve casas das quais é membro. A entrada numa
-- casa (por código) e a criação de casa passam por funções SECURITY DEFINER, de
-- modo que o cliente nunca precisa de uma policy de INSERT permissiva.


-- ============================================================================
-- BLOCO A — aplicar AGORA (aditivo, não quebra nada)
-- ============================================================================

-- A1. join_household blindada: search_path fixo + nomes totalmente qualificados.
create or replace function public.join_household(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare hid uuid;
begin
  select id into hid from public.households where code = invite_code;
  if hid is null then raise exception 'Código inválido'; end if;
  insert into public.memberships (user_id, household_id)
    values (auth.uid(), hid)
    on conflict (user_id) do update set household_id = excluded.household_id;
  return hid;
end; $$;

-- A2. create_household: insere casa + membership do criador atomicamente.
create or replace function public.create_household(house_name text, invite_code text, init_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare hid uuid;
begin
  insert into public.households (name, code, data)
    values (house_name, invite_code, init_data)
    returning id into hid;
  insert into public.memberships (user_id, household_id)
    values (auth.uid(), hid);
  return hid;
end; $$;

-- A3. Defesa em profundidade: o UPDATE de households também valida no WITH CHECK
--     que a linha resultante continua pertencendo a uma casa da qual sou membro.
alter policy "member can update household" on public.households
  with check (
    exists (
      select 1 from public.memberships m
      where m.household_id = households.id and m.user_id = auth.uid()
    )
  );


-- ============================================================================
-- BLOCO B — aplicar SÓ DEPOIS de o frontend novo estar no ar
-- (o app passou a criar casa via create_household; sem isso, criar casa quebra)
-- ============================================================================

-- Remove as policies de INSERT diretas — criação/entrada agora só via RPC DEFINER.
drop policy if exists "authenticated can insert household" on public.households;
drop policy if exists "own membership insert" on public.memberships;


-- ============================================================================
-- BLOCO C — Storage das fotos de check-in (aplicar 1x no SQL Editor)
-- ============================================================================
-- As fotos deixam de ser base64 dentro de households.data (que inchava a
-- memória no celular e o payload de cada save) e passam a viver no Storage;
-- households.data guarda só a URL. Cria o bucket público "checkins" e restringe
-- o UPLOAD a membros da casa, que só gravam na pasta da própria casa (primeiro
-- segmento do caminho = household_id). Leitura é pública (URLs não-adivinháveis).

insert into storage.buckets (id, name, public)
values ('checkins', 'checkins', true)
on conflict (id) do update set public = true;

drop policy if exists "checkin upload by household members" on storage.objects;
create policy "checkin upload by household members"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'checkins'
  and (storage.foldername(name))[1] in (
    select m.household_id::text from public.memberships m where m.user_id = auth.uid()
  )
);


-- ============================================================================
-- Estado final esperado das policies
-- ============================================================================
--  households:
--    - member can select household   (SELECT, USING: sou membro)
--    - member can update household   (UPDATE, USING + WITH CHECK: sou membro)
--    - (INSERT apenas via create_household)
--  memberships:
--    - own membership select         (SELECT, USING: auth.uid() = user_id)
--    - own membership delete         (DELETE, USING: auth.uid() = user_id)
--    - (INSERT apenas via create_household / join_household)


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


-- ============================================================================
-- BLOCO E — Permissão de criar tarefas no backend (aplicar 1x no SQL Editor)
-- ============================================================================
-- Contexto: o estado inteiro da casa vive em households.data (jsonb) e qualquer
-- MEMBRO pode dar UPDATE (precisa, pra concluir tarefa, desfazer, etc.). A RLS
-- sozinha não distingue "concluiu uma tarefa" de "criou uma tarefa nova". Este
-- trigger BEFORE UPDATE compara o data ANTIGO com o NOVO e recusa apenas as
-- mudanças que violam o modelo de permissão, deixando o resto passar:
--
--   * Criar tarefa nova  -> só o líder OU um membro com canCreate = true.
--   * Editar/remover tarefa existente (título, freq, xp, dias, dono) -> só líder.
--     (campos de execução — lastDone/lastDoneBy/penalized — mudam para todos.)
--   * Transferir liderança (leaderId) -> só o líder.
--   * Alterar a permissão canCreate de alguém -> só o líder.
--
-- O "quem sou eu" é lido do estado ANTIGO (OLD.data), então ninguém consegue se
-- autopromover e usar o poder novo na MESMA escrita.

create or replace function public.enforce_routine_permissions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  actor_id text;
  can_create boolean := false;
  is_leader boolean := false;
  added int;
  removed int;
  edited int;
  cancreate_tampered int;
begin
  -- Sem contexto de usuário (ex.: service role / Edge Functions): não interfere.
  if uid is null then
    return new;
  end if;

  -- Identifica o membro que está escrevendo, a partir do estado ANTIGO.
  select m->>'id', coalesce((m->>'canCreate')::boolean, false)
    into actor_id, can_create
  from jsonb_array_elements(coalesce(old.data->'members', '[]'::jsonb)) m
  where m->>'userId' = uid::text
  limit 1;

  is_leader := actor_id is not null and actor_id = (old.data->>'leaderId');

  -- Tarefas ADICIONADAS (ids que aparecem no NOVO e não existiam no ANTIGO).
  select count(*) into added
  from jsonb_array_elements(coalesce(new.data->'routines', '[]'::jsonb)) n
  where not exists (
    select 1 from jsonb_array_elements(coalesce(old.data->'routines', '[]'::jsonb)) o
    where o->>'id' = n->>'id'
  );

  -- Tarefas REMOVIDAS (ids que existiam no ANTIGO e sumiram no NOVO).
  select count(*) into removed
  from jsonb_array_elements(coalesce(old.data->'routines', '[]'::jsonb)) o
  where not exists (
    select 1 from jsonb_array_elements(coalesce(new.data->'routines', '[]'::jsonb)) n
    where n->>'id' = o->>'id'
  );

  -- Tarefas EDITADAS na definição (ignora os campos de execução).
  select count(*) into edited
  from jsonb_array_elements(coalesce(new.data->'routines', '[]'::jsonb)) n
  join jsonb_array_elements(coalesce(old.data->'routines', '[]'::jsonb)) o
    on o->>'id' = n->>'id'
  where jsonb_build_object('title', n->'title', 'freq', n->'freq', 'xp', n->'xp',
                           'customDays', n->'customDays', 'ownerId', n->'ownerId')
    is distinct from
        jsonb_build_object('title', o->'title', 'freq', o->'freq', 'xp', o->'xp',
                           'customDays', o->'customDays', 'ownerId', o->'ownerId');

  if added > 0 and not (is_leader or can_create) then
    raise exception 'Sem permissão para criar tarefas nesta casa';
  end if;

  if (removed > 0 or edited > 0) and not is_leader then
    raise exception 'Só o líder pode editar ou remover tarefas';
  end if;

  -- Transferência de liderança: só o líder atual.
  if (old.data->>'leaderId') is distinct from (new.data->>'leaderId') and not is_leader then
    raise exception 'Só o líder pode transferir a liderança';
  end if;

  -- Alterar a permissão canCreate de qualquer membro: só o líder.
  select count(*) into cancreate_tampered
  from jsonb_array_elements(coalesce(old.data->'members', '[]'::jsonb)) o
  join jsonb_array_elements(coalesce(new.data->'members', '[]'::jsonb)) n
    on o->>'id' = n->>'id'
  where coalesce((o->>'canCreate')::boolean, false)
    is distinct from coalesce((n->>'canCreate')::boolean, false);

  if cancreate_tampered > 0 and not is_leader then
    raise exception 'Só o líder pode alterar permissões';
  end if;

  return new;
end; $$;

drop trigger if exists trg_enforce_routine_permissions on public.households;
create trigger trg_enforce_routine_permissions
  before update on public.households
  for each row execute function public.enforce_routine_permissions();
