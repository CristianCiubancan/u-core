// @ts-nocheck
/// <reference types="@citizenfx/client" />

export const config = JSON.parse(
  LoadResourceFile(GetCurrentResourceName(), 'config.json')
);

export const Delay = (ms: number): Promise<void> =>
  new Promise((res) => setTimeout(res, ms));

export let QBCore: any = null;

if (config.useQBVehicles) {
  try {
    QBCore = exports[config.coreResourceName].GetCoreObject();
    if (config.debug) console.log('DEBUG: QBCore object obtained.');
  } catch (e) {
    console.error(
      `ERROR: Could not get QBCore object from resource '${config.coreResourceName}'. Ensure the resource name is correct and started.`
    );
    QBCore = null; // Ensure it's null if export fails
  }
} else {
  if (config.debug)
    console.log('DEBUG: QBCore integration disabled via config.');
}

export const playerId = PlayerId();

// Add other utility functions as needed during refactoring
