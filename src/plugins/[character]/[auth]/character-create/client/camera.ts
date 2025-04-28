/// <reference types="@citizenfx/client" />

import { CameraFocus, CameraDirection, ZoomDirection } from '../types/types';
import {
  cameraRotation,
  cameraZoom,
  cameraFocus,
  characterCreationCamera,
  setCameraRotation,
  setCameraZoom,
  setCameraFocus,
  setCharacterCreationCamera,
} from './state';

/**
 * =======================================================
 * CAMERA MANAGEMENT
 * =======================================================
 */

/**
 * Set up the camera for character creation
 */
export function setupCamera(): void {
  // Disable rendering of the player's camera while in character creation
  NetworkSetInSpectatorMode(true, PlayerPedId());

  // Create a camera pointing at the player
  updateCameraPosition();
}

/**
 * Update the camera position based on current rotation, zoom, and focus
 */
export function updateCameraPosition(): void {
  const playerPed = PlayerPedId();
  const coords = GetEntityCoords(playerPed, true);

  // Calculate camera position based on rotation and zoom
  const angleRad = (cameraRotation * Math.PI) / 180;
  let cameraHeight = coords[2];

  // Adjust height based on focus
  if (cameraFocus === 'head') {
    cameraHeight += 0.65;
  } else if (cameraFocus === 'legs') {
    cameraHeight -= 0.5;
  } else {
    cameraHeight += 0.2;
  }

  // Calculate camera position
  const cameraCoords = {
    x: coords[0] + Math.sin(angleRad) * cameraZoom,
    y: coords[1] + Math.cos(angleRad) * cameraZoom,
    z: cameraHeight,
  };

  // Calculate the direct vector from camera to ped
  const dirVector = {
    x: coords[0] - cameraCoords.x,
    y: coords[1] - cameraCoords.y,
    z: cameraHeight - cameraCoords.z,
  };

  const pitch =
    Math.atan2(dirVector.z, Math.sqrt(dirVector.x ** 2 + dirVector.y ** 2)) *
    (180 / Math.PI);
  let yaw = Math.atan2(dirVector.x, dirVector.y) * (180 / Math.PI);

  // Add our left-looking offset
  const leftAngleOffset = 30;
  yaw += leftAngleOffset;

  // Create or update the camera
  if (!characterCreationCamera) {
    const camera = CreateCam('DEFAULT_SCRIPTED_CAMERA', true);
    SetCamCoord(camera, cameraCoords.x, cameraCoords.y, cameraCoords.z);
    SetCamRot(camera, pitch, 0.0, yaw, 2);
    SetCamActive(camera, true);
    RenderScriptCams(true, false, 0, true, true);
    setCharacterCreationCamera(camera); // Update state
  } else {
    SetCamCoord(
      characterCreationCamera,
      cameraCoords.x,
      cameraCoords.y,
      cameraCoords.z
    );
    SetCamRot(characterCreationCamera, pitch, 0.0, yaw, 2);
  }
}

/**
 * Rotate the camera around the player
 * @param {CameraDirection} direction - The direction to rotate ('left' or 'right')
 */
export function rotateCamera(direction: CameraDirection): void {
  let newRotation = cameraRotation;
  if (direction === 'left') {
    newRotation = (cameraRotation - 15) % 360;
  } else if (direction === 'right') {
    newRotation = (cameraRotation + 15) % 360;
  }
  setCameraRotation(newRotation); // Update state
  updateCameraPosition();
}

/**
 * Zoom the camera in or out
 * @param {ZoomDirection} direction - The direction to zoom ('in' or 'out')
 */
export function zoomCamera(direction: ZoomDirection): void {
  let newZoom = cameraZoom;
  if (direction === 'in') {
    newZoom = Math.max(0.5, cameraZoom - 0.25);
  } else if (direction === 'out') {
    newZoom = Math.min(3.0, cameraZoom + 0.25);
  }
  setCameraZoom(newZoom); // Update state
  updateCameraPosition();
}

/**
 * Focus the camera on a specific part of the player
 * @param {CameraFocus} focus - The part to focus on ('head', 'body', or 'legs')
 */
export function focusCamera(focus: CameraFocus): void {
  setCameraFocus(focus); // Update state
  updateCameraPosition();
}

/**
 * Clean up the camera resources
 */
export function cleanupCamera(): void {
  // Disable spectator mode
  NetworkSetInSpectatorMode(false, PlayerPedId());

  // Destroy the camera
  if (characterCreationCamera) {
    SetCamActive(characterCreationCamera, false);
    DestroyCam(characterCreationCamera, true);
    RenderScriptCams(false, false, 0, true, true);
    setCharacterCreationCamera(null); // Update state
  }
}
