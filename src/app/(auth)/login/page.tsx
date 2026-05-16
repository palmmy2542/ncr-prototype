'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError('Invalid email or password.');
    } else {
      router.push('/inbox');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="w-full max-w-sm bg-white border border-stone-200 rounded-xl p-8 shadow-sm">
        <div className="font-mono text-xs font-medium text-emerald-700 tracking-widest mb-1">
          NCR//SYSTEM
        </div>
        <h1 className="text-xl font-semibold text-stone-900 mb-1">Sign in</h1>
        <p className="text-sm text-stone-500 mb-6">Internal use only</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">
              Email
            </label>
            <input
              type="email"
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-md outline-none focus:border-emerald-600 transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">
              Password
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-md outline-none focus:border-emerald-600 transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white text-sm font-medium rounded-md transition-colors"
          >
            {loading ? 'Signing in…' : 'Continue →'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-stone-100">
          <p className="text-xs text-stone-400 font-mono">
            Test accounts — password: <span className="text-stone-600">password123</span>
          </p>
          <div className="mt-2 space-y-1">
            {[
              ['alice@company.com', 'Foreman'],
              ['bob@company.com', 'Foreman Head'],
              ['carol@company.com', 'PM'],
              ['david@company.com', 'AMD'],
              ['admin@company.com', 'Admin'],
            ].map(([em, role]) => (
              <button
                key={em}
                type="button"
                onClick={() => { setEmail(em); setPassword('password123'); }}
                className="block w-full text-left text-xs text-stone-400 hover:text-emerald-700 font-mono transition-colors"
              >
                {em} <span className="text-stone-300">·</span> {role}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
