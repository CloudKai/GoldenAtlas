import { CITY_OPTIONS, createTripStop } from "./city-visits";
import type { MemoryPhoto as Photo, Trip } from "../types/domain";

export type { MemoryPhoto as Photo, Trip } from "../types/domain";

export interface CountryData {
  id: string;
  name: string;
  flag: string;
  continent: string;
  visited: boolean;
  bucketList: boolean;
  firstVisit?: string;
  lastVisit?: string;
  tripCount: number;
  photoCount: number;
}

export const VISITED_COUNTRY_IDS = ["FR", "IT", "JP", "TH", "AU", "GB", "US", "MA", "PT", "DE"];

export const BUCKET_LIST_IDS = ["NZ", "PE", "IS", "NO", "MX"];

export const COUNTRIES: Record<string, CountryData> = {
  FR: { id: "FR", name: "France", flag: "🇫🇷", continent: "Europe", visited: true, bucketList: false, firstVisit: "2019-05-10", lastVisit: "2023-06-22", tripCount: 3, photoCount: 84 },
  IT: { id: "IT", name: "Italy", flag: "🇮🇹", continent: "Europe", visited: true, bucketList: false, firstVisit: "2020-09-15", lastVisit: "2022-09-28", tripCount: 2, photoCount: 112 },
  JP: { id: "JP", name: "Japan", flag: "🇯🇵", continent: "Asia", visited: true, bucketList: false, firstVisit: "2023-04-01", lastVisit: "2023-04-18", tripCount: 1, photoCount: 203 },
  TH: { id: "TH", name: "Thailand", flag: "🇹🇭", continent: "Asia", visited: true, bucketList: false, firstVisit: "2022-12-20", lastVisit: "2022-12-31", tripCount: 1, photoCount: 67 },
  AU: { id: "AU", name: "Australia", flag: "🇦🇺", continent: "Oceania", visited: true, bucketList: false, firstVisit: "2023-01-05", lastVisit: "2023-01-22", tripCount: 1, photoCount: 95 },
  GB: { id: "GB", name: "United Kingdom", flag: "🇬🇧", continent: "Europe", visited: true, bucketList: false, firstVisit: "2021-05-14", lastVisit: "2022-05-20", tripCount: 2, photoCount: 58 },
  US: { id: "US", name: "United States", flag: "🇺🇸", continent: "North America", visited: true, bucketList: false, firstVisit: "2018-03-10", lastVisit: "2024-03-18", tripCount: 4, photoCount: 147 },
  MA: { id: "MA", name: "Morocco", flag: "🇲🇦", continent: "Africa", visited: true, bucketList: false, firstVisit: "2024-02-14", lastVisit: "2024-02-24", tripCount: 1, photoCount: 72 },
  PT: { id: "PT", name: "Portugal", flag: "🇵🇹", continent: "Europe", visited: true, bucketList: false, firstVisit: "2021-07-10", lastVisit: "2021-07-18", tripCount: 1, photoCount: 43 },
  DE: { id: "DE", name: "Germany", flag: "🇩🇪", continent: "Europe", visited: true, bucketList: false, firstVisit: "2019-12-20", lastVisit: "2019-12-27", tripCount: 1, photoCount: 31 },
  NZ: { id: "NZ", name: "New Zealand", flag: "🇳🇿", continent: "Oceania", visited: false, bucketList: true, tripCount: 0, photoCount: 0 },
  PE: { id: "PE", name: "Peru", flag: "🇵🇪", continent: "South America", visited: false, bucketList: true, tripCount: 0, photoCount: 0 },
  IS: { id: "IS", name: "Iceland", flag: "🇮🇸", continent: "Europe", visited: false, bucketList: true, tripCount: 0, photoCount: 0 },
  NO: { id: "NO", name: "Norway", flag: "🇳🇴", continent: "Europe", visited: false, bucketList: true, tripCount: 0, photoCount: 0 },
  MX: { id: "MX", name: "Mexico", flag: "🇲🇽", continent: "North America", visited: false, bucketList: true, tripCount: 0, photoCount: 0 },
};

