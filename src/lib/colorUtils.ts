import { colord } from 'colord';

export interface BrandingColors {
  primary: string;
  secondary: string;
  text: string;
}

// Calculate relative luminance (WCAG formula)
function getRelativeLuminance(color: string): number {
  try {
    const hsl = colord(color).toHsl();
    const rgb = colord(color).toRgb();
    
    // Convert sRGB to linear RGB
    const sRGBToLinear = (c: number) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    
    const r = sRGBToLinear(rgb.r);
    const g = sRGBToLinear(rgb.g);
    const b = sRGBToLinear(rgb.b);
    
    // Calculate luminance using WCAG formula
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  } catch {
    return 0;
  }
}

// Calculate WCAG contrast ratio
function calculateContrastRatio(color1: string, color2: string): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Generate WCAG compliant colors based on primary color
export const generateBrandingColors = (primaryColor: string): BrandingColors => {
  const primary = colord(primaryColor);
  
  // Generate secondary color using complementary color theory
  const secondary = primary.rotate(30).lighten(0.1);
  
  // Generate text color with proper contrast
  const isLightPrimary = primary.isLight();
  const textColor = isLightPrimary ? '#1a1a1a' : '#ffffff';
  
  return {
    primary: primary.toHex(),
    secondary: secondary.toHex(),
    text: textColor
  };
};

// Check if color meets WCAG AA contrast requirements (4.5:1 ratio)
export const checkContrast = (foreground: string, background: string): boolean => {
  try {
    return calculateContrastRatio(foreground, background) >= 4.5;
  } catch {
    return false;
  }
};

// Get detailed contrast analysis
export const getContrastAnalysis = (foreground: string, background: string) => {
  try {
    const ratio = calculateContrastRatio(foreground, background);
    
    return {
      ratio: Math.round(ratio * 100) / 100,
      passAA: ratio >= 4.5,
      passAAA: ratio >= 7,
      level: ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'Fail'
    };
  } catch {
    return {
      ratio: 0,
      passAA: false,
      passAAA: false,
      level: 'Fail' as const
    };
  }
};

// Apply color harmony rules to generate secondary color
export const generateSecondaryColor = (primaryColor: string, harmony: 'complementary' | 'triadic' | 'analogous' = 'complementary'): string => {
  const primary = colord(primaryColor);
  
  switch (harmony) {
    case 'complementary':
      return primary.rotate(180).toHex();
    case 'triadic':
      return primary.rotate(120).toHex();
    case 'analogous':
      return primary.rotate(30).toHex();
    default:
      return primary.rotate(180).toHex();
  }
};

// Convert hex to HSL for Tailwind CSS variables
export const hexToHSL = (hex: string): string => {
  const hsl = colord(hex).toHsl();
  return `${Math.round(hsl.h)} ${Math.round(hsl.s)}% ${Math.round(hsl.l)}%`;
};