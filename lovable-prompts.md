# Prompts Lovable — Sistema de Gestão Financeira
## Como usar: execute os prompts em ordem, um por vez. Aguarde cada fase terminar antes de ir para a próxima.

---

## FASE 1 — Fundação: Auth, banco e estrutura do projeto

```
Crie uma aplicação web de gestão financeira pessoal e empresarial chamada "FinanceApp" usando React + TypeScript + Tailwind + shadcn/ui + Supabase.

STACK OBRIGATÓRIA:
- React + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Auth + Postgres + Storage)
- Recharts para gráficos
- date-fns para datas
- react-hook-form + zod para formulários
- react-query (TanStack Query) para cache e estado do servidor

ESTRUTURA DE PASTAS:
src/
  components/
    ui/           ← shadcn components
    layout/       ← Sidebar, Header, MobileNav
    shared/       ← StatusBadge, CurrencyDisplay, DateDisplay, EmptyState, ConfirmDialog
  pages/          ← uma pasta por módulo
  hooks/          ← useTransactions, useClients, useAccounts, etc.
  lib/            ← supabase.ts, utils.ts, formatters.ts
  types/          ← database.types.ts (gerado pelo Supabase)

AUTH:
- Tela de login com email + senha
- Tela de cadastro
- Rota protegida (redirect para /login se não autenticado)
- Após login, redirecionar para /dashboard

LAYOUT:
- Sidebar fixa no desktop com logo, navegação e avatar do usuário no rodapé
- Bottom navigation no mobile (5 itens principais)
- Header com título da página atual, busca global e botão "+ Novo"
- Sidebar colapsável no desktop com ícone + texto

NAVEGAÇÃO (sidebar):
- Dashboard            /dashboard
- Lançamentos          /lancamentos
- Contas a Pagar       /contas-a-pagar
- Contas a Receber     /contas-a-receber
- Fluxo de Caixa       /fluxo-de-caixa
- Contas e Cartões     /contas-cartoes
- Clientes             /clientes
- Responsáveis         /responsaveis
- Categorias           /categorias
- Centros de Custo     /centros-de-custo
- Relatórios           /relatorios
- Integrações          /integracoes
- Configurações        /configuracoes

DESIGN SYSTEM:
- Tema baseado em slate/zinc neutros com accent indigo (#6366f1)
- Bordas suaves (rounded-xl nos cards)
- Sombras leves (shadow-sm)
- Tipografia clara com hierarquia bem definida
- Status badges coloridos: verde (recebido/pago), amarelo (pendente), vermelho (atrasado/vencido), cinza (cancelado)
- Dark mode com classe "dark" no html — preparado mas não obrigatório nesta fase

BANCO:
O Supabase já tem o schema completo aplicado com as tabelas:
profiles, companies, user_company_links, financial_accounts, credit_cards,
financial_categories, financial_subcategories, cost_centers, people_responsible,
clients, suppliers, recurring_rules, financial_transactions, transfer_links,
transaction_attachments, audit_logs, integration_settings, whatsapp_instances,
whatsapp_groups, whatsapp_message_logs, whatsapp_command_logs,
google_calendar_settings, automation_logs.

Todas as tabelas têm RLS ativado. O usuário só acessa seus próprios dados.

TIPOS TYPESCRIPT:
Gerar tipos para todas as tabelas e criar helpers de formatação:
- formatCurrency(value, currency = 'BRL') → "R$ 1.234,56"
- formatDate(date) → "14/04/2026"
- getStatusLabel(status) → "Pendente" | "Pago" | "Recebido" | "Atrasado" | "Cancelado"
- getStatusColor(status) → classe Tailwind correspondente

RESULTADO ESPERADO DESTA FASE:
- App roda sem erros
- Auth funcionando (login, cadastro, logout)
- Sidebar com navegação funcional
- Todas as rotas criadas (podem ser páginas placeholder por ora)
- Supabase conectado e autenticação integrada
- Tipos TypeScript gerados
- Design system base aplicado
```

---

## FASE 2 — Dashboard + Lançamentos (módulos centrais)

