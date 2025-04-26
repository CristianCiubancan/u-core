import React from 'react';

type ButtonSize = 'sm' | 'base' | 'lg';

interface ButtonProps {
  children?: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  text?: string;
  fullWidth?: boolean;
  onClick?: () => void;
  size?: ButtonSize;
}

const Button = ({
  children,
  type,
  text,
  fullWidth,
  onClick,
  size = 'base',
}: ButtonProps) => {
  // Map size prop to responsive text class
  const sizeMap: Record<ButtonSize, string> = {
    'sm': 'text-responsive-sm',
    'base': 'text-responsive-base',
    'lg': 'text-responsive-lg',
  };

  const textSizeClass = sizeMap[size] || 'text-responsive-base';

  return (
    <button
      type={type}
      className={`${
        fullWidth ? 'w-full' : ''
      } px-4 py-2 glass-brand-dark hover:bg-brand-700/80 transition duration-200 border border-white/20 ${textSizeClass} text-hd`}
      onClick={onClick}
    >
      {children || text}
    </button>
  );
};

export default Button;
