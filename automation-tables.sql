-- ============================================================
-- AUTOMATION TABLES — FinanceHub
-- Execute no Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- automation_rules: configuração de cada automação
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL,
  name                    TEXT NOT NULL,
  automation_type         TEXT NOT NULL CHECK (automation_type IN (
                            'daily_summary','weekly_summary','due_alerts','command_parser'
                          )),
  enabled                 BOOLEAN DEFAULT FALSE,
  channel                 TEXT DEFAULT 'whatsapp',
  destination_group_jid   TEXT,
  destination_group_name  TEXT,
  timezone                TEXT DEFAULT 'America/Sao_Paulo',
  frequency               TEXT DEFAULT 'daily' CHECK (frequency IN (
                            'manual','daily','weekly','monthly','custom'
                          )),
  scheduled_time          TEXT DEFAULT '20:00',        -- HH:MM
  scheduled_day_of_week   INTEGER,                     -- 0=Dom…6=Sáb (para semanal)
  scheduled_day_of_month  INTEGER,                     -- 1-31 (para mensal)
  config_json             JSONB DEFAULT '{}',
  next_run_at             TIMESTAMPTZ,
  last_run_at             TIMESTAMPTZ,
  last_status             TEXT CHECK (last_status IN ('success','error','running')),
  last_error              TEXT,
  run_count               INTEGER DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- automation_runs: histórico de execuções
CREATE TABLE IF NOT EXISTS public.automation_runs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id    UUID REFERENCES public.automation_rules(id) ON DELETE CASCADE NOT NULL,
  user_id          UUID NOT NULL,
  trigger_source   TEXT DEFAULT 'manual' CHECK (trigger_source IN ('manual','scheduler','api')),
  status           TEXT NOT NULL CHECK (status IN ('running','success','error')),
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  finished_at      TIMESTAMPTZ,
  duration_ms      INTEGER,
  payload_summary  TEXT,
  response_summary TEXT,
  error_message    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Desabilitar RLS (o app usa autenticação local, não Supabase Auth) ───
ALTER TABLE public.automation_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs  DISABLE ROW LEVEL SECURITY;

-- ─── Índices ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_automation_rules_user     ON public.automation_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_enabled  ON public.automation_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_automation_rules_type     ON public.automation_rules(automation_type);
CREATE INDEX IF NOT EXISTS idx_automation_rules_next_run ON public.automation_rules(next_run_at);
CREATE INDEX IF NOT EXISTS idx_automation_runs_rule      ON public.automation_runs(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_status    ON public.automation_runs(status);
CREATE INDEX IF NOT EXISTS idx_automation_runs_created   ON public.automation_runs(created_at DESC);

-- ─── Trigger updated_at ───────────────────────────────────────────────────
-- (reutiliza a função set_updated_at() já existente no schema.sql)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_automation_rules'
  ) THEN
    CREATE TRIGGER set_updated_at_automation_rules
      BEFORE UPDATE ON public.automation_rules
      FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
END;
$$;
