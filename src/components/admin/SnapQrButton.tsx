"use client";

import { useState, useTransition } from "react";
import { getSnapQr } from "@/app/admin/products/actions";

export function SnapQrButton({ variantId }: { variantId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const download = () =>
    start(async () => {
      setError(null);
      const res = await getSnapQr(variantId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const a = document.createElement("a");
      a.href = res.dataUrl;
      a.download = res.filename;
      a.click();
    });

  return (
    <span className="inline-flex flex-col">
      <button type="button" onClick={download} disabled={pending} className="btn btn-ghost btn-sm whitespace-nowrap">
        {pending ? "…" : "Download Snap QR"}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
