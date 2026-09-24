'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

const navItems = [
  { href: '/account', label: 'Overview', icon: OverviewIcon },
  { href: '/account/orders', label: 'Orders', icon: OrdersIcon },
  { href: '/account/profile', label: 'Profile', icon: ProfileIcon },
  { href: '/account/wishlist', label: 'Wishlist', icon: WishlistIcon },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setAuthStatus('authenticated');
      } else {
        setAuthStatus('unauthenticated');
        router.push('/auth/signin');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthStatus('authenticated');
      } else {
        setAuthStatus('unauthenticated');
        router.push('/auth/signin');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authStatus === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-body text-sm">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return null;
  }

  function isActive(href: string) {
    if (href === '/account') return pathname === '/account';
    return pathname.startsWith(href);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Mobile tab bar */}
      <nav className="md:hidden flex gap-1 mb-6 overflow-x-auto pb-2 border-b border-border scrollbar-hide">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-t text-xs font-display uppercase tracking-wider whitespace-nowrap transition-colors ${
              isActive(item.href)
                ? 'text-neon-cyan border-b-2 border-neon-cyan bg-neon-cyan/5'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden md:block w-56 shrink-0">
          <nav className="space-y-1 sticky top-24">
            <p className="font-display text-xs uppercase tracking-widest text-gray-600 mb-4 px-3">
              My Account
            </p>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-all duration-200 ${
                  isActive(item.href)
                    ? 'text-neon-cyan bg-neon-cyan/5 border border-neon-cyan/20 shadow-[0_0_10px_rgba(0,245,255,0.05)]'
                    : 'text-gray-400 hover:text-foreground hover:bg-surface-light border border-transparent'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

function OverviewIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function OrdersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function WishlistIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}
