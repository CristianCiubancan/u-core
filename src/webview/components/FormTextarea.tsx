import React from 'react';

interface FormTextareaProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
}

const FormTextarea: React.FC<FormTextareaProps> = ({
  id,
  label,
  value,
  onChange,
  rows = 4,
  placeholder = '',
  className = '',
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={id} className="block font-medium">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-2 glass-brand-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-700/50 focus:border-transparent transition"
        placeholder={placeholder}
      />
    </div>
  );
};

export default FormTextarea;
