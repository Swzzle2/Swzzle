// Admin pages are per-request and auth-gated; never prerender them at build time.
export const dynamic = 'force-dynamic';

export default function HQLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-auto">
      {children}
    </div>
  );
}
