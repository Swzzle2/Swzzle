import Link from "next/link";

const NAV = [
  { href: "/industrial", label: "Industrial" },
  { href: "/consumer", label: "Consumer" },
  { href: "/sds", label: "SDS" },
  { href: "/about", label: "About" },
];

export function Header() {
  return (
    <header className="border-b border-line">
      <div className="container-swz flex h-16 items-center justify-between gap-6">
        <Link href="/" className="display text-2xl tracking-tight">
          Swzzle<span className="text-accent">.</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm font-semibold uppercase tracking-wider">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-muted hover:text-accent">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
