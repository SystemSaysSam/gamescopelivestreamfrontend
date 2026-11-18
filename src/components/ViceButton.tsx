import React from 'react';
interface ViceButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'pink' | 'cyan' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  isConfirm?: boolean;
  children: React.ReactNode;
}

export const ViceButton: React.FC<ViceButtonProps> = ({
  variant = 'pink',
  size = 'md',
  icon,
  isConfirm = false,
  children,
  className = '',
  onClick,
  onMouseEnter,
  disabled,
  ...rest
}) => {
  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onMouseEnter) {
      onMouseEnter(e);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      onClick(e);
    }
  };

  const sizeStyles = {
    sm: 'px-3.5 sm:px-6 py-1.5 sm:py-2 text-[11px] sm:text-xs max-w-full',
    md: 'px-5 sm:px-8 py-2.5 sm:py-3 text-xs sm:text-sm max-w-full',
    lg: 'px-7 sm:px-12 py-3 sm:py-4 text-sm sm:text-base max-w-full'
  };

  const variantStyles = {
    pink: `bg-[#F276B9] hover:bg-[#ff80c0] text-white font-black 
           shadow-md shadow-pink-950/40 hover:shadow-lg hover:shadow-pink-950/50
           active:brightness-95 border-t border-white/30`,
    cyan: `bg-[#06b6d4] hover:bg-[#22d3ee] text-slate-950 font-black 
           shadow-md shadow-cyan-950/40 hover:shadow-lg hover:shadow-cyan-950/50
           active:brightness-95 border-t border-white/30`,
    dark: `bg-[#131926] text-white border border-white/15 hover:border-[#F276B9] 
           shadow-sm hover:bg-[#1a2335] font-bold`
  };

  return (
    <button
      {...rest}
      disabled={disabled}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      style={{
        clipPath: 'polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)'
      }}
      className={`group relative inline-flex items-center justify-center font-display tracking-wider uppercase transition-all duration-300 transform hover:-translate-y-0.5 hover:scale-[1.01] active:translate-y-0.5 active:scale-[0.99] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#F276B9]/50 disabled:opacity-40 disabled:pointer-events-none select-none overflow-hidden ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {/* Animated light sweep across button on hover */}
      <div 
        className="absolute inset-y-0 -left-[100%] w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-[-25deg] pointer-events-none transition-transform duration-700 ease-out group-hover:translate-x-[400%]"
      />

      {/* Glossy top edge highlight */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-white/50 pointer-events-none" />

      {/* Button content */}
      <span className="relative z-10 flex items-center justify-center space-x-1.5 sm:space-x-2 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] max-w-full">
        <span className="truncate">{children}</span>
        {icon && (
          <span className="transform transition-transform duration-300 group-hover:translate-x-1 flex items-center flex-shrink-0">
            {icon}
          </span>
        )}
      </span>
    </button>
  );
};
