// @ts-nocheck
/// <reference types="@citizenfx/server" />
/// <reference types="image-js" />

// @ts-ignore - Allow require for image-js until proper import/types are figured out if needed
const imagejs = require('image-js');
const fs = require('fs'); // We need fs for directory creation

const resName = GetCurrentResourceName();
const mainSavePath = GetResourcePath(resName) + '/images'; // Base path for images

try {
  // Create the main images directory if it doesn't exist
  if (!fs.existsSync(mainSavePath)) {
    fs.mkdirSync(mainSavePath);
    console.log(`Created main save directory: ${mainSavePath}`);
  }

  onNet('takeScreenshot', async (filename, type) => {
    const savePath = `${mainSavePath}/${type}`; // Determine specific save path (e.g., /images/clothing)

    // Create type-specific directory if it doesn't exist
    if (!fs.existsSync(savePath)) {
      fs.mkdirSync(savePath);
      console.log(`Created type-specific directory: ${savePath}`);
    }

    exports['screenshot-basic'].requestClientScreenshot(
      source,
      {
        fileName: `${savePath}/${filename}.png`,
        encoding: 'png',
        quality: 1.0,
      },
      async (err, fileName) => {
        try {
          if (err) {
            console.error(`Screenshot error: ${err}`);
            return;
          }

          console.log(`Processing screenshot: ${fileName}`);
          let image = await imagejs.Image.load(fileName);
          const coppedImage = image.crop({
            x: image.width / 4.5,
            width: image.height,
          });

          image.data = coppedImage.data;
          image.width = coppedImage.width;
          image.height = coppedImage.height;

          for (let x = 0; x < image.width; x++) {
            for (let y = 0; y < image.height; y++) {
              const pixelArr = image.getPixelXY(x, y);
              const r = pixelArr[0];
              const g = pixelArr[1];
              const b = pixelArr[2];

              if (g > r + b) {
                image.setPixelXY(x, y, [255, 255, 255, 0]);
              }
            }
          }

          await image.save(fileName);
          console.log(`Screenshot saved to: ${fileName}`);
        } catch (error) {
          console.error(`Error processing screenshot: ${error.message}`);
        }
      }
    );
  });
} catch (error) {
  console.error(`[fivem-greenscreener] Error initializing: ${error.message}`);
  console.error(
    `[fivem-greenscreener] Resource path: ${GetResourcePath(resName)}`
  );
}
