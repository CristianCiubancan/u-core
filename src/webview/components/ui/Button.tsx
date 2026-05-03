import React from 'react';
import ActionLink from './ActionLink';

interface ButtonProps {
  children?: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  text?: string;
  fullWidth?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'accent' | 'danger';
}

/**
 * Button — kept for backwards compatibility with older plugins. Now a
 * thin wrapper over ActionLink so the dossier aesthetic is the only
 * default. Pass `variant="accent"` or `variant="danger"` for tone, or
 * import ActionLink directly for new code.
 *
 * `size` and `fullWidth` are honored but most existing usages map to
 * the dossier action's compact mono size — only fullWidth changes the
 * layout meaningfully.
 */
const Button = ({
  children,
  type = 'button',
  text,
  fullWidth,
  onClick,
  disabled,
  className,
  variant = 'default',
}: ButtonProps) => {
  const label =
    typeof children === 'string'
      ? children
      : (text ?? (children as string) ?? '');
  return (
    <ActionLink
      type={type === 'reset' ? 'button' : type}
      label={label}
      onClick={onClick}
      disabled={disabled}
      accent={variant === 'accent'}
      danger={variant === 'danger'}
      className={`${fullWidth ? 'w-full justify-center' : ''} ${className || ''}`}
    />
  );
};

export default Button;
