// src/components/menus/MenuSystem.tsx
import React from 'react';
import { createPortal } from 'react-dom';
import { useMenuSystem } from '../../hooks/useMenuSystem';

interface CloseButtonProps {
  onClose: () => void;
  position?: 'left' | 'right';
}

const CloseButton: React.FC<CloseButtonProps> = ({
  onClose,
  position = 'right',
}) => {
  return (
    <button
      onClick={onClose}
      className={`absolute ${
        position === 'right' ? 'right-4' : 'left-4'
      } top-4 w-8 h-8 flex items-center justify-center glass-brand hover:bg-brand-500/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 active:scale-90 rounded-full shadow-sm hover:shadow transition-all-fast text-xl`}
      aria-label="Close menu"
    >
      ✕
    </button>
  );
};

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  position: 'left' | 'right';
}

const SideMenu: React.FC<SideMenuProps> = ({
  isOpen,
  onClose,
  children,
  position,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Menu */}
      <div
        className={`p-8 fixed top-0 bottom-0 ${
          position === 'left' ? 'left-0' : 'right-0'
        } w-2/5 z-20 transform transition-transform duration-300 ease-in-out ${
          isOpen
            ? 'translate-x-0'
            : position === 'left'
            ? '-translate-x-full'
            : 'translate-x-full'
        }`}
      >
        <div className="glass-brand-dark h-full overflow-y-auto scrollbar-brand-dark p-4 relative">
          <CloseButton
            onClose={onClose}
            position={position === 'left' ? 'right' : 'left'}
          />
          <div className="mt-12">{children}</div>
        </div>
      </div>
    </>
  );
};

// Central Modal Component
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop - now just visual, doesn't close on click */}
      <div className="fixed inset-0 bg-brand-900/70 z-30 transition-opacity" />

      {/* Modal */}
      <div
        className={`p-8 fixed top-1/2 left-1/2 w-2/5 z-40 transform transition-all duration-300 ease-in-out max-h-[90vh] ${
          isOpen
            ? 'translate-x-[-50%] translate-y-[-50%] scale-100 opacity-100'
            : 'translate-x-[-50%] translate-y-[-50%] scale-95 opacity-0'
        }`}
      >
        {/* Inner container with full height and scroll */}
        <div className="glass-brand-dark overflow-y-auto scrollbar-brand-dark p-4 h-full rounded-lg shadow-xl relative">
          <CloseButton onClose={onClose} />
          <div className="mt-8 pr-8">{children}</div>
        </div>
      </div>
    </>,
    document.body
  );
};

// Toast Component
interface ToastProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({
  isOpen,
  onClose,
  children,
  duration = 3000,
}) => {
  // Auto close after duration
  React.useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed bottom-8 right-8 z-50 pointer-events-none">
      <div
        className={`glass-brand-dark px-6 py-4 rounded-lg shadow-lg pointer-events-auto max-w-md border border-brand-500/30 transition-all duration-300 ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="text-shadow-sm mr-4">{children}</div>
          <button
            className="ml-4 w-6 h-6 flex items-center justify-center hover:bg-brand-500/40 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-400 active:scale-90 rounded-full transition-all-fast"
            onClick={onClose}
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Main Menu System Component
export const MenuSystem: React.FC = () => {
  const { state, closeMenu, hideToast } = useMenuSystem();

  return (
    <>
      {/* Left Menu */}
      <SideMenu
        isOpen={state.left.isOpen}
        onClose={() => closeMenu('left')}
        position="left"
      >
        {state.left.content}
      </SideMenu>

      {/* Right Menu */}
      <SideMenu
        isOpen={state.right.isOpen}
        onClose={() => closeMenu('right')}
        position="right"
      >
        {state.right.content}
      </SideMenu>

      {/* Central Modal */}
      <Modal isOpen={state.central.isOpen} onClose={() => closeMenu('central')}>
        {state.central.content}
      </Modal>

      {/* Toast */}
      <Toast
        isOpen={state.toast.isOpen}
        onClose={hideToast}
        duration={state.toast.duration}
      >
        {state.toast.content}
      </Toast>
    </>
  );
};
