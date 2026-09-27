'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  X, Lock, User as UserIcon, Mail, ShieldCheck,
  AlertCircle, CheckCircle2, Eye, EyeOff
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, initialTab = 'signin' }: AuthModalProps) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<'signin' | 'signup'>(initialTab);

  // Dedicated Form states
  const [signInIdentifier, setSignInIdentifier] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');

  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setTab(initialTab);
        setError(null);
        setSuccessMsg(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const ident = signInIdentifier.trim();
    if (!ident) {
      setError('Please enter your username or email.');
      return;
    }
    if (!signInPassword) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(ident, signInPassword);
      setSuccessMsg('Signed in successfully.');
      setTimeout(() => {
        onClose();
        setSignInPassword('');
      }, 350);
    } catch (err: any) {
      setError(err?.message || 'Invalid username/email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const u = signUpUsername.trim();
    const em = signUpEmail.trim();

    if (u.length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }
    if (!em.includes('@') || !em.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (signUpPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      await register(u, em, signUpPassword);
      setSuccessMsg('Account created successfully.');
      setTimeout(() => {
        onClose();
        setSignUpPassword('');
      }, 350);
    } catch (err: any) {
      setError(err?.message || 'Failed to create account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Authentication"
    >
      <div
        className="w-full max-w-md rounded-[6px] border border-[#242424] bg-[#121212] shadow-2xl overflow-hidden flex flex-col font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#242424] bg-[#0E0E0E]">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5]">
              {tab === 'signin' && 'SQL QUEST AUTHENTICATION'}
              {tab === 'signup' && 'INITIALIZE DEVELOPER ACCOUNT'}
            </h2>
            <p className="text-[11px] text-[#777777] mt-0.5">
              {tab === 'signin' && 'Resume your SQL challenge progress'}
              {tab === 'signup' && 'Track query solutions, streaks, and benchmarks'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-[2px] text-[#777777] hover:text-[#F5F5F5] hover:bg-[#1C1C1C] transition-colors"
            aria-label="Close modal"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 border-b border-[#242424] bg-[#0A0A0A] p-1 gap-1 text-xs">
          <button
            type="button"
            onClick={() => { setTab('signin'); setError(null); setSuccessMsg(null); }}
            className={`py-1.5 font-semibold rounded-[3px] transition-all duration-[120ms] ${
              tab === 'signin'
                ? 'bg-[#1C1C1C] text-[#F5F5F5] border border-[#333333]'
                : 'text-[#777777] hover:text-[#B0B0B0]'
            }`}
          >
            SIGN IN
          </button>
          <button
            type="button"
            onClick={() => { setTab('signup'); setError(null); setSuccessMsg(null); }}
            className={`py-1.5 font-semibold rounded-[3px] transition-all duration-[120ms] ${
              tab === 'signup'
                ? 'bg-[#1C1C1C] text-[#F5F5F5] border border-[#333333]'
                : 'text-[#777777] hover:text-[#B0B0B0]'
            }`}
          >
            CREATE ACCOUNT
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="rounded-[4px] border border-[#4A2020] bg-[#1A0E0E] p-2.5 flex items-start gap-2 text-xs text-[#FC8181]">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="rounded-[4px] border border-[#2E4A35] bg-[#0E1A12] p-2.5 flex items-start gap-2 text-xs text-[#48BB78]">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* SIGN IN FORM */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-3">
              <div>
                <label className="block text-[11px] text-[#888888] mb-1">
                  USERNAME OR EMAIL
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#555555]" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={signInIdentifier}
                    onChange={(e) => setSignInIdentifier(e.target.value)}
                    placeholder="spidey or engineer@domain.com"
                    className="w-full h-8 pl-8 pr-3 bg-[#0A0A0A] border border-[#222222] focus:border-[#FF6B00] rounded-[4px] text-xs text-[#F5F5F5] placeholder-[#444444] outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#888888] mb-1">
                  PASSWORD
                </label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#555555]" />
                  <input
                    type={showSignInPassword ? 'text' : 'password'}
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-8 pl-8 pr-8 bg-[#0A0A0A] border border-[#222222] focus:border-[#FF6B00] rounded-[4px] text-xs text-[#F5F5F5] placeholder-[#444444] outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute right-2.5 top-2 text-[#555555] hover:text-[#888888]"
                    title={showSignInPassword ? 'Hide password' : 'Show password'}
                  >
                    {showSignInPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-8 rounded-[4px] bg-[#FF6B00] hover:bg-[#E05F00] text-black font-bold text-xs tracking-tight transition-all duration-[120ms] disabled:opacity-50 active:scale-[0.98]"
                >
                  {isLoading ? 'VERIFYING CREDENTIALS...' : 'SIGN IN'}
                </button>
              </div>

              <p className="text-[11px] text-center text-[#666666] pt-1">
                New candidate?{' '}
                <button
                  type="button"
                  onClick={() => { setTab('signup'); setError(null); }}
                  className="text-[#FF6B00] hover:underline"
                >
                  Initialize account
                </button>
              </p>
            </form>
          )}

          {/* SIGN UP FORM */}
          {tab === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3">
              <div>
                <label className="block text-[11px] text-[#888888] mb-1">
                  USERNAME (MIN 3 CHARS)
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#555555]" />
                  <input
                    type="text"
                    required
                    autoFocus
                    minLength={3}
                    maxLength={30}
                    value={signUpUsername}
                    onChange={(e) => setSignUpUsername(e.target.value)}
                    placeholder="database_engineer"
                    className="w-full h-8 pl-8 pr-3 bg-[#0A0A0A] border border-[#222222] focus:border-[#FF6B00] rounded-[4px] text-xs text-[#F5F5F5] placeholder-[#444444] outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#888888] mb-1">
                  EMAIL ADDRESS
                </label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#555555]" />
                  <input
                    type="email"
                    required
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    placeholder="engineer@domain.com"
                    className="w-full h-8 pl-8 pr-3 bg-[#0A0A0A] border border-[#222222] focus:border-[#FF6B00] rounded-[4px] text-xs text-[#F5F5F5] placeholder-[#444444] outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#888888] mb-1">
                  PASSWORD (MIN 6 CHARS)
                </label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#555555]" />
                  <input
                    type={showSignUpPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-8 pl-8 pr-8 bg-[#0A0A0A] border border-[#222222] focus:border-[#FF6B00] rounded-[4px] text-xs text-[#F5F5F5] placeholder-[#444444] outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute right-2.5 top-2 text-[#555555] hover:text-[#888888]"
                    title={showSignUpPassword ? 'Hide password' : 'Show password'}
                  >
                    {showSignUpPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-8 rounded-[4px] bg-[#FF6B00] hover:bg-[#E05F00] text-black font-bold text-xs tracking-tight transition-all duration-[120ms] disabled:opacity-50 active:scale-[0.98]"
                >
                  {isLoading ? 'CREATING RECORD...' : 'INITIALIZE ACCOUNT'}
                </button>
              </div>

              <p className="text-[11px] text-center text-[#666666] pt-1">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => { setTab('signin'); setError(null); }}
                  className="text-[#FF6B00] hover:underline"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-[#202020] bg-[#0A0A0A] text-[10px] text-[#666666] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-[#38A169]" />
            <span>Encrypted JWT session tokens</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hover:text-[#B0B0B0] transition-colors"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
}
