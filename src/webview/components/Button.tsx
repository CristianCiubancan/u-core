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
  // Map size prop to fluid typography classes from our theme
  const sizeMap: Record<ButtonSize, string> = {
    'sm': 'text-fluid-sm py-1.5 px-2.5',
    'base': 'text-fluid-base py-2 px-3',
    'lg': 'text-fluid-lg py-2.5 px-4',
  };

  const sizeClass = sizeMap[size] || 'text-fluid-base py-2 px-3';

  // Base classes using our theme tokens
  const baseClasses =
    'transition-all duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-opacity-50 border border-transparent rounded';

  // Variant-specific classes using our theme tokens
  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 text-on-dark shadow-subtle hover:shadow-medium',
    secondary:
      'bg-gray-700 hover:bg-gray-600 focus:ring-gray-500 text-on-dark shadow-subtle hover:shadow-medium',
    success:
      'bg-success-600 hover:bg-success-700 focus:ring-success-500 text-on-dark shadow-subtle hover:shadow-medium',
    danger:
      'bg-error-600 hover:bg-error-700 focus:ring-error-500 text-on-dark shadow-subtle hover:shadow-medium',
    tab: active
      ? 'glass-active text-on-brand-surface high-contrast shadow-medium'
      : 'hover:glass-dark text-on-dark hover:text-on-glass-dark w-full text-left p-2',
  };

  // Combine all classes
  const buttonClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClass}
    ${fullWidth ? 'w-full' : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `;

  return (
    <button
      type={type}
      className={buttonClasses.trim()}
      onClick={onClick}
      disabled={disabled}
    >
      {children || text}
    </button>
  );
};

export default Button;
