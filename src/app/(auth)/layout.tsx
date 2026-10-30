import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid flex-1 place-items-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="display text-3xl">
          Swzzle<span className="text-accent">.</span>
        </Link>
        <div className="mt-8 rounded-brand border border-line bg-surface p-6">{children}</div>
      </div>
    </main>
  );
}
