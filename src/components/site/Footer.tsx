import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="container-swz flex flex-col gap-6 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="display text-3xl">
            Swzzle<span className="text-accent">.</span>
          </div>
          <p className="mt-2 text-accent font-semibold">stirring up business as usual.</p>
        </div>
        <nav className="flex flex-wrap gap-5 text-sm text-muted">
          <Link href="/industrial" className="hover:text-fg">Industrial</Link>
          <Link href="/consumer" className="hover:text-fg">Consumer</Link>
          <Link href="/sds" className="hover:text-fg">SDS library</Link>
          <Link href="/about" className="hover:text-fg">About</Link>
        </nav>
      </div>
    </footer>
  );
}
