/// <reference types="@citizenfx/client" />

import { CameraFocus, CameraDirection, ZoomDirection } from '../shared/types';
import {
  getCameraState,
  setCameraRotation,
  setCameraZoom,
  setCameraFocus,
  setCharacterCreationCamera,
} from '../shared/store';
import { faceCamera } from './character-manager';

/**
 * Camera Manager for character creation
 * Handles all camera-related functionality
 */
class CameraManager {
  private _spectatorModeActive: boolean = false;

  /**
   * Set up the camera for character creation
   */
  setup(): void {
    // Disable rendering of the player's camera while in character creation
    NetworkSetInSpectatorMode(true, PlayerPedId());
    this._spectatorModeActive = true;
    console.log('[Camera Manager] Spectator mode enabled');

    // Create a camera pointing at the player
    this.updatePosition();
  }

  /**
   * Update the camera position based on current rotation, zoom, and focus
   */
  updatePosition(): void {
    const { cameraRotation, cameraZoom, cameraFocus, characterCreationCamera } =
      getCameraState();
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
      setCharacterCreationCamera(camera);
      console.log('[Camera Manager] New camera created');
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
  rotate(direction: CameraDirection): void {
    const { cameraRotation } = getCameraState();
    let newRotation = cameraRotation;

    if (direction === 'left') {
      newRotation = (cameraRotation - 15) % 360;
    } else if (direction === 'right') {
      newRotation = (cameraRotation + 15) % 360;
    }

    setCameraRotation(newRotation);
    this.updatePosition();

    // Make the character face the camera after rotation
    faceCamera();
  }

  /**
   * Zoom the camera in or out
   * @param {ZoomDirection} direction - The direction to zoom ('in' or 'out')
   */
  zoom(direction: ZoomDirection): void {
    const { cameraZoom } = getCameraState();
    let newZoom = cameraZoom;

    if (direction === 'in') {
      newZoom = Math.max(0.5, cameraZoom - 0.25);
    } else if (direction === 'out') {
      newZoom = Math.min(3.0, cameraZoom + 0.25);
    }

    setCameraZoom(newZoom);
    this.updatePosition();
  }

  /**
   * Focus the camera on a specific part of the player
   * @param {CameraFocus} focus - The part to focus on ('head', 'body', or 'legs')
   */
  focus(focus: CameraFocus): void {
    setCameraFocus(focus);
    this.updatePosition();
  }

  /**
   * Clean up the camera when exiting character creation
   */
  cleanup(): void {
    const { characterCreationCamera } = getCameraState();

    // Disable spectator mode if it's active
    if (this._spectatorModeActive) {
      NetworkSetInSpectatorMode(false, PlayerPedId());
      this._spectatorModeActive = false;
      console.log('[Camera Manager] Spectator mode disabled');
    }

    // Destroy the camera
    if (characterCreationCamera) {
      SetCamActive(characterCreationCamera, false);
      DestroyCam(characterCreationCamera, true);
      RenderScriptCams(false, false, 0, true, true);
      setCharacterCreationCamera(null);
      console.log('[Camera Manager] Camera destroyed');
    }

    // Double-check to make sure player is visible
    SetEntityVisible(PlayerPedId(), true, false);
    console.log('[Camera Manager] Ensured player visibility');
  }
}

// Export a singleton instance
export const cameraManager = new CameraManager();

// Export compatibility functions for existing code
export const setupCamera = () => cameraManager.setup();
export const updateCameraPosition = () => cameraManager.updatePosition();
export const rotateCamera = (direction: CameraDirection) =>
  cameraManager.rotate(direction);
export const zoomCamera = (direction: ZoomDirection) =>
  cameraManager.zoom(direction);
export const focusCamera = (focus: CameraFocus) => cameraManager.focus(focus);
export const cleanupCamera = () => cameraManager.cleanup();
