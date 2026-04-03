import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserPlus, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getUsers, inviteUser, activateUser, deactivateUser, assignRoles, getRoles,
  type AdminUser,
} from '../../lib/api/admin';

// ── Invite Modal ──────────────────────────────────────────────────────────────

function InviteModal({
  roles,
  onClose,
  onSuccess,
}: {
  roles: { id: string; name: string; slug: string }[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    email: '', full_name: '', password: '', role_slugs: [] as string[],
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: inviteUser,
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setError(e?.response?.data?.detail ?? 'Failed to invite user'),
  });

  const toggleRole = (slug: string) =>
    setForm(f => ({
      ...f,
      role_slugs: f.role_slugs.includes(slug)
        ? f.role_slugs.filter(s => s !== slug)
        : [...f.role_slugs, slug],
    }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Invite Staff Member</h2>

        <div className="space-y-3">
          {[
            { label: 'Full Name', key: 'full_name', type: 'text' },
            { label: 'Email', key: 'email', type: 'email' },
            { label: 'Temporary Password', key: 'password', type: 'password' },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="block text-sm font-medium mb-1">{label}</label>
              <input
                type={type}
                value={(form as any)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium mb-2">Assign Roles</label>
            <div className="flex flex-wrap gap-2">
              {roles.map(r => (
                <button
                  key={r.slug}
                  type="button"
                  onClick={() => toggleRole(r.slug)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    form.role_slugs.includes(r.slug)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary'
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md border hover:bg-accent">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending}
            className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {mutation.isPending ? 'Inviting…' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Assign Roles Modal ────────────────────────────────────────────────────────

function AssignRolesModal({
  user,
  allRoles,
  onClose,
  onSuccess,
}: {
  user: AdminUser;
  allRoles: { id: string; name: string; slug: string }[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selected, setSelected] = useState(user.roles.map(r => r.slug));
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => assignRoles(user.id, selected),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setError(e?.response?.data?.detail ?? 'Failed to update roles'),
  });

  const toggle = (slug: string) =>
    setSelected(s => s.includes(slug) ? s.filter(x => x !== slug) : [...s, slug]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold mb-1">Assign Roles</h2>
        <p className="text-sm text-muted-foreground mb-4">{user.email}</p>

        <div className="flex flex-wrap gap-2">
          {allRoles.map(r => (
            <button
              key={r.slug}
              type="button"
              onClick={() => toggle(r.slug)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                selected.includes(r.slug)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary'
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md border hover:bg-accent">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [assignTarget, setAssignTarget] = useState<AdminUser | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, debouncedSearch],
    queryFn: () => getUsers({ page, limit: 20, search: debouncedSearch || undefined }),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: getRoles,
  });

  const toggleActive = useMutation({
    mutationFn: (u: AdminUser) => u.isActive ? deactivateUser(u.id) : activateUser(u.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout((handleSearch as any)._t);
    (handleSearch as any)._t = setTimeout(() => { setDebouncedSearch(v); setPage(1); }, 400);
  };

  const totalPages = data ? Math.ceil(data.meta.total / 20) : 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">
            {data?.meta.total ?? '–'} staff members
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <UserPlus className="h-4 w-4" />
          Invite User
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Roles</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Login</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            ) : (
              data?.data.map(user => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{user.fullName}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length > 0 ? user.roles.map(r => (
                        <span key={r.id} className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                          {r.name}
                        </span>
                      )) : (
                        <span className="text-xs text-muted-foreground">No roles</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {user.isActive ? (
                      <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                        <XCircle className="h-3.5 w-3.5" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setAssignTarget(user)}
                        className="rounded px-2 py-1 text-xs border hover:bg-accent"
                      >
                        Roles
                      </button>
                      <button
                        onClick={() => toggleActive.mutate(user)}
                        disabled={toggleActive.isPending}
                        className={`rounded px-2 py-1 text-xs border hover:bg-accent disabled:opacity-50 ${
                          user.isActive ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded p-1.5 border hover:bg-accent disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded p-1.5 border hover:bg-accent disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Modals */}
      {showInvite && (
        <InviteModal
          roles={roles}
          onClose={() => setShowInvite(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['admin-users'] })}
        />
      )}
      {assignTarget && (
        <AssignRolesModal
          user={assignTarget}
          allRoles={roles}
          onClose={() => setAssignTarget(null)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['admin-users'] })}
        />
      )}
    </div>
  );
}
