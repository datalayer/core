/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Color contrast utility for accessibility compliance
 * WCAG 2.1 requires:
 * - AA: 4.5:1 for normal text, 3:1 for large text or UI components
 * - AAA: 7:1 for normal text, 4.5:1 for large text or UI components
 */

interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): ColorRGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Calculate relative luminance according to WCAG 2.1
 */
function getLuminance(rgb: ColorRGB): number {
  const { r, g, b } = rgb;

  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const lum1 = getLuminance(rgb1);
  const lum2 = getLuminance(rgb2);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Check if color combination meets WCAG standards
 */
export function checkContrastCompliance(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  largeText: boolean = false
): {
  ratio: number;
  passes: boolean;
  requiredRatio: number;
  grade: string;
} {
  const ratio = getContrastRatio(foreground, background);

  let requiredRatio: number;
  if (level === 'AA') {
    requiredRatio = largeText ? 3 : 4.5;
  } else {
    requiredRatio = largeText ? 4.5 : 7;
  }

  const passes = ratio >= requiredRatio;

  let grade = 'Fail';
  if (ratio >= 7) grade = 'AAA';
  else if (ratio >= 4.5) grade = 'AA';
  else if (ratio >= 3) grade = 'AA Large';

  return {
    ratio: Math.round(ratio * 100) / 100,
    passes,
    requiredRatio,
    grade,
  };
}

/**
 * Test current application colors
 */
export function testApplicationColors(): void {
  const tests = [
    {
      name: 'Green Play Icon (Primary)',
      foreground: '#1ABC9C',
      background: '#FFFFFF',
    },
    {
      name: 'Green Play Icon (Hover)',
      foreground: '#16A085',
      background: '#FFFFFF',
    },
    {
      name: 'Red Trash Icon (Primary)',
      foreground: '#DC3545',
      background: '#FFFFFF',
    },
    {
      name: 'Red Trash Icon (Hover)',
      foreground: '#B02A37',
      background: '#FFFFFF',
    },
    {
      name: 'Green Play Icon on Light Background',
      foreground: '#1ABC9C',
      background: '#F8F9FA',
    },
    {
      name: 'Red Trash Icon on Light Background',
      foreground: '#DC3545',
      background: '#F8F9FA',
    },
    {
      name: 'Green Selected Button',
      foreground: '#FFFFFF',
      background: '#117964',
    },
    {
      name: 'Green Connect Button',
      foreground: '#FFFFFF',
      background: '#117964',
    },
    {
      name: 'Green Connect Button Hover',
      foreground: '#FFFFFF',
      background: '#138D75',
    },
    {
      name: 'Red Trash Icon on Light Background (Updated)',
      foreground: '#C82333',
      background: '#F8F9FA',
    },
  ];

  console.log('\n🎨 Color Contrast Accessibility Audit');
  console.log('=====================================');

  tests.forEach(test => {
    const result = checkContrastCompliance(test.foreground, test.background);
    const status = result.passes ? '✅' : '❌';

    console.log(`\n${status} ${test.name}`);
    console.log(`   Colors: ${test.foreground} on ${test.background}`);
    console.log(`   Ratio: ${result.ratio}:1 (${result.grade})`);
    console.log(`   Required: ${result.requiredRatio}:1 for AA compliance`);

    if (!result.passes) {
      console.log(`   ⚠️  Fails WCAG AA - Consider darker colors`);
    }
  });

  console.log('\n📋 Summary:');
  console.log('- Icons should meet 3:1 ratio for UI components');
  console.log('- Text should meet 4.5:1 ratio for AA compliance');
  console.log('- Consider using darker shades if ratios are too low');
}
