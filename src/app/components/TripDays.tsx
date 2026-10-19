import { useState } from "react";
import { Camera, ChevronDown, Folder, FolderOpen, Image as ImageIcon, Plus, Trash2, X } from "lucide-react";
import type { MemoryPhoto, Trip } from "../types/domain";
import { setCoverPhoto } from "../lib/trip-extras";
import { addDays, addDayToTrip, canRemoveLastDay, dayFolders, movePhotoToDay, removeLastDay, todayISO, updateDay, updatePhoto, type DayFolder } from "../lib/trip-days";

interface TripDaysProps {
  /** The draft while editing, otherwise the saved trip. */
  trip: Trip;
  editing: boolean;
  busy: boolean;
  onChange: (next: Trip) => void;
  onAddPhotos: (files: File[], date: string) => void;
  /** Outside edit mode, adding a day saves the longer trip straight away. */
  onAddDayNow: () => void;
  onOpenPhoto: (photoId: string) => void;
}

const inputStyle = { borderColor: "var(--border)", color: "var(--foreground)" } as const;
const labelStyle = { color: "var(--muted-foreground)" } as const;

const dayLabel = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
const countLabel = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export function TripDays({ trip, editing, busy, onChange, onAddPhotos, onAddDayNow, onOpenPhoto }: TripDaysProps) {
  const { days, otherPhotos, truncated } = dayFolders(trip);
  const today = todayISO();
  const [open, setOpen] = useState<Set<string>>(() => new Set(days[0] ? [days[0].date] : []));
  const toggle = (key: string) => setOpen((current) => {
    const next = new Set(current);
    if (!next.delete(key)) next.add(key);
    return next;
  });

  const addDay = () => {
    const newDate = addDays(trip.endDate, 1);
    setOpen((current) => new Set(current).add(newDate));
    if (editing) onChange(addDayToTrip(trip));
    else onAddDayNow();
  };

  const moveTargets = (photo: MemoryPhoto) => (
    <select
      value={days.some((day) => day.date === photo.date) ? photo.date : ""}
      onChange={(event) => event.target.value && onChange(movePhotoToDay(trip, photo.id, event.target.value))}
      aria-label={`Move ${photo.caption || "photo"} to another day`}
      className="h-9 w-full rounded-lg border bg-transparent px-2 text-xs"
      style={inputStyle}
    >
      {!days.some((day) => day.date === photo.date) && <option value="">Choose a day…</option>}
      {days.map((day) => <option key={day.date} value={day.date}>Day {day.number} · {dayLabel(day.date)}</option>)}
    </select>
  );

  const editablePhotos = (photos: MemoryPhoto[]) => (
    <ul className="space-y-3">
      {photos.map((photo) => (
        <li key={photo.id} className="flex gap-3">
          <button type="button" onClick={() => onOpenPhoto(photo.id)} className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg" aria-label={`Open ${photo.caption || "photo"}`}>
            <img src={photo.thumbnailUrl || photo.url} alt="" className="h-full w-full object-cover" />
          </button>
          <div className="min-w-0 flex-1 space-y-1.5">
            <input
              value={photo.caption}
              onChange={(event) => onChange(updatePhoto(trip, photo.id, { caption: event.target.value }))}
              maxLength={2000}
              placeholder="Add a caption"
              aria-label="Photo caption"
              className="h-9 w-full rounded-lg border bg-transparent px-2 text-sm"
              style={inputStyle}
            />
            {moveTargets(photo)}
            {trip.photos[0]?.id === photo.id
              ? <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--gold)" }}><ImageIcon size={13} /> Trip cover</p>
              : (
                <button type="button" onClick={() => onChange(setCoverPhoto(trip, photo.id))} className="flex min-h-9 items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--muted-foreground)" }} aria-label={`Use ${photo.caption || "this photo"} as the trip cover`}>
                  <ImageIcon size={13} /> Make cover
                </button>
              )}
          </div>
          <button
            type="button"
            onClick={() => onChange({ ...trip, photos: trip.photos.filter((item) => item.id !== photo.id) })}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--muted)" }}
            aria-label={`Remove ${photo.caption || "photo"}`}
          >
            <X size={15} />
          </button>
        </li>
      ))}
    </ul>
  );

  const readOnlyPhotos = (photos: MemoryPhoto[]) => (
    <ul className="grid grid-cols-3 gap-2">
      {photos.map((photo) => (
        <li key={photo.id}>
          <button type="button" onClick={() => onOpenPhoto(photo.id)} className="block aspect-square w-full overflow-hidden rounded-lg" aria-label={`Open ${photo.caption || "photo"}`}>
            <img src={photo.thumbnailUrl || photo.url} alt={photo.caption} className="h-full w-full object-cover" />
          </button>
          {photo.caption && <p className="mt-1 line-clamp-2 text-[11px] leading-snug" style={labelStyle}>{photo.caption}</p>}
        </li>
      ))}
    </ul>
  );

  const addPhotosButton = (date: string) => (
    <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-semibold" style={{ background: "var(--gold-light)", color: "var(--gold)" }}>
      <Camera size={16} /> Add photos to this day
      <input
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        disabled={busy}
        onChange={(event) => { onAddPhotos([...(event.target.files ?? [])], date); event.target.value = ""; }}
      />
    </label>
  );

  const folderHeader = (key: string, isOpen: boolean, title: string, subtitle: string, photos: MemoryPhoto[]) => (
    <button
      type="button"
      onClick={() => toggle(key)}
      aria-expanded={isOpen}
      className="flex min-h-14 w-full items-center gap-3 p-3 text-left"
    >
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--gold-light)", color: "var(--gold)" }}>
        {isOpen ? <FolderOpen size={19} /> : <Folder size={19} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs" style={labelStyle}>{subtitle}</span>
      </span>
      {!isOpen && photos.length > 0 && (
        <span className="flex -space-x-2" aria-hidden>
          {photos.slice(0, 3).map((photo) => <img key={photo.id} src={photo.thumbnailUrl || photo.url} alt="" className="h-8 w-8 rounded-full border-2 object-cover" style={{ borderColor: "var(--card)" }} />)}
        </span>
      )}
      <ChevronDown size={18} style={{ ...labelStyle, transform: isOpen ? "rotate(180deg)" : undefined }} />
    </button>
  );

  const renderDay = (day: DayFolder) => {
    const isOpen = open.has(day.date);
    const planning = day.date > today;
    const subtitle = [dayLabel(day.date), countLabel(day.photos.length, "photo"), day.notes.trim() ? (planning ? "plan" : "diary") : ""].filter(Boolean).join(" · ");
    return (
      <div key={day.date} className="overflow-hidden rounded-2xl" style={{ background: "var(--card)" }}>
        {folderHeader(day.date, isOpen, `Day ${day.number}${day.title ? ` · ${day.title}` : ""}`, subtitle, day.photos)}
        {isOpen && (
          <div className="space-y-3 border-t p-3" style={{ borderColor: "var(--border)" }}>
            {editing ? (
              <>
                <label className="block text-xs" style={labelStyle}>
                  Title (optional)
                  <input
                    value={day.title}
                    onChange={(event) => onChange(updateDay(trip, day.date, { title: event.target.value }))}
                    maxLength={120}
                    placeholder="e.g. Temples and tea"
                    className="mt-1 h-11 w-full rounded-xl border bg-transparent px-3 text-sm"
                    style={inputStyle}
                  />
                </label>
                <label className="block text-xs" style={labelStyle}>
                  {planning ? "Plan for the day" : "Diary"}
                  <textarea
                    value={day.notes}
                    onChange={(event) => onChange(updateDay(trip, day.date, { notes: event.target.value }))}
                    maxLength={20000}
                    rows={5}
                    placeholder={planning ? "What do you want to do, see, or eat?" : "What happened today?"}
                    className="mt-1 w-full rounded-xl border bg-transparent p-3 text-sm leading-6"
                    style={inputStyle}
                  />
                </label>
                {day.photos.length > 0 && editablePhotos(day.photos)}
                {addPhotosButton(day.date)}
              </>
            ) : (
              <>
                {day.notes.trim()
                  ? <p className="whitespace-pre-wrap text-sm leading-6">{day.notes}</p>
                  : <p className="text-sm" style={labelStyle}>{planning ? "No plan for this day yet. Tap Edit to add one." : "No diary for this day yet. Tap Edit to write one."}</p>}
                {day.photos.length > 0 && readOnlyPhotos(day.photos)}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="mx-5 mt-6" aria-label="Days">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-[.14em]" style={labelStyle}>Days · {days.length}{truncated ? "+" : ""}</h2>
        <span className="text-xs" style={labelStyle}>{countLabel(trip.photos.length, "photo")}</span>
      </div>

      <div className="space-y-3">
        {days.map(renderDay)}

        {otherPhotos.length > 0 && (
          <div className="overflow-hidden rounded-2xl" style={{ background: "var(--card)" }}>
            {folderHeader("other", open.has("other"), "Other dates", `${countLabel(otherPhotos.length, "photo")} outside this trip’s dates`, otherPhotos)}
            {open.has("other") && (
              <div className="border-t p-3" style={{ borderColor: "var(--border)" }}>
                {editing ? editablePhotos(otherPhotos) : readOnlyPhotos(otherPhotos)}
              </div>
            )}
          </div>
        )}
      </div>

      {truncated && <p className="mt-3 text-xs" style={labelStyle}>Very long trips show their first {days.length} days here.</p>}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={addDay}
          disabled={busy}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border font-semibold disabled:opacity-50"
          style={{ borderColor: "var(--gold)", color: "var(--gold)" }}
        >
          <Plus size={17} /> Add another day
        </button>
        {editing && canRemoveLastDay(trip) && (
          <button
            type="button"
            onClick={() => onChange(removeLastDay(trip))}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold"
            style={inputStyle}
            aria-label="Remove the last day"
          >
            <Trash2 size={16} /> Last day
          </button>
        )}
      </div>
    </section>
  );
}
