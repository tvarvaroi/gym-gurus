import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface CTAButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  onClick?: () => void;
  className?: string;
  showArrow?: boolean;
}

const CTAButton = memo(
  ({
    children,
    variant = 'primary',
    size = 'md',
    href,
    onClick,
    className = '',
    showArrow = true,
  }: CTAButtonProps) => {
    const variants = {
      primary: 'trainer-gradient hover:opacity-90 text-white shadow-lg hover:shadow-xl',
      secondary: 'bg-emerald-500 hover:bg-emerald-600 text-white',
      outline: 'border-2 border-white/20 hover:border-blue-primary hover:bg-white/5',
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    };

    const handleClick = () => {
      if (href) {
        window.location.href = href;
      } else if (onClick) {
        onClick();
      }
    };

    return (
      <div className="transition-transform duration-200 hover:scale-105 active:scale-95">
        <Button
          onClick={handleClick}
          className={`
          ${variants[variant]}
          ${sizes[size]}
          rounded-xl font-semibold
          transition-all duration-300
          relative overflow-hidden
          group
          ${className}
        `}
        >
          {/* Shine effect on hover */}
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

          <span className="relative flex items-center gap-2">
            {children}
            {showArrow && (
              <span className="transition-transform duration-300 group-hover:translate-x-1">
                <ArrowRight className="w-5 h-5" />
              </span>
            )}
          </span>
        </Button>
      </div>
    );
  }
);

CTAButton.displayName = 'CTAButton';

export default CTAButton;
