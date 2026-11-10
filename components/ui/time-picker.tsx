"use client";

import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Pemilih waktu 12 jam (WITA). Nilai yang dikirim tetap `HH:MM` 24 jam
 * agar perbandingan jadwal dan database tidak berubah.
 */
export function TimePicker({
  value,
  onChange,
  disabled = false,
  ariaLabel = "Waktu",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const [hourRaw, minuteRaw] = value.split(":");
  const hour24 = Number(hourRaw);
  const minute = Number(minuteRaw);
  const safeHour = Number.isFinite(hour24) ? hour24 : 8;
  const safeMinute = Number.isFinite(minute) ? minute : 0;
  const period: "AM" | "PM" = safeHour >= 12 ? "PM" : "AM";
  const hour12 = safeHour % 12 === 0 ? 12 : safeHour % 12;

  function set(nextHour: number, nextMinute: number, nextPeriod: "AM" | "PM") {
    let hour = nextHour % 12;
    if (nextPeriod === "PM") hour += 12;
    onChange(`${pad(hour)}:${pad(nextMinute)}`);
  }

  return (
    <div className={cn("time-picker", className)} data-disabled={disabled || undefined}>
      <select
        className="time-select"
        value={hour12}
        onChange={(event) => set(Number(event.target.value), safeMinute, period)}
        disabled={disabled}
        aria-label={`${ariaLabel} — jam`}
      >
        {HOURS.map((hour) => (
          <option key={hour} value={hour}>
            {pad(hour)}
          </option>
        ))}
      </select>
      <span className="time-dot" aria-hidden="true">
        .
      </span>
      <select
        className="time-select"
        value={safeMinute}
        onChange={(event) => set(hour12, Number(event.target.value), period)}
        disabled={disabled}
        aria-label={`${ariaLabel} — menit`}
      >
        {MINUTES.map((minuteValue) => (
          <option key={minuteValue} value={minuteValue}>
            {pad(minuteValue)}
          </option>
        ))}
      </select>
      <select
        className="time-select time-period"
        value={period}
        onChange={(event) => set(hour12, safeMinute, event.target.value as "AM" | "PM")}
        disabled={disabled}
        aria-label={`${ariaLabel} — AM atau PM`}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
