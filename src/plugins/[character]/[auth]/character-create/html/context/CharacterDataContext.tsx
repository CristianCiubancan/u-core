import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
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

// Define the context type
interface CharacterDataContextType {
  // Character data
  characterData: CharacterData;
  
  // UI state
  activeTab: TabType;
  activeFocus: CameraFocus;
  
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

// Create the context with a default undefined value
const CharacterDataContext = createContext<CharacterDataContextType | undefined>(undefined);

// Provider props
interface CharacterDataProviderProps {
  children: ReactNode;
}

// Provider component
export const CharacterDataProvider: React.FC<CharacterDataProviderProps> = ({ children }) => {
  // Character data state
  const [characterData, setCharacterData] = useState<CharacterData>(DEFAULT_CHARACTER);
  
  // UI state
  const [activeTab, setActiveTab] = useState<TabType>('face');
  const [activeFocus, setActiveFocus] = useState<CameraFocus>('body');

  // Handle model change
  const handleModelChange = useCallback((modelId: string) => {
    // Use the appropriate default character data based on the model
    const defaultData =
      modelId === 'mp_f_freemode_01'
        ? DEFAULT_FEMALE_CHARACTER
        : DEFAULT_CHARACTER;

    // Update with the default data for the selected model
    setCharacterData({
      ...defaultData,
      model: modelId,
    });

    // Send model change to client
    fetchNui('character-create:update-model', { model: modelId }).catch(
      (error: any) => {
        console.error('[UI] Failed to update model:', error);
      }
    );
  }, []);

  // Handle face change
  const handleFaceChange = useCallback((key: keyof FaceData, value: number) => {
    setCharacterData((prev) => ({
      ...prev,
      face: {
        ...prev.face,
        [key]: value,
      },
    }));

    // Send face change to client
    fetchNui('character-create:update-face', { key, value }).catch(
      (error: any) => {
        console.error('[UI] Failed to update face:', error);
      }
    );
  }, []);

  // Handle hair change
  const handleHairChange = useCallback((key: keyof HairData, value: number) => {
    setCharacterData((prev) => ({
      ...prev,
      hair: {
        ...prev.hair,
        [key]: value,
      },
    }));

    // Send hair change to client
    fetchNui('character-create:update-hair', { key, value }).catch(
      (error: any) => {
        console.error('[UI] Failed to update hair:', error);
      }
    );
  }, []);

  // Handle appearance change
  const handleAppearanceChange = useCallback(
    (category: keyof AppearanceData, key: string, value: number) => {
      setCharacterData((prev) => ({
        ...prev,
        appearance: {
          ...prev.appearance,
          [category]: {
            ...prev.appearance[category],
            [key]: value,
          },
        },
      }));

      // Send appearance change to client
      fetchNui('character-create:update-appearance', {
        category,
        key,
        value,
      }).catch((error: any) => {
        console.error('[UI] Failed to update appearance:', error);
      });
    },
    []
  );

  // Handle clothing change
  const handleClothingChange = useCallback(
    (key: keyof ClothingData, value: number) => {
      setCharacterData((prev) => ({
        ...prev,
        clothing: {
          ...prev.clothing,
          [key]: value,
        },
      }));

      // Send clothing change to client
      fetchNui('character-create:update-clothing', { key, value }).catch(
        (error: any) => {
          console.error('[UI] Failed to update clothing:', error);
        }
      );
    },
    []
  );

  // Handle save character
  const handleSaveCharacter = useCallback(async () => {
    try {
      await fetchNui('character-create:toggle-ui', {
        save: true,
        characterData,
      });
    } catch (error: any) {
      console.error('[UI] Failed to save character:', error);
    }
  }, [characterData]);

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
    characterData,
    activeTab,
    activeFocus,
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
