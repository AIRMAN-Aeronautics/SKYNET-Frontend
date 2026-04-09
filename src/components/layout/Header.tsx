import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ProfileDrawer } from './ProfileDrawer';
import { WeatherWidget } from './WeatherWidget';

export function Header() {
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const initials = user?.fullName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?';

  return (
    <>
      <header className="relative shrink-0 h-14 flex items-center justify-between overflow-hidden z-30 px-5">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" />
        {/* Ambient glow blobs */}
        <div className="absolute top-0 left-1/4 w-64 h-14 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/3 w-48 h-10 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
        {/* Bottom border */}
        <div className="absolute bottom-0 inset-x-0 h-px bg-white/10" />

        {/* Left: branding */}
        <div className="relative flex items-center gap-3 shrink-0">
          <span className="text-sm font-bold text-white tracking-widest whitespace-nowrap select-none uppercase">
            Skynet Academy
          </span>
        </div>

        {/* Center: weather + date/time */}
        <div className="relative flex-1 flex items-center justify-center">
          <WeatherWidget />
        </div>

        {/* Right: profile avatar */}
        <div className="relative shrink-0">
          <button
            onClick={() => setDrawerOpen(true)}
            title={user?.fullName ?? 'Profile'}
            aria-label="Open profile"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/30 border border-blue-400/40 text-white text-[11px] font-bold hover:bg-blue-500/50 transition-colors select-none"
          >
            {initials}
          </button>
        </div>
      </header>

      <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
