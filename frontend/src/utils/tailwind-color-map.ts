export const tailwindColorMap: Record<string, Record<string, string>> = {
  blue: {
    '500': '#3B82F6',
    '700': '#1D4ED8',
  },
  purple: {
    '500': '#8B5CF6',
    '700': '#6D28D9',
  },
  green: {
    '500': '#10B981',
    '700': '#047857',
  },
  red: {
    '500': '#EF4444',
    '700': '#B91C1C',
  },
  yellow: {
    '500': '#EAB308',
    '700': '#A16207',
  },
  pink: {
    '500': '#EC4899',
    '700': '#BE185D',
  },
  indigo: {
    '500': '#6366F1',
    '700': '#4338CA',
  },
  teal: {
    '500': '#14B8A6',
    '700': '#0F766E',
  },
  orange: {
    '500': '#F97316',
    '700': '#C2410C',
  },
  cyan: {
    '500': '#06B6D4',
    '700': '#0E7490',
  },
  lime: {
    '500': '#84CC16',
    '700': '#4D7C0F',
  },
  emerald: {
    '500': '#10B981',
    '700': '#047857',
  },
  rose: {
    '500': '#F43F5E',
    '700': '#BE123C',
  },
  fuchsia: {
    '500': '#D946EF',
    '700': '#A21CAF',
  },
  amber: {
    '500': '#F59E0B',
    '700': '#B45309',
  },
  violet: {
    '500': '#8B5CF6',
    '700': '#6D28D9',
  },
  sky: {
    '500': '#0EA5E9',
    '700': '#0369A1',
  },
};


export function getDominantHexColor(tailwindGradient: string): string | null {
  try {
    const [from, to] = tailwindGradient.split(' ').map(str => str.trim());

    const [fromColor, fromShade] = from.replace('from-', '').split('-');
    const [toColor, toShade] = to.replace('to-', '').split('-');

    const fromHex = tailwindColorMap[fromColor]?.[fromShade];
    const toHex = tailwindColorMap[toColor]?.[toShade];

    if (!fromHex || !toHex) return null;

    const averageHex = averageHexColors(fromHex, toHex);
    return averageHex;
  } catch (err) {
    console.error('Error parsing gradient string:', err);
    return null;
  }
}

function averageHexColors(hex1: string, hex2: string): string {
  const r = Math.round((parseInt(hex1.slice(1, 3), 16) + parseInt(hex2.slice(1, 3), 16)) / 2);
  const g = Math.round((parseInt(hex1.slice(3, 5), 16) + parseInt(hex2.slice(3, 5), 16)) / 2);
  const b = Math.round((parseInt(hex1.slice(5, 7), 16) + parseInt(hex2.slice(5, 7), 16)) / 2);

  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}
