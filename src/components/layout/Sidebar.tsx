import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Wallet,
  Users,
  UserCheck,
  Tag,
  FolderKanban,
  FileBarChart,
  Plug,
  Settings,
  ChevronDown,
  DollarSign,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PROFILE_PHOTO_KEY } from '@/pages/settings/SettingsPage'

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Lançamentos',
    href: '/lancamentos',
    icon: ArrowLeftRight,
  },
  {
    label: 'Contas a Pagar',
    href: '/contas-a-pagar',
    icon: TrendingDown,
  },
  {
    label: 'Contas a Receber',
    href: '/contas-a-receber',
    icon: TrendingUp,
  },
  {
    label: 'Fluxo de Caixa',
    href: '/fluxo-de-caixa',
    icon: BarChart3,
  },
  {
    label: 'Contas e Cartões',
    href: '/contas-cartoes',
    icon: Wallet,
  },
]

const managementItems = [
  {
    label: 'Clientes',
    href: '/clientes',
    icon: Users,
  },
  {
    label: 'Responsáveis',
    href: '/responsaveis',
    icon: UserCheck,
  },
  {
    label: 'Categorias',
    href: '/categorias',
    icon: Tag,
  },
  {
    label: 'Centros de Custo',
    href: '/centros-de-custo',
    icon: FolderKanban,
  },
]

const systemItems = [
  {
    label: 'Relatórios',
    href: '/relatorios',
    icon: FileBarChart,
  },
  {
    label: 'Integrações',
    href: '/integracoes',
    icon: Plug,
  },
  {
    label: 'Configurações',
    href: '/configuracoes',
    icon: Settings,
  },
]

interface NavItemProps {
  href: string
  icon: React.ElementType
  label: string
  onClick?: () => void
}

function NavItem({ href, icon: Icon, label, onClick }: NavItemProps) {
  const location = useLocation()
  const isActive = location.pathname === href

  return (
    <NavLink
      to={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </NavLink>
  )
}

interface SidebarProps {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
  const [managementOpen, setManagementOpen] = useState(true)
  const [profilePhoto, setProfilePhoto] = useState<string | null>(
    () => localStorage.getItem(PROFILE_PHOTO_KEY)
  )

  useEffect(() => {
    const handler = () => setProfilePhoto(localStorage.getItem(PROFILE_PHOTO_KEY))
    window.addEventListener('profile-photo-changed', handler)
    return () => window.removeEventListener('profile-photo-changed', handler)
  }, [])

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary overflow-hidden">
          {profilePhoto
            ? <img src={profilePhoto} alt="Logo" className="h-8 w-8 object-cover" />
            : <DollarSign className="h-5 w-5 text-white" />}
        </div>
        <div>
          <p className="text-sm font-bold text-sidebar-foreground">Gestão 360</p>
          <p className="text-xs text-sidebar-foreground/50">Financeiro</p>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        {/* Main navigation */}
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavItem key={item.href} {...item} onClick={onClose} />
          ))}
        </div>

        {/* Management section */}
        <div className="mt-6">
          <button
            onClick={() => setManagementOpen(!managementOpen)}
            className="flex w-full items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40 hover:text-sidebar-foreground/60 transition-colors"
          >
            <span>Cadastros</span>
            <ChevronDown
              className={cn(
                'h-3 w-3 transition-transform duration-200',
                managementOpen ? 'rotate-0' : '-rotate-90',
              )}
            />
          </button>
          {managementOpen && (
            <div className="mt-1 space-y-1">
              {managementItems.map((item) => (
                <NavItem key={item.href} {...item} onClick={onClose} />
              ))}
            </div>
          )}
        </div>

        {/* System section */}
        <div className="mt-6">
          <p className="mb-1 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Sistema
          </p>
          <div className="space-y-1">
            {systemItems.map((item) => (
              <NavItem key={item.href} {...item} onClick={onClose} />
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        <p className="text-center text-xs text-sidebar-foreground/30">Gestão 360 v1.0</p>
      </div>
    </div>
  )
}
