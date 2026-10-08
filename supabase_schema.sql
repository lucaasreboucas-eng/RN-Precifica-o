-- ============================================================================
-- RN PRECIFICAÇÃO - SCRIPT DE CRIAÇÃO DAS TABELAS NO SUPABASE
-- Execute este script no "SQL Editor" do painel do seu projeto Supabase
-- ============================================================================

-- 1. Tabela de Perfis de Acesso (profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Usuários / Colaboradores (managed_users)
CREATE TABLE IF NOT EXISTS public.managed_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  profile_id TEXT REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'bloqueado')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Orçamentos (orcamentos)
CREATE TABLE IF NOT EXISTS public.orcamentos (
  id TEXT PRIMARY KEY,
  os_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  date TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pendente',
  parametros JSONB NOT NULL DEFAULT '{}'::jsonb,
  itens JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
  custo_total NUMERIC(15, 2) DEFAULT 0,
  base NUMERIC(15, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- POLÍTICAS DE ACESSO (RLS - Row Level Security)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.managed_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;

-- Permite leitura e escrita para a aplicação (anon / authenticated)
DROP POLICY IF EXISTS "Acesso completo profiles" ON public.profiles;
CREATE POLICY "Acesso completo profiles" ON public.profiles
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso completo managed_users" ON public.managed_users;
CREATE POLICY "Acesso completo managed_users" ON public.managed_users
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso completo orcamentos" ON public.orcamentos;
CREATE POLICY "Acesso completo orcamentos" ON public.orcamentos
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- DADOS INICIAIS PADRÃO (Perfil e Administrador Geral)
-- ============================================================================
DELETE FROM public.orcamentos WHERE id IN ('orc-1', 'orc-2', 'orc-3');
DELETE FROM public.managed_users WHERE id IN ('user-1', 'user-2');
DELETE FROM public.profiles WHERE id = 'perfil-orcamentista';

INSERT INTO public.profiles (id, name, description, permissions, is_system)
VALUES
  (
    'perfil-admin',
    'Administrador Geral',
    'Acesso total a todas as abas e sub-abas.',
    '["gestao-precos-orcamentos", "configuracoes-perfis", "configuracoes-usuarios"]'::jsonb,
    true
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.managed_users (id, name, email, password, profile_id, status)
VALUES
  (
    'user-adm',
    'Administrador Geral',
    'adm@rnprecificacao.com.br',
    'adm12345',
    'perfil-admin',
    'ativo'
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  profile_id = EXCLUDED.profile_id,
  status = EXCLUDED.status;
