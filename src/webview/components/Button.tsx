import React from 'react';

type ButtonSize = 'sm' | 'base' | 'lg';
type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'tab';

interface ButtonProps {
  children?: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  text?: string;
  fullWidth?: boolean;
  onClick?: () => void;
  size?: ButtonSize;
  variant?: ButtonVariant;
  disabled?: boolean;
  className?: string;
  active?: boolean;
}

const Button = ({
  children,
  type = 'button',
  text,
  fullWidth = false,
  onClick,
  size = 'base',
  variant = 'primary',
  disabled = false,
  className = '',
  active = false,
}: ButtonProps) => {
  // Map size prop to responsive text class
  const sizeMap: Record<ButtonSize, string> = {
    'sm': 'text-responsive-sm',
    'base': 'text-responsive-base',
    'lg': 'text-responsive-lg',
  };

  const textSizeClass = sizeMap[size] || 'text-responsive-base';

  // Base classes for all buttons
  const baseClasses =
    'transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-opacity-50 border border-transparent';

  // Variant-specific classes
  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'bg-brand-600 hover:bg-brand-700 focus:ring-brand-500 text-white py-2 px-3 rounded shadow-subtle hover:shadow-elevation-1',
    secondary:
      'bg-gray-700 hover:bg-gray-600 focus:ring-gray-500 text-white py-2 px-3 rounded shadow-subtle hover:shadow-elevation-1',
    success:
      'bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white py-2 px-3 rounded shadow-subtle hover:shadow-elevation-1',
    danger:
      'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white py-2 px-3 rounded shadow-subtle hover:shadow-elevation-1',
    tab: `w-full text-left p-2 rounded ${
      active
        ? 'glass-brand-dark text-accessible-on-glass shadow-elevation-1'
        : 'hover:glass-dark text-on-dark hover:text-accessible-on-glass'
    }`,
  };

  // Combine all classes
  const buttonClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${textSizeClass}
    ${fullWidth ? 'w-full' : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `;

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
    >
      {children || text}
    </button>
  );
};

export default Button;
