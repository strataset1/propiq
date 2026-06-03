// Maps suburb display names to Australian postcodes for better search accuracy.
// Strata docs use postcodes, not suburb names like "Sydney CBD NSW".
export const POSTCODE_MAP: Record<string, string> = {
  "Sydney CBD NSW": "2000", "Haymarket NSW": "2000", "Pyrmont NSW": "2009",
  "Ultimo NSW": "2007", "Glebe NSW": "2037", "Surry Hills NSW": "2010",
  "Darlinghurst NSW": "2010", "Potts Point NSW": "2011", "Elizabeth Bay NSW": "2011",
  "Kings Cross NSW": "2011", "Rushcutters Bay NSW": "2011", "Edgecliff NSW": "2027",
  "Paddington NSW": "2021", "Woollahra NSW": "2025", "Double Bay NSW": "2028",
  "Rose Bay NSW": "2029", "Vaucluse NSW": "2030", "Watsons Bay NSW": "2030",
  "Bondi NSW": "2026", "Bondi Beach NSW": "2026", "Bondi Junction NSW": "2022",
  "Tamarama NSW": "2026", "Bronte NSW": "2024", "Clovelly NSW": "2031",
  "Randwick NSW": "2031", "Kensington NSW": "2033", "Kingsford NSW": "2032",
  "Coogee NSW": "2034", "Maroubra NSW": "2035", "Malabar NSW": "2036",
  "Mascot NSW": "2020", "Botany NSW": "2019", "Waterloo NSW": "2017",
  "Zetland NSW": "2017", "Rosebery NSW": "2018", "Alexandria NSW": "2015",
  "Beaconsfield NSW": "2015", "Erskineville NSW": "2043", "Newtown NSW": "2042",
  "St Peters NSW": "2044", "Sydenham NSW": "2044", "Marrickville NSW": "2204",
  "Dulwich Hill NSW": "2203", "Petersham NSW": "2049", "Summer Hill NSW": "2130",
  "Annandale NSW": "2038", "Camperdown NSW": "2050", "Redfern NSW": "2016",
  "Chippendale NSW": "2008", "Balmain NSW": "2041", "Rozelle NSW": "2039",
  "Leichhardt NSW": "2040", "Haberfield NSW": "2045", "Five Dock NSW": "2046",
  "Drummoyne NSW": "2047", "Ashfield NSW": "2131", "Burwood NSW": "2134",
  "Croydon NSW": "2132", "Strathfield NSW": "2135", "Homebush NSW": "2140",
  "Concord NSW": "2137", "Rhodes NSW": "2138", "Meadowbank NSW": "2114",
  "North Sydney NSW": "2060", "Kirribilli NSW": "2061", "Milsons Point NSW": "2061",
  "Neutral Bay NSW": "2089", "Cremorne NSW": "2090", "Mosman NSW": "2088",
  "Crows Nest NSW": "2065", "St Leonards NSW": "2065", "Artarmon NSW": "2064",
  "Lane Cove NSW": "2066", "Gladesville NSW": "2111", "Hunters Hill NSW": "2110",
  "Ryde NSW": "2112", "West Ryde NSW": "2114", "North Ryde NSW": "2113",
  "Macquarie Park NSW": "2113", "Eastwood NSW": "2122", "Epping NSW": "2121",
  "Chatswood NSW": "2067", "Roseville NSW": "2069", "Lindfield NSW": "2070",
  "Killara NSW": "2071", "Gordon NSW": "2072", "Pymble NSW": "2073",
  "St Ives NSW": "2075", "Turramurra NSW": "2074", "Wahroonga NSW": "2076",
  "Hornsby NSW": "2077", "Beecroft NSW": "2119", "Pennant Hills NSW": "2120",
  "Castle Hill NSW": "2154", "Baulkham Hills NSW": "2153", "Kellyville NSW": "2155",
  "Manly NSW": "2095", "Dee Why NSW": "2099", "Collaroy NSW": "2097",
  "Narrabeen NSW": "2101", "Mona Vale NSW": "2103", "Newport NSW": "2106",
  "Avalon Beach NSW": "2107", "Palm Beach NSW": "2108", "Freshwater NSW": "2096",
  "Parramatta NSW": "2150", "Westmead NSW": "2145", "Granville NSW": "2142",
  "Merrylands NSW": "2160", "Liverpool NSW": "2170", "Bankstown NSW": "2200",
  "Campsie NSW": "2194", "Canterbury NSW": "2193", "Hurstville NSW": "2220",
  "Kogarah NSW": "2217", "Rockdale NSW": "2216", "Wolli Creek NSW": "2205",
  "Cronulla NSW": "2230", "Caringbah NSW": "2229", "Miranda NSW": "2228",
  "Sutherland NSW": "2232", "Newcastle NSW": "2300", "Hamilton NSW": "2303",
  "Charlestown NSW": "2290", "Merewether NSW": "2291", "New Lambton NSW": "2305",
  "Gosford NSW": "2250", "Terrigal NSW": "2260", "Woy Woy NSW": "2256",
  "Wollongong NSW": "2500", "Fairy Meadow NSW": "2519", "Thirroul NSW": "2515",
  "Dapto NSW": "2530", "Shellharbour NSW": "2529", "Kiama NSW": "2533",
  "Byron Bay NSW": "2481", "Ballina NSW": "2478", "Tweed Heads NSW": "2485",
  "Lismore NSW": "2480", "Coffs Harbour NSW": "2450", "Port Macquarie NSW": "2444",
  "Tamworth NSW": "2340", "Armidale NSW": "2350", "Orange NSW": "2800",
  "Bathurst NSW": "2795", "Dubbo NSW": "2830", "Wagga Wagga NSW": "2650",
  "Albury NSW": "2640",
  // VIC
  "Melbourne CBD VIC": "3000", "Southbank VIC": "3006", "Docklands VIC": "3008",
  "Carlton VIC": "3053", "Fitzroy VIC": "3065", "Collingwood VIC": "3066",
  "Abbotsford VIC": "3067", "Richmond VIC": "3121", "Hawthorn VIC": "3122",
  "Kew VIC": "3101", "Camberwell VIC": "3124", "Box Hill VIC": "3128",
  "Brunswick VIC": "3056", "Northcote VIC": "3070", "Preston VIC": "3072",
  "South Yarra VIC": "3141", "Prahran VIC": "3181", "St Kilda VIC": "3182",
  "Elwood VIC": "3184", "Caulfield VIC": "3162", "Brighton VIC": "3186",
  "Hampton VIC": "3188", "Sandringham VIC": "3191", "Cheltenham VIC": "3192",
  "Footscray VIC": "3011", "Yarraville VIC": "3013", "Newport VIC": "3015",
  "Williamstown VIC": "3016", "Glen Waverley VIC": "3150", "Clayton VIC": "3168",
  "Dandenong VIC": "3175", "Frankston VIC": "3199", "Mornington VIC": "3931",
  "Ringwood VIC": "3134", "Croydon VIC": "3136", "Essendon VIC": "3040",
  "Geelong VIC": "3220", "Torquay VIC": "3228", "Ballarat VIC": "3350",
  "Bendigo VIC": "3550",
  // Seattle metro — US ZIP codes
  "Capitol Hill Seattle":     "98102",
  "Belltown Seattle":         "98121",
  "South Lake Union Seattle": "98109",
  "Queen Anne Seattle":       "98119",
  "Fremont Seattle":          "98103",
  "Ballard Seattle":          "98107",
  "West Seattle Seattle":     "98116",
  "Columbia City Seattle":    "98118",
  "Beacon Hill Seattle":      "98108",
  "First Hill Seattle":       "98104",
  "Pioneer Square Seattle":   "98104",
  "Downtown Seattle":         "98101",
  "Eastlake Seattle":         "98102",
  "Madrona Seattle":          "98122",
  "Madison Park Seattle":     "98112",
  "Green Lake Seattle":       "98103",
  "Wallingford Seattle":      "98103",
  "University District Seattle": "98105",
  "Northgate Seattle":        "98125",
  "Redmond WA":               "98052",
  "Bellevue WA":              "98004",
  "Kirkland WA":              "98033",
  "Mercer Island WA":         "98040",
  "Renton WA":                "98055",
  "Bothell WA":               "98011",
  "Issaquah WA":              "98027",
  "Shoreline WA":             "98133",
};

export function getPostcode(suburb: string): string | null {
  return POSTCODE_MAP[suburb] ?? null;
}

export function getRegion(suburb: string): "au" | "us" {
  return suburb.includes("Seattle") || POSTCODE_MAP[suburb]?.length === 5
    ? "us"
    : "au";
}

export function getSearchTerms(suburb: string): { suburb: string; postcode: string | null; city: string } {
  const postcode = getPostcode(suburb);
  const city = suburb
    .replace(/\s+(NSW|VIC|QLD|SA|TAS|ACT|NT)$/i, "") // AU state suffixes (skip WA — ambiguous)
    .replace(/\s+Seattle$/, "")                         // "Capitol Hill Seattle" → "Capitol Hill"
    .trim();
  return { suburb, postcode, city };
}
