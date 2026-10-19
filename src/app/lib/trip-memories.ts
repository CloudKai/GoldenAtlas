// "On this day": memories from earlier years that happened on today's date.
import type { MemoryPhoto, Trip, TripDay } from "../types/domain";
import { dayHasContent, datesInRange, hasStarted, todayISO, tripDays } from "./trip-days";

export interface OnThisDayEntry {
  year: number;
  date: string;
  trip: Trip;
  photos: MemoryPhoto[];
  day?: TripDay;
}

/** Past trips with photos or a diary on today's month and day, newest year first. */
export function onThisDay(trips: readonly Trip[], today = todayISO()): OnThisDayEntry[] {
  const monthDay = today.slice(5);
  const thisYear = Number(today.slice(0, 4));
  const entries: OnThisDayEntry[] = [];
  for (const trip of trips) {
    if (!hasStarted(trip, today)) continue;
    for (const date of datesInRange(trip.startDate, trip.endDate)) {
      if (date.slice(5) !== monthDay || Number(date.slice(0, 4)) >= thisYear) continue;
      const photos = trip.photos.filter((photo) => photo.date === date);
      const day = tripDays(trip).find((item) => item.date === date);
      if (!photos.length && !(day && dayHasContent(day))) continue;
      entries.push({ year: Number(date.slice(0, 4)), date, trip, photos, day });
    }
  }
  return entries.sort((a, b) => b.year - a.year || a.trip.title.localeCompare(b.trip.title));
}
