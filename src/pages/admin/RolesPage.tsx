import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import {
  getRoles, getRole, createRole, updateRolePermissions, deleteRole, getPermissions,
  type Role, type RoleDetail,
} from '../../lib/api/admin';

// ── Create Role Modal ─────────────────────────────────────────────────────────

function CreateRoleModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({ name: '', slug: '', description: '' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => createRole(form),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setError(e?.response?.data?.detail ?? 'Failed to create role'),
  });

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Create Role</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Role Name</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: autoSlug(e.target.value) }))}
              placeholder="e.g. Dispatch Manager"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slug</label>
            <input
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              placeholder="dispatch_manager"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description (optional)</label>
            <input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md border hover:bg-accent">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.name || !form.slug}
            className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {mutation.isPending ? 'Creating…' : 'Create Role'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Role Detail Panel ─────────────────────────────────────────────────────────

function RoleDetailPanel({
  role,
  onClose,
}: {
  role: Role;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const { data: detail, isLoading } = useQuery({
    queryKey: ['admin-role', role.id],
    queryFn: () => getRole(role.id),
  });

  const { data: allPerms } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: getPermissions,
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);

  if (detail && !initialized) {
    setSelected(new Set(detail.permissions.map(p => p.key)));
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: () => updateRolePermissions(role.id, Array.from(selected)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-roles'] });
      qc.invalidateQueries({ queryKey: ['admin-role', role.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteRole(role.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-roles'] });
      onClose();
    },
  });

  const togglePerm = (key: string) =>
    setSelected(s => {
      const n = new Set(s);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  const selectAll = (keys: string[]) =>
    setSelected(s => { const n = new Set(s); keys.forEach(k => n.add(k)); return n; });

  const clearAll = (keys: string[]) =>
    setSelected(s => { const n = new Set(s); keys.forEach(k => n.delete(k)); return n; });

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />
      {/* Panel */}
      <div className="w-full max-w-lg bg-background shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{role.name}</h2>
              {role.isSystem && (
                <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" /> System
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{role.description ?? 'No description'}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
        </div>

        {/* Permissions */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">Loading permissions…</p>}
          {allPerms && Object.entries(allPerms).map(([resource, perms]) => {
            const keys = perms.map(p => p.key);
            const allSelected = keys.every(k => selected.has(k));
            return (
              <div key={resource} className="rounded-lg border">
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b">
                  <span className="text-sm font-medium capitalize">{resource}</span>
                  <button
                    onClick={() => allSelected ? clearAll(keys) : selectAll(keys)}
                    className="text-xs text-primary hover:underline"
                  >
                    {allSelected ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                <div className="p-3 grid grid-cols-1 gap-2">
                  {perms.map(p => (
                    <label key={p.key} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.has(p.key)}
                        onChange={() => togglePerm(p.key)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary"
                      />
                      <div>
                        <p className="text-sm font-mono text-xs text-muted-foreground">{p.key}</p>
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t">
          {!role.isSystem ? (
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete Role
            </button>
          ) : <div />}
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving…' : `Save Permissions (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RolesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Role | null>(null);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: getRoles,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground">{roles.length} roles defined</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Role
        </button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Permissions</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading…</td>
              </tr>
            ) : roles.map(role => (
              <tr key={role.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <p className="font-medium">{role.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">{role.slug}</p>
                  {role.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {role.isSystem ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3" /> System
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Custom</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {role.permissionCount} permissions
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setSelected(role)}
                    className="rounded px-3 py-1 text-xs border hover:bg-accent"
                  >
                    Edit Permissions
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateRoleModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['admin-roles'] })}
        />
      )}
      {selected && (
        <RoleDetailPanel role={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
