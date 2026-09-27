'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { persistence, getCanonicalProblemId } from '@/lib/persistence';
import { api } from '@/lib/api';
import { ChapterGroup } from '@/lib/types';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { AuthModal } from '@/components/ui/AuthModal';
import {
  Database, BookOpen, BarChart3, LayoutDashboard,
  Search, LogOut, Menu, X
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [solvedCount, setSolvedCount] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const solvedSetRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    async function loadSolved(forceRefresh = false) {
      solvedSetRef.current = new Set<number>();
      try {
        const [localSolved, chaps] = await Promise.all([
          persistence.getSolvedIds().catch(() => [] as any[]),
          api.getChapters(forceRefresh).catch(() => [] as ChapterGroup[]),
        ]);
        const flatLevels = (chaps as ChapterGroup[]).flatMap((c: ChapterGroup) => c.levels || []);
        const backendSolved = flatLevels.filter((l) => l.passed).map((l) => l.id);
        const sourceList = Array.from(new Set([...backendSolved, ...localSolved]));
        for (const rawId of sourceList) {
          const canonical = getCanonicalProblemId(rawId, flatLevels);
          if (canonical >= 1 && canonical <= 100) {
            solvedSetRef.current.add(canonical);
          }
        }
        setSolvedCount(solvedSetRef.current.size);
      } catch {
        const solved = await persistence.getSolvedIds().catch(() => [] as any[]);
        for (const rawId of solved) {
          const canonical = getCanonicalProblemId(rawId);
          if (canonical >= 1 && canonical <= 100) {
            solvedSetRef.current.add(canonical);
          }
        }
        setSolvedCount(solvedSetRef.current.size);
      }
    }
    loadSolved();

    const handleProblemSolved = (e?: Event) => {
      const ce = e as CustomEvent<{ problemId?: number | string }>;
      if (ce?.detail?.problemId) {
        const canonical = getCanonicalProblemId(ce.detail.problemId);
        if (canonical >= 1 && canonical <= 100) {
          solvedSetRef.current.add(canonical);
          setSolvedCount(solvedSetRef.current.size);
        }
      }
      loadSolved(true);
    };

    const handleAuthLogout = () => {
      solvedSetRef.current.clear();
      setSolvedCount(0);
      loadSolved(true);
    };

    const handleAuthLogin = () => {
      solvedSetRef.current.clear();
      loadSolved(true);
    };

    window.addEventListener('sqlquest_auth_logout', handleAuthLogout);
    window.addEventListener('sqlquest_auth_login', handleAuthLogin);
    window.addEventListener('sqlquest_problem_solved', handleProblemSolved);
    return () => {
      window.removeEventListener('sqlquest_auth_logout', handleAuthLogout);
      window.removeEventListener('sqlquest_auth_login', handleAuthLogin);
      window.removeEventListener('sqlquest_problem_solved', handleProblemSolved);
    };
  }, [pathname, user]);

  // Global Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navLinks = [
    { href: '/', label: 'DASHBOARD', icon: LayoutDashboard, exact: true },
    { href: '/quest', label: 'CURRICULUM', icon: BookOpen, exact: false },
    { href: '/profile', label: 'TELEMETRY', icon: BarChart3, exact: false },
  ];

  const openAuth = (tab: 'signin' | 'signup') => {
    setAuthTab(tab);
    setAuthModalOpen(true);
  };

  return (
    <>
      <header className="sticky top-0 z-40 h-14 w-full bg-[#121212]/95 backdrop-blur-md border-b border-[#242424]">
        {/* Subtle Top Copper Seam Line */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#FF6B00]/40 to-transparent pointer-events-none" />

        <div className="flex h-full w-full items-center justify-between px-4 md:px-6">
          {/* Brand Mark & Main Nav */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2.5 group"
              aria-label="SQL Quest Home"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-[#1A1A1A] border border-[#2E2E2E] group-hover:border-[#FF6B00]/60 transition-colors duration-[120ms]">
                <Database className="h-3.5 w-3.5 text-[#FF6B00]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono font-bold text-sm tracking-tight text-[#F5F5F5] group-hover:text-white transition-colors">
                  SQL QUEST
                </span>
                <span className="font-mono text-[9px] text-[#666666] tracking-wider uppercase hidden sm:inline-block">
                  SQL MASTERCLASS
                </span>
              </div>
            </Link>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = link.exact
                  ? pathname === link.href
                  : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 rounded-[4px] px-3 py-1.5 text-xs font-mono font-medium transition-all duration-[120ms] ${
                      isActive
                        ? 'bg-[#1A1A1A] text-[#F5F5F5] border border-[#333333]'
                        : 'text-[#888888] hover:text-[#D4D4D4] hover:bg-[#161616]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Status Aperture & Actions */}
          <div className="flex items-center gap-3">
            {/* Command Palette Trigger */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] border border-[#262626] bg-[#0E0E0E] text-[#888888] hover:text-[#D4D4D4] hover:border-[#383838] transition-all duration-[120ms] text-xs font-mono"
            >
              <Search className="h-3 w-3 text-[#666666]" />
              <span className="text-[11px]">SEARCH SQL CHALLENGES</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.2 text-[9px] font-mono bg-[#1C1C1C] border border-[#2E2E2E] rounded-[2px] text-[#888888]">
                ⌘K
              </kbd>
            </button>

            {/* Monolithic Solved Progress Indicator */}
            <Link
              href="/quest"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] border border-[#262626] bg-[#0E0E0E] text-[#D4D4D4] hover:border-[#383838] text-xs font-mono transition-all duration-[120ms]"
              title="SQL Challenges Progress"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF6B00]" />
              <span className="font-bold text-[#F5F5F5]">{solvedCount}</span>
              <span className="text-[#666666]">SOLVED</span>
            </Link>

            {/* Auth / Profile State */}
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-2.5 py-1 rounded-[4px] border border-[#262626] bg-[#141414] text-[#D4D4D4] hover:border-[#383838] transition-all text-xs font-mono"
                >
                  <div className="h-4 w-4 rounded-[2px] bg-[#22140B] text-[#FF6B00] border border-[#3E2314] flex items-center justify-center font-bold text-[9px]">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline-block text-[11px]">{user.username}</span>
                </Link>
                <button
                  onClick={() => logout()}
                  className="p-1.5 rounded-[4px] text-[#777777] hover:text-[#FC8181] hover:bg-[#1A1A1A] transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuth('signin')}
                  className="px-2.5 py-1 rounded-[4px] text-xs font-mono text-[#888888] hover:text-[#F5F5F5] transition-colors"
                >
                  SIGN IN
                </button>
                <button
                  onClick={() => openAuth('signup')}
                  className="px-3 py-1 rounded-[4px] text-xs font-mono font-bold text-black bg-[#FF6B00] hover:bg-[#E05F00] transition-all duration-[120ms] active:scale-[0.98]"
                >
                  GET ACCESS
                </button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-[4px] text-[#888888] hover:text-white hover:bg-[#1A1A1A] transition-all"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[#242424] bg-[#121212] px-4 py-3 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-[4px] text-xs font-mono text-[#D4D4D4] hover:bg-[#1A1A1A] hover:text-white"
                >
                  <Icon className="h-3.5 w-3.5 text-[#FF6B00]" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Global Modals */}
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialTab={authTab} />
    </>
  );
}
