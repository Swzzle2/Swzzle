import AccountShell from './AccountShell';

// Account pages are per-user; never prerender them at build time.
// The shell is a client component, which can't export segment config.
export const dynamic = 'force-dynamic';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
