import { Spinner } from '@/components/ui/Icons';

interface DataTableLoadingProps {
  theme?: 'light' | 'dark';
}

export function DataTableLoading({ theme = 'light' }: DataTableLoadingProps) {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center ${
        theme === 'dark' ? 'bg-black/50' : 'bg-white/50'
      }`}
    >
      <Spinner
        className={`w-8 h-8 animate-spin ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}
      />
    </div>
  );
}
