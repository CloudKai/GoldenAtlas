import { useState } from "react";
import { Plus, Users, X } from "lucide-react";
import type { TripExpense } from "../types/domain";
import { addCompanion, currencyOptions, parseAmount } from "../lib/trip-extras";

const fieldStyle = { background: "var(--input-background)", color: "var(--foreground)", border: "1.5px solid transparent", fontSize: "15px" } as const;
const labelStyle = { fontSize: "13px", fontWeight: 500, color: "var(--muted-foreground)" } as const;

interface ExpenseFieldProps {
  value: TripExpense | undefined;
  onChange: (next: TripExpense | undefined) => void;
  /** The country's own currency, offered first when nothing has been chosen. */
  defaultCurrency?: string;
  /** A trip that has not started has a budget rather than expenses. */
  planned?: boolean;
}

export function ExpenseField({ value, onChange, defaultCurrency, planned = false }: ExpenseFieldProps) {
  const [text, setText] = useState(value ? String(value.amount) : "");
  const [chosen, setChosen] = useState<string | null>(null);
  const currency = chosen ?? value?.currency ?? defaultCurrency ?? "USD";
  const parsed = parseAmount(text);
  const invalid = text.trim() !== "" && parsed === undefined;

  const update = (nextText: string, nextCurrency: string) => {
    const amount = parseAmount(nextText);
    onChange(nextText.trim() === "" || amount === undefined ? undefined : { amount, currency: nextCurrency });
  };

  return (
    <div>
      <label htmlFor="trip-expense" className="mb-1.5 block" style={labelStyle}>{planned ? "Budget" : "Total spent"}</label>
      <div className="flex gap-2">
        <input
          id="trip-expense"
          inputMode="decimal"
          value={text}
          onChange={(event) => { setText(event.target.value); update(event.target.value, currency); }}
          placeholder="0.00"
          aria-invalid={invalid}
          aria-describedby={invalid ? "trip-expense-error" : undefined}
          className="h-12 min-w-0 flex-1 rounded-xl px-4 outline-none"
          style={fieldStyle}
        />
        <select
          value={currency}
          onChange={(event) => { setChosen(event.target.value); update(text, event.target.value); }}
          aria-label="Currency"
          className="h-12 w-24 rounded-xl px-2"
          style={fieldStyle}
        >
          {currencyOptions([defaultCurrency, value?.currency]).map((code) => <option key={code} value={code}>{code}</option>)}
        </select>
      </div>
      {invalid
        ? <p id="trip-expense-error" role="alert" className="mt-1.5" style={{ color: "#E25555", fontSize: "11px" }}>Enter an amount such as 1,250 or 89.90.</p>
        : <p className="mt-1.5" style={{ color: "var(--muted-foreground)", fontSize: "11px" }}>Optional. One amount for the whole trip; it stays private.</p>}
    </div>
  );
}

interface CompanionsFieldProps {
  value: string[];
  onChange: (next: string[]) => void;
}

export function CompanionsField({ value, onChange }: CompanionsFieldProps) {
  const [text, setText] = useState("");
  const add = (raw: string) => {
    // A pasted "Sam, Alex" adds both names.
    const next = raw.split(",").reduce((list, name) => addCompanion(list, name), value);
    if (next.length !== value.length) onChange(next.slice(0, 30));
    setText("");
  };

  return (
    <div>
      <label htmlFor="trip-companion" className="mb-1.5 block" style={labelStyle}>Who came with you?</label>
      {value.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {value.map((name) => (
            <li key={name} className="flex min-h-9 items-center gap-1.5 rounded-full pl-3" style={{ background: "var(--gold-light)", color: "var(--foreground)", fontSize: "12px", fontWeight: 550 }}>
              <Users size={12} style={{ color: "var(--gold)" }} />
              {name}
              <button type="button" onClick={() => onChange(value.filter((item) => item !== name))} className="flex h-9 w-9 items-center justify-center rounded-full" style={{ color: "var(--muted-foreground)" }} aria-label={`Remove ${name}`}>
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex h-12 items-center gap-2 rounded-xl px-4" style={{ background: "var(--input-background)" }}>
        <Plus size={15} style={{ color: "var(--gold)" }} />
        <input
          id="trip-companion"
          value={text}
          maxLength={120}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); add(text); } }}
          onBlur={() => text.trim() && add(text)}
          placeholder="Add a name and press Enter"
          className="min-w-0 flex-1 bg-transparent outline-none"
          style={{ color: "var(--foreground)", fontSize: "15px" }}
        />
      </div>
      <p className="mt-1.5" style={{ color: "var(--muted-foreground)", fontSize: "11px" }}>Optional. Names are kept in your private atlas so you can reuse them.</p>
    </div>
  );
}
