import { Check } from "lucide-react";
import { DayType } from "../backend";

interface DayTypeCheckboxGroupProps {
  value: DayType;
  onChange: (value: DayType) => void;
}

const DAY_TYPE_CONFIG = {
  [DayType.work]: {
    label: "Travail",
    // Blue
    activeClasses: "border-blue-600 bg-blue-600 text-white shadow-md scale-105",
    checkboxActiveClasses: "border-white bg-white",
    checkIconColor: "text-blue-600",
  },
  [DayType.conge]: {
    label: "Congé",
    // Green
    activeClasses:
      "border-emerald-600 bg-emerald-600 text-white shadow-md scale-105",
    checkboxActiveClasses: "border-white bg-white",
    checkIconColor: "text-emerald-600",
  },
  [DayType.astreinte]: {
    label: "Astreinte",
    // Orange
    activeClasses:
      "border-orange-500 bg-orange-500 text-white shadow-md scale-105",
    checkboxActiveClasses: "border-white bg-white",
    checkIconColor: "text-orange-500",
  },
  [DayType.arretMaladie]: {
    label: "Arrêt maladie",
    // Red
    activeClasses: "border-red-500 bg-red-500 text-white shadow-md scale-105",
    checkboxActiveClasses: "border-white bg-white",
    checkIconColor: "text-red-500",
  },
} as const;

export function DayTypeCheckboxGroup({
  value,
  onChange,
}: DayTypeCheckboxGroupProps) {
  const options = [
    DayType.work,
    DayType.conge,
    DayType.astreinte,
    DayType.arretMaladie,
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {options.map((option) => {
        const config = DAY_TYPE_CONFIG[option];
        const isSelected = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            data-ocid={`day_type.${option}.checkbox`}
            className={`flex items-center gap-3 px-5 py-3 rounded-lg border-2 transition-all font-medium ${
              isSelected
                ? config.activeClasses
                : "border-border bg-background hover:bg-muted hover:border-muted-foreground/30"
            }`}
          >
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                isSelected
                  ? config.checkboxActiveClasses
                  : "border-muted-foreground"
              }`}
            >
              {isSelected && (
                <Check
                  className={`w-3.5 h-3.5 ${config.checkIconColor}`}
                  strokeWidth={3}
                />
              )}
            </div>
            <span>{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Utility: get the color class string for a given DayType (for badges, dots, calendar cells…) */
export function getDayTypeColors(type: string | DayType) {
  switch (type) {
    case DayType.work:
    case "work":
      return {
        bg: "bg-blue-600",
        text: "text-blue-600",
        dot: "bg-blue-600",
        light: "bg-blue-50",
      };
    case DayType.conge:
    case "conge":
      return {
        bg: "bg-emerald-600",
        text: "text-emerald-600",
        dot: "bg-emerald-600",
        light: "bg-emerald-50",
      };
    case DayType.astreinte:
    case "astreinte":
      return {
        bg: "bg-orange-500",
        text: "text-orange-500",
        dot: "bg-orange-500",
        light: "bg-orange-50",
      };
    case DayType.arretMaladie:
    case "arretMaladie":
      return {
        bg: "bg-red-500",
        text: "text-red-500",
        dot: "bg-red-500",
        light: "bg-red-50",
      };
    default:
      return {
        bg: "bg-muted",
        text: "text-muted-foreground",
        dot: "bg-muted",
        light: "bg-muted",
      };
  }
}
