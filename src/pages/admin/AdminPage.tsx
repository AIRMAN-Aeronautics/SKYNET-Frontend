import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, ShieldCheck, Settings } from 'lucide-react';
import { getUsers, getRoles } from '../../lib/api/admin';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  // Redirect to the full admin settings page
  useEffect(() => {
    navigate('/admin/settings', { replace: true });
  }, [navigate]);

  const { data: usersData } = useQuery({
    queryKey: ['admin-users-count'],
    queryFn: () => getUsers({ page: 1, limit: 1 }),
    enabled: hasPermission('admin:users_read'),
  });

  const { data: roles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: getRoles,
    enabled: hasPermission('admin:roles_read'),
  });

  const cards = [
    {
      title: 'User Management',
      description: 'Invite staff, assign roles, activate or deactivate accounts.',
      icon: Users,
      href: '/admin/users',
      count: usersData?.meta.total,
      countLabel: 'total users',
      permission: 'admin:users_read',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Roles & Permissions',
      description: 'Create custom roles and control what each role can access.',
      icon: ShieldCheck,
      href: '/admin/roles',
      count: roles?.length,
      countLabel: 'roles defined',
      permission: 'admin:roles_read',
      color: 'bg-purple-50 text-purple-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Administration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage users, roles, and permissions for your organisation.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.filter(c => hasPermission(c.permission)).map(card => (
          <Link
            key={card.href}
            to={card.href}
            className="group rounded-lg border bg-card p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className={`rounded-lg p-3 ${card.color}`}>
                <card.icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold group-hover:text-primary transition-colors">
                  {card.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
                {card.count !== undefined && (
                  <p className="text-sm font-medium mt-3">
                    <span className="text-foreground">{card.count}</span>{' '}
                    <span className="text-muted-foreground">{card.countLabel}</span>
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
