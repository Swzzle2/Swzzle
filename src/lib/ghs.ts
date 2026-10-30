// The nine GHS hazard pictograms. Stored on products as codes ("GHS05").
// Drop official artwork at /public/ghs/GHS05.svg etc. and the HazardPictogram component will use it.
export const GHS = [
  { code: "GHS01", name: "Exploding bomb", meaning: "Explosives" },
  { code: "GHS02", name: "Flame", meaning: "Flammable" },
  { code: "GHS03", name: "Flame over circle", meaning: "Oxidizer" },
  { code: "GHS04", name: "Gas cylinder", meaning: "Gas under pressure" },
  { code: "GHS05", name: "Corrosion", meaning: "Corrosive" },
  { code: "GHS06", name: "Skull and crossbones", meaning: "Acute toxicity" },
  { code: "GHS07", name: "Exclamation mark", meaning: "Irritant / harmful" },
  { code: "GHS08", name: "Health hazard", meaning: "Health hazard" },
  { code: "GHS09", name: "Environment", meaning: "Aquatic toxicity" },
] as const;

export const GHS_CODES: readonly string[] = GHS.map((g) => g.code);

export function ghsInfo(code: string) {
  return GHS.find((g) => g.code === code);
}
