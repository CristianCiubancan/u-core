/// <reference types="@citizenfx/client" />

import { config, Delay } from './utils';

let cam: number | null = null;
let camInfo: any = null; // Consider defining a type for cameraInfo

export function getCam(): number | null {
  return cam;
}

export function getCamInfo(): any {
  return camInfo;
}

export function destroyCamera() {
  if (cam) {
    DestroyAllCams(true);
    DestroyCam(cam, true);
    cam = null;
  }
  camInfo = null;
  RenderScriptCams(false, false, 0, true, false); // Removed extra argument
  if (config.debug) console.log('DEBUG: Camera destroyed.');
}

export async function setupCameraForComponent(
  ped: number,
  cameraInfoConfig: any
) {
  if (config.debug) console.log('DEBUG: Setting up camera for component.');
  if (
    !camInfo ||
    camInfo.zPos !== cameraInfoConfig.zPos ||
    camInfo.fov !== cameraInfoConfig.fov
  ) {
    // Store new settings locally before destroying the old camera state
    const newCamSettings = {
      zPos: cameraInfoConfig.zPos,
      fov: cameraInfoConfig.fov,
      rotation: cameraInfoConfig.rotation, // Store rotation as well
    };

    destroyCamera(); // Destroy existing cam before creating a new one, this nullifies global camInfo

    // Ensure ped is in the correct initial position and rotation for camera setup
    SetEntityRotation(
      ped,
      config.greenScreenRotation.x,
      config.greenScreenRotation.y,
      config.greenScreenRotation.z,
      0,
      false
    );
    SetEntityCoordsNoOffset(
      ped,
      config.greenScreenPosition.x,
      config.greenScreenPosition.y,
      config.greenScreenPosition.z,
      false,
      false,
      false
    );

    await Delay(50); // Allow time for position update

    const [playerX, playerY, playerZ] = GetEntityCoords(ped);
    const [fwdX, fwdY, fwdZ] = GetEntityForwardVector(ped);

    const fwdPos = {
      x: playerX + fwdX * 1.2,
      y: playerY + fwdY * 1.2,
      z: playerZ + fwdZ + newCamSettings.zPos, // Use local variable
    };

    cam = CreateCamWithParams(
      'DEFAULT_SCRIPTED_CAMERA',
      fwdPos.x,
      fwdPos.y,
      fwdPos.z,
      0,
      0,
      0,
      newCamSettings.fov, // Use local variable
      true,
      0
    );

    PointCamAtCoord(cam, playerX, playerY, playerZ + newCamSettings.zPos); // Use local variable
    SetCamActive(cam, true);
    RenderScriptCams(true, false, 0, true, false); // Removed extra argument

    // Update global camInfo *after* new camera is set up
    camInfo = cameraInfoConfig;

    if (config.debug)
      console.log('DEBUG: New component camera created and activated.');
  } else {
    if (config.debug)
      console.log('DEBUG: Reusing existing component camera setup.');
  }

  // Apply final rotation after camera is potentially set up, using the correct settings for this run
  const currentRotation = camInfo?.rotation || cameraInfoConfig.rotation; // Use global if exists, else the new one
  SetEntityRotation(
    ped,
    currentRotation.x,
    currentRotation.y,
    currentRotation.z,
    2, // Rotation order might be important
    false
  );

  await Delay(50); // Allow time for rotation update
}

