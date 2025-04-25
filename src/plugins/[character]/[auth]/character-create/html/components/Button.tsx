import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'tab';

interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  className?: string;
  active?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  className = '',
  active = false,
}) => {
  const getButtonClasses = () => {
    const baseClasses =
      'transition-all duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-opacity-50';

    const variantClasses = {
      primary:
        'bg-brand-600 hover:bg-brand-700 focus:ring-brand-500 text-white py-2 px-3 rounded shadow-subtle hover:shadow-elevation-1',
      secondary:
        'bg-gray-700 hover:bg-gray-600 focus:ring-gray-500 text-white py-2 px-3 rounded shadow-subtle hover:shadow-elevation-1',
      success:
        'bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white py-2 px-3 rounded shadow-subtle hover:shadow-elevation-1',
      danger:
        'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white py-2 px-3 rounded shadow-subtle hover:shadow-elevation-1',
      tab: `w-full text-left p-2 rounded transition-all duration-200 text-sm ${
        active
          ? 'glass-brand-dark text-accessible-on-glass shadow-elevation-1'
          : 'hover:glass-dark text-on-dark hover:text-accessible-on-glass'
      }`,
    };

    return `${baseClasses} ${variantClasses[variant]} ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-102'
    } ${className}`;
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={getButtonClasses()}
    >
      {children}
    </button>
  );
};
