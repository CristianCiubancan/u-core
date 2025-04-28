import React from 'react';

interface ButtonProps {
  children?: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  text?: string;
  fullWidth?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const Button = ({
  children,
  type,
  text,
  fullWidth,
  onClick,
  disabled,
  size,
  className,
}: ButtonProps) => {
  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  const sizeClass = size ? sizeClasses[size] : sizeClasses.md;

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${
        fullWidth ? 'w-full' : ''
      } ${sizeClass} glass-gray-dark hover:bg-brand-600/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 active:scale-95 transition-all-fast border border-brand-500/30 rounded-lg shadow-sm hover:shadow text-shadow-sm scale-100 hover:scale-105 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className || ''}`}
      onClick={onClick}
    >
      {children || text}
    </button>
  );
};

export default Button;