```
Continuando o projeto FinanceApp. Agora implemente o Dashboard completo e o módulo de Lançamentos com CRUD total.

DASHBOARD (/dashboard):

Cards de resumo no topo (2 linhas de 4 cards cada):
Linha 1:
- Saldo Consolidado (soma de todas as contas ativas)
- Receita do Mês (entradas com status received no mês atual)
- Despesa do Mês (saídas com status paid no mês atual)
- Lucro / Prejuízo do Mês (receita - despesa)

Linha 2:
- Total a Receber (pendentes com due_date futuro, tipo income)
- Total a Pagar (pendentes com due_date futuro, tipo expense)
- Saldo Pessoal (contas context_type = personal)
- Saldo Empresa (contas context_type = business)

Gráficos (seção central):
- Gráfico de barras: Receitas vs Despesas dos últimos 6 meses (Recharts BarChart)
- Gráfico de linhas: Evolução do saldo ao longo do mês atual (Recharts LineChart)
- Gráfico de pizza: Distribuição por categoria (top 5 + "Outros")
- Gráfico de barras horizontal: Gastos por responsável

Seção de alertas e ações rápidas:
- Lista "Vencendo esta semana" (bills pendentes com due_date nos próximos 7 dias)
- Lista "Em atraso" (transações com status overdue)
- Lista "Próximos recebimentos" (income pendentes próximos)
- Botões de ação rápida: "+ Lançamento", "+ Conta a Pagar", "+ Conta a Receber", "+ Cliente"

Seletor de período no topo do dashboard (mês anterior | mês atual | personalizado).

MÓDULO DE LANÇAMENTOS (/lancamentos):

Filtros no topo da página:
- Date range picker (período de competência)
- Tipo: Todos | Entrada | Saída | Transferência
- Contexto: Todos | Pessoal | Empresa
- Status: Todos | Pendente | Pago | Recebido | Atrasado | Cancelado
- Responsável: dropdown com lista de people_responsible
- Categoria: dropdown com lista de financial_categories
- Busca por descrição (input com debounce 300ms)

Cards de resumo acima da tabela:
- Total de entradas no período filtrado
- Total de saídas no período filtrado
- Saldo do período

Tabela de lançamentos (desktop):
Colunas: Data | Descrição | Tipo | Categoria | Conta | Responsável | Valor | Status | Ações
- Ordenação por coluna
- Linha com cor de fundo sutil por status (atrasado = vermelho suave)
- Ícone de anexo se attachment_count > 0
- Menu de 3 pontos por linha com: Editar | Duplicar | Marcar como Pago/Recebido | Excluir

Cards no mobile (um card por lançamento com as informações principais).

FAB (Floating Action Button) no mobile: botão + fixo no canto inferior direito.

MODAL / SHEET DE CRIAÇÃO E EDIÇÃO:
Usar Sheet do shadcn (painel lateral) com formulário completo:
- Tipo: Entrada | Saída | Transferência (tabs ou segmented control)
- Contexto: Pessoal | Empresa
- Descrição (obrigatório)
- Valor em BRL com máscara monetária
- Data de competência (date picker)
- Data de vencimento
- Data de pagamento/recebimento
- Status
- Conta (select com contas ativas)
- Conta destino (só aparece se Transferência)
- Cartão (select com cartões ativos, opcional)
- Categoria (select agrupado por tipo)
- Subcategoria (aparece após selecionar categoria)
- Responsável (select com avatar/cor)
- Cliente (select, opcional)
- Fornecedor (select, opcional)
- Centro de custo (select, opcional)
- Forma de pagamento
- Observações (textarea)
- Tags (input de tags)
- Parcelamento: número de parcelas (1 a 48)
- Recorrência: select de frequência

VALIDAÇÃO:
- Descrição obrigatória
- Valor > 0 obrigatório
- Data de competência obrigatória
- Se transferência: conta destino obrigatória e diferente da origem
- Zod schema para tudo

AÇÕES:
- Criar: POST para Supabase, invalidar cache, toast de sucesso
- Editar: PATCH, manter histórico de updated_by e updated_at
- Duplicar: cria nova transação com mesmos dados (exceto datas e status = pending)
- Excluir: dialog de confirmação, soft delete (is_deleted = true)
- Marcar como pago/recebido: atualiza status e settlement_date para hoje

RESULTADO ESPERADO:
- Dashboard com dados reais do Supabase
- Lançamentos com CRUD 100% funcional
- Filtros funcionando
- Skeleton loading em todos os estados de carregamento
- Empty states com CTA claro quando não há dados
- Toasts de sucesso e erro em todas as ações
```

---

