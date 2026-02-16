import { useRef, useState, useEffect } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TruncatedTextProps {
  text: string;
  className?: string;
  as?: 'span' | 'p' | 'h3' | 'div';
}

/**
 * Renders text with truncation and a tooltip that appears only when
 * the text is actually overflowing (i.e., truncated).
 */
export function TruncatedText({
  text,
  className,
  as: Tag = 'span',
}: TruncatedTextProps) {
  const ref = useRef<HTMLElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setIsTruncated(el.scrollWidth > el.clientWidth);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  const element = (
    <Tag
      ref={ref as React.RefObject<never>}
      className={cn('truncate', className)}
    >
      {text}
    </Tag>
  );

  if (!isTruncated) return element;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{element}</TooltipTrigger>
      <TooltipContent>
        <p className="max-w-[300px] break-words">{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}
