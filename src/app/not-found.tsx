import Link from "next/link";

export default function NotFound() {
  return (
    <section className="container-swz py-24">
      <div className="eyebrow">404</div>
      <h1 className="display mt-2 text-5xl">Not found</h1>
      <p className="mt-3 text-muted">That page or product isn&apos;t available.</p>
      <Link href="/" className="btn mt-6">Home</Link>
    </section>
  );
}
