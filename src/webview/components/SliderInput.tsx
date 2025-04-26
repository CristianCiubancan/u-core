import React from 'react';

interface SliderInputProps {
  id?: string;
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  showValue?: boolean;
  valueLabel?: string;
  minLabel?: string;
  maxLabel?: string;
  className?: string;
}

const SliderInput: React.FC<SliderInputProps> = ({
  id,
  label,
  min,
  max,
  value,
  onChange,
  step = 1,
  showValue = true,
  valueLabel = '',
  minLabel = '',
  maxLabel = '',
  className = '',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue =
      step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value);
    onChange(newValue);
  };

  return (
    <div className={`mb-4 ${className}`}>
      <label className="block mb-2 text-primary font-medium">{label}</label>
      <input
        type="range"
        id={id}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className="w-full form-range accent-brand-600"
      />
      <div className="flex justify-between text-xs text-secondary mt-1">
        {minLabel ? <span>{minLabel}</span> : <span>{min}</span>}
        {maxLabel ? <span>{maxLabel}</span> : <span>{max}</span>}
      </div>
      {showValue && (
        <div className="flex justify-between mt-1">
          <span className="text-sm font-medium text-brand-500">
            {valueLabel ? `${valueLabel}: ${value}` : `Value: ${value}`}
          </span>
        </div>
      )}
    </div>
  );
};

export default SliderInput;
