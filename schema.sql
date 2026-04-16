-- ============================================================
-- SISTEMA DE GESTÃO FINANCEIRA — SUPABASE SCHEMA COMPLETO
-- Cole este arquivo inteiro no SQL Editor do Supabase
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- CORE
-- ============================================================

create table public.profiles (
  id              uuid references auth.users(id) on delete cascade primary key,
  full_name       text,
  avatar_url      text,
  default_currency text default 'BRL',
  timezone        text default 'America/Sao_Paulo',
  date_format     text default 'DD/MM/YYYY',
  theme           text default 'light',
  system_name     text default 'FinanceApp',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table public.companies (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid references auth.users(id) on delete cascade not null,
  name          text not null,
  trade_name    text,
  document      text,
  logo_url      text,
  primary_color text default '#6366f1',
  currency      text default 'BRL',
  timezone      text default 'America/Sao_Paulo',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table public.user_company_links (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  company_id uuid references public.companies(id) on delete cascade not null,
  role       text default 'owner' check (role in ('owner','admin','member','viewer')),
  created_at timestamptz default now(),
  unique(user_id, company_id)
);

-- ============================================================
-- CONTAS E CARTÕES
-- ============================================================

create table public.financial_accounts (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  company_id      uuid references public.companies(id) on delete set null,
  context_type    text not null check (context_type in ('personal','business')),
  name            text not null,
  account_type    text not null check (account_type in ('checking','savings','cash','digital','investment','other')),
  institution     text,
  initial_balance numeric(15,2) default 0,
  current_balance numeric(15,2) default 0,
  color           text default '#6366f1',
  icon            text,
  is_active       boolean default true,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table public.credit_cards (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid references auth.users(id) on delete cascade not null,
  company_id         uuid references public.companies(id) on delete set null,
  context_type       text not null check (context_type in ('personal','business')),
  name               text not null,
  institution        text,
  credit_limit       numeric(15,2) default 0,
  available_limit    numeric(15,2) default 0,
  closing_day        integer check (closing_day between 1 and 31),
  due_day            integer check (due_day between 1 and 31),
  best_purchase_day  integer check (best_purchase_day between 1 and 31),
  color              text default '#8b5cf6',
  icon               text,
  is_active          boolean default true,
  payment_account_id uuid references public.financial_accounts(id) on delete set null,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- ============================================================
-- CATEGORIAS
-- ============================================================

create table public.financial_categories (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  name          text not null,
  category_type text not null check (category_type in ('income','expense')),
  context_type  text default 'both' check (context_type in ('personal','business','both')),
  color         text default '#6366f1',
  icon          text,
  is_active     boolean default true,
  is_fixed      boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table public.financial_subcategories (
  id          uuid primary key default uuid_generate_v4(),
  category_id uuid references public.financial_categories(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  color       text,
  is_active   boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- CENTROS DE CUSTO
-- ============================================================

create table public.cost_centers (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  company_id  uuid references public.companies(id) on delete set null,
  name        text not null,
  description text,
  color       text default '#10b981',
  is_active   boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- RESPONSÁVEIS
-- ============================================================

create table public.people_responsible (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  person_type text default 'other' check (person_type in ('partner','employee','family','other')),
  color       text default '#f59e0b',
  avatar_url  text,
  is_active   boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- CLIENTES
-- ============================================================

create table public.clients (
  id                       uuid primary key default uuid_generate_v4(),
  user_id                  uuid references auth.users(id) on delete cascade not null,
  company_id               uuid references public.companies(id) on delete set null,
  name                     text not null,
  trade_name               text,
  client_type              text default 'individual' check (client_type in ('individual','company')),
  document                 text,
  phone                    text,
  email                    text,
  is_recurring             boolean default false,
  default_amount           numeric(15,2),
  due_day                  integer check (due_day between 1 and 31),
  preferred_payment_method text,
  service_description      text,
  origin                   text,
  status                   text default 'active' check (status in ('active','inactive')),
  notes                    text,
  tags                     text[],
  total_received           numeric(15,2) default 0,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

-- ============================================================
-- FORNECEDORES
-- ============================================================

create table public.suppliers (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  company_id uuid references public.companies(id) on delete set null,
  name       text not null,
  document   text,
  phone      text,
  email      text,
  status     text default 'active' check (status in ('active','inactive')),
  notes      text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- REGRAS DE RECORRÊNCIA
-- ============================================================

create table public.recurring_rules (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid references auth.users(id) on delete cascade not null,
  description         text not null,
  amount              numeric(15,2) not null,
  transaction_type    text not null check (transaction_type in ('income','expense')),
  context_type        text not null check (context_type in ('personal','business')),
  frequency           text not null check (frequency in ('weekly','biweekly','monthly','quarterly','semiannual','annual','custom')),
  custom_days         integer,
  start_date          date not null,
  end_date            date,
  account_id          uuid references public.financial_accounts(id) on delete set null,
  card_id             uuid references public.credit_cards(id) on delete set null,
  category_id         uuid references public.financial_categories(id) on delete set null,
  subcategory_id      uuid references public.financial_subcategories(id) on delete set null,
  client_id           uuid references public.clients(id) on delete set null,
  supplier_id         uuid references public.suppliers(id) on delete set null,
  responsible_person_id uuid references public.people_responsible(id) on delete set null,
  cost_center_id      uuid references public.cost_centers(id) on delete set null,
  payment_method      text,
  notes               text,
  tags                text[],
  is_active           boolean default true,
  last_generated_date date,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ============================================================
-- TRANSAÇÕES FINANCEIRAS (tabela central)
-- ============================================================

create table public.financial_transactions (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid references auth.users(id) on delete cascade not null,
  company_id            uuid references public.companies(id) on delete set null,
  context_type          text not null check (context_type in ('personal','business')),
  transaction_type      text not null check (transaction_type in ('income','expense','transfer')),
  status                text not null default 'pending'
                          check (status in ('pending','paid','received','overdue','cancelled')),
  description           text not null,
  amount                numeric(15,2) not null,
  competency_date       date not null,
  settlement_date       date,
  due_date              date,
  account_id            uuid references public.financial_accounts(id) on delete set null,
  destination_account_id uuid references public.financial_accounts(id) on delete set null,
  card_id               uuid references public.credit_cards(id) on delete set null,
  category_id           uuid references public.financial_categories(id) on delete set null,
  subcategory_id        uuid references public.financial_subcategories(id) on delete set null,
  client_id             uuid references public.clients(id) on delete set null,
  supplier_id           uuid references public.suppliers(id) on delete set null,
  responsible_person_id uuid references public.people_responsible(id) on delete set null,
  cost_center_id        uuid references public.cost_centers(id) on delete set null,
  recurring_rule_id     uuid references public.recurring_rules(id) on delete set null,
  installment_number    integer,
  installment_total     integer,
  payment_method        text,
  notes                 text,
  tags                  text[],
  attachment_count      integer default 0,
  transfer_link_id      uuid,        -- preenchido pelo trigger após criar par de transferência
  is_deleted            boolean default false,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now(),
  created_by            uuid references auth.users(id),
  updated_by            uuid references auth.users(id)
);

-- Par de transferência (origem → destino)
create table public.transfer_links (
  id                        uuid primary key default uuid_generate_v4(),
  origin_transaction_id     uuid references public.financial_transactions(id) on delete cascade not null,
  destination_transaction_id uuid references public.financial_transactions(id) on delete cascade not null,
  created_at                timestamptz default now()
);

-- Anexos
create table public.transaction_attachments (
  id             uuid primary key default uuid_generate_v4(),
  transaction_id uuid references public.financial_transactions(id) on delete cascade not null,
  user_id        uuid references auth.users(id) on delete cascade not null,
  file_name      text not null,
  file_url       text not null,
  file_size      integer,
  mime_type      text,
  created_at     timestamptz default now()
);

-- ============================================================
-- AUDITORIA
-- ============================================================

create table public.audit_logs (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references auth.users(id) on delete set null,
  table_name text not null,
  record_id  uuid not null,
  action     text not null check (action in ('insert','update','delete')),
  old_data   jsonb,
  new_data   jsonb,
  ip_address text,
  created_at timestamptz default now()
);

-- ============================================================
-- INTEGRAÇÕES
-- ============================================================

create table public.integration_settings (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  company_id       uuid references public.companies(id) on delete set null,
  integration_type text not null check (integration_type in ('whatsapp','google_calendar','webhook','other')),
  is_enabled       boolean default false,
  settings         jsonb default '{}',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique(user_id, integration_type)
);

create table public.whatsapp_instances (
  id                       uuid primary key default uuid_generate_v4(),
  user_id                  uuid references auth.users(id) on delete cascade not null,
  provider_name            text,
  api_base_url             text,
  server_url               text,
  instance_name            text,
  -- tokens NUNCA retornam ao frontend em texto puro; armazenados via Edge Function
  instance_token_encrypted text,
  admin_token_encrypted    text,
  webhook_url              text,
  webhook_secret_encrypted text,
  system_name              text default 'FinanceApp',
  connection_status        text default 'disconnected'
                             check (connection_status in ('disconnected','connecting','connected')),
  send_updates_enabled     boolean default false,
  receive_commands_enabled boolean default false,
  last_connection_at       timestamptz,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

create table public.whatsapp_groups (
  id                uuid primary key default uuid_generate_v4(),
  instance_id       uuid references public.whatsapp_instances(id) on delete cascade not null,
  user_id           uuid references auth.users(id) on delete cascade not null,
  group_jid         text not null,   -- formato: 120363xxxxxxxxxxxx@g.us
  group_name        text,
  is_default        boolean default false,
  allowed_commands  boolean default true,
  receive_summaries boolean default true,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create table public.whatsapp_message_logs (
  id             uuid primary key default uuid_generate_v4(),
  instance_id    uuid references public.whatsapp_instances(id) on delete set null,
  user_id        uuid references auth.users(id) on delete cascade not null,
  direction      text not null check (direction in ('inbound','outbound')),
  sender_jid     text,
  group_jid      text,
  message_body   text,
  message_id     text,
  status         text default 'received'
                   check (status in ('received','processing','processed','error')),
  parsed_command jsonb,
  created_at     timestamptz default now()
);

create table public.whatsapp_command_logs (
  id               uuid primary key default uuid_generate_v4(),
  message_log_id   uuid references public.whatsapp_message_logs(id) on delete set null,
  user_id          uuid references auth.users(id) on delete cascade not null,
  command_type     text,
  raw_text         text,
  parsed_data      jsonb,
  execution_result jsonb,
  status           text default 'pending'
                     check (status in ('pending','executing','success','error')),
  error_message    text,
  created_at       timestamptz default now()
);

create table public.google_calendar_settings (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid references auth.users(id) on delete cascade not null,
  is_enabled            boolean default false,
  calendar_id           text,
  timezone              text default 'America/Sao_Paulo',
  default_event_duration integer default 60,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expiry          timestamptz,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create table public.automation_logs (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  automation_type text not null,
  trigger_source text,
  status         text not null check (status in ('running','success','error')),
  input_data     jsonb,
  output_data    jsonb,
  error_message  text,
  duration_ms    integer,
  created_at     timestamptz default now()
);

-- ============================================================
-- ÍNDICES DE PERFORMANCE
-- ============================================================

create index idx_tx_user           on public.financial_transactions(user_id);
create index idx_tx_company        on public.financial_transactions(company_id);
create index idx_tx_context        on public.financial_transactions(context_type);
create index idx_tx_type           on public.financial_transactions(transaction_type);
create index idx_tx_status         on public.financial_transactions(status);
create index idx_tx_competency     on public.financial_transactions(competency_date);
create index idx_tx_due            on public.financial_transactions(due_date);
create index idx_tx_settlement     on public.financial_transactions(settlement_date);
create index idx_tx_account        on public.financial_transactions(account_id);
create index idx_tx_client         on public.financial_transactions(client_id);
create index idx_tx_responsible    on public.financial_transactions(responsible_person_id);
create index idx_tx_category       on public.financial_transactions(category_id);
create index idx_tx_not_deleted    on public.financial_transactions(is_deleted) where is_deleted = false;
create index idx_tx_recurring      on public.financial_transactions(recurring_rule_id);

create index idx_audit_table_rec   on public.audit_logs(table_name, record_id);
create index idx_audit_user        on public.audit_logs(user_id);
create index idx_audit_created     on public.audit_logs(created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles                 enable row level security;
alter table public.companies                enable row level security;
alter table public.user_company_links       enable row level security;
alter table public.financial_accounts       enable row level security;
alter table public.credit_cards             enable row level security;
alter table public.financial_categories     enable row level security;
alter table public.financial_subcategories  enable row level security;
alter table public.cost_centers             enable row level security;
alter table public.people_responsible       enable row level security;
alter table public.clients                  enable row level security;
alter table public.suppliers                enable row level security;
alter table public.recurring_rules          enable row level security;
alter table public.financial_transactions   enable row level security;
alter table public.transfer_links           enable row level security;
alter table public.transaction_attachments  enable row level security;
alter table public.audit_logs               enable row level security;
alter table public.integration_settings     enable row level security;
alter table public.whatsapp_instances       enable row level security;
alter table public.whatsapp_groups          enable row level security;
alter table public.whatsapp_message_logs    enable row level security;
alter table public.whatsapp_command_logs    enable row level security;
alter table public.google_calendar_settings enable row level security;
alter table public.automation_logs          enable row level security;

-- Profiles
create policy "own_profile_select" on public.profiles for select using (auth.uid() = id);
create policy "own_profile_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own_profile_update" on public.profiles for update using (auth.uid() = id);

-- Companies
create policy "own_companies" on public.companies for all using (auth.uid() = owner_id);

-- User company links
create policy "own_links" on public.user_company_links for select using (auth.uid() = user_id);

-- Financial accounts
create policy "own_accounts" on public.financial_accounts for all using (auth.uid() = user_id);

-- Credit cards
create policy "own_cards" on public.credit_cards for all using (auth.uid() = user_id);

-- Categories
create policy "own_categories" on public.financial_categories for all using (auth.uid() = user_id);
create policy "own_subcategories" on public.financial_subcategories for all using (auth.uid() = user_id);

-- Cost centers
create policy "own_cost_centers" on public.cost_centers for all using (auth.uid() = user_id);

-- People
create policy "own_people" on public.people_responsible for all using (auth.uid() = user_id);

-- Clients
create policy "own_clients" on public.clients for all using (auth.uid() = user_id);

-- Suppliers
create policy "own_suppliers" on public.suppliers for all using (auth.uid() = user_id);

-- Recurring rules
create policy "own_recurring" on public.recurring_rules for all using (auth.uid() = user_id);

-- Transactions
create policy "own_transactions" on public.financial_transactions for all using (auth.uid() = user_id);

-- Transfer links
create policy "own_transfer_links" on public.transfer_links for select
  using (exists (
    select 1 from public.financial_transactions t
    where t.id = origin_transaction_id and t.user_id = auth.uid()
  ));

-- Attachments
create policy "own_attachments" on public.transaction_attachments for all using (auth.uid() = user_id);

-- Audit logs
create policy "own_audit" on public.audit_logs for select using (auth.uid() = user_id);

-- Integrations
create policy "own_integration_settings"     on public.integration_settings     for all using (auth.uid() = user_id);
create policy "own_whatsapp_instances"        on public.whatsapp_instances        for all using (auth.uid() = user_id);
create policy "own_whatsapp_groups"           on public.whatsapp_groups           for all using (auth.uid() = user_id);
create policy "own_whatsapp_message_logs"     on public.whatsapp_message_logs     for select using (auth.uid() = user_id);
create policy "own_whatsapp_command_logs"     on public.whatsapp_command_logs     for select using (auth.uid() = user_id);
create policy "own_google_calendar_settings"  on public.google_calendar_settings  for all using (auth.uid() = user_id);
create policy "own_automation_logs"           on public.automation_logs           for select using (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-criar perfil no signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles                for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.companies               for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.financial_accounts      for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.credit_cards            for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.financial_categories    for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.financial_subcategories for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.cost_centers            for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.people_responsible      for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.clients                 for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.suppliers               for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.recurring_rules         for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.financial_transactions  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.whatsapp_instances      for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.google_calendar_settings for each row execute procedure public.set_updated_at();

-- Auditoria de transações
create or replace function public.audit_transaction()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs(user_id, table_name, record_id, action, new_data)
    values (auth.uid(), tg_table_name, new.id, 'insert', to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs(user_id, table_name, record_id, action, old_data, new_data)
    values (auth.uid(), tg_table_name, new.id, 'update', to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs(user_id, table_name, record_id, action, old_data)
    values (auth.uid(), tg_table_name, old.id, 'delete', to_jsonb(old));
    return old;
  end if;
end;
$$;

create trigger audit_transactions
  after insert or update or delete on public.financial_transactions
  for each row execute procedure public.audit_transaction();

-- Recalcular saldo da conta
create or replace function public.recalculate_account_balance(p_account_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.financial_accounts
  set current_balance = initial_balance + coalesce((
    select sum(
      case
        when t.transaction_type = 'income'    then  t.amount
        when t.transaction_type = 'expense'   then -t.amount
        when t.transaction_type = 'transfer' and t.account_id = p_account_id             then -t.amount
        when t.transaction_type = 'transfer' and t.destination_account_id = p_account_id then  t.amount
        else 0
      end
    )
    from public.financial_transactions t
    where (t.account_id = p_account_id or t.destination_account_id = p_account_id)
      and t.status in ('paid','received')
      and t.is_deleted = false
  ), 0)
  where id = p_account_id;
end;
$$;

create or replace function public.sync_account_balance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('INSERT','UPDATE') then
    if new.account_id is not null then
      perform public.recalculate_account_balance(new.account_id);
    end if;
    if new.destination_account_id is not null then
      perform public.recalculate_account_balance(new.destination_account_id);
    end if;
  end if;

  if tg_op in ('DELETE','UPDATE') then
    if old.account_id is not null and old.account_id is distinct from new.account_id then
      perform public.recalculate_account_balance(old.account_id);
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger sync_account_balance
  after insert or update or delete on public.financial_transactions
  for each row execute procedure public.sync_account_balance();

-- Atualizar total recebido por cliente
create or replace function public.sync_client_total()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_client_id uuid;
begin
  v_client_id := coalesce(new.client_id, old.client_id);
  if v_client_id is not null then
    update public.clients
    set total_received = coalesce((
      select sum(amount)
      from public.financial_transactions
      where client_id = v_client_id
        and transaction_type = 'income'
        and status = 'received'
        and is_deleted = false
    ), 0)
    where id = v_client_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger sync_client_total
  after insert or update or delete on public.financial_transactions
  for each row execute procedure public.sync_client_total();

-- ============================================================
-- SEED DE DADOS INICIAIS
-- Execute APÓS criar seu primeiro usuário via Auth
-- ============================================================

do $$
declare
  v_user_id             uuid;
  v_company_id          uuid;
  v_acc_nubank          uuid;
  v_acc_inter           uuid;
  v_acc_cash            uuid;
  v_cat_salary          uuid;
  v_cat_client          uuid;
  v_cat_food            uuid;
  v_cat_transport       uuid;
  v_cat_marketing       uuid;
  v_cat_tools           uuid;
  v_cat_taxes           uuid;
  v_cat_prolabore       uuid;
  v_resp_michael        uuid;
  v_resp_ana            uuid;
  v_cc_operacional      uuid;
  v_client_tech         uuid;
  v_client_loja         uuid;
begin
  select id into v_user_id from auth.users order by created_at limit 1;

  if v_user_id is null then
    raise notice 'Nenhum usuário encontrado. Crie uma conta primeiro e execute novamente.';
    return;
  end if;

  -- Empresa
  insert into public.companies (owner_id, name, trade_name, primary_color)
  values (v_user_id, 'Santos Empresa Ltda', 'Santos Co', '#6366f1')
  returning id into v_company_id;

  insert into public.user_company_links (user_id, company_id, role)
  values (v_user_id, v_company_id, 'owner');

  -- Contas bancárias
  insert into public.financial_accounts (user_id, company_id, context_type, name, account_type, institution, initial_balance, current_balance, color)
  values (v_user_id, v_company_id, 'business', 'Nubank PJ', 'digital', 'Nubank', 15000.00, 15000.00, '#8b5cf6')
  returning id into v_acc_nubank;

  insert into public.financial_accounts (user_id, company_id, context_type, name, account_type, institution, initial_balance, current_balance, color)
  values (v_user_id, v_company_id, 'business', 'Inter PJ', 'checking', 'Banco Inter', 8500.00, 8500.00, '#f97316')
  returning id into v_acc_inter;

  insert into public.financial_accounts (user_id, context_type, name, account_type, institution, initial_balance, current_balance, color)
  values (v_user_id, 'personal', 'Caixa Pessoal', 'cash', 'Físico', 2000.00, 2000.00, '#10b981')
  returning id into v_acc_cash;

  -- Categorias de receita
  insert into public.financial_categories (user_id, name, category_type, context_type, color, icon)
  values (v_user_id, 'Salário', 'income', 'personal', '#10b981', 'wallet')
  returning id into v_cat_salary;

  insert into public.financial_categories (user_id, name, category_type, context_type, color, icon)
  values (v_user_id, 'Clientes / Projetos', 'income', 'business', '#6366f1', 'users')
  returning id into v_cat_client;

  insert into public.financial_categories (user_id, name, category_type, context_type, color, icon)
  values (v_user_id, 'Outras Receitas', 'income', 'both', '#0ea5e9', 'plus-circle');

  -- Categorias de despesa
  insert into public.financial_categories (user_id, name, category_type, context_type, color, icon)
  values (v_user_id, 'Alimentação', 'expense', 'both', '#f59e0b', 'utensils')
  returning id into v_cat_food;

  insert into public.financial_categories (user_id, name, category_type, context_type, color, icon)
  values (v_user_id, 'Combustível / Transporte', 'expense', 'both', '#ef4444', 'car')
  returning id into v_cat_transport;

  insert into public.financial_categories (user_id, name, category_type, context_type, color, icon)
  values (v_user_id, 'Marketing', 'expense', 'business', '#8b5cf6', 'trending-up')
  returning id into v_cat_marketing;

  insert into public.financial_categories (user_id, name, category_type, context_type, color, icon)
  values (v_user_id, 'Ferramentas / SaaS', 'expense', 'business', '#0ea5e9', 'tool')
  returning id into v_cat_tools;

  insert into public.financial_categories (user_id, name, category_type, context_type, color, icon)
  values (v_user_id, 'Impostos', 'expense', 'business', '#dc2626', 'file-text')
  returning id into v_cat_taxes;

  insert into public.financial_categories (user_id, name, category_type, context_type, color, icon)
  values (v_user_id, 'Pró-labore', 'expense', 'business', '#7c3aed', 'briefcase')
  returning id into v_cat_prolabore;

  insert into public.financial_categories (user_id, name, category_type, context_type, color)
  values
    (v_user_id, 'Assinaturas',   'expense', 'both',     '#06b6d4'),
    (v_user_id, 'Saúde',         'expense', 'personal', '#ec4899'),
    (v_user_id, 'Educação',      'expense', 'both',     '#84cc16'),
    (v_user_id, 'Moradia',       'expense', 'personal', '#a78bfa'),
    (v_user_id, 'Lazer',         'expense', 'personal', '#fb923c'),
    (v_user_id, 'Fornecedores',  'expense', 'business', '#64748b'),
    (v_user_id, 'Infraestrutura','expense', 'business', '#475569');

  -- Responsáveis
  insert into public.people_responsible (user_id, name, person_type, color)
  values (v_user_id, 'Michael Santos', 'partner', '#6366f1')
  returning id into v_resp_michael;

  insert into public.people_responsible (user_id, name, person_type, color)
  values (v_user_id, 'Ana Beatriz Santos', 'partner', '#ec4899')
  returning id into v_resp_ana;

  -- Centros de custo
  insert into public.cost_centers (user_id, company_id, name, color)
  values
    (v_user_id, v_company_id, 'Operacional',   '#6366f1'),
    (v_user_id, v_company_id, 'Comercial',     '#f59e0b'),
    (v_user_id, v_company_id, 'Administrativo','#10b981'),
    (v_user_id, v_company_id, 'TI',            '#0ea5e9')
  returning id into v_cc_operacional;

  -- Clientes
  insert into public.clients (user_id, company_id, name, client_type, phone, email, is_recurring, default_amount, due_day, service_description, status)
  values (v_user_id, v_company_id, 'Tech Solutions Ltda', 'company', '(11) 99999-0001', 'financeiro@techsolutions.com', true, 3500.00, 10, 'Consultoria mensal em TI', 'active')
  returning id into v_client_tech;

  insert into public.clients (user_id, company_id, name, client_type, phone, email, is_recurring, default_amount, due_day, service_description, status)
  values (v_user_id, v_company_id, 'Loja Central ME', 'company', '(11) 98888-0002', 'admin@lojacentral.com', true, 1800.00, 15, 'Gestão de redes sociais', 'active')
  returning id into v_client_loja;

  insert into public.clients (user_id, company_id, name, client_type, phone, email, is_recurring, status)
  values (v_user_id, v_company_id, 'João Pereira', 'individual', '(11) 97777-0003', 'joao@email.com', false, 'active');

  -- Transações de exemplo (receitas)
  insert into public.financial_transactions
    (user_id, company_id, context_type, transaction_type, status, description, amount, competency_date, settlement_date, account_id, category_id, client_id, responsible_person_id, created_by)
  values
    (v_user_id, v_company_id, 'business', 'income', 'received', 'Consultoria Tech Solutions — Março', 3500.00, current_date - 40, current_date - 40, v_acc_nubank, v_cat_client, v_client_tech, v_resp_michael, v_user_id),
    (v_user_id, v_company_id, 'business', 'income', 'received', 'Gestão Social Loja Central — Março', 1800.00, current_date - 35, current_date - 35, v_acc_nubank, v_cat_client, v_client_loja, v_resp_ana,    v_user_id),
    (v_user_id, v_company_id, 'business', 'income', 'received', 'Consultoria Tech Solutions — Abril', 3500.00, current_date - 10, current_date - 10, v_acc_nubank, v_cat_client, v_client_tech, v_resp_michael, v_user_id),
    (v_user_id, v_company_id, 'business', 'income', 'received', 'Gestão Social Loja Central — Abril', 1800.00, current_date -  5, current_date -  5, v_acc_nubank, v_cat_client, v_client_loja, v_resp_ana,    v_user_id),
    (v_user_id, null,         'personal', 'income', 'received', 'Salário — Abril',                    5000.00, current_date - 15, current_date - 15, v_acc_cash,   v_cat_salary, null,           v_resp_michael, v_user_id),
    (v_user_id, v_company_id, 'business', 'income', 'pending',  'Consultoria Tech Solutions — Maio',  3500.00, current_date + 10, null,               v_acc_nubank, v_cat_client, v_client_tech, v_resp_michael, v_user_id),
    (v_user_id, v_company_id, 'business', 'income', 'pending',  'Gestão Social Loja Central — Maio',  1800.00, current_date + 15, null,               v_acc_nubank, v_cat_client, v_client_loja, v_resp_ana,    v_user_id);

  -- Transações de exemplo (despesas)
  insert into public.financial_transactions
    (user_id, company_id, context_type, transaction_type, status, description, amount, competency_date, settlement_date, due_date, account_id, category_id, responsible_person_id, created_by)
  values
    (v_user_id, v_company_id, 'business', 'expense', 'paid',    'Pró-labore Michael — Abril',    3000.00, current_date - 20, current_date - 20, current_date - 20, v_acc_nubank, v_cat_prolabore,  v_resp_michael, v_user_id),
    (v_user_id, v_company_id, 'business', 'expense', 'paid',    'Pró-labore Ana — Abril',        2500.00, current_date - 20, current_date - 20, current_date - 20, v_acc_nubank, v_cat_prolabore,  v_resp_ana,     v_user_id),
    (v_user_id, v_company_id, 'business', 'expense', 'paid',    'Google Ads — Abril',             800.00, current_date -  8, current_date -  8, current_date -  8, v_acc_inter,  v_cat_marketing,  v_resp_michael, v_user_id),
    (v_user_id, v_company_id, 'business', 'expense', 'paid',    'Adobe Creative Cloud',           249.90, current_date - 12, current_date - 12, current_date - 12, v_acc_inter,  v_cat_tools,      v_resp_ana,     v_user_id),
    (v_user_id, v_company_id, 'business', 'expense', 'paid',    'GitHub Team',                    105.00, current_date - 12, current_date - 12, current_date - 12, v_acc_inter,  v_cat_tools,      v_resp_michael, v_user_id),
    (v_user_id, null,         'personal', 'expense', 'paid',    'Supermercado',                   380.00, current_date -  3, current_date -  3, current_date -  3, v_acc_cash,   v_cat_food,       v_resp_michael, v_user_id),
    (v_user_id, null,         'personal', 'expense', 'paid',    'Combustível',                    195.00, current_date -  7, current_date -  7, current_date -  7, v_acc_cash,   v_cat_transport,  v_resp_ana,     v_user_id),
    (v_user_id, v_company_id, 'business', 'expense', 'pending', 'DAS MEI — Maio',                  71.60, current_date +  5, null,               current_date +  5, v_acc_nubank, v_cat_taxes,      v_resp_michael, v_user_id),
    (v_user_id, v_company_id, 'business', 'expense', 'overdue', 'Digital Ocean — Abril',          120.00, current_date -  2, null,               current_date -  2, v_acc_inter,  v_cat_tools,      v_resp_michael, v_user_id),
    (v_user_id, null,         'personal', 'expense', 'pending', 'Plano de Saúde — Maio',          420.00, current_date +  8, null,               current_date +  8, v_acc_cash,   null,             v_resp_michael, v_user_id),
    (v_user_id, v_company_id, 'business', 'expense', 'pending', 'Pró-labore Michael — Maio',     3000.00, current_date + 10, null,               current_date + 10, v_acc_nubank, v_cat_prolabore,  v_resp_michael, v_user_id),
    (v_user_id, v_company_id, 'business', 'expense', 'pending', 'Pró-labore Ana — Maio',         2500.00, current_date + 10, null,               current_date + 10, v_acc_nubank, v_cat_prolabore,  v_resp_ana,     v_user_id);

  raise notice 'Seed concluído para user_id = %', v_user_id;
end;
$$;