export async function setupCameraForObject(object: number, hash: number) {
  if (config.debug) console.log(`DEBUG: Setting up camera for object ${hash}.`);
  destroyCamera(); // Always create a new camera for objects

  await Delay(50); // Short delay after destroying previous cam

  let [[minDimX, minDimY, minDimZ], [maxDimX, maxDimY, maxDimZ]] =
    GetModelDimensions(hash);
  let modelSize = {
    x: maxDimX - minDimX,
    y: maxDimY - minDimY,
    z: maxDimZ - minDimZ,
  };
  // Adjust FOV calculation for potentially very small objects
  let fov = Math.min(
    Math.max((Math.max(modelSize.x, modelSize.z) / 0.15) * 10, 20),
    70
  ); // Ensure a minimum FOV

  const [objectX, objectY, objectZ] = GetEntityCoords(object, false); // Use false for exact coords
  const [fwdX, fwdY, _] = GetEntityForwardVector(object);

  // Calculate center based on model dimensions and entity coords
  const center = {
    x: objectX + (minDimX + maxDimX) / 2,
    y: objectY + (minDimY + maxDimY) / 2,
    z: objectZ + (minDimZ + maxDimZ) / 2,
  };

  // Adjust camera distance based on model size
  const camDistance =
    Math.max(modelSize.x, modelSize.y, modelSize.z) * 1.5 + 1.0; // Base distance + multiplier

  const camPos = {
    x: center.x + fwdX * camDistance,
    y: center.y + fwdY * camDistance,
    z: center.z, // Point slightly above center maybe? Adjust z offset if needed
  };

  if (config.debug)
    console.log(
      `DEBUG: Object Cam - Size: ${JSON.stringify(
        modelSize
      )}, FOV: ${fov}, Distance: ${camDistance}, Pos: ${JSON.stringify(
        camPos
      )}, Center: ${JSON.stringify(center)}`
    );

  cam = CreateCamWithParams(
    'DEFAULT_SCRIPTED_CAMERA',
    camPos.x,
    camPos.y,
    camPos.z,
    0,
    0,
    0,
    fov,
    true,
    0
  );

  PointCamAtCoord(cam, center.x, center.y, center.z);
  SetCamActive(cam, true);
  RenderScriptCams(true, false, 0, true, false); // Removed extra argument
  if (config.debug)
    console.log('DEBUG: New object camera created and activated.');

  await Delay(50); // Allow time for camera activation
}

export async function setupCameraForVehicle(vehicle: number, hash: number) {
  if (config.debug)
    console.log(`DEBUG: Setting up camera for vehicle ${hash}.`);
  destroyCamera(); // Always create a new camera for vehicles

  await Delay(50);

  let [[minDimX, minDimY, minDimZ], [maxDimX, maxDimY, maxDimZ]] =
    GetModelDimensions(hash);
  let modelSize = {
    x: maxDimX - minDimX,
    y: maxDimY - minDimY,
    z: maxDimZ - minDimZ,
  };
  // Adjust FOV based on the largest dimension
  let fov = Math.min(
    Math.max((Math.max(modelSize.x, modelSize.y, modelSize.z) / 0.15) * 10, 30),
    70
  ); // Min/Max FOV

  const [vehicleX, vehicleY, vehicleZ] = GetEntityCoords(vehicle, false);

  // Calculate center based on model dimensions and entity coords
  const center = {
    x: vehicleX + (minDimX + maxDimX) / 2,
    y: vehicleY + (minDimY + maxDimY) / 2,
    z: vehicleZ + (minDimZ + maxDimZ) / 2,
  };

  // Calculate camera distance based on model size
  const camDistance =
    Math.max(modelSize.x, modelSize.y, modelSize.z) * 1.2 + 3.0; // Base distance + multiplier

  // Position camera at an angle (e.g., 340 degrees)
  const angleRad = (340 * Math.PI) / 180; // Convert angle to radians
  let camPos = {
    x: center.x + camDistance * Math.cos(angleRad),
    y: center.y + camDistance * Math.sin(angleRad),
    z: center.z + modelSize.z * 0.5, // Position camera slightly higher than center
  };

  if (config.debug)
    console.log(
      `DEBUG: Vehicle Cam - Size: ${JSON.stringify(
        modelSize
      )}, FOV: ${fov}, Distance: ${camDistance}, Pos: ${JSON.stringify(
        camPos
      )}, Center: ${JSON.stringify(center)}`
    );

  cam = CreateCamWithParams(
    'DEFAULT_SCRIPTED_CAMERA',
    camPos.x,
    camPos.y,
    camPos.z,
    0,
    0,
    0,
    fov,
    true,
    0
  );

  PointCamAtCoord(cam, center.x, center.y, center.z); // Point at the calculated center
  SetCamActive(cam, true);
  RenderScriptCams(true, false, 0, true, false); // Removed extra argument
  if (config.debug)
    console.log('DEBUG: New vehicle camera created and activated.');

  await Delay(50);
}
