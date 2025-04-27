const fontSizeMultiplier: number = 1.15; // Optimized for readability

interface FontSizeConfig {
  [key: string]: [string, { lineHeight: string; letterSpacing: string }];
}

// Function to generate font size configuration with optimized readability
function generateFontSizes(): FontSizeConfig {
  const sizes: { [key: string]: [number, number] } = {
    'xs': [0.75, 1.3], // Increased line height for better readability
    'sm': [0.875, 1.55], // Increased line height for better readability
    'base': [1, 1.65], // Optimal line height for main text
    'lg': [1.125, 1.6], // Slightly reduced line height for larger text
    'xl': [1.25, 1.55], // Adjusted for headings
    '2xl': [1.5, 1.4], // Adjusted for headings
    '3xl': [1.875, 1.3], // Adjusted for headings
    '4xl': [2.25, 1.2], // Headings need less line height
    '5xl': [3, 1.1], // Improved for very large text
    '6xl': [3.75, 1.05], // Improved for very large text
  };

  return Object.entries(sizes).reduce(
    (acc: FontSizeConfig, [key, [size, lineHeight]]) => {
      acc[key] = [
        `${size * fontSizeMultiplier}rem`,
        {
          lineHeight: `${
            typeof lineHeight === 'number'
              ? lineHeight * fontSizeMultiplier
              : lineHeight
          }rem`,
          letterSpacing:
            key === 'xs' || key === 'sm'
              ? '0.01em'
              : key === 'base'
              ? '0.005em'
              : '0em', // Improved letter spacing for small text
        },
      ];
      return acc;
    },
    {}
  );
}

export { generateFontSizes };
