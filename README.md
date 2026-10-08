# RN Precificação

Sistema moderno de cálculo e gestão de orçamentos e precificação para manutenção de frotas e serviços industriais.

---

## 🛠️ Tecnologias & Arquitetura

- **Frontend**: React 19 + TypeScript + Vite
- **Estilização**: Tailwind CSS v4 + Design System customizado (Paleta Ouro Nobre & Azul Navy)
- **Autenticação & Banco de Dados**: Supabase (`@supabase/supabase-js`)
- **Ícones**: Lucide React
- **Hospedagem & Deploy**: Vercel / Cloud Run
- **Controle de Versão**: Git & GitHub

---

## 🎨 Identidade Visual (Design System)

Baseada no emblema metálico RN:
- **Cores Primárias**: Azul Navy Profundo (`#080C14`, `#0D1526`, `#0F1D38`)
- **Cores Secundárias / Destaque**: Ouro Metálico (`#D4AF37`, `#F59E0B`, `#ECC863`) e Prata/Chrome (`#E2E8F0`, `#94A3B8`)
- **Tipografia**: *Plus Jakarta Sans* para legibilidade de dados corporativos e *Rajdhani* para títulos e detalhes de engenharia.
- **Componentes**: `Button`, `Input`, `Label`, `Card`, `Modal`, `Alert`, `Spinner`, `Logo`, `Header`, `Sidebar`, `AppLayout`, `AuthLayout`.

---

## 🚀 Como Executar Localmente

### 1. Clonar o repositório
```bash
git clone https://github.com/seu-usuario/rn-precificacao.git
cd rn-precificacao
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
Copie o arquivo de exemplo:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais do Supabase:
```env
VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
VITE_SUPABASE_ANON_KEY="sua-chave-anonima-publica"
```

> **Nota**: Se você não configurar as variáveis imediatamente, o aplicativo funcionará no **Modo Demonstração**, permitindo testar toda a navegação e o design do sistema.

### 4. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```
O sistema estará disponível em: `http://localhost:3000`.

---

## ☁️ Deploy na Vercel

1. Envie o projeto para o seu repositório no **GitHub**:
   ```bash
   git init
   git add .
   git commit -m "feat: estrutura inicial e tela de login RN Precificação"
   git branch -M main
   git remote add origin https://github.com/seu-usuario/rn-precificacao.git
   git push -u origin main
   ```

2. No painel da **Vercel** (`https://vercel.com`):
   - Clique em **"Add New Project"** e selecione o repositório GitHub `rn-precificacao`.
   - Em **Environment Variables**, cadastre:
     - `VITE_SUPABASE_URL`: sua URL do projeto Supabase.
     - `VITE_SUPABASE_ANON_KEY`: sua chave pública anon do Supabase.
   - Clique em **"Deploy"**.

---

## 🔒 Segurança

- Nenhuma chave de API ou credencial sensível é colocada diretamente no código-fonte.
- O arquivo `.env` está devidamente listado no `.gitignore`.
- Sessões são gerenciadas de forma segura com suporte a renovação automática de token no Supabase.

---

## 📅 Roadmap de Desenvolvimento

- [x] **Fase 1**: Estrutura do projeto, Design System, Tela de Login e Autenticação Supabase.
- [ ] **Fase 2**: Tabelas no Supabase (Orçamentos, Frotas, Peças e Serviços).
- [ ] **Fase 3**: Motor de cálculo de margem, BDI e precificação em lote.
- [ ] **Fase 4**: Geração e exportação de orçamentos em PDF com assinatura digital.
