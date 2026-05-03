import React from 'react';

interface PaperProps {
  children: React.ReactNode;
  className?: string;
  selected?: boolean;
  /** Inline style overrides, mainly for animation-delay-style stagger. */
  style?: React.CSSProperties;
}

/**
 * Translucent dossier paper card. Use this as the base for any panel
 * that should look like a free-floating piece of paper rather than a
 * traditional UI panel. Stack multiple papers in a `flex flex-col gap-*`
 * container with the column itself transparent — the gaps between
 * papers reveal the game world behind, reinforcing the "in-world UI"
 * feel.
 *
 * Visual base lives at `.dossier-paper` in `_shared/html/style.css`;
 * `selected` pairs the alternate `.dossier-paper-selected` for an
 * indigo-rail treatment.
 */
const Paper = ({
  children,
  className = '',
  selected = false,
  style,
}: PaperProps) => {
  return (
    <div
      style={style}
      className={`dossier-paper ${
        selected ? 'dossier-paper-selected' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

export default Paper;
