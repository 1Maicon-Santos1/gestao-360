import { useLocation } from 'react-router-dom'
import { Menu, Bell, LogOut, Settings, User, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/contexts/AuthContext'
import { usePWAInstall } from '@/hooks/usePWAInstall'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/lancamentos': 'Lançamentos',
  '/contas-a-pagar': 'Contas a Pagar',
  '/contas-a-receber': 'Contas a Receber',
  '/fluxo-de-caixa': 'Fluxo de Caixa',
  '/contas-cartoes': 'Contas e Cartões',
  '/clientes': 'Clientes',
  '/responsaveis': 'Responsáveis',
  '/categorias': 'Categorias',
  '/centros-de-custo': 'Centros de Custo',
  '/relatorios': 'Relatórios',
  '/integracoes': 'Integrações',
  '/configuracoes': 'Configurações',
}

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const location = useLocation()
  const { signOut } = useAuth()
  const { canInstall, install } = usePWAInstall()
  const title = PAGE_TITLES[location.pathname] ?? 'FinanceHub'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden shrink-0"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Page title */}
      <h1 className="text-lg font-semibold flex-1">{title}</h1>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Install PWA button */}
        {canInstall && (
          <Button
            variant="outline"
            size="sm"
            onClick={install}
            className="hidden sm:flex items-center gap-2 text-primary border-primary/30 hover:bg-primary/5"
          >
            <Download className="h-4 w-4" />
            <span className="hidden md:inline">Instalar App</span>
          </Button>
        )}

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  FH
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48" align="end" forceMount>
            <DropdownMenuItem asChild>
              <a href="/configuracoes" className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                Perfil
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/configuracoes" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                Configurações
              </a>
            </DropdownMenuItem>
            {canInstall && (
              <DropdownMenuItem onClick={install} className="flex items-center gap-2 cursor-pointer">
                <Download className="h-4 w-4" />
                Instalar App
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
