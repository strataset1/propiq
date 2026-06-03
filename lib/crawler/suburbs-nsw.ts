// NSW suburbs with significant strata/apartment density.
// Focused on inner-city, high-density coastal, and major urban centres.
// Rural towns and low-density outer suburbs excluded — unlikely to have
// publicly indexed strata by-law PDFs.
export const NSW_SUBURBS: string[] = [
  // ── Sydney CBD & immediate surrounds ─────────────────────────────
  "Sydney CBD NSW",       // 2000 — highest density, massive strata stock
  "Haymarket NSW",        // 2000 — dense, adjoins CBD
  "Pyrmont NSW",          // 2009 — apartment-heavy peninsula
  "Ultimo NSW",           // 2007 — student/inner city apartments
  "Chippendale NSW",      // 2008 — dense new developments
  "Glebe NSW",            // 2037 — significant apartment stock
  "Surry Hills NSW",      // 2010 — very high density
  "Darlinghurst NSW",     // 2010 — very high density
  "Potts Point NSW",      // 2011 — one of Australia's densest suburbs
  "Elizabeth Bay NSW",    // 2011 — dense apartment suburb
  "Kings Cross NSW",      // 2011 — dense
  "Rushcutters Bay NSW",  // 2011

  // ── Inner East ───────────────────────────────────────────────────
  "Paddington NSW",       // 2021 — terraces + apartments
  "Woollahra NSW",        // 2025
  "Edgecliff NSW",        // 2027
  "Double Bay NSW",       // 2028 — high-value strata
  "Rose Bay NSW",         // 2029
  "Bondi NSW",            // 2026 — major apartment zone
  "Bondi Beach NSW",      // 2026
  "Bondi Junction NSW",   // 2022 — high density
  "Tamarama NSW",         // 2026
  "Bronte NSW",           // 2024
  "Clovelly NSW",         // 2031
  "Randwick NSW",         // 2031
  "Coogee NSW",           // 2034 — beach apartments
  "Maroubra NSW",         // 2035

  // ── Inner South / Alexandria Corridor ────────────────────────────
  "Waterloo NSW",         // 2017 — major new apartment precinct
  "Zetland NSW",          // 2017 — rapidly densifying
  "Rosebery NSW",         // 2018
  "Alexandria NSW",       // 2015 — converted warehouses + new builds
  "Beaconsfield NSW",     // 2015
  "Redfern NSW",          // 2016 — significant apartment stock
  "Mascot NSW",           // 2020 — major unit zone near airport
  "Wolli Creek NSW",      // 2205 — very high density new apartments
  "Arncliffe NSW",        // 2205

  // ── Inner West ───────────────────────────────────────────────────
  "Erskineville NSW",     // 2043
  "Newtown NSW",          // 2042
  "St Peters NSW",        // 2044
  "Sydenham NSW",         // 2044
  "Marrickville NSW",     // 2204
  "Dulwich Hill NSW",     // 2203
  "Petersham NSW",        // 2049
  "Annandale NSW",        // 2038
  "Camperdown NSW",       // 2050
  "Balmain NSW",          // 2041 — heritage + strata
  "Rozelle NSW",          // 2039
  "Leichhardt NSW",       // 2040
  "Burwood NSW",          // 2134 — major apartment corridor
  "Strathfield NSW",      // 2135
  "Homebush NSW",         // 2140 — Olympic precinct apartments
  "Rhodes NSW",           // 2138 — very high density new precinct
  "Meadowbank NSW",       // 2114
  "Drummoyne NSW",        // 2047

  // ── Inner North ──────────────────────────────────────────────────
  "North Sydney NSW",     // 2060 — CBD equivalent density
  "Kirribilli NSW",       // 2061
  "Milsons Point NSW",    // 2061
  "Neutral Bay NSW",      // 2089
  "Cremorne NSW",         // 2090
  "Mosman NSW",           // 2088
  "Crows Nest NSW",       // 2065
  "St Leonards NSW",      // 2065 — major apartment hub
  "Wollstonecraft NSW",   // 2065
  "Waverton NSW",         // 2060
  "Cammeray NSW",         // 2062

  // ── Lower North Shore / Ryde ─────────────────────────────────────
  "Chatswood NSW",        // 2067 — very high density
  "Lane Cove NSW",        // 2066
  "Ryde NSW",             // 2112
  "West Ryde NSW",        // 2114
  "Meadowbank NSW",       // 2114 — (already listed)
  "North Ryde NSW",       // 2113
  "Macquarie Park NSW",   // 2113 — major apartment precinct
  "Epping NSW",           // 2121

  // ── Upper North Shore ────────────────────────────────────────────
  "Roseville NSW",        // 2069
  "Lindfield NSW",        // 2070
  "Killara NSW",          // 2071
  "Gordon NSW",           // 2072

  // ── Northern Beaches ─────────────────────────────────────────────
  "Manly NSW",            // 2095 — dense beach apartments
  "Fairlight NSW",        // 2094
  "Freshwater NSW",       // 2096
  "Dee Why NSW",          // 2099 — high-density beach suburb
  "Narrabeen NSW",        // 2101
  "Collaroy NSW",         // 2097
  "Mona Vale NSW",        // 2103
  "Newport NSW",          // 2106
  "Avalon Beach NSW",     // 2107
  "Palm Beach NSW",       // 2108

  // ── Western Sydney key hubs ──────────────────────────────────────
  "Parramatta NSW",       // 2150 — major apartment boom
  "Westmead NSW",         // 2145
  "Harris Park NSW",      // 2150
  "Granville NSW",        // 2142
  "Merrylands NSW",       // 2160
  "Liverpool NSW",        // 2170 — growing density
  "Hornsby NSW",          // 2077 — significant unit stock

  // ── South Sydney / St George ─────────────────────────────────────
  "Hurstville NSW",       // 2220 — high density
  "Kogarah NSW",          // 2217
  "Rockdale NSW",         // 2216
  "Cronulla NSW",         // 2230 — beach apartments
  "Caringbah NSW",        // 2229
  "Miranda NSW",          // 2228
  "Sutherland NSW",       // 2232
  "Kingsgrove NSW",       // 2208

  // ── Canterbury-Bankstown ─────────────────────────────────────────
  "Bankstown NSW",        // 2200
  "Campsie NSW",          // 2194
  "Canterbury NSW",       // 2193
  "Burwood NSW",          // 2134 — (already listed)

  // ── Newcastle / Hunter ───────────────────────────────────────────
  "Newcastle NSW",        // 2300 — CBD apartments
  "Newcastle West NSW",   // 2302
  "Hamilton NSW",         // 2303
  "Merewether NSW",       // 2291 — beach apartments
  "Cooks Hill NSW",       // 2300
  "The Junction NSW",     // 2291
  "Charlestown NSW",      // 2290
  "New Lambton NSW",      // 2305

  // ── Central Coast ────────────────────────────────────────────────
  "Gosford NSW",          // 2250 — apartment hub
  "Terrigal NSW",         // 2260 — beach strata
  "Woy Woy NSW",          // 2256
  "Umina Beach NSW",      // 2257

  // ── Wollongong / Illawarra ───────────────────────────────────────
  "Wollongong NSW",       // 2500 — CBD apartments
  "North Wollongong NSW", // 2500
  "Fairy Meadow NSW",     // 2519
  "Thirroul NSW",         // 2515
  "Kiama NSW",            // 2533 — coastal strata

  // ── Byron Bay coastal strip ──────────────────────────────────────
  "Byron Bay NSW",        // 2481 — high-value holiday strata
  "Ballina NSW",          // 2478
  "Lennox Head NSW",      // 2478
  "Tweed Heads NSW",      // 2485 — major holiday apartment zone
];
