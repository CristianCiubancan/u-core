import React, { ReactNode } from 'react';

interface IconWrapperProps {
  children: ReactNode;
  className?: string;
  size?: number | string;
}

/**
 * Wrapper component for consistent icon styling
 */
const IconWrapper: React.FC<IconWrapperProps> = ({
  children,
  className = '',
  size = '1em',
}) => {
  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      style={{ fontSize: size }}
    >
      {children}
    </span>
  );
};

export default IconWrapper;
