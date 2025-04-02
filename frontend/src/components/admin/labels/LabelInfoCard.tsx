import Image from 'next/image';
import { Tags } from 'lucide-react';
import { LabelInfoCardProps } from '@/types';

export function LabelInfoCard({
  label,
  theme,
  formatDate,
}: LabelInfoCardProps) {
  return (
    <div
      className={`${
        theme === 'light' ? 'bg-white' : 'bg-gray-800'
      } rounded-lg shadow-md p-6`}
    >
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-shrink-0 w-28 h-28 md:w-32 md:h-32 rounded-lg overflow-hidden bg-transparent flex items-center justify-center">
          {label.logoUrl ? (
            <Image
              src={label.logoUrl}
              alt={`${label.name} logo`}
              width={128}
              height={128}
              className="object-contain w-full h-full"
            />
          ) : (
            <Tags className="w-16 h-16 text-gray-400 dark:text-gray-500" />
          )}
        </div>
        <div className="flex-grow">
          <div className="flex flex-wrap justify-between items-start">
            <div>
              <h1
                className={`text-2xl md:text-3xl font-bold mb-2 ${
                  theme === 'light' ? 'text-gray-900' : 'text-white'
                }`}
              >
                {label.name}
              </h1>
              {label.description && (
                <p
                  className={`mb-4 max-w-3xl ${
                    theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                  }`}
                >
                  {label.description}
                </p>
              )}
            </div>
            <div className="flex flex-col mt-2 md:mt-0 gap-2 text-sm">
              <div
                className={`flex gap-2 px-3 py-1.5 rounded-md ${
                  theme === 'light' ? 'bg-gray-100' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                  }`}
                >
                  Created:
                </span>
                <span
                  className={`${
                    theme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}
                >
                  {formatDate(label.createdAt)}
                </span>
              </div>
              <div
                className={`flex gap-2 px-3 py-1.5 rounded-md ${
                  theme === 'light' ? 'bg-gray-100' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                  }`}
                >
                  Last Updated:
                </span>
                <span
                  className={`${
                    theme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}
                >
                  {formatDate(label.updatedAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-4">
            <div
              className={`flex items-center gap-3 py-1.5 px-4 rounded-lg ${
                theme === 'light'
                  ? 'bg-blue-50 text-blue-600 border border-blue-100'
                  : 'bg-blue-900/20 text-blue-400 border border-blue-900/40'
              }`}
            >
              <span className="font-medium">Albums</span>
              <span className="text-lg font-semibold">
                {label._count?.albums ?? 0}
              </span>
            </div>

            <div
              className={`flex items-center gap-3 py-1.5 px-4 rounded-lg ${
                theme === 'light'
                  ? 'bg-purple-50 text-purple-600 border border-purple-100'
                  : 'bg-purple-900/20 text-purple-400 border border-purple-900/40'
              }`}
            >
              <span className="font-medium">Tracks</span>
              <span className="text-lg font-semibold">
                {label._count?.tracks ?? 0}
              </span>
            </div>

            <div
              className={`flex items-center gap-3 py-1.5 px-4 rounded-lg ${
                theme === 'light'
                  ? 'bg-green-50 text-green-600 border border-green-100'
                  : 'bg-green-900/20 text-green-400 border border-green-900/40'
              }`}
            >
              <span className="font-medium">Artists</span>
              <span className="text-lg font-semibold">
                {label.artists?.length ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
