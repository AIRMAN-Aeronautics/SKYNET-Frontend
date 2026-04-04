import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Settings, Users, ShieldCheck, Plane, CreditCard, Database,
  Palette, Sun, Moon, Monitor, Mail, Globe, CheckCircle2,
  XCircle, Lock, Plus, Trash2, Search, UserPlus, Edit2,
  ChevronLeft, ChevronRight, AlertTriangle, Building2,
  GraduationCap, Upload, Download,
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Separator } from '../../components/ui/separator';

import {
  getTenant, updateTenant,
  getSettings, updateSettings,
  getUsers, inviteUser, activateUser, deactivateUser, assignRoles,
  getRoles, getRole, createRole, updateRolePermissions, deleteRole, getPermissions,
  getStudents, createStudent, bulkCreateStudents, activateStudent, deactivateStudent,
  getInstructors, createInstructor, activateInstructor, deactivateInstructor,
  getMapping, saveMapping,
  type AdminUser, type Role, type TenantInfo, type StudentRecord, type InstructorRecord,
  type TenantSettings,
} from '../../lib/api/admin';

// ── Shared design-system components ──────────────────────────────────────────

function AviationHeader({
  category, title, description, stats, actions,
}: {
  category: string;
  title: string;
  description?: string;
  stats?: { value: React.ReactNode; label: string }[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-blue-900/30 bg-blue-950 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-blue-400 uppercase mb-0.5">
            {category}
          </p>
          <h2 className="text-white font-bold text-base tracking-wide">{title}</h2>
          {description && <p className="text-blue-400 text-xs mt-0.5">{description}</p>}
        </div>
        {(stats || actions) && (
          <div className="flex items-center gap-4">
            {stats && stats.length > 0 && (
              <div className={`grid gap-4 text-center border-r border-blue-800 pr-4`}
                   style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
                {stats.map(s => (
                  <div key={s.label}>
                    <p className="text-white text-xl font-bold leading-none">{s.value}</p>
                    <p className="text-blue-400 text-[9px] font-semibold tracking-widest mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase px-0.5 mb-2">
      {children}
    </p>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${active ? 'text-emerald-600' : 'text-red-500'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

// ── Theme helpers ────────────────────────────────────────────────────────────

function useTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('theme') as any) || 'system';
  });

  const setTheme = (t: 'light' | 'dark' | 'system') => {
    setThemeState(t);
    localStorage.setItem('theme', t);
    const root = document.documentElement;
    if (t === 'dark') root.classList.add('dark');
    else if (t === 'light') root.classList.remove('dark');
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      prefersDark ? root.classList.add('dark') : root.classList.remove('dark');
    }
  };

  return { theme, setTheme };
}

// ── Organisation Tab ──────────────────────────────────────────────────────────

function OrganisationTab() {
  const qc = useQueryClient();
  const { data: tenant, isLoading } = useQuery({
    queryKey: ['admin-tenant'],
    queryFn: getTenant,
  });

  const [form, setForm] = useState<Partial<{
    timezone: string; contact_email: string; contact_phone: string;
  }>>({});
  const [editing, setEditing] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () => updateTenant(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tenant'] });
      setEditing(false);
    },
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <AviationHeader
        category="Administration"
        title="Organisation Settings"
        description="Core configuration for your flight training organisation"
        stats={[
          { value: tenant?.staffCount ?? 0, label: 'STAFF' },
          { value: tenant?.regulatoryFrameworkCode ?? '—', label: 'FRAMEWORK' },
          { value: tenant?.isActive ? 'ACTIVE' : 'INACTIVE', label: 'STATUS' },
        ]}
        actions={
          !editing ? (
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-blue-700 text-blue-200 hover:bg-blue-900 hover:text-white"
              onClick={() => setEditing(true)}
            >
              <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-blue-700 text-blue-200 hover:bg-blue-900 hover:text-white"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="text-xs bg-blue-500 hover:bg-blue-400 text-white"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </>
          )
        }
      />

      <div className="rounded-lg border bg-card">
        <SectionLabel>
          <span className="px-4 pt-4 block">Organisation Details</span>
        </SectionLabel>
        <div className="px-4 pb-4 grid grid-cols-2 gap-x-6 gap-y-3">
          {[
            { label: 'Name',          value: tenant?.name ?? '—',                        editable: false },
            { label: 'Slug',          value: tenant?.slug ?? '—',                        editable: false, mono: true },
            { label: 'Framework',     value: tenant?.regulatoryFrameworkCode ?? '—',     editable: false },
            { label: 'Created',       value: tenant?.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : '—', editable: false },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-3 py-1 border-b border-border/50 last:border-0">
              <span className="text-xs text-muted-foreground w-24 shrink-0">{row.label}</span>
              <span className={`text-sm font-medium ${row.mono ? 'font-mono' : ''}`}>{row.value}</span>
            </div>
          ))}

          <div className="flex items-center gap-3 py-1 border-b border-border/50">
            <span className="text-xs text-muted-foreground w-24 shrink-0">Timezone</span>
            {editing ? (
              <Select
                value={form.timezone ?? tenant?.timezone ?? 'Asia/Kolkata'}
                onValueChange={v => setForm(f => ({ ...f, timezone: v }))}
              >
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="Asia/Kolkata">IST – India Standard Time</SelectItem>
                  <SelectItem value="America/New_York">EST – Eastern Standard Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">PST – Pacific Standard Time</SelectItem>
                  <SelectItem value="Europe/London">GMT – Greenwich Mean Time</SelectItem>
                  <SelectItem value="Europe/Berlin">CET – Central European Time</SelectItem>
                  <SelectItem value="Australia/Sydney">AEST – Australian Eastern Time</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm font-medium">{tenant?.timezone ?? '—'}</span>
            )}
          </div>

          <div className="flex items-center gap-3 py-1 border-b border-border/50">
            <span className="text-xs text-muted-foreground w-24 shrink-0">Contact Email</span>
            {editing ? (
              <Input
                type="email"
                className="h-7 text-xs"
                value={form.contact_email ?? tenant?.contactEmail ?? ''}
                onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
              />
            ) : (
              <span className="text-sm font-medium">{tenant?.contactEmail ?? '—'}</span>
            )}
          </div>

          <div className="flex items-center gap-3 py-1">
            <span className="text-xs text-muted-foreground w-24 shrink-0">Contact Phone</span>
            {editing ? (
              <Input
                className="h-7 text-xs"
                value={form.contact_phone ?? tenant?.contactPhone ?? ''}
                onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
              />
            ) : (
              <span className="text-sm font-medium">{tenant?.contactPhone ?? '—'}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────

function InviteDialog({
  open, onClose, roles, onSuccess,
}: {
  open: boolean; onClose: () => void;
  roles: { id: string; name: string; slug: string }[];
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({ email: '', full_name: '', password: '', role_slugs: [] as string[] });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => inviteUser(form),
    onSuccess: () => { onSuccess(); onClose(); setForm({ email: '', full_name: '', password: '', role_slugs: [] }); },
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
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Staff Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Account is created immediately — no email confirmation required.
          </div>
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Assign Roles</Label>
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
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.email || !form.full_name || !form.password}>
            {mutation.isPending ? 'Creating…' : 'Create Account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignRolesDialog({
  user, roles, open, onClose, onSuccess,
}: {
  user: AdminUser | null; roles: { id: string; name: string; slug: string }[];
  open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');

  useState(() => {
    if (user) setSelected(user.roles.map(r => r.slug));
  });

  // Reset when user changes
  if (user && selected.length === 0 && user.roles.length > 0) {
    setSelected(user.roles.map(r => r.slug));
  }

  const mutation = useMutation({
    mutationFn: () => assignRoles(user!.id, selected),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setError(e?.response?.data?.detail ?? 'Failed to update roles'),
  });

  const toggle = (slug: string) =>
    setSelected(s => s.includes(slug) ? s.filter(x => x !== slug) : [...s, slug]);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign Roles</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <p className="text-sm text-muted-foreground mb-4">{user?.email}</p>
          <div className="flex flex-wrap gap-2">
            {roles.map(r => (
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
          {error && <p className="text-sm text-destructive mt-3">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UsersTab() {
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

  const activeCount = data?.data.filter(u => u.isActive).length ?? 0;

  return (
    <div className="space-y-4">
      <AviationHeader
        category="Personnel"
        title="Staff Management"
        description="Manage staff accounts, roles, and access credentials"
        stats={[
          { value: data?.meta.total ?? '—', label: 'TOTAL' },
          { value: activeCount, label: 'ACTIVE' },
          { value: totalPages, label: 'PAGES' },
        ]}
        actions={
          <Button
            size="sm"
            className="text-xs bg-blue-500 hover:bg-blue-400 text-white"
            onClick={() => setShowInvite(true)}
          >
            <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Create User
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Search by name or email…" className="pl-9" />
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-xs py-2">Staff Member</TableHead>
              <TableHead className="text-xs py-2">Roles</TableHead>
              <TableHead className="text-xs py-2">Status</TableHead>
              <TableHead className="text-xs py-2">Last Login</TableHead>
              <TableHead className="text-xs py-2 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">Loading…</TableCell></TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">No users found.</TableCell></TableRow>
            ) : data?.data.map(user => (
              <TableRow key={user.id}>
                <TableCell className="py-2">
                  <p className="font-medium text-sm">{user.fullName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex flex-wrap gap-1">
                    {user.roles.length > 0 ? user.roles.map(r => (
                      <Badge key={r.id} variant="secondary" className="text-xs">{r.name}</Badge>
                    )) : <span className="text-xs text-muted-foreground">No roles</span>}
                  </div>
                </TableCell>
                <TableCell className="py-2"><StatusDot active={user.isActive} /></TableCell>
                <TableCell className="text-xs text-muted-foreground py-2">
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                </TableCell>
                <TableCell className="py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAssignTarget(user)}>Roles</Button>
                    <Button
                      variant="outline" size="sm" className={`h-7 text-xs ${user.isActive ? 'text-destructive hover:text-destructive' : 'text-emerald-600 hover:text-emerald-600'}`}
                      onClick={() => toggleActive.mutate(user)} disabled={toggleActive.isPending}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <InviteDialog
        open={showInvite}
        onClose={() => setShowInvite(false)}
        roles={roles}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['admin-users'] })}
      />
      {assignTarget && (
        <AssignRolesDialog
          user={assignTarget}
          roles={roles}
          open={!!assignTarget}
          onClose={() => setAssignTarget(null)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['admin-users'] })}
        />
      )}
    </div>
  );
}

// ── Roles Tab ─────────────────────────────────────────────────────────────────

function CreateRoleDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: '', slug: '', description: '' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => createRole(form),
    onSuccess: () => { onSuccess(); onClose(); setForm({ name: '', slug: '', description: '' }); },
    onError: (e: any) => setError(e?.response?.data?.detail ?? 'Failed to create role'),
  });

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Create Role</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Role Name</Label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: autoSlug(e.target.value) }))}
              placeholder="e.g. Dispatch Manager"
            />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              placeholder="dispatch_manager"
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name || !form.slug}>
            {mutation.isPending ? 'Creating…' : 'Create Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RolePermissionsPanel({ role, onClose }: { role: Role; onClose: () => void }) {
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-roles'] }); onClose(); },
  });

  const togglePerm = (key: string) =>
    setSelected(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const selectAll = (keys: string[]) =>
    setSelected(s => { const n = new Set(s); keys.forEach(k => n.add(k)); return n; });

  const clearAll = (keys: string[]) =>
    setSelected(s => { const n = new Set(s); keys.forEach(k => n.delete(k)); return n; });

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-lg bg-background shadow-2xl flex flex-col overflow-hidden border-l">
        <div className="flex items-start justify-between p-5 border-b">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{role.name}</h2>
              {role.isSystem && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Lock className="h-3 w-3" /> System
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{role.description ?? 'No description'}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
        </div>

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
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-primary"
                      />
                      <div>
                        <p className="text-xs font-mono text-muted-foreground">{p.key}</p>
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between p-4 border-t">
          {!role.isSystem ? (
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-1.5 text-sm text-destructive hover:text-destructive/80 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" /> Delete Role
            </button>
          ) : <div />}
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : `Save Permissions (${selected.size})`}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RolesTab() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: getRoles,
  });

  const systemRoles = roles.filter(r => r.isSystem).length;

  return (
    <div className="space-y-4">
      <AviationHeader
        category="Security"
        title="Access Control"
        description="Define roles and assign permissions to control what staff can access"
        stats={[
          { value: roles.length, label: 'ROLES' },
          { value: systemRoles, label: 'SYSTEM' },
          { value: roles.length - systemRoles, label: 'CUSTOM' },
        ]}
        actions={
          <Button
            size="sm"
            className="text-xs bg-blue-500 hover:bg-blue-400 text-white"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Create Role
          </Button>
        }
      />

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-xs py-2">Role</TableHead>
              <TableHead className="text-xs py-2">Type</TableHead>
              <TableHead className="text-xs py-2">Permissions</TableHead>
              <TableHead className="text-xs py-2 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">Loading…</TableCell></TableRow>
            ) : roles.map(role => (
              <TableRow key={role.id}>
                <TableCell className="py-2">
                  <p className="font-medium text-sm">{role.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">{role.slug}</p>
                  {role.description && <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>}
                </TableCell>
                <TableCell className="py-2">
                  {role.isSystem ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3" /> System
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Custom</span>
                  )}
                </TableCell>
                <TableCell className="py-2">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                    {role.permissionCount} permissions
                  </span>
                </TableCell>
                <TableCell className="py-2 text-right">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSelectedRole(role)}>
                    Edit Permissions
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CreateRoleDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['admin-roles'] })}
      />
      {selectedRole && <RolePermissionsPanel role={selectedRole} onClose={() => setSelectedRole(null)} />}
    </div>
  );
}

