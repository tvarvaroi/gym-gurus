import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'wouter';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  /** Hide the Dashboard home link (for public pages like calculators) */
  showHome?: boolean;
}

export function Breadcrumbs({ items, showHome = true }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
        {showHome && (
          <li className="flex items-center gap-1.5">
            <Link
              href="/dashboard"
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Home className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only">Dashboard</span>
            </Link>
          </li>
        )}
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const showChevron = showHome || index > 0;
          return (
            <li key={index} className="flex items-center gap-1.5 min-w-0">
              {showChevron && (
                <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
              )}
              {isLast || !item.href ? (
                <span className="font-medium text-foreground truncate max-w-[200px] sm:max-w-[300px]">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors truncate max-w-[200px] sm:max-w-[300px]"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
