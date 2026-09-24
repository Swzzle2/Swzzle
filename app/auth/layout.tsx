// Auth pages depend on the visitor's session; never prerender them at build time.
// The pages themselves are client components, which can't export segment config.
export const dynamic = 'force-dynamic';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
