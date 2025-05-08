import { useEffect, useState } from 'react';
import { FastAverageColor } from 'fast-average-color';

const fac = new FastAverageColor();

export const useDominantColor = (imageUrl?: string) => {
  const [dominantColor, setDominantColor] = useState<string | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setDominantColor(null); // Reset color if imageUrl is not provided
      return;
    }

    const img = document.createElement('img');
    img.crossOrigin = 'anonymous'; // Request CORS permissions

    img.onload = async () => {
      try {
        const color = await fac.getColorAsync(img); // Pass the loaded image element
        setDominantColor(color.hex);
      } catch (error) {
        console.error('Error getting dominant color from loaded image:', error, imageUrl);
        setDominantColor(null);
      }
    };

    img.onerror = (error) => {
      console.error('Error loading image for dominant color:', error, imageUrl);
      setDominantColor(null);
    };

    img.src = imageUrl; // Start loading the image

    // Optional: Cleanup function to clear handlers if component unmounts or imageUrl changes
    // though for an image element not added to DOM, it might not be strictly necessary
    // unless to prevent potential memory leaks with many rapid changes.
    return () => {
      img.onload = null;
      img.onerror = null;
      // No direct way to cancel image loading, but removing src might help in some browsers
      // img.src = ''; 
    };
  }, [imageUrl]);

  return { dominantColor };
};