## FASE 3 — Contas a Pagar, Contas a Receber, Fluxo de Caixa, Contas e Cartões

```
Continuando o FinanceApp. Implemente os módulos: Contas a Pagar, Contas a Receber, Fluxo de Caixa e Contas & Cartões.

CONTAS A PAGAR (/contas-a-pagar):

Cards de resumo no topo:
- Total a pagar (pendentes)
- Vencendo hoje
- Em atraso (overdue)
- Pago no mês

Filtros:
- Período de vencimento (date range)
- Status: Todos | Pendente | Pago | Atrasado | Cancelado
- Contexto: Pessoal | Empresa
- Conta: dropdown
- Categoria: dropdown
- Responsável: dropdown

Tabela com destaque visual:
- Linha vermelha suave: vencidas (due_date < hoje e status = pending)
- Linha amarela suave: vencendo hoje
- Linha normal: futuras

Ações por linha:
- Marcar como pago (abre mini-modal para confirmar data de pagamento e conta)
- Editar
- Duplicar
- Excluir

Botão "+ Nova Conta a Pagar" abre Sheet com campos:
descrição, valor, vencimento, status, categoria, conta, responsável, contexto, observações, recorrência.

CONTAS A RECEBER (/contas-a-receber):

Cards de resumo:
- Total a receber
- Recebido no mês
- Em atraso
- Vencendo esta semana

Filtros:
- Período
- Status: Pendente | Recebido | Atrasado | Cancelado
- Cliente: dropdown
- Conta: dropdown
- Recorrente: sim | não | todos

Tabela com colunas: Data prev. | Descrição | Cliente | Valor | Status | Recorrente | Ações.

Ações: Marcar como recebido | Editar | Duplicar | Excluir.

Botão "+ Nova Conta a Receber" com campos: descrição, valor, vencimento, cliente, conta, categoria, responsável, contexto, recorrente, observações.

FLUXO DE CAIXA (/fluxo-de-caixa):

Seletor de visualização: Diária | Semanal | Mensal.

Cards no topo:
- Saldo inicial do período
- Total de entradas previstas
- Total de saídas previstas
- Saldo final projetado

Gráfico de área (Recharts AreaChart) mostrando saldo projetado ao longo do tempo.

Tabela cronológica com colunas: Data | Descrição | Tipo | Conta | Valor | Saldo Acumulado.
Agrupar por dia quando visualização diária.

Filtros: Conta | Contexto | Período.

Calcular saldo projetado somando saldo atual das contas + entradas pendentes - saídas pendentes, ordenadas por due_date.

CONTAS E CARTÕES (/contas-cartoes):

Aba 1 — Contas bancárias:
Grid de cards (2-3 colunas) com:
- Nome da conta
- Ícone da instituição
- Tipo (digital, corrente, poupança, caixa)
- Saldo atual (grande, com cor verde/vermelho)
- Badge de contexto (Pessoal / Empresa)
- Botões: Editar | Desativar | Excluir

Botão "+ Nova Conta" abre Sheet:
Campos: nome, tipo, instituição, contexto, saldo inicial, cor, observações.

Aba 2 — Cartões de crédito:
Grid de cards estilizados (visual de cartão de crédito) com:
- Nome do cartão
- Instituição
- Limite total e limite disponível (barra de progresso)
- Dia de fechamento | Dia de vencimento
- Melhor dia de compra
- Badge de contexto
- Botões: Editar | Desativar | Excluir

Botão "+ Novo Cartão" abre Sheet:
Campos: nome, instituição, contexto, limite, dia de fechamento, dia de vencimento, melhor dia de compra, conta vinculada, cor.

Para ambas as abas:
- Toggle ativo/inativo sem excluir
- Confirmação ao excluir
- Skeleton loading
- Empty state com CTA

RESULTADO ESPERADO:
- 4 módulos 100% funcionais com CRUD
- Dados reais do Supabase
- Feedback visual claro em todas as ações
- Mobile responsivo
- Formulários com validação Zod
```

---

## FASE 4 — Clientes, Responsáveis, Categorias, Centros de Custo, Relatórios, Integrações, Configurações + PWA

