import { useState } from 'react';
import { Lock, ArrowRight, AlertCircle } from 'lucide-react';

interface UnlockProps {
  onUnlock: () => void;
}

export function Unlock({ onUnlock }: UnlockProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (data.success) {
        // Store access in localStorage
        localStorage.setItem('site_access', 'granted');
        onUnlock();
      } else {
        setError('Invalid access code');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/hero.png)' }}
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo_w.png" alt="ACTO" className="h-10 mx-auto mb-4" />
          <p className="text-gray-300 text-sm">Early Access</p>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-stone-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-stone-600" />
            </div>
            <h1 className="text-xl font-medium text-gray-900 mb-2">Enter Access Code</h1>
            <p className="text-stone-500 text-sm">
              This site is currently in private beta.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Access code"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-lg text-gray-900 placeholder-stone-400 focus:outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200 transition-colors"
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !code}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Checking...' : 'Continue'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-6">
          Don't have a code? <a href="https://x.com/actoboticsnet" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">Contact us</a>
        </p>
      </div>
    </div>
  );
}

