/**
 * TimeInput — saisie d'une heure au format HH:MM.
 *
 * `value` est un nombre décimal (heures), ex : 21.25 = 21h15.
 * `onChange` reçoit le nouveau nombre décimal.
 */
import { Input } from "@/components/ui/input";

interface TimeInputProps {
  value: string; // decimal string, e.g. "21.25"
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** Convert a decimal hours string ("21.25") to { h: "21", m: "15" } */
function decimalToHM(decimal: string): { h: string; m: string } {
  const num = Number.parseFloat(decimal);
  if (Number.isNaN(num)) return { h: "", m: "" };
  const h = Math.floor(num);
  const m = Math.round((num - h) * 60);
  return { h: String(h), m: String(m).padStart(2, "0") };
}

/** Convert h/m strings to decimal hours string */
function hmToDecimal(h: string, m: string): string {
  const hours = Number.parseInt(h) || 0;
  const minutes = Number.parseInt(m) || 0;
  return String(hours + minutes / 60);
}

export function TimeInput({ value, onChange, disabled }: TimeInputProps) {
  const { h, m } = decimalToHM(value);

  const handleHourChange = (newH: string) => {
    const clamped = Math.min(23, Math.max(0, Number.parseInt(newH) || 0));
    onChange(hmToDecimal(String(clamped), m || "0"));
  };

  const handleMinuteChange = (newM: string) => {
    const clamped = Math.min(59, Math.max(0, Number.parseInt(newM) || 0));
    onChange(hmToDecimal(h || "0", String(clamped)));
  };

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min="0"
        max="23"
        placeholder="HH"
        value={h}
        onChange={(e) => handleHourChange(e.target.value)}
        disabled={disabled}
        className="w-14 text-center px-1"
        data-ocid="time.hour_input"
      />
      <span className="text-muted-foreground font-semibold select-none">h</span>
      <Input
        type="number"
        min="0"
        max="59"
        placeholder="MM"
        value={m}
        onChange={(e) => handleMinuteChange(e.target.value)}
        disabled={disabled}
        className="w-14 text-center px-1"
        data-ocid="time.minute_input"
      />
    </div>
  );
}
