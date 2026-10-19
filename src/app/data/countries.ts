import { COUNTRY_RECORDS } from "./countries.generated";

export interface CountryInfo {
  id: string;
  name: string;
  flag: string;
  continent: string;
  /** True for the 195 countries behind the "x of 195" statistic; territories and regions are still fully selectable. */
  countsTowardTotal: boolean;
}

const CONTINENT_NAMES: Record<string, string> = {
  AF: "Africa", AN: "Antarctica", AS: "Asia", EU: "Europe", NA: "North America", OC: "Oceania", SA: "South America",
};

export function flagForCountry(id: string) {
  const code = id.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🌍";
  return String.fromCodePoint(...[...code].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65));
}

export const COUNTRY_LIST: readonly CountryInfo[] = COUNTRY_RECORDS.map(([id, name, continentCode, counts]) => ({
  id,
  name,
  flag: flagForCountry(id),
  continent: CONTINENT_NAMES[continentCode] ?? "World",
  countsTowardTotal: counts === 1,
}));

const COUNTRY_BY_ID = new Map(COUNTRY_LIST.map((country) => [country.id, country]));

/**
 * Map shapes without their own database row. They resolve to the country or territory they belong to, so tapping
 * them behaves like tapping that place instead of failing.
 */
export const MAP_SHAPE_ALIASES: Readonly<Record<string, string>> = {
  GO: "TF", // Glorioso Islands
  JU: "TF", // Juan de Nova Island
  "UM-DQ": "UM", // Jarvis Island
  "UM-FQ": "UM", // Baker Island
  "UM-HQ": "UM", // Howland Island
  "UM-JQ": "UM", // Johnston Atoll
  "UM-MQ": "UM", // Midway Islands
  "UM-WQ": "UM", // Wake Island
};

/** Resolves a map shape id (or a stored code) to the id used for trips, bucket list and statistics. */
export function resolveCountryId(id: string) {
  const code = id.trim().toUpperCase();
  return MAP_SHAPE_ALIASES[code] ?? code;
}

/** Every map shape that should light up when `id` is visited: the country itself plus any aliased shapes. */
export function shapeIdsForCountry(id: string) {
  return [id, ...Object.entries(MAP_SHAPE_ALIASES).filter(([, target]) => target === id).map(([shape]) => shape)];
}

export const getCountry = (id: string | null | undefined): CountryInfo | undefined => id ? COUNTRY_BY_ID.get(resolveCountryId(id)) : undefined;
export const countryName = (id: string, fallback = id) => getCountry(id)?.name ?? fallback;
export const countsTowardWorldTotal = (id: string) => getCountry(id)?.countsTowardTotal ?? false;

/** Alternate and former names people actually type. Matching is lenient on purpose. */
const SEARCH_ALIASES: Readonly<Record<string, string>> = {
  US: "usa america united states of america", GB: "uk england scotland wales britain great britain northern ireland",
  NL: "holland netherlands", CZ: "czech republic", SZ: "swaziland", MK: "macedonia", MM: "burma", CI: "cote d'ivoire ivory coast",
  CV: "cape verde", TR: "turkiye", KR: "korea republic of korea", KP: "korea dprk", AE: "uae emirates", CD: "drc congo kinshasa",
  CG: "congo brazzaville", VA: "holy see vatican city", TL: "east timor timor-leste", PS: "palestine gaza west bank",
  RU: "russian federation", LA: "lao", BN: "brunei darussalam", FM: "micronesia", MO: "macau", HK: "hong kong china",
  TW: "taiwan republic of china", XK: "kosovo", AQ: "antarctic south pole", UM: "wake midway howland baker jarvis johnston",
  TF: "kerguelen glorioso juan de nova", VN: "viet nam", SY: "syrian", IR: "persia", BO: "bolivia plurinational", VE: "venezuela bolivarian",
};

/** Lowercases and strips accents, so "cote" finds Côte d'Ivoire and "sao" finds São Tomé. */
export const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const SEARCH_INDEX = COUNTRY_LIST.map((country) => ({
  country,
  text: normalizeSearch(`${country.name} ${country.id} ${SEARCH_ALIASES[country.id] ?? ""}`),
  name: normalizeSearch(country.name),
}));

/** Name matches that start the query rank first, then other name matches, then aliases and codes. */
export function searchCountries(query: string, list: readonly CountryInfo[] = COUNTRY_LIST) {
  const needle = normalizeSearch(query);
  if (!needle) return [...list];
  const allowed = new Set(list.map((country) => country.id));
  return SEARCH_INDEX
    .filter((entry) => allowed.has(entry.country.id) && entry.text.includes(needle))
    .map((entry) => ({ country: entry.country, rank: entry.name.startsWith(needle) ? 0 : entry.name.includes(needle) ? 1 : 2 }))
    .sort((a, b) => a.rank - b.rank || a.country.name.localeCompare(b.country.name, "en"))
    .map((entry) => entry.country);
}
