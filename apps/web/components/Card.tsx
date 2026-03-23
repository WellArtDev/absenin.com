import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glass?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', hover = false, glass = false, onClick }: CardProps) {
  const baseClasses = glass
    ? 'bg-glass backdrop-blur-glass border border-white/20'
    : 'bg-ui-card border border-ui-border';

  const hoverClasses = hover
    ? 'hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 cursor-pointer'
    : 'shadow-card';

  return (
    <div
      onClick={onClick}
      className={`${baseClasses} ${hoverClasses} rounded-card ${className}`}
    >
      {children}
    </div>
  );
}
