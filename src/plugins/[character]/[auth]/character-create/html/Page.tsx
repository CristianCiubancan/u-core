import { useCallback, useEffect, useState } from 'react';
import { useNuiEvent } from '../../../../../webview/hooks/useNuiEvent';
import { fetchNui } from '../../../../../webview/utils/fetchNui';
import { isEnvBrowser } from '../../../../../webview/utils/misc';
import { FaFaceSmile } from 'react-icons/fa6';
import { FaScissors } from 'react-icons/fa6';
import { MdOutlineColorLens } from 'react-icons/md';
import { GiClothes } from 'react-icons/gi';
import {
  FaceTab,
  HairTab,
  AppearanceTab,
  ClothingTab,
  CameraControls,
  ModelPicker,
} from './components';
import { TabButton } from './components/common';
import {
  CharacterData,
  DEFAULT_CHARACTER,
  NUI_EVENT,
  TabType,
  AppearanceOverlay,
  CameraFocus,
} from '../shared/types';

export default function Page() {
  const [isOpen, setIsOpen] = useState(isEnvBrowser());
  const [activeTab, setActiveTab] = useState<TabType>('face');
  const [activeFocus, setActiveFocus] = useState<CameraFocus>('body');
  const [characterData, setCharacterData] =
    useState<CharacterData>(DEFAULT_CHARACTER);

  // Listen for toggle events from the client script
  useNuiEvent(NUI_EVENT, (data: any) => {
    setIsOpen(!!data);
  });

  // Handle close button click
  const handleCloseUi = useCallback(async () => {
    try {
      await fetchNui(NUI_EVENT, { close: true });
      setIsOpen(false);
    } catch (error: any) {
      console.error('[UI] Failed to close UI:', error);
    }
  }, []);

  // Handle model change
  const handleModelChange = useCallback((modelId: string) => {
    setCharacterData((prev) => ({
      ...prev,
      model: modelId,
    }));

    // Send model change to client
    fetchNui('character-create:update-model', { model: modelId }).catch(
      (error: any) => {
        console.error('[UI] Failed to update model:', error);
      }
    );
  }, []);

  // Handle face change
  const handleFaceChange = useCallback((key: string, value: number) => {
    setCharacterData((prev) => ({
      ...prev,
      face: {
        ...prev.face,
        [key]: value,
      },
    }));

    // Send face change to client
    fetchNui('character-create:update-face', {
      key,
      value,
    }).catch((error: any) => {
      console.error('[UI] Failed to update face:', error);
    });
  }, []);

  // Handle hair change
  const handleHairChange = useCallback((key: string, value: number) => {
    setCharacterData((prev) => ({
      ...prev,
      hair: {
        ...prev.hair,
        [key]: value,
      },
    }));

    // Send hair change to client
    fetchNui('character-create:update-hair', {
      key,
      value,
    }).catch((error: any) => {
      console.error('[UI] Failed to update hair:', error);
    });
  }, []);

  // Handle appearance change
  const handleAppearanceChange = useCallback(
    (category: string, key: string, value: number) => {
      setCharacterData((prev) => {
        // Get the current category data
        const categoryData = prev.appearance[category] as AppearanceOverlay;

        if (!categoryData) {
          console.error(`Category ${category} not found in appearance data`);
          return prev;
        }

        return {
          ...prev,
          appearance: {
            ...prev.appearance,
            [category]: {
              ...categoryData,
              [key]: value,
            },
          },
        };
      });

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

  // Handle eye color change
  const handleEyeColorChange = useCallback((value: number) => {
    setCharacterData((prev) => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        eyeColor: value,
      },
    }));

    // Send eye color change to client
    fetchNui('character-create:update-appearance', {
      category: 'eyeColor',
      value,
    }).catch((error: any) => {
      console.error('[UI] Failed to update eye color:', error);
    });
  }, []);

  // Handle clothing change
  const handleClothingChange = useCallback((key: string, value: number) => {
    setCharacterData((prev) => ({
      ...prev,
      clothing: {
        ...prev.clothing,
        [key]: value,
      },
    }));

    // Send clothing change to client
    fetchNui('character-create:update-clothing', {
      key,
      value,
    }).catch((error: any) => {
      console.error('[UI] Failed to update clothing:', error);
    });
  }, []);

  // Handle camera rotation
  const handleRotateCamera = useCallback((direction: 'left' | 'right') => {
    fetchNui('character-create:rotate-camera', { direction }).catch(
      (error: any) => {
        console.error('[UI] Failed to rotate camera:', error);
      }
    );
  }, []);

  // Handle camera zoom
  const handleZoomCamera = useCallback((direction: 'in' | 'out') => {
    fetchNui('character-create:zoom-camera', { direction }).catch(
      (error: any) => {
        console.error('[UI] Failed to zoom camera:', error);
      }
    );
  }, []);

  // Handle camera focus
  const handleFocusCamera = useCallback(
    (focus: CameraFocus) => {
      setActiveFocus(focus);
      fetchNui('character-create:focus-camera', { focus }).catch(
        (error: any) => {
          console.error('[UI] Failed to focus camera:', error);
        }
      );
    },
    [setActiveFocus]
  );

  // Handle player rotation
  const handleRotatePlayer = useCallback((direction: 'left' | 'right') => {
    fetchNui('character-create:rotate-player', { direction }).catch(
      (error: any) => {
        console.error('[UI] Failed to rotate player:', error);
      }
    );
  }, []);

  useEffect(() => {
    // listen for F3 key press
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F3') {
        handleCloseUi();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCloseUi]);

  // Render UI
  return isOpen ? (
    <div className="flex p-6 gap-4 h-screen max-h-screen">
      <div className="flex flex-col w-[40vw] glass-dark text-on-dark rounded-lg shadow-lg overflow-hidden">
        {/* Main container */}
        {/* Left sidebar - Tabs */}
        <div className="border-b border-brand-800 flex flex-col p-4 flex-shrink-0">
          {/* Sidebar container */}
          <div className="text-center text-xl font-bold text-white text-shadow mb-4">
            Character Creation
          </div>
          <ModelPicker
            currentModel={characterData.model}
            onModelChange={handleModelChange}
          />
          {/* Tabs */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            <TabButton
              tab="face"
              activeTab={activeTab}
              label="Face"
              icon={<FaFaceSmile />}
              onClick={setActiveTab}
            />
            <TabButton
              tab="hair"
              activeTab={activeTab}
              label="Hair"
              icon={<FaScissors />}
              onClick={setActiveTab}
            />
            <TabButton
              tab="appearance"
              activeTab={activeTab}
              label="Appearance"
              icon={<MdOutlineColorLens />}
              onClick={setActiveTab}
            />
            <TabButton
              tab="clothing"
              activeTab={activeTab}
              label="Clothing"
              icon={<GiClothes />}
              onClick={setActiveTab}
            />
          </div>
        </div>
        {/* Right content - Tab content */}
        <div className="flex-1 p-4 min-h-0 flex flex-col text-responsive-base">
          {activeTab === 'face' && (
            <FaceTab
              faceData={characterData.face}
              onFaceChange={handleFaceChange}
            />
          )}
          {activeTab === 'hair' && (
            <HairTab
              hairData={characterData.hair}
              onHairChange={handleHairChange}
            />
          )}
          {activeTab === 'appearance' && (
            <AppearanceTab
              appearanceData={characterData.appearance}
              onAppearanceChange={handleAppearanceChange}
              onEyeColorChange={handleEyeColorChange}
            />
          )}
          {activeTab === 'clothing' && (
            <ClothingTab
              clothingData={characterData.clothing}
              onClothingChange={handleClothingChange}
              model={characterData.model}
            />
          )}
        </div>
      </div>
      <div className="glass-brand-dark p-2 border-t border-brand-700 mb-auto rounded-b-lg">
        {/* Camera controls in vertical layout */}
        <CameraControls
          onRotate={handleRotateCamera}
          onZoom={handleZoomCamera}
          onFocus={handleFocusCamera}
          onRotatePlayer={handleRotatePlayer}
          activeFocus={activeFocus}
        />
      </div>
    </div>
  ) : null;
}
