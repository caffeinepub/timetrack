import { DayType } from '../backend';
import { Check } from 'lucide-react';

interface DayTypeCheckboxGroupProps {
  value: DayType;
  onChange: (value: DayType) => void;
}

export function DayTypeCheckboxGroup({ value, onChange }: DayTypeCheckboxGroupProps) {
  const options = [
    { value: DayType.work, label: 'Travail' },
    { value: DayType.conge, label: 'Congé' },
    { value: DayType.astreinte, label: 'Astreinte' },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`flex items-center gap-3 px-5 py-3 rounded-lg border-2 transition-all font-medium ${
            value === option.value
              ? 'border-primary bg-primary text-primary-foreground shadow-md scale-105'
              : 'border-border bg-background hover:bg-accent hover:border-accent-foreground/20'
          }`}
        >
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              value === option.value
                ? 'border-primary-foreground bg-primary-foreground'
                : 'border-muted-foreground'
            }`}
          >
            {value === option.value && (
              <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
            )}
          </div>
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
