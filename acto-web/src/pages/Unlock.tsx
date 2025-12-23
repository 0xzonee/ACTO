import { useState } from 'react';
import { Lock, ArrowRight, AlertCircle, Github, X } from 'lucide-react';
import { FaXTwitter } from 'react-icons/fa6';

interface UnlockProps {
  onUnlock: () => void;
}

// Modal Component for Privacy and Terms
function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-medium text-gray-900">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

// Privacy Policy Content
function PrivacyContent() {
  return (
    <div className="prose prose-sm prose-gray max-w-none">
      <p className="text-xs text-gray-400 mb-4">Last updated: December 2025</p>
      
      <h3 className="text-lg font-medium mb-3 text-gray-900">1. Introduction</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        ACTO ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, 
        use, disclose, and safeguard your information when you use our proof-of-execution platform.
      </p>

      <h3 className="text-lg font-medium mb-3 text-gray-900">2. Information We Collect</h3>
      <ul className="list-disc pl-5 mb-4 text-gray-600 text-sm space-y-1">
        <li><strong>Wallet Addresses:</strong> Public wallet address for authentication</li>
        <li><strong>API Keys:</strong> Generated and stored for API authentication</li>
        <li><strong>Proof Data:</strong> Cryptographic proofs you submit</li>
        <li><strong>Usage Data:</strong> API request logs and analytics</li>
      </ul>

      <h3 className="text-lg font-medium mb-3 text-gray-900">3. What We Don't Collect</h3>
      <ul className="list-disc pl-5 mb-4 text-gray-600 text-sm space-y-1">
        <li>Private keys (never collected or stored)</li>
        <li>Raw sensor data (processed locally)</li>
        <li>Personal identification information</li>
      </ul>

      <h3 className="text-lg font-medium mb-3 text-gray-900">4. Data Security</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        All data in transit is encrypted using TLS 1.3. Sensitive data at rest is encrypted using AES-256. 
        We use Ed25519 cryptographic signatures for secure authentication.
      </p>

      <h3 className="text-lg font-medium mb-3 text-gray-900">5. Your Rights</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        You have the right to access, correct, delete, and export your data. Contact us at privacy@actobotics.net 
        to exercise these rights.
      </p>

      <h3 className="text-lg font-medium mb-3 text-gray-900">6. Contact</h3>
      <p className="text-gray-600 text-sm leading-relaxed">
        Questions? Email us at privacy@actobotics.net
      </p>
    </div>
  );
}

// Terms of Service Content
function TermsContent() {
  return (
    <div className="prose prose-sm prose-gray max-w-none">
      <p className="text-xs text-gray-400 mb-4">Last updated: December 2025</p>
      
      <h3 className="text-lg font-medium mb-3 text-gray-900">1. Agreement to Terms</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        By accessing or using ACTO's Services, you agree to be bound by these Terms. If you disagree with any part, 
        you may not access the Services.
      </p>

      <h3 className="text-lg font-medium mb-3 text-gray-900">2. Description of Services</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        ACTO provides a proof-of-execution platform for autonomous systems including: Python SDK, REST API, 
        Dashboard, CLI Tools, and Fleet Management.
      </p>

      <h3 className="text-lg font-medium mb-3 text-gray-900">3. Eligibility</h3>
      <ul className="list-disc pl-5 mb-4 text-gray-600 text-sm space-y-1">
        <li>Be at least 18 years of age</li>
        <li>Have legal capacity to enter contracts</li>
        <li>Have a valid Solana wallet for dashboard access</li>
        <li>Hold required ACTO token balance (50,000 ACTO)</li>
      </ul>

      <h3 className="text-lg font-medium mb-3 text-gray-900">4. Acceptable Use</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        You agree not to use the Services for unlawful purposes, submit fraudulent proofs, attempt unauthorized access, 
        or interfere with the Services.
      </p>

      <h3 className="text-lg font-medium mb-3 text-gray-900">5. Intellectual Property</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        The ACTO SDK and CLI are released under MIT License. You retain ownership of your data and proofs.
      </p>

      <h3 className="text-lg font-medium mb-3 text-gray-900">6. Disclaimers</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        The Services are provided "AS IS" without warranties. Cryptographic proofs are mathematical attestations 
        and do not constitute legal proof.
      </p>

      <h3 className="text-lg font-medium mb-3 text-gray-900">7. Limitation of Liability</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        ACTO shall not be liable for indirect, incidental, special, or consequential damages resulting from 
        your use of the Services.
      </p>

      <h3 className="text-lg font-medium mb-3 text-gray-900">8. Contact</h3>
      <p className="text-gray-600 text-sm leading-relaxed">
        Questions? Email us at legal@actobotics.net
      </p>
    </div>
  );
}

export function Unlock({ onUnlock }: UnlockProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

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
        <div className="flex items-center justify-center gap-4 mt-6">
          <a 
            href="https://x.com/actoboticsnet" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="X (Twitter)"
          >
            <FaXTwitter size={20} />
          </a>
          <a 
            href="https://github.com/actobotics" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="GitHub"
          >
            <Github size={20} />
          </a>
        </div>
        
        {/* Legal Links */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <button 
            onClick={() => setShowPrivacy(true)}
            className="text-white/70 hover:text-white transition-colors text-xs"
          >
            Privacy
          </button>
          <span className="text-white/50">·</span>
          <button 
            onClick={() => setShowTerms(true)}
            className="text-white/70 hover:text-white transition-colors text-xs"
          >
            Terms
          </button>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} title="Privacy Policy">
        <PrivacyContent />
      </Modal>
      
      <Modal isOpen={showTerms} onClose={() => setShowTerms(false)} title="Terms of Service">
        <TermsContent />
      </Modal>
    </div>
  );
}