const unsplash = (id: string, w = 800) =>
  `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;

const stopsFor = (tripId: string, cityIds: string[]) => cityIds.map((cityId) => {
  const option = CITY_OPTIONS.find((city) => city.id === cityId);
  if (!option) throw new Error(`Missing city fixture: ${cityId}`);
  return createTripStop(option, tripId);
});

export const TRIPS: Trip[] = [
  {
    id: "trip-fr-1",
    countryId: "FR",
    title: "Paris in Summer",
    city: "Paris",
    country: "France",
    countryFlag: "🇫🇷",
    startDate: "2023-06-12",
    endDate: "2023-06-22",
    duration: 10,
    coverImage: unsplash("photo-1499856871958-5b9627545d1a"),
    journal: "Paris was everything I'd hoped for and more. The city moved at a gentle pace in the summer heat — cafés spilling onto cobblestones, long evenings lit by golden light. I spent mornings wandering through the Marais and afternoons watching the Seine from Pont des Arts.",
    favouriteMemory: "Sitting at a small table outside Café de Flore with a café crème, watching the city walk by. No plans, no rush — just Paris being Paris.",
    mood: "✨",
    rating: 5,
    companions: ["Alice"],
    places: ["Le Marais", "Montmartre", "Musée d'Orsay", "Versailles"],
    stops: stopsFor("trip-fr-1", ["fr-paris"]),
    isFavourite: true,
    photos: [
      { id: "ph-fr-1-1", url: unsplash("photo-1499856871958-5b9627545d1a"), caption: "Eiffel Tower at golden hour", date: "2023-06-13", location: "Champ de Mars", isFavourite: true },
      { id: "ph-fr-1-2", url: unsplash("photo-1454386608169-1c3b4edc1df8"), caption: "Sunset over the rooftops", date: "2023-06-14", location: "Montmartre", isFavourite: false },
      { id: "ph-fr-1-3", url: unsplash("photo-1502602898657-3e91760cbb34"), caption: "Notre-Dame from the river", date: "2023-06-15", location: "Seine", isFavourite: false },
      { id: "ph-fr-1-4", url: unsplash("photo-1520939817895-060bdaf4fe1b"), caption: "Morning at the Louvre", date: "2023-06-16", location: "1st Arrondissement", isFavourite: true },
      { id: "ph-fr-1-5", url: unsplash("photo-1551887373-3c5bd224f6e2"), caption: "Versailles gardens", date: "2023-06-17", location: "Versailles", isFavourite: false },
      { id: "ph-fr-1-6", url: unsplash("photo-1543349689-9a4d426bee8e"), caption: "The Seine at night", date: "2023-06-20", location: "Right Bank", isFavourite: false },
    ],
  },
  {
    id: "trip-fr-2",
    countryId: "FR",
    title: "Provence & The South",
    city: "Marseille & Aix",
    country: "France",
    countryFlag: "🇫🇷",
    startDate: "2021-07-20",
    endDate: "2021-07-29",
    duration: 9,
    coverImage: unsplash("photo-1520466809213-7b9a56adcd45"),
    journal: "Lavender fields, rosé wine, and the smell of thyme in the heat. Provence moves at its own unhurried rhythm and I was glad to slow down to match it.",
    mood: "🌿",
    rating: 5,
    companions: [],
    places: ["Aix-en-Provence", "Les Baux", "Gordes", "Cassis"],
    stops: stopsFor("trip-fr-2", ["fr-marseille", "fr-aix"]),
    isFavourite: false,
    photos: [
      { id: "ph-fr-2-1", url: unsplash("photo-1520466809213-7b9a56adcd45"), caption: "Lavender fields near Valensole", date: "2021-07-22", location: "Valensole Plateau", isFavourite: true },
      { id: "ph-fr-2-2", url: unsplash("photo-1533533903671-3a25e4edec6e"), caption: "Village perché at dawn", date: "2021-07-24", location: "Gordes", isFavourite: false },
      { id: "ph-fr-2-3", url: unsplash("photo-1569965257368-36ea30dab866"), caption: "Calanques coast path", date: "2021-07-26", location: "Cassis", isFavourite: false },
    ],
  },
  {
    id: "trip-fr-3",
    countryId: "FR",
    title: "Paris — First Visit",
    city: "Paris",
    country: "France",
    countryFlag: "🇫🇷",
    startDate: "2019-05-10",
    endDate: "2019-05-17",
    duration: 7,
    coverImage: unsplash("photo-1550340499-a6c60fc8287c"),
    journal: "My first time in Paris. Everything felt impossibly romantic and impossibly real at the same time.",
    mood: "💛",
    rating: 5,
    companions: ["Mum", "Dad"],
    places: ["Eiffel Tower", "Louvre", "Champs-Élysées"],
    stops: stopsFor("trip-fr-3", ["fr-paris"]),
    isFavourite: true,
    photos: [
      { id: "ph-fr-3-1", url: unsplash("photo-1550340499-a6c60fc8287c"), caption: "First glimpse of the Eiffel Tower", date: "2019-05-11", location: "Trocadéro", isFavourite: true },
    ],
  },
  {
    id: "trip-it-1",
    countryId: "IT",
    title: "Amalfi & Rome",
    city: "Positano & Rome",
    country: "Italy",
    countryFlag: "🇮🇹",
    startDate: "2022-09-15",
    endDate: "2022-09-28",
    duration: 13,
    coverImage: unsplash("photo-1516483638261-f4dbaf036963"),
    journal: "The Amalfi Coast is the kind of place that makes you understand why painters gave up everything to stay. Every curve in the cliff road revealed something more beautiful than the last.",
    favouriteMemory: "Eating lemon granita on the waterfront in Positano at midnight, watching the lights of Praiano flicker across the water.",
    mood: "🍋",
    rating: 5,
    companions: ["Marco"],
    places: ["Positano", "Ravello", "Pompeii", "Rome"],
    stops: stopsFor("trip-it-1", ["it-positano", "it-rome"]),
    isFavourite: true,
    photos: [
      { id: "ph-it-1-1", url: unsplash("photo-1516483638261-f4dbaf036963"), caption: "Positano from the cliffside", date: "2022-09-17", location: "Positano", isFavourite: true },
      { id: "ph-it-1-2", url: unsplash("photo-1533154374019-3ae8d65a0c9b"), caption: "The Colosseum at dusk", date: "2022-09-23", location: "Rome", isFavourite: true },
      { id: "ph-it-1-3", url: unsplash("photo-1529260830199-42c24126f198"), caption: "Roman forum ruins", date: "2022-09-24", location: "Rome", isFavourite: false },
      { id: "ph-it-1-4", url: unsplash("photo-1515542622106-78bda8ba0e5b"), caption: "Trevi Fountain at dawn", date: "2022-09-25", location: "Rome", isFavourite: false },
      { id: "ph-it-1-5", url: unsplash("photo-1491557345352-5929e343eb89"), caption: "Via delle Quattro Fontane", date: "2022-09-26", location: "Rome", isFavourite: false },
    ],
  },
  {
    id: "trip-it-2",
    countryId: "IT",
    title: "Tuscany & Florence",
    city: "Florence & Siena",
    country: "Italy",
    countryFlag: "🇮🇹",
    startDate: "2020-09-10",
    endDate: "2020-09-19",
    duration: 9,
    coverImage: unsplash("photo-1523531294919-4bcd7c65e216"),
    journal: "Rolling hills, cypress trees, and wine at every turn. Tuscany looked exactly like a Renaissance painting come to life.",
    mood: "🍷",
    rating: 5,
    companions: [],
    places: ["Florence", "Siena", "San Gimignano", "Volterra"],
    stops: stopsFor("trip-it-2", ["it-florence", "it-siena"]),
    isFavourite: false,
    photos: [
      { id: "ph-it-2-1", url: unsplash("photo-1523531294919-4bcd7c65e216"), caption: "Tuscan hills at sunrise", date: "2020-09-12", location: "Val d'Orcia", isFavourite: true },
      { id: "ph-it-2-2", url: unsplash("photo-1543429776-2782fc8e4c7b"), caption: "The Duomo in Florence", date: "2020-09-14", location: "Florence", isFavourite: false },
    ],
  },
  {
    id: "trip-jp-1",
    countryId: "JP",
    title: "Japan — Cherry Blossom Season",
    city: "Tokyo & Kyoto",
    country: "Japan",
    countryFlag: "🇯🇵",
    startDate: "2023-04-01",
    endDate: "2023-04-18",
    duration: 17,
    coverImage: unsplash("photo-1549517045-bc93de199c7d"),
    journal: "Japan in sakura season is unlike anything else. Entire parks turned pink. Families laid out picnic mats under the blossoms. Old women in kimonos posed for photos. I felt like I had stepped into another world — one more intentional, more beautiful, more considered than my own.",
    favouriteMemory: "Walking through Maruyama Park in Kyoto at dusk, the ancient cherry tree lit from below, petals falling like slow snow onto the dark water.",
    mood: "🌸",
    rating: 5,
    companions: [],
    places: ["Tokyo", "Nikko", "Kyoto", "Nara", "Osaka"],
    stops: stopsFor("trip-jp-1", ["jp-tokyo", "jp-kyoto", "jp-nara", "jp-osaka"]),
    isFavourite: true,
    photos: [
      { id: "ph-jp-1-1", url: unsplash("photo-1549517045-bc93de199c7d"), caption: "Tokyo streetscape at night", date: "2023-04-02", location: "Shinjuku", isFavourite: false },
      { id: "ph-jp-1-2", url: unsplash("photo-1528360983277-13d401cdc186"), caption: "Kyoto temple at dawn", date: "2023-04-09", location: "Fushimi Inari", isFavourite: true },
      { id: "ph-jp-1-3", url: unsplash("photo-1480796927426-f609979314bd"), caption: "Cherry blossoms in full bloom", date: "2023-04-10", location: "Maruyama Park, Kyoto", isFavourite: true },
      { id: "ph-jp-1-4", url: unsplash("photo-1541801742709-1c4e3f82ce28"), caption: "Torii gates at Fushimi Inari", date: "2023-04-11", location: "Kyoto", isFavourite: false },
      { id: "ph-jp-1-5", url: unsplash("photo-1596422846543-75c6fc197f07"), caption: "Nara deer park", date: "2023-04-13", location: "Nara", isFavourite: false },
      { id: "ph-jp-1-6", url: unsplash("photo-1524413840807-0c3cb6fa808d"), caption: "Osaka Dotonbori at night", date: "2023-04-16", location: "Osaka", isFavourite: false },
      { id: "ph-jp-1-7", url: unsplash("photo-1558618666-fcd25c85cd64"), caption: "Mount Fuji from the Shinkansen", date: "2023-04-08", location: "En route to Kyoto", isFavourite: true },
    ],
  },
  {
    id: "trip-th-1",
    countryId: "TH",
    title: "Bangkok & Chiang Mai",
    city: "Bangkok & Chiang Mai",
    country: "Thailand",
    countryFlag: "🇹🇭",
    startDate: "2022-12-20",
    endDate: "2022-12-31",
    duration: 11,
    coverImage: unsplash("photo-1528181304800-259b08848526"),
    journal: "Arriving in Bangkok, the heat hits you first. Then the noise. Then the smell of lemongrass and charcoal from a thousand street stalls. Chiang Mai felt entirely different — quieter, cooler, surrounded by mountains and temples in the mist.",
    favouriteMemory: "Releasing a paper lantern into the night sky with hundreds of others during Yi Peng festival. The city below disappearing into a sea of flickering lights.",
    mood: "🏮",
    rating: 5,
    companions: ["Jamie", "Priya"],
    places: ["Chatuchak Market", "Wat Pho", "Chiang Mai Night Bazaar", "Doi Inthanon"],
    stops: stopsFor("trip-th-1", ["th-bangkok", "th-chiang-mai"]),
    isFavourite: true,
    photos: [
      { id: "ph-th-1-1", url: unsplash("photo-1528181304800-259b08848526"), caption: "Wat Pho golden stupa", date: "2022-12-22", location: "Bangkok", isFavourite: false },
      { id: "ph-th-1-2", url: unsplash("photo-1563492065599-3520f775eeed"), caption: "Chiang Mai temple at dusk", date: "2022-12-27", location: "Doi Suthep, Chiang Mai", isFavourite: true },
      { id: "ph-th-1-3", url: unsplash("photo-1506665531195-3566af2b4dfa"), caption: "Floating market at dawn", date: "2022-12-23", location: "Damnoen Saduak", isFavourite: false },
    ],
  },
  {
    id: "trip-au-1",
    countryId: "AU",
    title: "Sydney & The Blue Mountains",
    city: "Sydney",
    country: "Australia",
    countryFlag: "🇦🇺",
    startDate: "2023-01-05",
    endDate: "2023-01-22",
    duration: 17,
    coverImage: unsplash("photo-1506973035872-a4ec16b8e8d9"),
    journal: "Summer in Sydney felt wonderfully upside-down — January heat, Christmas still on shop fronts, and the harbour shimmering silver every morning. I swam in ocean pools, hiked through the Blue Mountains, and ate fish tacos at Bondi.",
    favouriteMemory: "Watching the sun rise from the top of the Harbour Bridge. The whole city glittered below like a scattered map.",
    mood: "🌊",
    rating: 5,
    companions: ["Sam"],
    places: ["Opera House", "Bondi Beach", "Blue Mountains", "Manly"],
    stops: stopsFor("trip-au-1", ["au-sydney"]),
    isFavourite: false,
    photos: [
      { id: "ph-au-1-1", url: unsplash("photo-1506973035872-a4ec16b8e8d9"), caption: "Sydney Opera House at sunrise", date: "2023-01-07", location: "Circular Quay", isFavourite: true },
      { id: "ph-au-1-2", url: unsplash("photo-1523482580672-f1090a2d3734"), caption: "Bondi Beach afternoon", date: "2023-01-10", location: "Bondi Beach", isFavourite: false },
      { id: "ph-au-1-3", url: unsplash("photo-1444201716572-c60ec66d0494"), caption: "Three Sisters, Blue Mountains", date: "2023-01-15", location: "Katoomba", isFavourite: true },
      { id: "ph-au-1-4", url: unsplash("photo-1474044159687-1ee9f3a51722"), caption: "Manly Ferry crossing the harbour", date: "2023-01-08", location: "Sydney Harbour", isFavourite: false },
    ],
  },
  {
    id: "trip-gb-1",
    countryId: "GB",
    title: "London — Spring",
    city: "London",
    country: "United Kingdom",
    countryFlag: "🇬🇧",
    startDate: "2022-05-14",
    endDate: "2022-05-20",
    duration: 6,
    coverImage: unsplash("photo-1486299267070-83823f5448dd"),
    journal: "London in May is entirely different to London in grey November. The parks are full, the light is soft, and people actually sit outside.",
    mood: "☀️",
    rating: 4,
    companions: [],
    places: ["Tate Modern", "Borough Market", "Greenwich", "Victoria & Albert Museum"],
    stops: stopsFor("trip-gb-1", ["gb-london"]),
    isFavourite: false,
    photos: [
      { id: "ph-gb-1-1", url: unsplash("photo-1486299267070-83823f5448dd"), caption: "Tower Bridge in the morning", date: "2022-05-15", location: "Southwark", isFavourite: false },
      { id: "ph-gb-1-2", url: unsplash("photo-1513635269975-59663e0ac1ad"), caption: "Big Ben and Parliament", date: "2022-05-16", location: "Westminster", isFavourite: false },
    ],
  },
  {
    id: "trip-us-1",
    countryId: "US",
    title: "New York City",
    city: "New York",
    country: "United States",
    countryFlag: "🇺🇸",
    startDate: "2024-03-10",
    endDate: "2024-03-18",
    duration: 8,
    coverImage: unsplash("photo-1534430480872-3498386e7856"),
    journal: "New York is relentless in the best way. Every block holds something unexpected. I walked until my feet gave out, then walked some more.",
    favouriteMemory: "Getting a bagel at 7am in the Lower East Side, sitting on a stoop, watching the city wake up.",
    mood: "🗽",
    rating: 5,
    companions: ["Chris"],
    places: ["Brooklyn Bridge", "High Line", "MOMA", "Central Park"],
    stops: stopsFor("trip-us-1", ["us-new-york"]),
    isFavourite: true,
    photos: [
      { id: "ph-us-1-1", url: unsplash("photo-1534430480872-3498386e7856"), caption: "Manhattan skyline at dusk", date: "2024-03-12", location: "Brooklyn Bridge Park", isFavourite: true },
      { id: "ph-us-1-2", url: unsplash("photo-1485871981521-5b1fd3805eee"), caption: "Central Park in early spring", date: "2024-03-14", location: "Central Park", isFavourite: false },
      { id: "ph-us-1-3", url: unsplash("photo-1500916434205-0c77489c6cf7"), caption: "High Line at sunset", date: "2024-03-15", location: "Chelsea", isFavourite: false },
    ],
  },
  {
    id: "trip-ma-1",
    countryId: "MA",
    title: "Marrakech & The Atlas",
    city: "Marrakech",
    country: "Morocco",
    countryFlag: "🇲🇦",
    startDate: "2024-02-14",
    endDate: "2024-02-24",
    duration: 10,
    coverImage: unsplash("photo-1560969184-10fe8719e047"),
    journal: "The souks of Marrakech are organised chaos and pure sensory joy. Colours, textures, sounds, smells — everything at once. Then, a day's drive through the Atlas Mountains and suddenly the red earth gives way to snow-capped peaks.",
    favouriteMemory: "Arriving in the Sahara desert at sunset. Standing in the silence, watching the dunes turn from gold to copper to violet.",
    mood: "🌅",
    rating: 5,
    companions: ["Lena"],
    places: ["Marrakech Medina", "Jemaa el-Fna", "Atlas Mountains", "Merzouga Dunes"],
    stops: stopsFor("trip-ma-1", ["ma-marrakech"]),
    isFavourite: true,
    photos: [
      { id: "ph-ma-1-1", url: unsplash("photo-1560969184-10fe8719e047"), caption: "Medina rooftops at sunset", date: "2024-02-16", location: "Marrakech", isFavourite: true },
      { id: "ph-ma-1-2", url: unsplash("photo-1517821099606-e19b39a58d67"), caption: "Souk textiles", date: "2024-02-17", location: "Marrakech Souks", isFavourite: false },
      { id: "ph-ma-1-3", url: unsplash("photo-1489493887464-892be6d1daae"), caption: "Atlas Mountain village", date: "2024-02-20", location: "Imlil", isFavourite: false },
      { id: "ph-ma-1-4", url: unsplash("photo-1509023464722-18d996393ca8"), caption: "Sahara dunes at golden hour", date: "2024-02-22", location: "Merzouga, Erg Chebbi", isFavourite: true },
    ],
  },
  {
    id: "trip-pt-1",
    countryId: "PT",
    title: "Lisbon & the Alentejo",
    city: "Lisbon",
    country: "Portugal",
    countryFlag: "🇵🇹",
    startDate: "2021-07-10",
    endDate: "2021-07-18",
    duration: 8,
    coverImage: unsplash("photo-1526746323784-6bc814d79273"),
    journal: "Lisbon feels like a secret that everyone knows but somehow doesn't seem crowded. Tram 28 rattling through the Alfama. Pastéis de nata warm from the oven. Fado drifting from somewhere deeper in the alley.",
    mood: "💛",
    rating: 4,
    companions: [],
    places: ["Alfama", "Belém", "Sintra", "Évora"],
    stops: stopsFor("trip-pt-1", ["pt-lisbon"]),
    isFavourite: false,
    photos: [
      { id: "ph-pt-1-1", url: unsplash("photo-1526746323784-6bc814d79273"), caption: "Alfama district at dawn", date: "2021-07-12", location: "Alfama, Lisbon", isFavourite: false },
      { id: "ph-pt-1-2", url: unsplash("photo-1558618047-3c8c76ca7d13"), caption: "Belém Tower and the Tagus", date: "2021-07-13", location: "Belém, Lisbon", isFavourite: false },
    ],
  },
];

export const getTripsForCountry = (countryId: string): Trip[] =>
  TRIPS.filter((t) => t.countryId === countryId);

export const getFavouriteTrips = (): Trip[] =>
  TRIPS.filter((t) => t.isFavourite);

export const getFavouritePhotos = (): Photo[] =>
  TRIPS.flatMap((t) => t.photos).filter((p) => p.isFavourite);

export const getAllPhotos = (): (Photo & { countryId: string; tripTitle: string; country: string })[] =>
  TRIPS.flatMap((t) =>
    t.photos.map((p) => ({
      ...p,
      countryId: t.countryId,
      tripTitle: t.title,
      country: t.country,
    }))
  );

export const STATS = {
  countriesVisited: VISITED_COUNTRY_IDS.length,
  totalCountries: 195,
  continentsVisited: 5,
  totalContinents: 7,
  totalTrips: TRIPS.length,
  totalTravelDays: TRIPS.reduce((s, t) => s + t.duration, 0),
  totalPhotos: TRIPS.reduce((s, t) => s + t.photos.length, 0),
  mostVisitedCountry: "France",
  firstTrip: { country: "United States", date: "2018-03-10" },
  mostRecentTrip: { country: "Morocco", date: "2024-02-24" },
  favouriteCountry: "Japan",
  tripsByYear: [
    { year: 2018, count: 1 },
    { year: 2019, count: 2 },
    { year: 2020, count: 1 },
    { year: 2021, count: 3 },
    { year: 2022, count: 3 },
    { year: 2023, count: 3 },
    { year: 2024, count: 2 },
  ],
  continentBreakdown: [
    { continent: "Europe", count: 7 },
    { continent: "Asia", count: 2 },
    { continent: "Oceania", count: 1 },
    { continent: "North America", count: 1 },
    { continent: "Africa", count: 1 },
  ],
};
