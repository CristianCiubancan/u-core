import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { fetchNui } from '../../../../../../webview/utils/fetchNui';
import {
  CharacterData,
  DEFAULT_CHARACTER,
  DEFAULT_FEMALE_CHARACTER,
  FaceData,
  HairData,
  AppearanceData,
  ClothingData,
  CameraFocus,
  TabType,
} from '../../shared/types';

// Define state type
interface CharacterState {
  characterData: CharacterData;
  activeTab: TabType;
  activeFocus: CameraFocus;
}

// Define action types
type CharacterAction =
  | { type: 'SET_MODEL'; payload: string }
  | { type: 'SET_FACE'; payload: { key: keyof FaceData; value: number } }
  | { type: 'SET_HAIR'; payload: { key: keyof HairData; value: number } }
  | { type: 'SET_APPEARANCE'; payload: { category: keyof AppearanceData; key: string; value: number } }
  | { type: 'SET_CLOTHING'; payload: { key: keyof ClothingData; value: number } }
  | { type: 'SET_ACTIVE_TAB'; payload: TabType }
  | { type: 'SET_ACTIVE_FOCUS'; payload: CameraFocus };

// Define context type
interface CharacterDataContextType extends CharacterState {
  // Update functions
  setActiveTab: (tab: TabType) => void;
  setActiveFocus: (focus: CameraFocus) => void;
  
  // Character data update functions
  handleModelChange: (modelId: string) => void;
  handleFaceChange: (key: keyof FaceData, value: number) => void;
  handleHairChange: (key: keyof HairData, value: number) => void;
  handleAppearanceChange: (category: keyof AppearanceData, key: string, value: number) => void;
  handleClothingChange: (key: keyof ClothingData, value: number) => void;
  
  // Save and close functions
  handleSaveCharacter: () => Promise<void>;
  handleCloseUi: () => Promise<void>;
}

// Initial state
const initialState: CharacterState = {
  characterData: DEFAULT_CHARACTER,
  activeTab: 'face',
  activeFocus: 'body',
};

// Create the context with a default undefined value
const CharacterDataContext = createContext<CharacterDataContextType | undefined>(undefined);

// Reducer function
function characterReducer(state: CharacterState, action: CharacterAction): CharacterState {
  switch (action.type) {
    case 'SET_MODEL': {
      const defaultData = action.payload === 'mp_f_freemode_01'
        ? DEFAULT_FEMALE_CHARACTER
        : DEFAULT_CHARACTER;
        
      return {
        ...state,
        characterData: {
          ...defaultData,
          model: action.payload,
        },
      };
    }
    
    case 'SET_FACE':
      return {
        ...state,
        characterData: {
          ...state.characterData,
          face: {
            ...state.characterData.face,
            [action.payload.key]: action.payload.value,
          },
        },
      };
      
    case 'SET_HAIR':
      return {
        ...state,
        characterData: {
          ...state.characterData,
          hair: {
            ...state.characterData.hair,
            [action.payload.key]: action.payload.value,
          },
        },
      };
      
    case 'SET_APPEARANCE':
      return {
        ...state,
        characterData: {
          ...state.characterData,
          appearance: {
            ...state.characterData.appearance,
            [action.payload.category]: {
              ...state.characterData.appearance[action.payload.category],
              [action.payload.key]: action.payload.value,
            },
          },
        },
      };
      
    case 'SET_CLOTHING':
      return {
        ...state,
        characterData: {
          ...state.characterData,
          clothing: {
            ...state.characterData.clothing,
            [action.payload.key]: action.payload.value,
          },
        },
      };
      
    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        activeTab: action.payload,
      };
      
    case 'SET_ACTIVE_FOCUS':
      return {
        ...state,
        activeFocus: action.payload,
      };
      
    default:
      return state;
  }
}

// Provider props
interface CharacterDataProviderProps {
  children: ReactNode;
}

// Helper function to handle NUI errors
const handleNuiError = (message: string) => (error: any) => {
  console.error(`[UI] ${message}:`, error);
};

// Provider component
export const CharacterDataProvider: React.FC<CharacterDataProviderProps> = ({ children }) => {
  // Use reducer instead of multiple useState calls
  const [state, dispatch] = useReducer(characterReducer, initialState);
  
  // UI state updaters
  const setActiveTab = useCallback((tab: TabType) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
  }, []);
  
  const setActiveFocus = useCallback((focus: CameraFocus) => {
    dispatch({ type: 'SET_ACTIVE_FOCUS', payload: focus });
  }, []);

  // Handle model change
  const handleModelChange = useCallback((modelId: string) => {
    dispatch({ type: 'SET_MODEL', payload: modelId });

    // Send model change to client
    fetchNui('character-create:update-model', { model: modelId })
      .catch(handleNuiError('Failed to update model'));
  }, []);

  // Handle face change
  const handleFaceChange = useCallback((key: keyof FaceData, value: number) => {
    dispatch({ 
      type: 'SET_FACE', 
      payload: { key, value }
    });

    // Send face change to client
    fetchNui('character-create:update-face', { key, value })
      .catch(handleNuiError('Failed to update face'));
  }, []);

  // Handle hair change
  const handleHairChange = useCallback((key: keyof HairData, value: number) => {
    dispatch({ 
      type: 'SET_HAIR', 
      payload: { key, value }
    });

    // Send hair change to client
    fetchNui('character-create:update-hair', { key, value })
      .catch(handleNuiError('Failed to update hair'));
  }, []);

  // Handle appearance change
  const handleAppearanceChange = useCallback(
    (category: keyof AppearanceData, key: string, value: number) => {
      dispatch({ 
        type: 'SET_APPEARANCE', 
        payload: { category, key, value }
      });

      // Send appearance change to client
      fetchNui('character-create:update-appearance', { category, key, value })
        .catch(handleNuiError('Failed to update appearance'));
    },
    []
  );

  // Handle clothing change
  const handleClothingChange = useCallback(
    (key: keyof ClothingData, value: number) => {
      dispatch({ 
        type: 'SET_CLOTHING', 
        payload: { key, value }
      });

      // Send clothing change to client
      fetchNui('character-create:update-clothing', { key, value })
        .catch(handleNuiError('Failed to update clothing'));
    },
    []
  );

  // Handle save character
  const handleSaveCharacter = useCallback(async () => {
    try {
      await fetchNui('character-create:toggle-ui', {
        save: true,
        characterData: state.characterData,
      });
    } catch (error: any) {
      console.error('[UI] Failed to save character:', error);
    }
  }, [state.characterData]);

  // Handle close UI
  const handleCloseUi = useCallback(async () => {
    try {
      await fetchNui('character-create:toggle-ui', { close: true });
    } catch (error: any) {
      console.error('[UI] Failed to close UI:', error);
    }
  }, []);

  // Create the context value
  const contextValue: CharacterDataContextType = {
    ...state,
    setActiveTab,
    setActiveFocus,
    handleModelChange,
    handleFaceChange,
    handleHairChange,
    handleAppearanceChange,
    handleClothingChange,
    handleSaveCharacter,
    handleCloseUi,
  };

  return (
    <CharacterDataContext.Provider value={contextValue}>
      {children}
    </CharacterDataContext.Provider>
  );
};

// Custom hook to use the character data context
export const useCharacterData = (): CharacterDataContextType => {
  const context = useContext(CharacterDataContext);
  
  if (context === undefined) {
    throw new Error('useCharacterData must be used within a CharacterDataProvider');
  }
  
  return context;
};
