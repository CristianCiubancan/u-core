import { grayPalettes, colorPalettes } from '../colors';

// Configuration settings
interface AppConfig {
  brandColor: keyof typeof colorPalettes;
  grayColor: keyof typeof grayPalettes;
}

const config: AppConfig = {
  brandColor: 'red', // Changed to indigo for better visual appeal and readability
  grayColor: 'slate', // Changed to slate for better contrast with indigo
};

export type { AppConfig };
export { config };
