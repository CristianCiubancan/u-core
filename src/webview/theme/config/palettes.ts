import { colorPalettes, grayPalettes } from '../colors';
import { config } from '../config/appConfig';

// Get active palette references
const brandPalette = colorPalettes[config.brandColor];
const grayPalette = grayPalettes[config.grayColor];

export { brandPalette, grayPalette };
