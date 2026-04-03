import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-black text-white">

      {/* LEFT SIDE */}
      <div className="relative hidden md:flex w-1/2 items-center justify-center overflow-hidden">

        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=1600&q=80')"
          }}
        />

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#020617]/90 via-[#0f172a]/90 to-black"></div>

        {/* Subtle Light Effect */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_30%,rgba(56,189,248,0.15),transparent)] animate-pulse"></div>

        {/* Glow */}
        <div className="absolute w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-3xl animate-pulse"></div>

        {/* ✈️ ANIMATION (CORRECT POSITION) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">

          {/* Plane Wrapper */}
          <div className="absolute bottom-0 left-0 animate-[planeFly_12s_cubic-bezier(0.4,0,0.2,1)_infinite]">

            {/* Contrail */}
            <div className="absolute top-1/2 left-[-140px] w-[140px] h-[2px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent blur-sm"></div>

            {/* Plane SVG */}
            <svg
              className="drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]"
              width="60"
              height="60"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M2 16l20-4-20-4v4h12l-12 0v4z"
                fill="#38bdf8"
              />
            </svg>
          </div>

          {/* Glow Following Plane */}
          <div className="absolute bottom-0 left-0 animate-[planeGlow_12s_linear_infinite] w-32 h-32 bg-cyan-400/20 rounded-full blur-3xl"></div>

          {/* Keyframes */}
          <style>
{`
  @keyframes planeFly {
    0% {
      transform: translate(0px, 0px) rotate(25deg) scale(0.8);
      opacity: 0;
    }

    10% { opacity: 1; }

    50% {
      transform: translate(200px, -120px) rotate(18deg) scale(0.95);
    }

    100% {
      transform: translate(500px, -300px) rotate(12deg) scale(1.1);
      opacity: 0;
    }
  }

  @keyframes planeGlow {
    0% {
      transform: translate(0px, 0px);
      opacity: 0;
    }

    10% { opacity: 1; }

    50% {
      transform: translate(200px, -120px);
    }

    100% {
      transform: translate(500px, -300px);
      opacity: 0;
    }
  }
`}
</style>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-lg px-10">

          <h1 className="text-4xl font-bold leading-tight text-white">
            Flight Training <br /> Reimagined
          </h1>

          <p className="mt-4 text-gray-300">
            Manage students, instructors, and training workflows with a modern AI-powered aviation platform.
          </p>

          <div className="mt-6 space-y-2 text-sm text-gray-300">
            <div>✈️ Instructor & Student Management</div>
            <div>📊 Real-time Training Insights</div>
            <div>🧠 AI-Powered Decision Support</div>
          </div>

        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex w-full md:w-1/2 items-center justify-center p-6 relative">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(56,189,248,0.15),transparent)]"></div>

        <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">Skynet Academy</h1>
            <p className="mt-2 text-sm text-gray-400">
              AI-Powered Flight Training System
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Email</label>
              <input
                type="email"
                placeholder="admin@academy.com"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                {...register('password', { required: 'Password is required' })}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-cyan-500/30 hover:scale-[1.02] transition-all duration-200 disabled:opacity-60"
            >
              {loading ? 'Initializing System…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-500">
            Secure AI Authentication Enabled
          </p>
        </div>
      </div>
    </div>
  );
}