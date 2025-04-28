/// <reference types="@citizenfx/server" />
/// <reference types="image-js" />

// @ts-ignore - Allow require for image-js until proper import/types are figured out if needed
const imagejs = require('image-js');
const fs = require('fs'); // We need fs for directory creation

const resName = GetCurrentResourceName();
const mainSavePath = GetResourcePath(resName) + '/images'; // Base path for images

// Track active screenshot requests with their source IDs
const activeRequests = new Map();

console.log(
  `[fivem-greenscreener] Initializing with resource path: ${GetResourcePath(
    resName
  )}`
);
console.log(`[fivem-greenscreener] Main save path: ${mainSavePath}`);

try {
  // Create the main images directory if it doesn't exist
  if (!fs.existsSync(mainSavePath)) {
    fs.mkdirSync(mainSavePath);
    console.log(`Created main save directory: ${mainSavePath}`);
  }

  // Check if screenshot-basic is available
  if (!exports['screenshot-basic']) {
    console.error(
      `[fivem-greenscreener] ERROR: screenshot-basic resource is not available. Make sure it's installed and started.`
    );
  } else {
    console.log(
      `[fivem-greenscreener] screenshot-basic resource is available.`
    );
  }

  // Function to check if a player source is still valid
  function isSourceValid(src: number): boolean {
    try {
      // In FiveM, we can check if a player is still connected
      return GetPlayerName(src.toString()) !== null;
    } catch (e) {
      return false;
    }
  }

  // Function to safely emit to a client, checking if source is still valid
  function safeEmitNet(eventName: string, src: number, ...args: any[]) {
    if (isSourceValid(src)) {
      emitNet(eventName, src, ...args);
      return true;
    }
    return false;
  }

  // Function to broadcast to all clients
  function broadcastScreenshotComplete(fileName: string, _type: string) {
    // This is a fallback mechanism to notify all clients when the source is invalid
    // Only use this if you want all clients to be notified about completed screenshots
    // emitNet('screenshot:broadcast', -1, fileName, _type);

    // For now, we'll just log that we couldn't notify the original requester
    console.log(
      `[fivem-greenscreener] Screenshot completed but couldn't notify original requester: ${fileName}`
    );
  }

  onNet('takeScreenshot', async (filename: string, type: string) => {
    const playerSource = source;
    console.log(
      `[fivem-greenscreener] Received takeScreenshot event for ${filename} (type: ${type})`
    );
    console.log(`[fivem-greenscreener] Source: ${playerSource}`);

    if (!playerSource) {
      console.error(
        `[fivem-greenscreener] ERROR: Invalid source (${playerSource}). Cannot take screenshot.`
      );
      return;
    }

    // Store the request in our tracking map
    const requestId = `${playerSource}_${filename}_${Date.now()}`;
    activeRequests.set(requestId, {
      source: playerSource,
      filename,
      type,
      timestamp: Date.now(),
    });

    const savePath = `${mainSavePath}/${type}`; // Determine specific save path (e.g., /images/clothing)

    // Create type-specific directory if it doesn't exist
    if (!fs.existsSync(savePath)) {
      fs.mkdirSync(savePath);
      console.log(`Created type-specific directory: ${savePath}`);
    }

    const fullSavePath = `${savePath}/${filename}.png`;
    console.log(
      `[fivem-greenscreener] Will save screenshot to: ${fullSavePath}`
    );

    try {
      exports['screenshot-basic'].requestClientScreenshot(
        playerSource,
        {
          fileName: fullSavePath,
          encoding: 'png',
          quality: 1.0,
        },
        async (err: any, fileName: string) => {
          try {
            // Get the request data from our tracking map
            const requestData = activeRequests.get(requestId);

            if (err) {
              console.error(`[fivem-greenscreener] Screenshot error: ${err}`);

              // Notify client of error if source is still valid
              if (requestData && isSourceValid(requestData.source)) {
                safeEmitNet('screenshot:error', requestData.source, err);
              }

              // Clean up the request
              activeRequests.delete(requestId);
              return;
            }

            if (!fileName || !fs.existsSync(fileName)) {
              console.error(
                `[fivem-greenscreener] Screenshot file not created or not found: ${fileName}`
              );

              // Notify client of error if source is still valid
              if (requestData && isSourceValid(requestData.source)) {
                safeEmitNet(
                  'screenshot:error',
                  requestData.source,
                  'Screenshot file not created or not found'
                );
              }

              // Clean up the request
              activeRequests.delete(requestId);
              return;
            }

            console.log(
              `[fivem-greenscreener] Processing screenshot: ${fileName}`
            );

            try {
              let image = await imagejs.Image.load(fileName);
              console.log(
                `[fivem-greenscreener] Image loaded. Dimensions: ${image.width}x${image.height}`
              );

              // Crop the image - adjust the cropping parameters if needed
              const croppedImage = image.crop({
                x: Math.floor(image.width / 4.5),
                width: Math.min(
                  image.height,
                  image.width - Math.floor(image.width / 4.5)
                ),
              });

              console.log(
                `[fivem-greenscreener] Image cropped. New dimensions: ${croppedImage.width}x${croppedImage.height}`
              );

              image.data = croppedImage.data;
              image.width = croppedImage.width;
              image.height = croppedImage.height;

              // Process the image to remove green background
              console.log(`[fivem-greenscreener] Removing green background...`);
              for (let x = 0; x < image.width; x++) {
                for (let y = 0; y < image.height; y++) {
                  const pixelArr = image.getPixelXY(x, y);
                  const r = pixelArr[0];
                  const g = pixelArr[1];
                  const b = pixelArr[2];

                  // If the green component is significantly higher than red+blue, make it transparent
                  if (g > r + b) {
                    image.setPixelXY(x, y, [255, 255, 255, 0]);
                  }
                }
              }

              // Save the processed image
              await image.save(fileName);
              console.log(
                `[fivem-greenscreener] Screenshot processed and saved to: ${fileName}`
              );

              // Get the latest request data (in case it changed during processing)
              const currentRequestData = activeRequests.get(requestId);

              // Emit an event back to the client to confirm the screenshot was processed
              if (
                currentRequestData &&
                isSourceValid(currentRequestData.source)
              ) {
                const emitSuccess = safeEmitNet(
                  'screenshot:processed',
                  currentRequestData.source,
                  fileName
                );
                if (!emitSuccess) {
                  console.warn(
                    `[fivem-greenscreener] Source ${currentRequestData.source} became invalid before emitting screenshot:processed for ${fileName}`
                  );
                  // Optionally broadcast to all clients as a fallback
                  broadcastScreenshotComplete(fileName, type);
                }
              } else {
                console.warn(
                  `[fivem-greenscreener] Source became invalid before emitting screenshot:processed for ${fileName}`
                );
                // Optionally broadcast to all clients as a fallback
                broadcastScreenshotComplete(fileName, type);
              }
            } catch (imageError) {
              console.error(
                `[fivem-greenscreener] Error processing image: ${imageError.message}`
              );
              console.error(imageError.stack);

              // Get the latest request data
              const currentRequestData = activeRequests.get(requestId);

              // Emit an error event back to the client
              if (
                currentRequestData &&
                isSourceValid(currentRequestData.source)
              ) {
                safeEmitNet(
                  'screenshot:error',
                  currentRequestData.source,
                  imageError.message
                );
              } else {
                console.warn(
                  `[fivem-greenscreener] Source became invalid before emitting screenshot:error for ${fileName}`
                );
              }
            }

            // Clean up the request regardless of success or failure
            activeRequests.delete(requestId);
          } catch (callbackError) {
            console.error(
              `[fivem-greenscreener] Error in screenshot callback: ${callbackError.message}`
            );
            console.error(callbackError.stack);

            // Clean up the request
            activeRequests.delete(requestId);
          }
        }
      );
    } catch (screenshotError) {
      console.error(
        `[fivem-greenscreener] Error requesting screenshot: ${screenshotError.message}`
      );
      console.error(screenshotError.stack);

      // Clean up the request
      activeRequests.delete(requestId);
    }
  });

  console.log(`[fivem-greenscreener] Server-side initialized successfully.`);
} catch (error) {
  console.error(`[fivem-greenscreener] Error initializing: ${error.message}`);
  console.error(error.stack);
  console.error(
    `[fivem-greenscreener] Resource path: ${GetResourcePath(resName)}`
  );
}
