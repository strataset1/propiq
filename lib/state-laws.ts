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
      takeaway: "NSW: Blanket pet bans are invalid under s 137B SSMA 2015 — a 'No' by-law may have no force or effect",
      overridesHardNo: true,
      detail: `PET LAWS IN STRATA — New South Wales (NSW)

Under s 137B of the Strata Schemes Management Act 2015 (NSW), a by-law has "no force or effect" if it "unreasonably prohibit[s] the keeping of an animal" on a lot. Keeping an animal is taken to be reasonable unless it causes "unreasonable interference" with another resident's use and enjoyment of their lot or common property.

What this means:
• Blanket pet bans are invalid
• Approval can be required
• Refusal must be based on a real issue (noise, damage, safety, odour or nuisance)
• Pet bonds, pet fees and forced pet insurance are not allowed
• Assistance animals cannot be banned

Practical summary: pets are generally allowed unless they cause a genuine problem.`,
    },
  },

  vic: {
    pets_allowed: {
      takeaway: "VIC: Pets depend on building rules — overreaching blanket bans may be challengeable",
      overridesHardNo: false,
      detail: `PET LAWS IN STRATA — Victoria (VIC)

Victoria is more by-law dependent. Pets are usually governed by the building's owners corporation rules under the Owners Corporations Act 2006 (Vic).

In Owners Corporation PS 501391P v Balcombe [2016] VSC 384, the court confirmed that owners corporation rules must stay within the proper purposes of an owners corporation — managing common property, nuisance, safety and building management.

What this means:
• Approval may be required
• Rules vary by building
• Unreasonable blanket bans may be challengeable
• Assistance animals cannot be refused in the same way as ordinary pets

Practical summary: pets depend on the building rules, but overreaching bans may not hold up.`,
    },
  },

  qld: {
    pets_allowed: {
      takeaway: "QLD: Blanket pet bans and size/type/number limits are not allowed under s 169B BCCMA 1997",
      overridesHardNo: true,
      detail: `PET LAWS IN STRATA — Queensland (QLD)

Queensland is strongly pro-pet. Under s 169B of the Body Corporate and Community Management Act 1997 (Qld), a by-law must not "prohibit the keeping or bringing of an animal" or "restrict the number, type or size of an animal." Under s 180(7), by-laws must not be "oppressive or unreasonable." Under s 181, a person with a disability has the right to be accompanied by a guide, hearing or assistance dog — a by-law cannot restrict that right.

What this means:
• Blanket pet bans are not allowed
• Arbitrary size, type or number limits are not allowed
• Approval can still be required
• Refusal must be reasonable
• Assistance animals must be allowed

Practical summary: pets are generally allowed, but the body corporate can manage them with reasonable conditions.`,
    },
  },

  sa: {
    pets_allowed: {
      takeaway: "SA: By-laws determine pet rules — blanket bans increasingly hard to justify",
      overridesHardNo: false,
      detail: `PET LAWS IN STRATA — South Australia (SA)

South Australia is more dependent on the specific strata or body corporate by-laws.

Generally:
• Approval is often required
• By-laws decide the process
• Blanket bans are becoming harder to justify
• Assistance animals have stronger legal protection
• The trend is moving away from "no pets" and toward "pets allowed unless they cause problems"

Practical summary: check the registered by-laws before buying or renting.`,
    },
  },

  wa: {
    pets_allowed: {
      takeaway: "WA: By-laws determine pet rules — blanket bans increasingly hard to justify",
      overridesHardNo: false,
      detail: `PET LAWS IN STRATA — Western Australia (WA)

Western Australia is more dependent on the specific strata or body corporate by-laws.

Generally:
• Approval is often required
• By-laws decide the process
• Blanket bans are becoming harder to justify
• Assistance animals have stronger legal protection
• The trend is moving away from "no pets" and toward "pets allowed unless they cause problems"

Practical summary: check the registered by-laws before buying or renting.`,
    },
  },

  tas: {
    pets_allowed: {
      takeaway: "TAS: By-laws determine pet rules — blanket bans increasingly hard to justify",
      overridesHardNo: false,
      detail: `PET LAWS IN STRATA — Tasmania (TAS)

Tasmania is more dependent on the specific strata or body corporate by-laws.

Generally:
• Approval is often required
• By-laws decide the process
• Blanket bans are becoming harder to justify
• Assistance animals have stronger legal protection
• The trend is moving away from "no pets" and toward "pets allowed unless they cause problems"

Practical summary: check the registered by-laws before buying or renting.`,
    },
  },

  nt: {
    pets_allowed: {
      takeaway: "NT: By-laws determine pet rules — blanket bans increasingly hard to justify",
      overridesHardNo: false,
      detail: `PET LAWS IN STRATA — Northern Territory (NT)

The Northern Territory is more dependent on the specific body corporate by-laws.

Generally:
• Approval is often required
• By-laws decide the process
• Blanket bans are becoming harder to justify
• Assistance animals have stronger legal protection
• The trend is moving away from "no pets" and toward "pets allowed unless they cause problems"

Practical summary: check the registered by-laws before buying or renting.`,
    },
  },

  act: {
    pets_allowed: {
      takeaway: "ACT: By-laws determine pet rules — blanket bans increasingly hard to justify",
      overridesHardNo: false,
      detail: `PET LAWS IN STRATA — Australian Capital Territory (ACT)

The ACT is more dependent on the specific owners corporation by-laws.

Generally:
• Approval is often required
• By-laws decide the process
• Blanket bans are becoming harder to justify
• Assistance animals have stronger legal protection
• The trend is moving away from "no pets" and toward "pets allowed unless they cause problems"

Practical summary: check the registered by-laws before buying or renting.`,
    },
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