```
Fase final do FinanceApp. Implemente os módulos de suporte, relatórios, integrações e converta o app em PWA instalável.

CLIENTES (/clientes):

Cards de resumo: Total de clientes | Ativos | Recorrentes | Total recebido de clientes.

Tabela com colunas: Nome | Tipo | Telefone | Recorrente | Valor Padrão | Total Recebido | Status | Ações.

Busca por nome/email. Filtros: Status | Tipo | Recorrente.

Sheet de criação/edição com campos:
nome, tipo (PF/PJ), documento, telefone, email, recorrente (toggle), valor padrão (se recorrente), dia de vencimento (se recorrente), forma de pagamento, serviço/descrição, origem, status, observações, tags.

Ação "Ver histórico": abre sheet lateral com todas as transações vinculadas ao cliente (income only), com total recebido.

RESPONSÁVEIS (/responsaveis):

Grid de cards com: avatar colorido (iniciais), nome, tipo, total movimentado, badge ativo/inativo.

Sheet: nome, tipo (sócio | colaborador | familiar | outro), cor.

CATEGORIAS (/categorias):

Duas seções: Receitas | Despesas.
Lista com ícone, cor, nome, tipo (fixo/variável), contexto, subcategorias count.

Expansível: ao clicar em categoria, mostrar subcategorias inline.

Sheet de categoria: nome, tipo (receita/despesa), contexto, cor, ícone, fixo.
Sheet de subcategoria: nome, categoria pai, cor.

CENTROS DE CUSTO (/centros-de-custo):

Tabela simples: Nome | Descrição | Cor | Status | Total movimentado | Ações.
Sheet: nome, descrição, cor.

RELATÓRIOS (/relatorios):

Abas: Por Período | Por Categoria | Por Responsável | Por Cliente | Por Conta | Por Centro de Custo.

Cada aba tem:
- Seletor de período
- Cards com totais (receita, despesa, saldo)
- Gráfico relevante (pizza, barras, linhas)
- Tabela detalhada
- Botão "Exportar CSV" (desabilitado visualmente com tooltip "Em breve")

Filtros por contexto em todas as abas.

INTEGRAÇÕES (/integracoes):

Layout em tabs: WhatsApp | Google Agenda | Webhooks | Automações.

TAB WHATSAPP:
Card de status de conexão no topo (ícone + badge: Desconectado | Conectando | Conectado).

Formulário com campos:
- Provider: select (Evolution API | WAHA | outro)
- URL do servidor (api_base_url)
- Nome da instância
- Token da instância (input tipo password, nunca exibir texto completo, máscara ••••••)
- Token admin (mesmo tratamento)
- Webhook URL
- Webhook secret (mesmo tratamento)

Seção "Grupo de destino":
- JID do grupo (formato 120363xxxxxxxxxxxx@g.us, com placeholder explicativo)
- Nome amigável do grupo

Toggles:
- Enviar atualizações automáticas
- Receber e processar comandos

Botões:
- "Salvar Configurações" (desabilitado nesta versão — mostra toast "Disponível em breve via Edge Function")
- "Testar Conexão" (mesmo comportamento por ora)

Banner informativo: "A conexão com WhatsApp será feita via Supabase Edge Function para garantir que seus tokens nunca sejam expostos."

TAB GOOGLE AGENDA:
Formulário: Calendar ID, timezone, duração padrão de eventos.
Toggle: Integração ativa.
Botão "Conectar com Google" (placeholder, toast "Em breve").

TAB WEBHOOKS:
Toggle: webhooks ativos.
Campo URL de callback.
Campo secret.
Botão "Em breve" para testar.

TAB AUTOMAÇÕES:
Lista de automações futuras com toggles (todos desabilitados) e badge "Em breve":
- Resumo diário no WhatsApp
- Resumo semanal no WhatsApp
- Alerta de vencimentos
- Parser de comandos
- Notificação de clientes inadimplentes

CONFIGURAÇÕES (/configuracoes):

Abas: Perfil | Preferências | App | Sobre.

Perfil: nome completo, nome da empresa, email (readonly), avatar (placeholder).
Preferências: moeda padrão, timezone, formato de data, idioma.
App: seção "Instalar App" com instruções e botão de instalação (PWA).

PWA — IMPLEMENTAÇÃO COMPLETA:

1. Criar /public/manifest.webmanifest:
{
  "name": "FinanceApp — Gestão Financeira",
  "short_name": "FinanceApp",
  "description": "Gestão financeira pessoal e empresarial",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#6366f1",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}

2. Criar ícones SVG como fallback para PNG (gerar via canvas ou usar placeholder).

3. Registrar service worker em main.tsx com vite-plugin-pwa ou implementação manual.

4. Cache de assets estáticos com Workbox ou cache manual.

5. Componente <InstallPrompt />:
- Detectar evento beforeinstallprompt
- Mostrar banner discreto no topo da página ou card em Configurações > App
- Botão "Instalar App" que chama prompt.prompt()
- Se iOS: mostrar instrução "Toque em Compartilhar > Adicionar à Tela de Início"
- Após instalação: esconder banner e mostrar mensagem de sucesso

6. Meta tags no index.html para iOS:
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="FinanceApp">
<link rel="apple-touch-icon" href="/icons/icon-192.png">

MELHORIAS GERAIS DE UX (aplicar em todo o app):
- Skeleton loading em TODOS os estados de carregamento (nunca spinner puro)
- Empty states úteis com CTA em todos os módulos
- Toast de sucesso e erro em todas as mutações
- Dialog de confirmação para excluir (com texto do item sendo excluído)
- Persistir filtros ativos no estado local (não precisa ser URL por ora)
- Shortcut: tecla "N" em qualquer tela abre o sheet de novo lançamento
- Command palette (Ctrl+K / Cmd+K): busca global entre transações, clientes e contas

RESULTADO ESPERADO DESTA FASE:
- Todos os módulos funcionais com CRUD
- PWA instalável no Android e iOS (com instrução)
- App completo, sem telas em construção
- UX polida com feedback visual consistente
- Pronto para uso pessoal diário
```

