import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/(auth)/actions";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: { default: "Admin", template: "%s | Swzzle admin" }, robots: { index: false } };

const NAV = [
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/import", label: "CSV import" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-12 max-w-[1400px] items-center gap-6 px-4 text-sm">
          <Link href="/admin/products" className="font-bold">
            Swzzle <span className="text-accent">admin</span>
          </Link>
          <nav className="flex gap-4">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="text-muted hover:text-fg">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <Link href="/" className="text-muted hover:text-fg" target="_blank">
              View site
            </Link>
            <form action={signOut}>
              <button className="text-muted hover:text-fg">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6">
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <AdminGate>{children}</AdminGate>
        </Suspense>
      </main>
    </div>
  );
}

// Second check after the proxy, so admin pages never render for non-admins.
async function AdminGate({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}
