import { ghsInfo } from "@/lib/ghs";

/**
 * Placeholder GHS diamond: red border, code inside. Swap for official artwork by
 * adding /public/ghs/GHSxx.svg and rendering an <img> here instead.
 */
export function HazardPictogram({ code, size = 56 }: { code: string; size?: number }) {
  const info = ghsInfo(code);
  return (
    <figure className="flex flex-col items-center gap-1" title={info ? `${info.name}: ${info.meaning}` : code}>
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={info?.name ?? code}>
        <rect x="15" y="15" width="70" height="70" transform="rotate(45 50 50)" fill="#fff" stroke="#e00" strokeWidth="8" />
        <text x="50" y="56" textAnchor="middle" fontSize="16" fontWeight="700" fill="#000" fontFamily="sans-serif">
          {code.replace("GHS", "")}
        </text>
      </svg>
      {info && <figcaption className="text-[10px] uppercase tracking-wide text-muted">{info.meaning}</figcaption>}
    </figure>
  );
}