---

## FASE 5 (opcional) — Polimento e dados de produção

```
Revisão final do FinanceApp. Foco em polish, performance e preparação para uso em produção.

1. PERFORMANCE:
- React.lazy + Suspense em todas as rotas (code splitting)
- Memoização com useMemo nos cálculos do dashboard
- Paginação na tabela de lançamentos (20 por página + "Carregar mais" ou paginação)
- Índices aproveitados via queries ordenadas por competency_date desc

2. FORMULÁRIOS:
- Revisar todos os Zod schemas — campos obrigatórios e mensagens de erro em português
- Máscara monetária: ao digitar 1234 mostrar "R$ 12,34", ao copiar/colar tratar o valor corretamente
- Auto-focus no primeiro campo ao abrir sheet
- Fechar sheet com Escape

3. DASHBOARD:
- Tornar todos os cards clicáveis: clicar em "Total a Pagar" navega para /contas-a-pagar com filtro de pendentes aplicado
- Clicar em barra do gráfico de categorias navega para /lancamentos filtrado por aquela categoria
- Adicionar tooltip de contexto em todos os gráficos

4. MOBILE:
- Testar e ajustar bottom navigation (5 itens: Dashboard, Lançamentos, + , Clientes, Configurações)
- FAB centralizado na bottom nav que abre sheet de novo lançamento
- Swipe para fechar sheets
- Gestos nativos onde possível

5. ACESSIBILIDADE:
- aria-labels em botões de ícone
- Focus visible em todos os elementos interativos
- Contraste mínimo AA

6. SEED ADICIONAL:
- Gerar 3 meses de histórico realista (60-80 transações)
- Incluir transferências entre contas
- Incluir lançamentos parcelados (ex.: notebook em 12x)
- Incluir lançamentos recorrentes

7. DOCUMENTAÇÃO INLINE:
- Tooltip explicativo no campo JID do grupo WhatsApp
- Tooltip explicativo no campo best_purchase_day do cartão
- Help text abaixo de campos complexos
```

---

## Notas de execução

**Ordem obrigatória:** Fase 1 → 2 → 3 → 4 → 5 (opcional)

**Antes de executar a Fase 1:**
1. Crie um projeto no Supabase
2. Cole o arquivo `schema.sql` no SQL Editor e execute
3. Crie um bucket público no Supabase Storage chamado `attachments`
4. Copie as credenciais (Project URL e anon key) para as variáveis de ambiente do Lovable

**Variáveis de ambiente necessárias:**
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

**Dica de uso no Lovable:**
- Se o Lovable travar ou parar na metade, use: *"Continue de onde parou, focando em [módulo específico]"*
- Se algo sair errado: *"Reverta apenas [componente X] e refaça seguindo [instrução específica]"*
- Para ajustar algo visual: *"No componente [X], ajuste [Y] para [Z]"*
