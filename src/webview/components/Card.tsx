import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: string;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerContent?: ReactNode;
  footerClassName?: string;
}

const Card: React.FC<CardProps> = ({
  children,
  title,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footerContent,
  footerClassName = '',
}) => {
  return (
    <div className={`glass-dark rounded-lg shadow-elevation-1 overflow-hidden ${className}`}>
      {title && (
        <div className={`glass-brand-dark p-3 border-b border-brand-700 ${headerClassName}`}>
          <h2 className="text-responsive-lg font-semibold tracking-tight text-accessible-on-glass">
            {title}
          </h2>
        </div>
      )}
      <div className={`p-4 ${bodyClassName}`}>{children}</div>
      {footerContent && (
        <div className={`glass-dark p-3 border-t border-brand-700/30 ${footerClassName}`}>
          {footerContent}
        </div>
      )}
    </div>
  );
};

export default Card;
