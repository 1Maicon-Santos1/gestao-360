import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import PasswordGatePage from '@/pages/auth/PasswordGatePage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import TransactionsPage from '@/pages/transactions/TransactionsPage'
import PayablesPage from '@/pages/payables/PayablesPage'
import ReceivablesPage from '@/pages/receivables/ReceivablesPage'
import CashFlowPage from '@/pages/cashflow/CashFlowPage'
import AccountsPage from '@/pages/accounts/AccountsPage'
import ClientsPage from '@/pages/clients/ClientsPage'
import ResponsiblePage from '@/pages/responsible/ResponsiblePage'
import CategoriesPage from '@/pages/categories/CategoriesPage'
import CostCentersPage from '@/pages/cost-centers/CostCentersPage'
import ReportsPage from '@/pages/reports/ReportsPage'
import IntegrationsPage from '@/pages/integrations/IntegrationsPage'
import SettingsPage from '@/pages/settings/SettingsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/" replace />
  return <>{children}</>
}

function GateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      {/* Password gate */}
      <Route path="/" element={<GateRoute><PasswordGatePage /></GateRoute>} />

      {/* Protected app */}
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="lancamentos" element={<TransactionsPage />} />
        <Route path="contas-a-pagar" element={<PayablesPage />} />
        <Route path="contas-a-receber" element={<ReceivablesPage />} />
        <Route path="fluxo-de-caixa" element={<CashFlowPage />} />
        <Route path="contas-cartoes" element={<AccountsPage />} />
        <Route path="clientes" element={<ClientsPage />} />
        <Route path="responsaveis" element={<ResponsiblePage />} />
        <Route path="categorias" element={<CategoriesPage />} />
        <Route path="centros-de-custo" element={<CostCentersPage />} />
        <Route path="relatorios" element={<ReportsPage />} />
        <Route path="integracoes" element={<IntegrationsPage />} />
        <Route path="configuracoes" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
