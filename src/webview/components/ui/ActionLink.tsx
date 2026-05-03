import React from 'react';

interface ActionLinkProps {
  icon?: React.ReactNode;
  label: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  accent?: boolean;
  danger?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}

/**
 * Dossier-style action button — text + optional icon, hairline bottom
 * border, mono uppercase. The base look comes from `.dossier-action` in
 * `_shared/html/style.css`; pair `accent` for the primary (indigo) tone
 * or `danger` for destructive (red). No prop = neutral zinc.
 */
const ActionLink = ({
  icon,
  label,
  onClick,
  accent,
  danger,
  disabled,
  type = 'button',
  className = '',
}: ActionLinkProps) => {
  const tone = danger
    ? 'dossier-action-danger'
    : accent
      ? 'dossier-action-accent'
      : '';
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`dossier-action ${tone} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

export default ActionLink;
