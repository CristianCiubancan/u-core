import React from 'react';

interface ButtonProps {
  children?: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  text?: string;
  fullWidth?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

const Button = ({ children, type, text, fullWidth, onClick }: ButtonProps) => {
  return (
    <button
      type={type}
      className={`${
        fullWidth ? 'w-full' : ''
      } px-4 py-2 glass-brand-dark hover:bg-brand-600/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 active:scale-95 transition-all-fast border border-brand-500/30 rounded-lg shadow-sm hover:shadow text-shadow-sm scale-100 hover:scale-105`}
      onClick={onClick}
    >
      {children || text}
    </button>
  );
};

export default Button;
