import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, UserCheck, ShoppingBag, Calendar,
  MessageSquareWarning, CreditCard, Scissors, LogOut, Palette, Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

const NAV = [
  { to: '/',             icon: LayoutDashboard,       label: 'Dashboard' },
  { to: '/users',        icon: Users,                 label: 'Utilisateurs' },
  { to: '/artisans',     icon: UserCheck,             label: 'Artisans' },
  { to: '/orders',       icon: ShoppingBag,           label: 'Commandes' },
  { to: '/catalogue',    icon: Palette,               label: 'Catalogue' },
  { to: '/appointments', icon: Calendar,              label: 'Rendez-vous' },
  { to: '/payments',     icon: CreditCard,            label: 'Paiements' },
  { to: '/claims',       icon: MessageSquareWarning,  label: 'Réclamations' },
  { to: '/reviews',      icon: Star,                  label: 'Avis' },
  { to: '/metiers',      icon: Scissors,              label: 'Métiers' },
]

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col bg-white border-r border-surface-border">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-black tracking-tighter">M</span>
          </div>
          <div>
            <p className="font-display font-bold text-ink text-sm leading-tight">MODÈLEPRO</p>
            <p className="text-ink-muted text-[10px] uppercase tracking-widest">Back-office</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-none space-y-0.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn(
              'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-brand-100 text-brand-700'
                : 'text-ink-sub hover:bg-surface-muted hover:text-ink'
            )}
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={cn('shrink-0 transition-colors', isActive ? 'text-brand-600' : 'text-ink-muted group-hover:text-ink-sub')} />
                <span>{label}</span>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-600"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-surface-border">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-brand-200 flex items-center justify-center shrink-0">
            <span className="text-brand-700 text-xs font-bold">
              {user?.prenom?.[0]}{user?.nom?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-ink truncate">{user?.prenom} {user?.nom}</p>
            <p className="text-[10px] text-ink-muted">Admin</p>
          </div>
          <button onClick={handleLogout} className="p-1.5 rounded-lg text-ink-muted hover:text-danger hover:bg-red-50 transition-colors" title="Déconnexion">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
