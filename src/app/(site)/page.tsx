import Link from "next/link";

export default function Home() {
  return (
    <>
      <section className="container-swz py-20 sm:py-28">
        <div className="eyebrow">Industrial and consumer cleaning chemicals</div>
        <h1 className="display mt-4 text-6xl sm:text-8xl">
          Clean,
          <br />
          <span className="text-accent">harder.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted">
          Professional-grade degreasers, floor care and specialty cleaners for maintenance teams, plus a consumer line
          for the rest of us.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/industrial" className="btn">Shop industrial</Link>
          <Link href="/consumer" className="btn btn-ghost">Shop consumer</Link>
        </div>
      </section>

      <section className="container-swz grid gap-4 sm:grid-cols-3">
        {[
          { href: "/industrial", title: "Industrial / MRO", body: "Bulk sizes and pails for facilities, fleets and plants." },
          { href: "/consumer", title: "Consumer", body: "The same chemistry, sized for home and garage." },
          { href: "/sds", title: "SDS library", body: "Every safety data sheet, one search away." },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-brand border border-line bg-surface p-6 hover:border-accent"
          >
            <h2 className="display text-2xl">{card.title}</h2>
            <p className="mt-2 text-sm text-muted">{card.body}</p>
          </Link>
        ))}
      </section>
    </>
  );
}
