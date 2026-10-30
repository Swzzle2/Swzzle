import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <section className="container-swz max-w-3xl py-12">
      <div className="eyebrow">About</div>
      <h1 className="display mt-2 text-5xl">Swzzle</h1>
      <div className="prose-swz mt-6 text-lg text-muted">
        <p>Copy coming soon.</p>
      </div>
    </section>
  );
}
