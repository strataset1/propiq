export type StateLawEntry = {
  takeaway: string;       // one-line shown in the collapsed badge
  detail: string;         // full text shown when expanded
  overridesHardNo: boolean; // true when state law makes a by-law "no" potentially unenforceable
};

export type AttributeStateLaws = {
  pets_allowed?: StateLawEntry;
  short_term_rental?: StateLawEntry;
  interior_renovations?: StateLawEntry;
  exterior_renovations?: StateLawEntry;
};

export const STATE_LAWS: Record<string, AttributeStateLaws> = {
  nsw: {
    pets_allowed: {
      takeaway: "NSW: Blanket pet bans are illegal — a 'No' by-law may not be enforceable",
      overridesHardNo: true,
      detail: `PET LAWS IN STRATA — New South Wales (NSW)

NSW is the most pro-pet state in Australia. Blanket bans on pets are illegal. Owners corporations cannot unreasonably refuse pets — refusal is only valid if the pet causes "unreasonable interference" (noise, damage, safety risk).

Not permitted:
• Pet bonds
• Pet fees
• Blanket "no pets" rules

Approval is still usually required, but it must be granted unless there is a genuine, specific issue with the particular animal. A by-law that says "no pets" without qualification is unenforceable under NSW strata law.`,
    },
  },

  vic: {
    // Add VIC laws here
  },

  qld: {
    // Add QLD laws here
  },

  sa: {
    // Add SA laws here
  },

  wa: {
    // Add WA laws here
  },
};

// Detect state from a normalised address string.
// Checks for explicit state abbreviations first, then falls back to postcode ranges.
export function detectState(address: string): string | null {
  const lower = address.toLowerCase();

  const explicit: [string, string][] = [
    ["nsw", "nsw"],
    ["new south wales", "nsw"],
    ["vic", "vic"],
    ["victoria", "vic"],
    ["qld", "qld"],
    ["queensland", "qld"],
    ["sa", "sa"],
    ["south australia", "sa"],
    ["wa", "wa"],
    ["western australia", "wa"],
    ["tas", "tas"],
    ["tasmania", "tas"],
    ["nt", "nt"],
    ["northern territory", "nt"],
    ["act", "act"],
    ["australian capital territory", "act"],
  ];

  for (const [pattern, state] of explicit) {
    if (lower.includes(pattern)) return state;
  }

  // Postcode-based fallback — match last 4-digit sequence
  const postcodeMatch = address.match(/\b(\d{4})\b/);
  if (postcodeMatch) {
    const pc = parseInt(postcodeMatch[1], 10);
    if (pc >= 1000 && pc <= 2999) return "nsw";
    if (pc >= 3000 && pc <= 3999) return "vic";
    if (pc >= 4000 && pc <= 4999) return "qld";
    if (pc >= 5000 && pc <= 5999) return "sa";
    if (pc >= 6000 && pc <= 6999) return "wa";
    if (pc >= 7000 && pc <= 7999) return "tas";
    if (pc >= 800 && pc <= 999) return "nt";
    if ((pc >= 200 && pc <= 299) || (pc >= 2600 && pc <= 2618) || (pc >= 2900 && pc <= 2920)) return "act";
  }

  return null;
}
