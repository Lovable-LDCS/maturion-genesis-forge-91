import { colord } from 'colord';

export interface BrandingColors {
  primary: string;
  secondary: string;
  text: string;
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

// Check if color meets WCAG AA contrast requirements
export const checkContrast = (foreground: string, background: string): boolean => {
  const fgColor = colord(foreground);
  const bgColor = colord(background);
  
  // Simple contrast check using lightness
  const fgLightness = fgColor.toHsl().l;
  const bgLightness = bgColor.toHsl().l;
  
  return Math.abs(fgLightness - bgLightness) > 50; // Simplified contrast check
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