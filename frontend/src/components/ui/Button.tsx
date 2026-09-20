import React from 'react';
import { Spinner } from './Spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-extrabold rounded-xl border-2 border-black transition-all duration-150 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed select-none cursor-pointer';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 shadow-neo-sm hover:shadow-neo active:shadow-none hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5',
    md: 'text-sm px-4.5 py-2.5 gap-2 shadow-neo hover:shadow-neo-lg active:shadow-none hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5',
    lg: 'text-base px-6 py-3.5 gap-2.5 shadow-neo-lg hover:shadow-neo-xl active:shadow-none hover:-translate-x-1 hover:-translate-y-1 active:translate-x-1 active:translate-y-1',
  };

  const variantStyles = {
    primary:
      'bg-[#ffe566] text-black hover:bg-[#ffd026]',
    secondary:
      'bg-white text-black hover:bg-[#faf6ee]',
    outline:
      'bg-white text-black hover:bg-[#fff9db]',
    ghost:
      'bg-transparent text-black border-transparent hover:border-black hover:bg-white shadow-none hover:shadow-neo-sm',
    danger:
      'bg-[#ff6b6b] text-black hover:bg-[#ff5252]',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Spinner size={size === 'lg' ? 'md' : 'sm'} color="current" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
