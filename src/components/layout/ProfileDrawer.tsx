import { X, LogOut, Mail, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ProfileDrawer({ open, onClose }: Props) {
  const { user, logout } = useAuth();

  const initials = user?.fullName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?';

  const roleLabel = user?.roles.map(r => r.name).join(', ') || user?.role || '—';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/25 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 z-50 flex h-full w-72 flex-col border-l bg-card shadow-2xl
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Drawer header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
          <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
            My Profile
          </p>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Profile card */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Avatar + name row */}
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold select-none">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">
                {user?.fullName ?? '—'}
              </p>
              <p className="truncate text-xs text-muted-foreground mt-0.5">
                {roleLabel}
              </p>
            </div>
          </div>

          {/* Detail rows */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-[9px] font-bold tracking-[0.15em] text-muted-foreground uppercase mb-0.5">
                  Email
                </p>
                <p className="text-xs text-foreground truncate">
                  {user?.email ?? '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <Shield className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-[9px] font-bold tracking-[0.15em] text-muted-foreground uppercase mb-0.5">
                  Role
                </p>
                <p className="text-xs text-foreground truncate">
                  {roleLabel}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="shrink-0 border-t p-4">
          <button
            onClick={() => { logout(); onClose(); }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
