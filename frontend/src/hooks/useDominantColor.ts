import { useEffect, useState } from 'react';
import { FastAverageColor } from 'fast-average-color';

const fac = new FastAverageColor();

export const useDominantColor = (imageUrl?: string) => {
  const [dominantColor, setDominantColor] = useState<string | null>(null);

  useEffect(() => {
    if (!imageUrl) return;

    const getColor = async () => {
      try {
        const color = await fac.getColorAsync(imageUrl);
        setDominantColor(color.hex);
      } catch (error) {
        console.error('Error getting dominant color:', error);
        setDominantColor(null);
      }
    };

    getColor();
  }, [imageUrl]);

  return { dominantColor };
};
