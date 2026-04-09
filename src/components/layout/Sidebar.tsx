import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Ship, Banknote, UsersRound, BarChart3, Settings,
  Plane, ClipboardList, GraduationCap, UserCheck,
  Send, BookOpen, ShieldCheck, LifeBuoy,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  permission?: string;
  anyOf?: string[];
  end?: boolean;
}

const MAIN_NAV: NavItem[] = [
  { to: '/dashboard',      label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard:read',   end: true },
  { to: '/fleet',          label: 'Fleet',     icon: Ship,            permission: 'fleet:read'                  },
  { to: '/finance',        label: 'Finance',   icon: Banknote,        permission: 'finance:read'                },
  { to: '/crm',            label: 'CRM',       icon: UsersRound,      permission: 'crm:read'                    },
  { to: '/reports',        label: 'Reports',   icon: BarChart3,       permission: 'reports:read'                },
  {
    to: '/admin/settings', label: 'Admin',     icon: Settings,
    anyOf: ['admin:roles_read', 'admin:users_read', 'admin:tenant_settings'],
  },
];

const OPS_NAV: NavItem[] = [
  { to: '/aircraft',    label: 'Aircraft',    icon: Plane,         permission: 'fleet:read'       },
  { to: '/roster',      label: 'Roster',      icon: ClipboardList, permission: 'roster:read'      },
  { to: '/students',    label: 'Students',    icon: GraduationCap, permission: 'students:read'    },
  { to: '/instructors', label: 'Instructors', icon: UserCheck,     permission: 'instructors:read' },
  { to: '/dispatch',    label: 'Dispatch',    icon: Send,          permission: 'dispatch:read'    },
  { to: '/training',    label: 'Training',    icon: BookOpen,      permission: 'training:read'    },
  { to: '/compliance',  label: 'Compliance',  icon: ShieldCheck,   permission: 'compliance:read'  },
  { to: '/support',     label: 'Support',     icon: LifeBuoy,      permission: 'support:read'     },
];

function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
  const { hasPermission, hasAnyPermission } = useAuth();

  const visible = items.filter(item => {
    if (item.permission) return hasPermission(item.permission);
    if (item.anyOf)      return hasAnyPermission(item.anyOf);
    return true;
  });

  if (!visible.length) return null;

  return (
    <div>
      <p className="px-4 pt-4 pb-1.5 text-[9px] font-bold tracking-[0.2em] text-slate-600 uppercase select-none">
        {label}
      </p>
      {visible.map(({ to, label: lbl, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `group relative flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-all
             ${isActive
               ? 'border-l-4 border-blue-500 bg-blue-500/10 text-white pl-3'
               : 'border-l-4 border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200 pl-3'
             }`
          }
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          {lbl}
        </NavLink>
      ))}
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="flex w-48 shrink-0 flex-col bg-slate-900 overflow-hidden border-r border-slate-700/50">
      <nav className="flex-1 overflow-y-auto py-1">
        <NavGroup label="Main"       items={MAIN_NAV} />
        <NavGroup label="Operations" items={OPS_NAV}  />
      </nav>
    </aside>
  );
}
