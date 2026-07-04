import { useEffect, useMemo, useState } from "react";

type ExpiryUnixInputProps = {
  value: string;
  onChange: (nextUnixSeconds: string) => void;
  id?: string;
  label?: string;
  required?: boolean;
};

function unixToLocalInputValue(unixSeconds: string): string {
  if (!unixSeconds || !/^\d+$/.test(unixSeconds)) {
    return "";
  }
  const date = new Date(Number(unixSeconds) * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localInputValueToUnix(value: string): string {
  if (!value) {
    return "";
  }
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) {
    return "";
  }
  return String(Math.floor(ms / 1000));
}

function getFutureUnixSeconds(days: number): string {
  const nowMs = Date.now();
  return String(Math.floor((nowMs + days * 24 * 60 * 60 * 1000) / 1000));
}

export default function ExpiryUnixInput({
  value,
  onChange,
  id = "expiry-unix-seconds",
  label = "Expiry time",
  required = false,
}: ExpiryUnixInputProps) {
  const [localValue, setLocalValue] = useState(() => unixToLocalInputValue(value));

  useEffect(() => {
    setLocalValue(unixToLocalInputValue(value));
  }, [value]);

  const quickPicks = useMemo(
    () => [
      { label: "+7d", days: 7 },
      { label: "+30d", days: 30 },
      { label: "+90d", days: 90 },
    ],
    [],
  );

  return (
    <div className="space-y-2">
      <label className="mb-1 block text-sm text-[var(--text-secondary)]" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="datetime-local"
        className="neon-input"
        value={localValue}
        onChange={(e) => {
          const nextLocal = e.target.value;
          setLocalValue(nextLocal);
          onChange(localInputValueToUnix(nextLocal));
        }}
        required={required}
      />
      <div className="flex flex-wrap gap-2">
        {quickPicks.map((pick) => (
          <button
            key={pick.label}
            type="button"
            className="neon-button text-xs"
            onClick={() => onChange(getFutureUnixSeconds(pick.days))}
          >
            {pick.label}
          </button>
        ))}
        <button type="button" className="neon-button text-xs" onClick={() => onChange("")}>
          Clear
        </button>
      </div>
      <p className="text-xs text-[var(--text-muted)]">Unix seconds: {value || "unset"}</p>
    </div>
  );
}

