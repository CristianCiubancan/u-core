import React, { ReactNode } from 'react';

interface PanelProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'dark' | 'brand' | 'brand-dark';
}

const Panel: React.FC<PanelProps> = ({
  children,
  className = '',
  variant = 'default',
}) => {
  const variantClasses = {
    default: 'glass',
    dark: 'glass-dark',
    brand: 'glass-brand',
    'brand-dark': 'glass-brand-dark',
  };

  return (
    <div className={`${variantClasses[variant]} p-4 rounded-lg shadow-subtle ${className}`}>
      {children}
    </div>
  );
};

export default Panel;
