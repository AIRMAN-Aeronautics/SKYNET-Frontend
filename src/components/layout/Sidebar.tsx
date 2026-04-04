import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Plane, PlaneTakeoff, CalendarDays, Wrench,
  ShieldCheck, DollarSign, Users, LifeBuoy,
  GraduationCap, BarChart3, Settings, UserSquare2, BookUser,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  permission?: string;
  anyOf?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard,  permission: 'dashboard:read' },
  { to: '/dispatch',     label: 'Dispatch',     icon: Plane,            permission: 'dispatch:read' },
  { to: '/aircraft-availability', label: 'Aircraft Availability', icon: PlaneTakeoff, permission: 'aircraft_availability:read' },
  { to: '/roster',       label: 'Roster',       icon: CalendarDays,     permission: 'roster:read' },
  { to: '/students',     label: 'Students',     icon: BookUser,         permission: 'students:read' },
  { to: '/instructors',  label: 'Instructors',  icon: UserSquare2,      permission: 'instructors:read' },
  { to: '/fleet',        label: 'Fleet',        icon: Wrench,           permission: 'fleet:read' },
  { to: '/compliance',   label: 'Compliance',   icon: ShieldCheck,      permission: 'compliance:read' },
  { to: '/finance',      label: 'Finance',      icon: DollarSign,       permission: 'finance:read' },
  { to: '/crm',          label: 'CRM',          icon: Users,            permission: 'crm:read' },
  { to: '/support',      label: 'Support',      icon: LifeBuoy,         permission: 'support:read' },
  { to: '/training',     label: 'Training',     icon: GraduationCap,    permission: 'training:read' },
  { to: '/reports',      label: 'Reports',      icon: BarChart3,        permission: 'reports:read' },
  { to: '/admin/settings', label: 'Admin',        icon: Settings,         anyOf: ['admin:roles_read', 'admin:users_read', 'admin:tenant_settings'] },
];

export function Sidebar() {
  const { user, hasPermission, hasAnyPermission } = useAuth();

  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.permission) return hasPermission(item.permission);
    if (item.anyOf) return hasAnyPermission(item.anyOf);
    return true;
  });

  return (
    <aside className="flex w-60 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-lg font-bold text-primary">Skynet Academy</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors hover:bg-accent
              ${isActive ? 'bg-accent text-primary' : 'text-muted-foreground'}`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      {user && (
        <div className="border-t p-4">
          <p className="truncate text-sm font-medium">{user.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {user.roles.map(r => r.name).join(', ') || user.role}
          </p>
        </div>
      )}
    </aside>
  );
}
