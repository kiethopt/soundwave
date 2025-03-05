import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  icon: LucideIcon;
  iconColor: string;
  count: number;
  title: string;
  description: string;
  href: string;
}

export function StatsCard({
  icon: Icon,
  iconColor,
  count,
  title,
  description,
  href,
}: StatsCardProps) {
  return (
    <Link href={href} className="dashboard-card">
      <div className="flex items-center justify-between mb-2 md:mb-4">
        <Icon className={`w-5 h-5 md:w-8 md:h-8 ${iconColor}`} />
        <span className="text-lg sm:text-xl md:text-2xl font-bold">
          {count}
        </span>
      </div>
      <h3 className="text-sm sm:text-base md:text-lg font-bold text-primary">
        {title}
      </h3>
      <p className="text-xs md:text-sm text-secondary">{description}</p>
    </Link>
  );
}
