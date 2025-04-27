import { ReactNode } from 'react';

const Container = ({ children }: { children: ReactNode }) => {
  return (
    <div
      className={`w-full glass-brand-dark max-h-screen overflow-y-auto rounded-2xl p-6`}
    >
      {children}
    </div>
  );
};

export default Container;
