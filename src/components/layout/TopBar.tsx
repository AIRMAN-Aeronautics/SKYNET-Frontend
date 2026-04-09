import { Bell, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function TopBar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-9 items-center justify-between border-b bg-card px-4">
      <div />
      <div className="flex items-center gap-1">
        <button
          className="relative rounded-full p-1 hover:bg-accent"
          aria-label="Notifications"
        >
          <Bell className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-accent"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
