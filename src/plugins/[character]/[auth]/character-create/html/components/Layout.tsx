import React, { ReactNode } from 'react';
import Button from '../../../../../../webview/components/Button';

interface LayoutProps {
  children: ReactNode;
  title: string;
  position?: 'left' | 'center' | 'right';
  onSave?: () => void;
  onClose?: () => void;
  isSaving?: boolean;
  saveButtonText?: string;
  cancelButtonText?: string;
  showButtons?: boolean;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  title,
  position = 'center',
  onSave,
  onClose,
  isSaving = false,
  saveButtonText = 'Save',
  cancelButtonText = 'Cancel',
  showButtons = true,
  headerContent,
  footerContent,
}) => {
  const getPositionClasses = () => {
    switch (position) {
      case 'left':
        return 'justify-start';
      case 'right':
        return 'justify-end';
      case 'center':
      default:
        return 'justify-center';
    }
  };

  return (
    <div
      className={`inset-0 w-[50vw] h-screen py-8 flex ${getPositionClasses()}`}
    >
      <div
        className={`glass-dark h-full font-smooth text-on-dark rounded-lg shadow-elevation-3 w-full overflow-hidden flex flex-col`}
      >
        {/* Header */}
        <div className="glass-brand-dark p-3 flex justify-between items-center border-b border-brand-700">
          <h1 className="text-responsive-xl font-semibold tracking-tight text-accessible-on-glass">
            {title}
          </h1>
          {headerContent ? (
            headerContent
          ) : showButtons ? (
            <div className="flex space-x-2">
              {onSave && (
                <Button onClick={onSave} disabled={isSaving} size="sm">
                  {isSaving ? 'Saving...' : saveButtonText}
                </Button>
              )}
              {onClose && (
                <Button onClick={onClose} size="sm">
                  {cancelButtonText}
                </Button>
              )}
            </div>
          ) : null}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">{children}</div>

        {/* Footer */}
        {footerContent && (
          <div className="border-t border-brand-700/30">{footerContent}</div>
        )}
      </div>
    </div>
  );
};

export default Layout;
