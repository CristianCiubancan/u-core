import React from 'react';

interface LoadingIndicatorProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

/**
 * Loading indicator component that displays a simple spinner
 * Used to indicate loading or processing operations
 */
export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'medium',
  className = '',
}) => {
  const sizeClasses = {
    small: 'w-4 h-4 border-2',
    medium: 'w-6 h-6 border-2',
    large: 'w-8 h-8 border-3',
  };

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full border-t-transparent border-brand-500 animate-spin`}
        role="status"
        aria-label="Loading"
      />
    </div>
  );
};