// ── System Tab ────────────────────────────────────────────────────────────────

function IntegerField({
  label, desc, value, onChange, disabled,
}: {
  label: string; desc: string;
  value: number; onChange: (v: number) => void; disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Input
        type="number"
        min={1}
        value={value}
        onChange={e => {
          const n = parseInt(e.target.value, 10);
          if (!isNaN(n) && n >= 1) onChange(n);
        }}
        disabled={disabled}
        className="w-20 h-7 text-xs text-right"
      />
    </div>
  );
}

function SystemTab() {
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery<TenantSettings>({
    queryKey: ['admin-settings'],
    queryFn: getSettings,
  });

  // ── System settings state ─────────────────────────────────────────────────
  const [studentsPerInstructor, setStudentsPerInstructor] = useState(10);
  const [soloMilestoneHours, setSoloMilestoneHours] = useState(25);
  const [instructorHoursPerDay, setInstructorHoursPerDay] = useState(6);

  // ── Notification preferences state ────────────────────────────────────────
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState(true);
  const [complianceWarnings, setComplianceWarnings] = useState(true);

  // ── Data management state ─────────────────────────────────────────────────
  const [autoBackup, setAutoBackup] = useState(false);

  const [synced, setSynced] = useState(false);

  // Sync local state once API data arrives (runs once per fetch)
  if (settings && !synced) {
    setStudentsPerInstructor(settings.system_settings.student_per_instructor);
    setSoloMilestoneHours(settings.system_settings.solo_flight_milestone_hours);
    setInstructorHoursPerDay(settings.system_settings.instructor_flying_hours_per_day);
    setEmailNotifs(settings.notification_preferences.emailNotifications);
    setMaintenanceAlerts(settings.notification_preferences.maintenanceAlerts);
    setComplianceWarnings(settings.notification_preferences.complianceWarnings);
    setAutoBackup(settings.data_management.autoBackup);
    setSynced(true);
  }

  const [saved_, setSaved_] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateSettings({
        system_settings: {
          student_per_instructor: studentsPerInstructor,
          solo_flight_milestone_hours: soloMilestoneHours,
          instructor_flying_hours_per_day: instructorHoursPerDay,
        },
        notification_preferences: {
          emailNotifications: emailNotifs,
          maintenanceAlerts,
          complianceWarnings,
        },
        data_management: {
          autoBackup,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      setSaved_(true);
      setTimeout(() => setSaved_(false), 2000);
    },
  });

  const busy = isLoading || saveMutation.isPending;

  return (
    <div className="space-y-4">
      <AviationHeader
        category="Configuration"
        title="System Settings"
        description="Operational thresholds, notification preferences, and data management"
        actions={
          <div className="flex items-center gap-2">
            {saved_ && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Saved
              </span>
            )}
            <Button
              size="sm"
              className="text-xs bg-blue-500 hover:bg-blue-400 text-white"
              onClick={() => saveMutation.mutate()}
              disabled={busy}
            >
              {saveMutation.isPending ? 'Saving…' : 'Save Settings'}
            </Button>
          </div>
        }
      />

      {/* ── Configuration System Settings ─────────────────────────────────── */}
      <div className="rounded-lg border overflow-hidden">
        <div className="bg-muted/40 px-4 py-2 border-b">
          <SectionLabel>Configuration System Settings</SectionLabel>
        </div>
        <div className="divide-y">
          <IntegerField
            label="Students per Instructor"
            desc="Maximum number of students that can be assigned to one instructor"
            value={studentsPerInstructor}
            onChange={setStudentsPerInstructor}
            disabled={busy}
          />
          <IntegerField
            label="Solo Flight Milestone (hours)"
            desc="Minimum flight hours a student must log before solo flight is permitted"
            value={soloMilestoneHours}
            onChange={setSoloMilestoneHours}
            disabled={busy}
          />
          <IntegerField
            label="Instructor Flying Hours per Day"
            desc="Maximum flying hours an instructor is scheduled for in a single day"
            value={instructorHoursPerDay}
            onChange={setInstructorHoursPerDay}
            disabled={busy}
          />
        </div>
      </div>

      {/* ── Notification Preferences ──────────────────────────────────────── */}
      <div className="rounded-lg border overflow-hidden">
        <div className="bg-muted/40 px-4 py-2 border-b">
          <SectionLabel>Notification Preferences</SectionLabel>
        </div>
        {[
          { label: 'Email Notifications', desc: 'Send email alerts for critical events',          checked: emailNotifs,        onChange: setEmailNotifs        },
          { label: 'Maintenance Alerts',  desc: 'Alert when aircraft require maintenance',         checked: maintenanceAlerts,  onChange: setMaintenanceAlerts  },
          { label: 'Compliance Warnings', desc: 'Warn 30 days before compliance items expire',    checked: complianceWarnings, onChange: setComplianceWarnings },
        ].map((row, i, arr) => (
          <div key={row.label} className={`flex items-center justify-between px-4 py-3 ${i < arr.length - 1 ? 'border-b' : ''}`}>
            <div>
              <p className="text-sm font-medium">{row.label}</p>
              <p className="text-xs text-muted-foreground">{row.desc}</p>
            </div>
            <Switch checked={row.checked} onCheckedChange={row.onChange} disabled={busy} />
          </div>
        ))}
      </div>

      {/* ── Data Management ───────────────────────────────────────────────── */}
      <div className="rounded-lg border overflow-hidden">
        <div className="bg-muted/40 px-4 py-2 border-b">
          <SectionLabel>Data Management</SectionLabel>
        </div>
        <div className="divide-y">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Automatic Backup</p>
              <p className="text-xs text-muted-foreground">Automatically back up organisation data daily</p>
            </div>
            <Switch checked={autoBackup} onCheckedChange={setAutoBackup} disabled={busy} />
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Data Export</p>
              <p className="text-xs text-muted-foreground">Export your organisation's data as CSV or JSON</p>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs">Export Data</Button>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">API Access</p>
              <p className="text-xs text-muted-foreground">Generate API keys for external integrations</p>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs">Generate API Key</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Appearance Tab ────────────────────────────────────────────────────────────

function AppearanceTab() {
  const qc = useQueryClient();
  const { theme, setTheme } = useTheme();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['admin-tenant'],
    queryFn: getTenant,
  });

  const s = (tenant?.settings ?? {}) as Record<string, string>;
  const [timezone, setTimezone] = useState<string>('Asia/Kolkata');
  const [currency, setCurrency] = useState<string>('inr');
  const [dateFormat, setDateFormat] = useState<string>('dmy');
  const [units, setUnits] = useState<string>('imperial');
  const [synced, setSynced] = useState(false);

  // Sync once tenant data arrives — timezone comes from the top-level column,
  // currency/dateFormat/units come from the settings JSONB
  if (tenant && !synced) {
    setTimezone(tenant.timezone ?? 'Asia/Kolkata');
    setCurrency(s.currency ?? 'inr');
    setDateFormat(s.dateFormat ?? 'dmy');
    setUnits(s.units ?? 'imperial');
    setSynced(true);
  }

  const [saved_, setSaved_] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateTenant({
        timezone,
        settings: { currency, dateFormat, units },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tenant'] });
      setSaved_(true);
      setTimeout(() => setSaved_(false), 2000);
    },
  });

  const handleSave = () => saveMutation.mutate();

  return (
    <div className="space-y-4">
      <AviationHeader
        category="Display"
        title="Appearance & Regional"
        description="Theme, timezone, currency, and unit preferences"
        actions={
          <div className="flex items-center gap-2">
            {saved_ && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Saved
              </span>
            )}
            <Button
              size="sm"
              className="text-xs bg-blue-500 hover:bg-blue-400 text-white"
              onClick={handleSave}
              disabled={saveMutation.isPending || isLoading}
            >
              {saveMutation.isPending ? 'Saving…' : 'Save Preferences'}
            </Button>
          </div>
        }
      />

      {/* Theme picker */}
      <div className="rounded-lg border overflow-hidden">
        <div className="bg-muted/40 px-4 py-2 border-b">
          <SectionLabel>Color Mode</SectionLabel>
        </div>
        <div className="p-4 grid grid-cols-3 gap-3">
          {([
            { value: 'light',  icon: Sun,     label: 'Light',  desc: 'Bright — well-lit environments' },
            { value: 'dark',   icon: Moon,    label: 'Dark',   desc: 'Reduced eye strain, night ops' },
            { value: 'system', icon: Monitor, label: 'System', desc: 'Matches device setting' },
          ] as const).map(({ value, icon: Icon, label, desc }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`text-left rounded-lg border p-3 transition-all ${theme === value ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-400/30' : 'border-border hover:border-blue-300 hover:bg-slate-50'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                {theme === value && <span className="h-2 w-2 rounded-full bg-blue-500" />}
              </div>
              <div className={`rounded border h-8 mb-2 ${value === 'dark' ? 'bg-slate-900' : value === 'system' ? 'bg-gradient-to-r from-white to-slate-900' : 'bg-white'}`} />
              <p className="text-[10px] text-muted-foreground">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Regional settings */}
      <div className="rounded-lg border overflow-hidden">
        <div className="bg-muted/40 px-4 py-2 border-b">
          <SectionLabel>Regional Preferences</SectionLabel>
        </div>
        <div className="p-4 grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone} disabled={isLoading}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="Asia/Kolkata">IST – India</SelectItem>
                <SelectItem value="America/New_York">EST – Eastern US</SelectItem>
                <SelectItem value="America/Los_Angeles">PST – Pacific US</SelectItem>
                <SelectItem value="Europe/London">GMT – London</SelectItem>
                <SelectItem value="Europe/Berlin">CET – Central Europe</SelectItem>
                <SelectItem value="Australia/Sydney">AEST – Sydney</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Currency</Label>
            <Select value={currency} onValueChange={setCurrency} disabled={isLoading}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inr">INR (₹)</SelectItem>
                <SelectItem value="usd">USD ($)</SelectItem>
                <SelectItem value="eur">EUR (€)</SelectItem>
                <SelectItem value="gbp">GBP (£)</SelectItem>
                <SelectItem value="aud">AUD ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Date Format</Label>
            <Select value={dateFormat} onValueChange={setDateFormat} disabled={isLoading}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                <SelectItem value="ymd">YYYY-MM-DD (ISO)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Unit System</Label>
            <Select value={units} onValueChange={setUnits} disabled={isLoading}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="imperial">Imperial (ft, nm, lbs)</SelectItem>
                <SelectItem value="metric">Metric (m, km, kg)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Student Management Tab ───────────────────────────────────────────────────

const STUDENT_PROGRAMS = ['CPL', 'PPL', 'IR', 'ME', 'Night Rating', 'FI', 'ATPL Ground', 'Other'];

interface StudentLocal {
  id: string;
  full_name: string;
  phone: string;
  student_id: string;
  program: string;
  batch_date: string;
  notes: string;
  status: 'active' | 'inactive';
  created_source: 1 | 2 | 3;
  enrolled_at: string;
}

const SOURCE_LABELS: Record<number, { label: string; variant: 'secondary' | 'outline' | 'default' }> = {
  1: { label: 'Admin', variant: 'secondary' },
  2: { label: 'Bulk Upload', variant: 'outline' },
  3: { label: 'Maverick App', variant: 'default' },
};

function CreateStudentDialog({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const blank = { full_name: '', email: '', phone: '', student_id: '', program: '', batch_date: '', notes: '' };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => createStudent({
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      student_id: form.student_id || undefined,
      program: form.program,
      batch_date: form.batch_date || undefined,
      notes: form.notes || undefined,
    }),
    onSuccess: () => {
      onCreated();
      onClose();
      setForm(blank);
      setError('');
    },
    onError: (e: any) => setError(e?.response?.data?.detail ?? 'Failed to create student'),
  });

  const handleSubmit = () => {
    if (!form.full_name || !form.email || !form.phone || !form.program) {
      setError('Full name, email, phone, and program are required.');
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Student</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="student@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Phone <span className="text-destructive">*</span></Label>
              <Input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+91 9876543210"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>
                Student ID{' '}
                <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                value={form.student_id}
                onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
                placeholder="STU-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Program <span className="text-destructive">*</span></Label>
              <Select value={form.program} onValueChange={v => setForm(f => ({ ...f, program: v }))}>
                <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                <SelectContent>
                  {STUDENT_PROGRAMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Batch Date</Label>
              <Input
                type="date"
                value={form.batch_date}
                onChange={e => setForm(f => ({ ...f, batch_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any additional notes…"
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={mutation.isPending || !form.full_name || !form.email || !form.phone || !form.program}
          >
            {mutation.isPending ? 'Creating…' : 'Create Student'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface BulkRow {
  full_name: string;
  email: string;
  phone: string;
  student_id: string;
  program: string;
  batch_date: string;
  notes: string;
  _error?: string;
}

function BulkUploadDialog({
  open, onClose, onUploaded,
}: { open: boolean; onClose: () => void; onUploaded: () => void }) {
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');

  const reset = () => { setRows([]); setFileName(''); setParseError(''); };

  const handleFile = (file: File) => {
    setFileName(file.name);
    setParseError('');
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        setParseError('CSV must have a header row and at least one data row.');
        return;
      }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
      const required = ['full_name', 'email', 'phone', 'program'];
      const parsed: BulkRow[] = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = cols[i] ?? ''; });
        const missing = required.filter(r => !row[r]);
        return {
          full_name: row.full_name ?? '',
          email: row.email ?? '',
          phone: row.phone ?? '',
          student_id: row.student_id ?? '',
          program: row.program ?? '',
          batch_date: row.batch_date ?? '',
          notes: row.notes ?? '',
          ...(missing.length ? { _error: `Missing: ${missing.join(', ')}` } : {}),
        };
      });
      setRows(parsed);
    };
    reader.readAsText(file);
  };

  const validRows = rows.filter(r => !r._error);
  const errorCount = rows.length - validRows.length;

  const bulkMutation = useMutation({
    mutationFn: () => bulkCreateStudents(validRows.map(r => ({
      full_name: r.full_name,
      email: r.email,
      phone: r.phone,
      student_id: r.student_id || undefined,
      program: r.program,
      batch_date: r.batch_date || undefined,
      notes: r.notes || undefined,
    }))),
    onSuccess: () => { onUploaded(); reset(); onClose(); },
    onError: (e: any) => setParseError(e?.response?.data?.detail ?? 'Upload failed'),
  });

  const handleConfirm = () => bulkMutation.mutate();

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk Upload Students</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {rows.length === 0 ? (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-10 cursor-pointer hover:border-primary transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Click to select a CSV file</p>
              <p className="text-xs text-muted-foreground mt-1">
                Required columns: full_name, email, phone, program
              </p>
              <p className="text-xs text-muted-foreground">
                Optional: student_id, batch_date, notes
              </p>
              <input
                type="file"
                accept=".csv"
                className="sr-only"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {fileName} — {rows.length} rows
                  {' '}({validRows.length} valid
                  {errorCount > 0 ? `, ${errorCount} with errors` : ''})
                </p>
                <Button variant="outline" size="sm" onClick={reset}>Change file</Button>
              </div>
              <div className="rounded-md border overflow-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Validation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={i} className={r._error ? 'bg-destructive/5' : ''}>
                        <TableCell className="text-xs">{r.full_name || '—'}</TableCell>
                        <TableCell className="text-xs">{r.email || '—'}</TableCell>
                        <TableCell className="text-xs">{r.phone || '—'}</TableCell>
                        <TableCell className="text-xs">{r.student_id || '—'}</TableCell>
                        <TableCell className="text-xs">{r.program || '—'}</TableCell>
                        <TableCell className="text-xs">
                          {r._error
                            ? <span className="text-destructive">{r._error}</span>
                            : <span className="text-green-600">OK</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
          {parseError && <p className="text-sm text-destructive">{parseError}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={validRows.length === 0 || bulkMutation.isPending}>
            {bulkMutation.isPending ? 'Uploading…' : `Upload ${validRows.length > 0 ? `${validRows.length} Student${validRows.length !== 1 ? 's' : ''}` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function downloadCsvTemplate() {
  const csv = [
    'full_name,email,phone,student_id,program,batch_date,notes',
    'John Doe,john.doe@example.com,+91 9876543210,STU-001,CPL,2024-01-15,Sample student',
    'Jane Smith,jane.smith@example.com,+91 9123456789,STU-002,PPL,2024-02-01,',
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'students_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function StudentManagementTab() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterProgram, setFilterProgram] = useState('all');

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout((handleSearch as any)._t);
    (handleSearch as any)._t = setTimeout(() => setDebouncedSearch(v), 400);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-students', debouncedSearch, filterStatus, filterSource, filterProgram],
    queryFn: () => getStudents({
      search: debouncedSearch || undefined,
      status: filterStatus !== 'all' ? filterStatus : undefined,
      created_source: filterSource !== 'all' ? Number(filterSource) : undefined,
      program: filterProgram !== 'all' ? filterProgram : undefined,
      limit: 200,
    }),
  });

  const { data: allData } = useQuery({
    queryKey: ['admin-students-all'],
    queryFn: () => getStudents({ limit: 200 }),
  });

  const students = data?.data ?? [];
  const allStudents = allData?.data ?? [];
  const programs = [...new Set(allStudents.map(s => s.program))].filter(Boolean);
  const totalActive = allStudents.filter(s => s.status === 'active').length;
  const fromAdmin = allStudents.filter(s => s.createdSource === 1).length;
  const fromMaverick = allStudents.filter(s => s.createdSource === 3).length;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-students'] });
    qc.invalidateQueries({ queryKey: ['admin-students-all'] });
  };

  const toggleStatus = useMutation({
    mutationFn: (s: StudentRecord) =>
      s.status === 'active' ? deactivateStudent(s.id) : activateStudent(s.id),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-4">
      <AviationHeader
        category="Trainee Operations"
        title="Trainee Registry"
        description="Manage trainee pilot records — single entry, bulk CSV upload, and status control"
        stats={[
          { value: allStudents.length, label: 'TOTAL'    },
          { value: totalActive,        label: 'ACTIVE'   },
          { value: fromAdmin,          label: 'ADMIN'    },
          { value: fromMaverick,       label: 'MAVERICK' },
        ]}
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-blue-700 text-blue-200 hover:bg-blue-900 hover:text-white"
              onClick={downloadCsvTemplate}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" /> Template
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-blue-700 text-blue-200 hover:bg-blue-900 hover:text-white"
              onClick={() => setShowBulk(true)}
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" /> Bulk Upload
            </Button>
            <Button
              size="sm"
              className="text-xs bg-blue-500 hover:bg-blue-400 text-white"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Trainee
            </Button>
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Name, email, phone, ID…" className="pl-9 h-8 text-sm" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="1">Admin</SelectItem>
            <SelectItem value="2">Bulk Upload</SelectItem>
            <SelectItem value="3">Maverick App</SelectItem>
          </SelectContent>
        </Select>
        {programs.length > 0 && (
          <Select value={filterProgram} onValueChange={setFilterProgram}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {programs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-xs py-2">Trainee</TableHead>
              <TableHead className="text-xs py-2">Phone</TableHead>
              <TableHead className="text-xs py-2">Student ID</TableHead>
              <TableHead className="text-xs py-2">Program</TableHead>
              <TableHead className="text-xs py-2">Status</TableHead>
              <TableHead className="text-xs py-2">Source</TableHead>
              <TableHead className="text-xs py-2">Enrolled</TableHead>
              <TableHead className="text-xs py-2 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">Loading…</TableCell></TableRow>
            ) : students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  {allStudents.length === 0 ? (
                    <div className="flex flex-col items-center gap-2">
                      <GraduationCap className="h-7 w-7 opacity-20" />
                      <p className="text-sm font-medium">No trainees on record</p>
                      <p className="text-xs">Add a trainee manually or bulk-upload from CSV.</p>
                    </div>
                  ) : <span className="text-sm">No trainees match your filters.</span>}
                </TableCell>
              </TableRow>
            ) : students.map(s => (
              <TableRow key={s.id}>
                <TableCell className="py-2">
                  <p className="font-medium text-sm">{s.fullName}</p>
                  {s.email && <p className="text-xs text-muted-foreground">{s.email}</p>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground py-2">{s.phone || '—'}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground py-2">{s.studentId || '—'}</TableCell>
                <TableCell className="py-2">
                  <Badge variant="outline" className="text-xs">{s.program}</Badge>
                </TableCell>
                <TableCell className="py-2"><StatusDot active={s.status === 'active'} /></TableCell>
                <TableCell className="py-2">
                  <Badge variant={SOURCE_LABELS[s.createdSource]?.variant ?? 'secondary'} className="text-xs">
                    {SOURCE_LABELS[s.createdSource]?.label ?? 'Unknown'}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground py-2">
                  {s.enrolledAt ? new Date(s.enrolledAt).toLocaleDateString() : '—'}
                </TableCell>
                <TableCell className="py-2 text-right">
                  <Button
                    variant="outline" size="sm" className={`h-7 text-xs ${s.status === 'active' ? 'text-destructive hover:text-destructive' : 'text-emerald-600 hover:text-emerald-600'}`}
                    onClick={() => toggleStatus.mutate(s)} disabled={toggleStatus.isPending}
                  >
                    {s.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CreateStudentDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={invalidate}
      />
      <BulkUploadDialog
        open={showBulk}
        onClose={() => setShowBulk(false)}
        onUploaded={invalidate}
      />
    </div>
  );
}

// ── Instructors Tab ──────────────────────────────────────────────────────────

const INSTRUCTOR_SPECIALIZATIONS = ['CPL', 'PPL', 'IR', 'ME', 'Night Rating', 'FI', 'ATPL Ground', 'TRI', 'SFI'];

export interface InstructorLocal {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  instructor_code: string;
  specializations: string[];
  license_number: string;
  license_expiry: string;
  notes: string;
  status: 'active' | 'inactive';
  created_at: string;
}

function CreateInstructorDialog({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const blank = { full_name: '', email: '', password: '', phone: '', instructor_code: '',
    specializations: [] as string[], license_number: '', license_expiry: '', notes: '' };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');

  const toggleSpec = (s: string) =>
    setForm(f => ({
      ...f,
      specializations: f.specializations.includes(s)
        ? f.specializations.filter(x => x !== s)
        : [...f.specializations, s],
    }));

  const mutation = useMutation({
    mutationFn: () => createInstructor({
      full_name: form.full_name,
      email: form.email,
      password: form.password || undefined,
      phone: form.phone || undefined,
      instructor_code: form.instructor_code || undefined,
      specializations: form.specializations,
      license_number: form.license_number || undefined,
      license_expiry: form.license_expiry || undefined,
      notes: form.notes || undefined,
    }),
    onSuccess: () => { onCreated(); onClose(); setForm(blank); setError(''); },
    onError: (e: any) => setError(e?.response?.data?.detail ?? 'Failed to create instructor'),
  });

  const handleSubmit = () => {
    if (!form.full_name || !form.email) {
      setError('Full name and email are required.');
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Instructor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Account is created immediately — no email confirmation required.
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Capt. John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="instructor@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Password{' '}
                <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Leave blank to auto-generate"
              />
              <p className="text-xs text-muted-foreground">
                If blank: email-prefix + last 4 digits of phone
              </p>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+91 9876543210"
              />
            </div>
            <div className="space-y-2">
              <Label>Instructor Code <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                value={form.instructor_code}
                onChange={e => setForm(f => ({ ...f, instructor_code: e.target.value }))}
                placeholder="INST-001"
              />
            </div>
            <div className="space-y-2">
              <Label>License Number</Label>
              <Input
                value={form.license_number}
                onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))}
                placeholder="CPL/12345"
              />
            </div>
            <div className="space-y-2">
              <Label>License Expiry</Label>
              <Input
                type="date"
                value={form.license_expiry}
                onChange={e => setForm(f => ({ ...f, license_expiry: e.target.value }))}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Specializations</Label>
              <div className="flex flex-wrap gap-2">
                {INSTRUCTOR_SPECIALIZATIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSpec(s)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      form.specializations.includes(s)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any additional notes…"
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create Instructor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InstructorsTab() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSpec, setFilterSpec] = useState('all');

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout((handleSearch as any)._t);
    (handleSearch as any)._t = setTimeout(() => setDebouncedSearch(v), 400);
  };

  const { data: allInstructors = [], isLoading } = useQuery({
    queryKey: ['admin-instructors', debouncedSearch, filterStatus],
    queryFn: () => getInstructors({
      search: debouncedSearch || undefined,
      status: filterStatus !== 'all' ? filterStatus : undefined,
    }),
  });

  const allSpecs = [...new Set(allInstructors.flatMap(i => i.specializations))];
  const instructors = filterSpec === 'all'
    ? allInstructors
    : allInstructors.filter(i => i.specializations.includes(filterSpec));
  const totalActive = allInstructors.filter(i => i.status === 'active').length;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-instructors'] });

  const toggleStatus = useMutation({
    mutationFn: (i: InstructorRecord) =>
      i.status === 'active' ? deactivateInstructor(i.id) : activateInstructor(i.id),
    onSuccess: invalidate,
  });

  const totalInactive = allInstructors.length - totalActive;

  return (
    <div className="space-y-4">
      {/* Aviation Header */}
      <AviationHeader
        category="Instructor Operations"
        title="Instructor Roster"
        description="Certified flight instructors and their licence status"
        stats={[
          { value: allInstructors.length, label: 'TOTAL' },
          { value: totalActive, label: 'ACTIVE' },
          { value: totalInactive, label: 'INACTIVE' },
        ]}
        actions={
          <Button
            size="sm"
            onClick={() => setShowCreate(true)}
            className="h-8 bg-white text-blue-950 hover:bg-blue-50 text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Instructor
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search name, email, code…"
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        {allSpecs.length > 0 && (
          <Select value={filterSpec} onValueChange={setFilterSpec}>
            <SelectTrigger className="w-44 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Specializations</SelectItem>
              {allSpecs.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground py-2">Instructor</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground py-2">Contact</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground py-2">Code</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground py-2">Specializations</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground py-2">Licence</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground py-2">Status</TableHead>
              <TableHead className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground py-2 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">Loading…</TableCell></TableRow>
            ) : instructors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  {allInstructors.length === 0 ? (
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 opacity-30" />
                      <p className="text-sm font-medium">No instructors yet</p>
                      <p className="text-xs">Add your first instructor to get started.</p>
                    </div>
                  ) : (
                    <p className="text-sm">No instructors match your filters.</p>
                  )}
                </TableCell>
              </TableRow>
            ) : instructors.map(inst => (
              <TableRow key={inst.id} className="hover:bg-muted/30">
                <TableCell className="py-2">
                  <p className="font-medium text-sm">{inst.fullName}</p>
                </TableCell>
                <TableCell className="py-2">
                  <p className="text-sm">{inst.email}</p>
                  {inst.phone && <p className="text-xs text-muted-foreground">{inst.phone}</p>}
                </TableCell>
                <TableCell className="py-2">
                  <span className="text-sm font-mono">{inst.instructorCode || '—'}</span>
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex flex-wrap gap-1">
                    {inst.specializations.length > 0
                      ? inst.specializations.map(s => (
                          <span key={s} className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                            {s}
                          </span>
                        ))
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <p className="text-sm">{inst.licenseNumber || '—'}</p>
                  {inst.licenseExpiry && (
                    <p className="text-xs text-muted-foreground">
                      Exp: {new Date(inst.licenseExpiry).toLocaleDateString()}
                    </p>
                  )}
                </TableCell>
                <TableCell className="py-2">
                  <StatusDot active={inst.status === 'active'} />
                </TableCell>
                <TableCell className="py-2 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleStatus.mutate(inst)}
                    disabled={toggleStatus.isPending}
                    className={`h-7 text-xs ${inst.status === 'active'
                      ? 'text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/50'
                      : 'text-emerald-600 hover:text-emerald-600 border-emerald-300 hover:border-emerald-400'}`}
                  >
                    {inst.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CreateInstructorDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={invalidate}
      />
    </div>
  );
}

// ── Instructor-Student Mapping Tab ────────────────────────────────────────────

const MAX_TRAINEES_PER_INSTRUCTOR = 10;

function capacityStatus(count: number) {
  const pct = count / MAX_TRAINEES_PER_INSTRUCTOR;
  if (pct >= 1)   return { label: 'FULL',          dot: 'bg-red-500',     bar: 'bg-red-500',     badge: 'bg-red-50 text-red-700 border-red-200'     } as const;
  if (pct >= 0.7) return { label: 'NEAR CAPACITY', dot: 'bg-amber-500',   bar: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 border-amber-200' } as const;
  return            { label: 'AVAILABLE',          dot: 'bg-emerald-500', bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' } as const;
}

function InstructorMappingTab() {
  const qc = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [traineeSearch, setTraineeSearch] = useState('');

  const { data: studentsData } = useQuery({
    queryKey: ['admin-students-all'],
    queryFn: () => getStudents({ limit: 200 }),
  });
  const { data: instructorsData = [] } = useQuery({
    queryKey: ['admin-instructors'],
    queryFn: () => getInstructors(),
  });
  const { data: savedMappings = {}, isLoading: mappingLoading } = useQuery({
    queryKey: ['admin-mapping'],
    queryFn: getMapping,
  });

  const [pending, setPending] = useState<Record<string, string>>({});
  const [synced, setSynced] = useState(false);
  if (!synced && !mappingLoading && Object.keys(savedMappings).length >= 0) {
    setPending({ ...savedMappings });
    setSynced(true);
  }

  const saveMutation = useMutation({
    mutationFn: () => saveMapping(pending),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-mapping'] });
      setSynced(false);
    },
  });

  const students        = studentsData?.data ?? [];
  const activeInstructors = instructorsData.filter(i => i.status === 'active');
  const hasChanges      = JSON.stringify(pending) !== JSON.stringify(savedMappings);
  const totalAssigned   = Object.values(pending).filter(Boolean).length;

  // Trainee counts keyed by instructor userId
  const traineeCounts: Record<string, number> = {};
  for (const uid of Object.values(pending)) {
    if (uid) traineeCounts[uid] = (traineeCounts[uid] ?? 0) + 1;
  }

  const selectedInstructor = activeInstructors.find(i => i.userId === selectedUserId) ?? null;
  const selectedCount      = selectedUserId ? (traineeCounts[selectedUserId] ?? 0) : 0;
  const isFull             = selectedCount >= MAX_TRAINEES_PER_INSTRUCTOR;

  const assignedToSelected  = students.filter(s => selectedUserId && pending[s.id] === selectedUserId);
  const unassignedFiltered  = students.filter(s => {
    if (pending[s.id]) return false;
    if (!traineeSearch) return true;
    const q = traineeSearch.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      (s.email ?? '').toLowerCase().includes(q) ||
      (s.phone ?? '').includes(q) ||
      (s.studentId ?? '').toLowerCase().includes(q)
    );
  });

  const assign   = (profileId: string) => {
    if (!selectedUserId || isFull) return;
    setPending(p => ({ ...p, [profileId]: selectedUserId }));
  };
  const unassign = (profileId: string) =>
    setPending(p => { const { [profileId]: _, ...rest } = p; return rest; });

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Operations header bar */}
      <div className="rounded-lg border border-blue-900/30 bg-blue-950 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-blue-400 uppercase mb-0.5">
              Flight Training Operations
            </p>
            <h2 className="text-white font-bold text-base tracking-wide">
              Trainee Assignment Console
            </h2>
            <p className="text-blue-400 text-xs mt-0.5">
              Max {MAX_TRAINEES_PER_INSTRUCTOR} trainees per instructor · unsaved changes shown in amber
            </p>
          </div>

          <div className="flex items-center gap-5">
            {/* Live stats */}
            <div className="grid grid-cols-3 gap-4 text-center border-r border-blue-800 pr-5">
              {[
                { val: students.length,               label: 'TRAINEES'   },
                { val: activeInstructors.length,      label: 'INSTRUCTORS' },
                { val: students.length - totalAssigned, label: 'UNASSIGNED' },
              ].map(({ val, label }) => (
                <div key={label}>
                  <p className="text-white text-xl font-bold leading-none">{val}</p>
                  <p className="text-blue-400 text-[9px] font-semibold tracking-widest mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Save / discard */}
            {hasChanges ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-blue-700 text-blue-200 hover:bg-blue-900 hover:text-white"
                  onClick={() => setPending({ ...savedMappings })}
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  className="text-xs bg-blue-500 hover:bg-blue-400 text-white font-semibold"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? 'Saving…' : 'Commit Changes'}
                </Button>
              </div>
            ) : (
              <span className="text-[10px] text-blue-500 font-semibold tracking-widest">SAVED</span>
            )}
          </div>
        </div>
      </div>

      {/* No data state */}
      {(students.length === 0 || activeInstructors.length === 0) && (
        <div className="rounded-lg border border-dashed py-14 flex flex-col items-center gap-2 text-muted-foreground">
          <Plane className="h-7 w-7 opacity-20" />
          <p className="text-sm font-medium">
            {students.length === 0 && activeInstructors.length === 0
              ? 'No trainees or instructors on record'
              : students.length === 0 ? 'No trainee records found'
              : 'No active instructors found'}
          </p>
          <p className="text-xs text-center max-w-xs">
            Add trainees in the Students tab and instructors in the Instructors tab before assigning.
          </p>
        </div>
      )}

      {students.length > 0 && activeInstructors.length > 0 && (
        <div className="grid grid-cols-12 gap-4 items-start">

          {/* ── Left panel: Instructor roster ── */}
          <div className="col-span-4 space-y-2">
            <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase px-0.5 mb-1">
              Instructor Roster
            </p>

            {activeInstructors.map(inst => {
              const count    = traineeCounts[inst.userId] ?? 0;
              const status   = capacityStatus(count);
              const pct      = Math.min((count / MAX_TRAINEES_PER_INSTRUCTOR) * 100, 100);
              const selected = selectedUserId === inst.userId;

              return (
                <button
                  key={inst.id}
                  onClick={() => {
                    setSelectedUserId(selected ? null : inst.userId);
                    setTraineeSearch('');
                  }}
                  className={`w-full text-left rounded-lg border px-4 py-3 transition-all ${
                    selected
                      ? 'border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-400/30'
                      : 'border-border bg-card hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{inst.fullName}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {inst.instructorCode
                          ? `${inst.instructorCode} · ${inst.email}`
                          : inst.email}
                      </p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full border ${status.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${status.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Trainees</span>
                      <span className="text-[11px] font-semibold text-foreground tabular-nums">
                        {count} / {MAX_TRAINEES_PER_INSTRUCTOR}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Right panel: Assignment workspace ── */}
          <div className="col-span-8 space-y-4">

            {!selectedInstructor ? (
              <div className="rounded-lg border border-dashed h-72 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Plane className="h-7 w-7 opacity-20" />
                <p className="text-sm font-medium">Select a flight instructor</p>
                <p className="text-xs">Choose from the roster to manage their trainee assignments</p>
              </div>
            ) : (
              <>
                {/* Selected instructor header */}
                <div className="rounded-lg border bg-card px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-sm">{selectedInstructor.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedInstructor.specializations?.length > 0
                        ? selectedInstructor.specializations.join(' · ')
                        : selectedInstructor.email}
                    </p>
                  </div>
                  {(() => {
                    const s = capacityStatus(selectedCount);
                    return (
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${s.badge}`}>
                        <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                        {selectedCount} / {MAX_TRAINEES_PER_INSTRUCTOR} · {s.label}
                      </span>
                    );
                  })()}
                </div>

                {/* Capacity full warning */}
                {isFull && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 flex items-center gap-2 text-sm text-amber-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Instructor capacity reached — unassign a trainee before adding another.
                  </div>
                )}

                {/* Section: Assigned trainees */}
                <div>
                  <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase px-0.5 mb-2">
                    Assigned Trainees ({assignedToSelected.length})
                  </p>
                  {assignedToSelected.length === 0 ? (
                    <div className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
                      No trainees assigned yet. Use the search below to assign.
                    </div>
                  ) : (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead className="text-xs py-2">Trainee</TableHead>
                            <TableHead className="text-xs py-2">Phone</TableHead>
                            <TableHead className="text-xs py-2">Student ID</TableHead>
                            <TableHead className="text-xs py-2">Program</TableHead>
                            <TableHead className="w-10 py-2" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assignedToSelected.map(s => (
                            <TableRow key={s.id}>
                              <TableCell className="py-2">
                                <p className="text-sm font-medium leading-tight">{s.fullName}</p>
                                {s.email && <p className="text-xs text-muted-foreground">{s.email}</p>}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground py-2">{s.phone || '—'}</TableCell>
                              <TableCell className="text-xs text-muted-foreground py-2">{s.studentId || '—'}</TableCell>
                              <TableCell className="py-2">
                                <Badge variant="outline" className="text-xs">{s.program}</Badge>
                              </TableCell>
                              <TableCell className="py-2">
                                <button
                                  onClick={() => unassign(s.id)}
                                  title="Remove assignment"
                                  className="text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {/* Section: Add trainees */}
                {!isFull && (
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase px-0.5 mb-2">
                      Add Trainees
                    </p>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={traineeSearch}
                        onChange={e => setTraineeSearch(e.target.value)}
                        placeholder="Search by name, email, phone, or student ID…"
                        className="pl-9 text-sm"
                      />
                    </div>

                    {unassignedFiltered.length === 0 ? (
                      <div className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
                        {traineeSearch
                          ? 'No unassigned trainees match your search.'
                          : 'All trainees are currently assigned to an instructor.'}
                      </div>
                    ) : (
                      <div className="rounded-lg border overflow-hidden">
                        <div className="max-h-60 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/40 hover:bg-muted/40">
                                <TableHead className="text-xs py-2">Trainee</TableHead>
                                <TableHead className="text-xs py-2">Phone</TableHead>
                                <TableHead className="text-xs py-2">Student ID</TableHead>
                                <TableHead className="text-xs py-2">Program</TableHead>
                                <TableHead className="w-16 py-2" />
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {unassignedFiltered.map(s => (
                                <TableRow key={s.id} className="hover:bg-blue-50/50">
                                  <TableCell className="py-2">
                                    <p className="text-sm font-medium leading-tight">{s.fullName}</p>
                                    {s.email && <p className="text-xs text-muted-foreground">{s.email}</p>}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground py-2">{s.phone || '—'}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground py-2">{s.studentId || '—'}</TableCell>
                                  <TableCell className="py-2">
                                    <Badge variant="outline" className="text-xs">{s.program}</Badge>
                                  </TableCell>
                                  <TableCell className="py-2">
                                    <button
                                      onClick={() => assign(s.id)}
                                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors whitespace-nowrap"
                                    >
                                      + Assign
                                    </button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const { user, hasPermission } = useAuth();


  if (!hasPermission('admin:users_read') && !hasPermission('admin:roles_read') && !hasPermission('admin:tenant_settings')) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-sm w-full">
          <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
            <XCircle className="h-8 w-8 text-destructive" />
            <p className="font-medium">Access Denied</p>
            <p className="text-sm text-muted-foreground text-center">Admin privileges required to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue={hasPermission('admin:tenant_settings') ? 'organisation' : hasPermission('admin:users_read') ? 'users' : 'roles'} className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          {hasPermission('admin:tenant_settings') && (
            <TabsTrigger value="organisation" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Building2 className="h-4 w-4" />
              <span>Organisation</span>
            </TabsTrigger>
          )}
          {hasPermission('admin:users_read') && (
            <TabsTrigger value="users" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              <span>Users</span>
            </TabsTrigger>
          )}
          {hasPermission('admin:users_read') && (
            <TabsTrigger value="students" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <GraduationCap className="h-4 w-4" />
              <span>Students</span>
            </TabsTrigger>
          )}
          {hasPermission('admin:users_read') && (
            <TabsTrigger value="instructors" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Plane className="h-4 w-4" />
              <span>Instructors</span>
            </TabsTrigger>
          )}
          {hasPermission('admin:users_read') && (
            <TabsTrigger value="mapping" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Lock className="h-4 w-4" />
              <span>Mapping</span>
            </TabsTrigger>
          )}
          {hasPermission('admin:roles_read') && (
            <TabsTrigger value="roles" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <ShieldCheck className="h-4 w-4" />
              <span>Roles</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="system" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Database className="h-4 w-4" />
            <span>System</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Palette className="h-4 w-4" />
            <span>Appearance</span>
          </TabsTrigger>
        </TabsList>

        {hasPermission('admin:tenant_settings') && (
          <TabsContent value="organisation">
            <OrganisationTab />
          </TabsContent>
        )}

        {hasPermission('admin:users_read') && (
          <TabsContent value="users">
            <UsersTab />
          </TabsContent>
        )}

        {hasPermission('admin:users_read') && (
          <TabsContent value="students">
            <StudentManagementTab />
          </TabsContent>
        )}

        {hasPermission('admin:users_read') && (
          <TabsContent value="instructors">
            <InstructorsTab />
          </TabsContent>
        )}

        {hasPermission('admin:users_read') && (
          <TabsContent value="mapping">
            <InstructorMappingTab />
          </TabsContent>
        )}

        {hasPermission('admin:roles_read') && (
          <TabsContent value="roles">
            <RolesTab />
          </TabsContent>
        )}

        <TabsContent value="system">
          <SystemTab />
        </TabsContent>

        <TabsContent value="appearance">
          <AppearanceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
