-- ============================================================
-- FIX RLS — Execute este arquivo no Supabase SQL Editor
-- Desabilita Row Level Security em todas as tabelas do app.
-- Necessário porque o app usa autenticação local (sem Supabase Auth).
-- ============================================================

ALTER TABLE public.profiles                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_accounts        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_cards              DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_categories      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_subcategories   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers              DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.people_responsible        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_links            DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_attachments   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_rules           DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_company_links        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_settings      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs                DISABLE ROW LEVEL SECURITY;
