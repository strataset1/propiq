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
    interior_renovations: {
      takeaway: "NSW: Cosmetic work needs no approval — minor renos (floors, kitchens) need OC approval — structural work needs a special resolution",
      overridesHardNo: false,
      detail: `INTERIOR RENOVATION LAWS IN STRATA — New South Wales (NSW)

The Strata Schemes Management Act 2015 (NSW) creates three tiers of internal works:

s 108 — Cosmetic work (no approval needed, just notify):
• Painting, wallpaper, picture hooks, shelving, carpet
• Blinds, curtains, flyscreens
• Minor fixtures (towel rails, toilet roll holders)
• Owners simply notify the OC — no vote required

s 109 — Minor renovations (OC approval by ordinary resolution):
• Floorboards and other hard flooring
• Recessed lighting
• Built-in wardrobes
• Kitchen and bathroom updates that don't affect structure or waterproofing
• Internal layout changes (non-structural walls within the lot)

s 110 — Major renovations (special resolution — 75% vote):
• Structural changes
• Changes to waterproofing
• Any renovation affecting common property boundaries or services

What this means:
• Cosmetic work is almost always fine without asking — just notify
• Most kitchen and bathroom renovations need ordinary OC approval
• Structural or waterproofing changes need a 75% vote
• The building's by-laws can set stricter rules on top of this framework

Practical summary: NSW has a well-defined tiered system — check which category your work falls into before starting.`,
    },
    exterior_renovations: {
      takeaway: "NSW: External changes affecting common property require a special resolution (75% vote) under s 110 SSMA 2015",
      overridesHardNo: false,
      detail: `EXTERIOR RENOVATION LAWS IN STRATA — New South Wales (NSW)

External work in NSW strata almost always involves common property — the façade, external walls, windows, balconies and roofs are usually common property under the Strata Schemes Management Act 2015 (NSW).

s 110 — Major renovations affecting common property require a special resolution (75% vote at a general meeting). This covers:
• External windows and sliding doors
• Balcony structures, balustrades and balcony tiles
• External walls and cladding
• Air conditioning units on external walls or roof
• Satellite dishes or solar panels on common property

s 65A — Changes to common property by individual owners are possible but require:
• An "exclusive use by-law" granting the owner rights over that part of common property
• This requires a special resolution

What this means:
• You likely cannot alter the external appearance of your lot without OC approval
• Most external changes require a special resolution (75%)
• An exclusive use by-law may be needed for ongoing works
• The building's by-laws can set additional requirements

Practical summary: for most external changes in NSW strata, assume you need a 75% vote unless explicitly permitted by the by-laws.`,
    },
    short_term_rental: {
      takeaway: "NSW: Strata can ban non-hosted Airbnb by by-law — hosted Airbnb (owner lives there) is harder to ban",
      overridesHardNo: false,
      detail: `SHORT-TERM RENTAL LAWS IN STRATA — New South Wales (NSW)

Under s 137A of the Strata Schemes Management Act 2015 (NSW), an owners corporation can make a by-law prohibiting a lot from being used for short-term rental accommodation, but only where the lot is not the host's principal place of residence. Strata can target investment-style Airbnb use, but generally cannot ban hosted Airbnb where the owner or occupier lives there.

NSW also has a statewide STRA framework:
• Non-hosted STRA is capped at 180 days per year in Greater Sydney and certain nominated regional areas
• Hosted STRA is treated more leniently
• STRA properties must be registered and comply with fire safety rules

What this means:
• Strata can ban non-hosted Airbnb by by-law
• Hosted Airbnb is harder to ban
• 180-day caps apply in Sydney and some key regions
• Registration and fire safety rules apply

Practical summary: NSW gives strata real control over investor-style Airbnb, but not usually owner-occupied/home-share Airbnb.`,
    },
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
    interior_renovations: {
      takeaway: "VIC: Internal works within your lot are generally permitted — OC approval needed if work affects common property or services",
      overridesHardNo: false,
      detail: `INTERIOR RENOVATION LAWS IN STRATA — Victoria (VIC)

Under the Owners Corporations Act 2006 (VIC), lot owners are generally free to renovate within their own lot, provided the works do not affect common property, shared services (pipes, wiring) or the structural integrity of the building.

Key rules:
• Rule 5 of the Model Owners Corporation Rules: owners must not damage or alter common property without OC approval
• Internal works that are contained entirely within the lot (painting, flooring, kitchen fit-outs, non-structural walls) generally do not require approval
• Works that affect shared services — plumbing stacks, electrical risers, load-bearing walls — require OC consent
• OC rules vary by building — always check your specific rules before starting

What this means:
• Cosmetic work and fit-outs within your lot are generally fine
• Structural, plumbing or electrical changes affecting common property need OC approval
• Approval is typically by ordinary resolution unless the rules require more
• Your building's specific rules may be stricter

Practical summary: internal work is usually straightforward in VIC — just make sure you're not touching shared services or common property.`,
    },
    exterior_renovations: {
      takeaway: "VIC: External changes affecting common property or the building's appearance require OC consent — check your building's rules",
      overridesHardNo: false,
      detail: `EXTERIOR RENOVATION LAWS IN STRATA — Victoria (VIC)

In VIC strata, exterior elements such as the façade, external walls, balcony structures, windows and roofline are almost always common property under the Owners Corporations Act 2006 (VIC) and the relevant plan of subdivision.

Key rules:
• Rule 5 of the Model Rules: owners must not alter or damage common property without OC consent
• Alterations to the external appearance of the building generally require OC approval by ordinary resolution (or special resolution if the rules require it)
• Air conditioning units, satellite dishes, balcony enclosures and window replacements typically need OC consent
• Balcony tiles and waterproofing are often common property — check your plan of subdivision

What this means:
• You cannot alter the external appearance of your lot or the building without OC approval
• Approval is typically by ordinary resolution under the Model Rules
• Your building's specific rules may require a special resolution for significant works
• The plan of subdivision defines what is common property

Practical summary: always check your plan of subdivision and OC rules before commencing any external work — approval is almost always required in VIC.`,
    },
    short_term_rental: {
      takeaway: "VIC: Owners corporations can ban short-stay accommodation by special resolution (from Jan 2025)",
      overridesHardNo: false,
      detail: `SHORT-TERM RENTAL LAWS IN STRATA — Victoria (VIC)

From 1 January 2025, owners corporations can make rules banning the use of lots for short-stay accommodation. Consumer Affairs Victoria says this must be done by special resolution. Victoria also introduced a 7.5% short-stay levy from 1 January 2025, applying to stays of less than 28 consecutive days — paid by the booking platform if booked through a platform, or by the owner/tenant if booked directly.

What this means:
• Owners corporations can ban short-stay accommodation
• Usually requires a special resolution
• 7.5% short-stay levy applies
• Councils also have stronger powers to regulate short stays

Practical summary: Victoria is one of the tougher states for Airbnb in apartment buildings.`,
    },
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
    interior_renovations: {
      takeaway: "QLD: Lot owners can renovate their lot freely — body corporate approval only needed if work affects common property",
      overridesHardNo: false,
      detail: `INTERIOR RENOVATION LAWS IN STRATA — Queensland (QLD)

Queensland is comparatively permissive. Under the Body Corporate and Community Management Act 1997 (Qld), lot owners have broad rights to deal with their lot as they see fit, provided the works do not affect common property, shared services or other lots.

Key rules:
• s 230 BCCMA: owners can carry out works within their own lot without body corporate approval, as long as the works do not affect common property or shared services
• s 163 BCCMA: changes to common property (shared walls, floor/ceiling slabs, shared plumbing, structural elements) require body corporate approval
• Cosmetic work — painting, flooring, kitchen and bathroom fit-outs, built-in storage — is generally within the owner's rights without approval
• Works that breach the building envelope or affect shared services need approval

What this means:
• Internal cosmetic work and fit-outs generally need no approval
• Structural changes or work affecting shared plumbing/electrical/walls need body corporate approval
• Approval is typically by ordinary resolution for lot improvements
• Check the by-laws — some schemes have stricter requirements

Practical summary: QLD is one of the more owner-friendly states for internal renovations — you generally do not need approval unless your work touches common property.`,
    },
    exterior_renovations: {
      takeaway: "QLD: Changes affecting common property or the external appearance need body corporate approval — ordinary or special resolution depending on the works",
      overridesHardNo: false,
      detail: `EXTERIOR RENOVATION LAWS IN STRATA — Queensland (QLD)

Under the Body Corporate and Community Management Act 1997 (Qld), external elements of a building such as the façade, roof, external walls and shared structural elements are typically common property.

Key rules:
• s 163 BCCMA: improvements to common property require body corporate approval
• s 251A BCCMA: lot improvements that affect common property require an ordinary resolution (or special resolution for major infrastructure changes)
• Air conditioning installations, balcony changes, window replacements and external cladding work typically affect common property and need approval
• The Accommodation Module and other BCCMA modules set specific rules for common property improvements

What this means:
• External changes affecting common property require body corporate approval
• Ordinary resolution is usually sufficient for individual lot improvement requests
• Special resolution is needed for major or irreversible changes to common property
• The body corporate cannot unreasonably withhold approval

Practical summary: get body corporate approval before any external works in QLD — but the body corporate generally cannot refuse without good reason.`,
    },
    short_term_rental: {
      takeaway: "QLD: Body corporates usually cannot ban Airbnb by by-law — but can regulate guest behaviour",
      overridesHardNo: true,
      detail: `SHORT-TERM RENTAL LAWS IN STRATA — Queensland (QLD)

Queensland is generally more Airbnb-friendly. Under s 180(3) of the Body Corporate and Community Management Act 1997 (Qld), a by-law cannot restrict the type of residential use of a lot. This is why many Queensland bodies corporate cannot simply ban Airbnb by by-law if the use remains residential.

However, bodies corporate can still regulate behaviour — noise, parties, damage, security, use of common property and nuisance. They may also be able to enforce building rules against guests.

What this means:
• Body corporates usually cannot impose a blanket Airbnb ban
• They can regulate behaviour and common property use
• Council and planning rules may still apply
• Some older or non-BCCM schemes can be different

Practical summary: QLD is one of the more Airbnb-friendly strata states, but body corporates can still control nuisance and guest behaviour.`,
    },
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
    interior_renovations: {
      takeaway: "SA: Internal works within your lot are generally permitted — community/strata corporation approval needed for structural or common property work",
      overridesHardNo: false,
      detail: `INTERIOR RENOVATION LAWS IN STRATA — South Australia (SA)

South Australia has two main strata frameworks: the Strata Titles Act 1988 (SA) and the Community Titles Act 1996 (SA).

Key rules:
• Cosmetic internal works — painting, flooring, kitchen and bathroom fit-outs — are generally within the owner's rights without approval
• Works affecting common property, shared services or the structural elements of the building require community/strata corporation approval
• The scheme by-laws or community rules set out the specific approval process
• Structural changes and waterproofing work are most commonly subject to approval requirements

What this means:
• Cosmetic work and internal fit-outs are generally fine without approval
• Structural or common property works need corporation approval
• Check the registered by-laws or community rules before starting
• Approval is typically by ordinary resolution

Practical summary: SA follows similar principles to other states — cosmetic work is usually fine, but check your by-laws for anything structural.`,
    },
    exterior_renovations: {
      takeaway: "SA: External changes affecting common property require community/strata corporation approval — check the registered by-laws",
      overridesHardNo: false,
      detail: `EXTERIOR RENOVATION LAWS IN STRATA — South Australia (SA)

Under both the Strata Titles Act 1988 (SA) and the Community Titles Act 1996 (SA), external elements of a building are typically common property. Changes to common property require corporation approval.

Key rules:
• External walls, roofs, façades and shared structural elements are common property
• Changes to common property require strata/community corporation approval
• The by-laws or community rules specify the approval threshold and process
• External additions such as air conditioning, satellite dishes and balcony enclosures typically need approval

What this means:
• External changes almost always require corporation approval in SA
• Check the registered by-laws for the specific process and majority required
• Approval is typically by ordinary resolution unless the by-laws require more

Practical summary: approval is required for virtually all external changes in SA strata — refer to the registered by-laws.`,
    },
    short_term_rental: {
      takeaway: "SA: By-laws and council/planning rules determine short-stay rights — check before assuming Airbnb is allowed",
      overridesHardNo: false,
      detail: `SHORT-TERM RENTAL LAWS IN STRATA — South Australia (SA)

South Australia is more council and planning dependent, with less uniform statewide strata control than NSW or VIC.

Generally:
• Local council and planning rules matter
• Strata rules may restrict short stays
• Registration or levy systems are emerging
• Outright bans depend on the legislation and the wording of the scheme rules

Practical summary: check the by-laws, planning rules and registration requirements before assuming Airbnb is allowed.`,
    },
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
    interior_renovations: {
      takeaway: "WA: Internal works within your lot are generally permitted — check scheme by-laws for structural or plumbing work",
      overridesHardNo: false,
      detail: `INTERIOR RENOVATION LAWS IN STRATA — Western Australia (WA)

Under the Strata Titles Act 1985 (WA), as amended by the Strata Titles Amendment Act 2018 (commenced 2020), lot owners can generally renovate within their own lot without strata company approval, provided the works do not affect common property or shared services.

Key rules:
• The scheme by-laws govern what approvals are required — model by-laws differ by scheme
• Works affecting common property (shared walls, floor/ceiling slabs, shared plumbing) require strata company approval
• Cosmetic works — painting, flooring, kitchen and bathroom fit-outs — are generally within the owner's rights
• Structural changes, waterproofing and anything affecting the building's structure require strata company approval
• Community title schemes have additional rules under the Strata Titles Act

What this means:
• Cosmetic and internal fit-out work is generally permitted
• Structural or common property works need strata company approval
• Check the scheme by-laws before starting any renovation
• Approval is typically by ordinary resolution

Practical summary: WA is similar to most other states — cosmetic work is fine, structural or common property work needs approval.`,
    },
    exterior_renovations: {
      takeaway: "WA: External changes to common property require strata company approval — check scheme by-laws before altering any exterior element",
      overridesHardNo: false,
      detail: `EXTERIOR RENOVATION LAWS IN STRATA — Western Australia (WA)

In WA strata, external elements — the façade, external walls, roof, balcony structures and windows — are usually common property under the Strata Titles Act 1985 (WA).

Key rules:
• Changes to common property require strata company approval
• The scheme by-laws set the approval threshold — typically ordinary resolution for lot improvements
• Air conditioning, satellite dishes, balcony enclosures and window replacements usually require strata company approval
• Community title schemes under the WA Act may have additional requirements

What this means:
• External changes affecting common property require strata company approval
• Scheme by-laws determine the process and majority required
• Some older WA schemes may have stricter or more permissive rules
• The strata company cannot unreasonably withhold approval

Practical summary: check the scheme by-laws first — almost all external changes in WA strata require strata company approval.`,
    },
    short_term_rental: {
      takeaway: "WA: STRA registration mandatory from Jan 2025 — strata by-laws can still block Airbnb use",
      overridesHardNo: false,
      detail: `SHORT-TERM RENTAL LAWS IN STRATA — Western Australia (WA)

The Short-Term Rental Accommodation Act 2024 (WA) underpins the WA STRA Register, which opened on 1 July 2024. Registration became mandatory from 1 January 2025. The WA Act recognises that a strata lot may not be eligible where short-term rental accommodation is prohibited under strata or community title by-laws.

What this means:
• STRA registration is mandatory
• Local planning rules may apply
• Strata by-laws can be very important
• Some strata schemes may prohibit STR use

Practical summary: WA is registration-heavy, and strata by-laws can still block Airbnb use.`,
    },
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
    interior_renovations: {
      takeaway: "TAS: Internal works within your lot are generally permitted — body corporate approval needed for structural or common property work",
      overridesHardNo: false,
      detail: `INTERIOR RENOVATION LAWS IN STRATA — Tasmania (TAS)

Under the Strata Titles Act 1998 (TAS), lot owners can generally renovate within their lot without body corporate approval, provided the works do not affect common property or shared services.

Key rules:
• Cosmetic internal works — painting, flooring, kitchen and bathroom fit-outs — are generally within the owner's rights
• Works affecting common property or shared services require body corporate approval
• The by-laws specify the approval process
• Structural changes and waterproofing work typically require approval

What this means:
• Internal cosmetic work is generally permitted
• Structural or common property works need body corporate approval
• Check the by-laws before starting any renovation

Practical summary: TAS follows standard strata principles — cosmetic work is fine, anything touching shared elements needs approval.`,
    },
    exterior_renovations: {
      takeaway: "TAS: External changes affecting common property require body corporate approval under the Strata Titles Act 1998",
      overridesHardNo: false,
      detail: `EXTERIOR RENOVATION LAWS IN STRATA — Tasmania (TAS)

Under the Strata Titles Act 1998 (TAS), external elements of a strata building are typically common property. Changes to common property require body corporate approval.

Key rules:
• Facades, external walls, roofs and shared structural elements are common property
• Body corporate approval is required before making changes to common property
• The by-laws specify the approval threshold — typically ordinary resolution
• External additions (air conditioning, satellite dishes, balcony work) typically need approval

What this means:
• External changes almost always require body corporate approval in TAS
• Refer to the by-laws for the specific process and majority required

Practical summary: approval is required for external changes in TAS strata — check the registered by-laws.`,
    },
    short_term_rental: {
      takeaway: "TAS: Moving toward more regulation — check by-laws and planning rules before assuming Airbnb is allowed",
      overridesHardNo: false,
      detail: `SHORT-TERM RENTAL LAWS IN STRATA — Tasmania (TAS)

Tasmania has been moving toward more regulation, including recent short-stay levy proposals.

Generally:
• Local council and planning rules matter
• Strata rules may restrict short stays
• Short-stay levy proposals are in progress
• Outright bans depend on the wording of the scheme rules

Practical summary: check the by-laws, planning rules and registration requirements before assuming Airbnb is allowed.`,
    },
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
    interior_renovations: {
      takeaway: "NT: Internal works within your lot are generally permitted — body corporate approval needed for structural or common property work",
      overridesHardNo: false,
      detail: `INTERIOR RENOVATION LAWS IN STRATA — Northern Territory (NT)

Under the Unit Title Schemes Act 2009 (NT), lot owners can generally renovate within their own lot without body corporate approval, provided the works do not affect common property or shared services.

Key rules:
• Cosmetic internal works — painting, flooring, kitchen and bathroom updates — are generally within the owner's rights
• Works affecting common property, shared services or the structural fabric of the building require body corporate approval
• The scheme by-laws specify the approval process
• Structural changes and waterproofing work typically require approval

What this means:
• Internal cosmetic work is generally permitted
• Structural or common property works need body corporate approval
• Check the scheme by-laws before starting

Practical summary: NT follows standard unit title principles — cosmetic work is fine, structural or shared-service work needs approval.`,
    },
    exterior_renovations: {
      takeaway: "NT: External changes affecting common property require body corporate approval under the Unit Title Schemes Act 2009",
      overridesHardNo: false,
      detail: `EXTERIOR RENOVATION LAWS IN STRATA — Northern Territory (NT)

Under the Unit Title Schemes Act 2009 (NT), external elements of a unit title building are typically common property. Changes to common property require body corporate approval.

Key rules:
• External walls, façades, roofs and shared structural elements are common property
• Body corporate approval is required for changes to common property
• The scheme by-laws specify the approval threshold — typically ordinary resolution
• External additions (air conditioning, satellite dishes, balcony changes) require approval

What this means:
• External changes require body corporate approval in NT
• Check the scheme by-laws for the specific process

Practical summary: approval is required for external changes in NT unit title schemes.`,
    },
    short_term_rental: {
      takeaway: "NT: By-laws and planning rules determine short-stay rights — check before assuming Airbnb is allowed",
      overridesHardNo: false,
      detail: `SHORT-TERM RENTAL LAWS IN STRATA — Northern Territory (NT)

The Northern Territory has less uniform statewide strata control on short-term rentals.

Generally:
• Local council and planning rules matter
• Body corporate rules may restrict short stays
• Outright bans depend on the wording of the scheme rules

Practical summary: check the by-laws, planning rules and registration requirements before assuming Airbnb is allowed.`,
    },
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
    interior_renovations: {
      takeaway: "ACT: Internal works are governed by the unit plan and OC rules — structural or common property work needs OC approval",
      overridesHardNo: false,
      detail: `INTERIOR RENOVATION LAWS IN STRATA — Australian Capital Territory (ACT)

Under the Unit Titles Act 2001 (ACT) and Unit Titles (Management) Act 2011 (ACT), lot owners can generally renovate within their own unit, but must comply with the unit plan and owners corporation rules.

Key rules:
• Cosmetic internal works — painting, flooring, kitchen and bathroom fit-outs — are generally within the owner's rights
• Works affecting common property, shared services or the structural elements of the building require owners corporation (OC) approval
• s 22 Unit Titles (Management) Act: owners must not alter common property without OC consent
• The ACT's leasehold system can affect renovation rights — check your Crown lease purpose clause

What this means:
• Internal cosmetic work is generally permitted
• Structural or common property works need OC approval
• The Crown lease purpose clause may restrict certain types of use or renovation
• Check the OC rules and the unit plan

Practical summary: internal work in the ACT is generally fine for cosmetic changes — get OC approval for anything structural or affecting shared services.`,
    },
    exterior_renovations: {
      takeaway: "ACT: External changes affecting common property require OC approval — Crown lease and unit plan constraints also apply",
      overridesHardNo: false,
      detail: `EXTERIOR RENOVATION LAWS IN STRATA — Australian Capital Territory (ACT)

Under the Unit Titles Act 2001 (ACT) and Unit Titles (Management) Act 2011 (ACT), external elements of a unit title building are typically common property. Changes require owners corporation (OC) approval.

Key rules:
• External walls, façades, roofs and shared structural elements are common property
• s 22 Unit Titles (Management) Act: OC approval is required before altering common property
• The ACT's Crown leasehold system adds a layer — external changes may also need to comply with the Crown lease purpose clause and any Territory Plan requirements
• External additions (air conditioning, satellite dishes, balcony enclosures) typically need OC approval and may require building approval

What this means:
• External changes require OC approval in the ACT
• Crown lease and Territory Plan constraints may apply on top of OC rules
• Building approval from the ACT Government may also be needed for structural changes

Practical summary: the ACT has more layers than other states for external works — OC approval plus Crown lease and planning compliance.`,
    },
    short_term_rental: {
      takeaway: "ACT: Restrictions turn on the unit plan, lease purpose, zoning and owners corporation rules",
      overridesHardNo: false,
      detail: `SHORT-TERM RENTAL LAWS IN STRATA — Australian Capital Territory (ACT)

ACT restrictions on short-term rentals often turn on the unit plan, lease purpose, zoning and owners corporation rules.

Generally:
• Local planning and zoning rules matter
• Owners corporation rules may restrict short stays
• Registration or levy systems may apply
• Outright bans depend on the wording of the scheme rules

Practical summary: check the by-laws, planning rules and registration requirements before assuming Airbnb is allowed.`,
    },
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
