/**
 * Simple state management for character creation
 */
import {
  CharacterData,
  CameraFocus,
  DEFAULT_CHARACTER,
  NUI_EVENT,
} from './types';

// Re-export constants
export { NUI_EVENT };

// Define the store state interface
interface StoreState {
  // UI State
  uiVisible: boolean;

  // Camera state
  cameraRotation: number;
  cameraZoom: number;
  cameraFocus: CameraFocus;
  characterCreationCamera: number | null;

  // Character data
  characterData: CharacterData;
}

// Initialize with default values
const initialState: StoreState = {
  uiVisible: false,
  cameraRotation: 0,
  cameraZoom: 1.5,
  cameraFocus: 'body',
  characterCreationCamera: null,
  characterData: DEFAULT_CHARACTER,
};

// Create a simple store
class Store {
  private state: StoreState = initialState;
  private listeners: Array<(state: StoreState) => void> = [];

  // Get current state
  getState(): StoreState {
    return this.state;
  }

  // Update state
  setState(partialState: Partial<StoreState>): void {
    this.state = { ...this.state, ...partialState };
    this.notifyListeners();
  }

  // Update character data
  updateCharacterData(partialData: Partial<CharacterData>): void {
    this.state.characterData = { ...this.state.characterData, ...partialData };
    this.notifyListeners();
  }

  // Update nested character data properties
  updateCharacterProperty<K extends keyof CharacterData>(
    property: K,
    value: Partial<CharacterData[K]>
  ): void {
    this.state.characterData = {
      ...this.state.characterData,
      [property]: {
        ...this.state.characterData[property],
        ...value,
      },
    };
    this.notifyListeners();
  }

  // Subscribe to state changes
  subscribe(listener: (state: StoreState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  // Notify all listeners of state change
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }

  // Reset state to initial values
  reset(): void {
    this.state = initialState;
    this.notifyListeners();
  }
}

// Create and export a singleton instance
export const store = new Store();

// Helper functions to access specific parts of state
export const getCharacterData = (): CharacterData =>
  store.getState().characterData;
export const isUiVisible = (): boolean => store.getState().uiVisible;
export const getCameraState = () => {
  const { cameraRotation, cameraZoom, cameraFocus, characterCreationCamera } =
    store.getState();
  return { cameraRotation, cameraZoom, cameraFocus, characterCreationCamera };
};

// Helper functions to update specific parts of state
export const setUiVisible = (visible: boolean): void =>
  store.setState({ uiVisible: visible });
export const setCameraRotation = (rotation: number): void =>
  store.setState({ cameraRotation: rotation });
export const setCameraZoom = (zoom: number): void =>
  store.setState({ cameraZoom: zoom });
export const setCameraFocus = (focus: CameraFocus): void =>
  store.setState({ cameraFocus: focus });
export const setCharacterCreationCamera = (camera: number | null): void =>
  store.setState({ characterCreationCamera: camera });
export const updateCharacterModel = (model: string): void =>
  store.updateCharacterData({ model });
