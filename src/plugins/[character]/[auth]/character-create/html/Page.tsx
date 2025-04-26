import { useCallback, useEffect, useState } from 'react';
import { useNuiEvent } from '../../../../../webview/hooks/useNuiEvent';
import { fetchNui } from '../../../../../webview/utils/fetchNui';
import { isEnvBrowser } from '../../../../../webview/utils/misc';
import {
  Layout,
  TabNavigation,
  Button,
} from '../../../../../webview/components';
import {
  ModelTab,
  FaceTab,
  HairTab,
  AppearanceTab,
  ClothingTab,
  CameraControls,
} from './components';
import {
  CharacterData,
  DEFAULT_CHARACTER,
  NUI_EVENT,
  TabType,
  AppearanceOverlay,
} from './types';

export default function Page() {
  const [isOpen, setIsOpen] = useState(isEnvBrowser());
  const [activeTab, setActiveTab] = useState<TabType>('model');
  const [characterData, setCharacterData] =
    useState<CharacterData>(DEFAULT_CHARACTER);
  const [isSaving, setIsSaving] = useState(false);

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

  // Handle save button click
  const handleSaveCharacter = useCallback(async () => {
    try {
      setIsSaving(true);
      await fetchNui(NUI_EVENT, { save: true, characterData });
      setIsSaving(false);
      handleCloseUi();
    } catch (error: any) {
      console.error('[UI] Failed to save character:', error);
      setIsSaving(false);
    }
  }, [characterData, handleCloseUi]);

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
  const handleFocusCamera = useCallback((focus: 'head' | 'body' | 'legs') => {
    fetchNui('character-create:focus-camera', { focus }).catch((error: any) => {
      console.error('[UI] Failed to focus camera:', error);
    });
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
    <Layout
      title="Character Creation"
      onSave={handleSaveCharacter}
      onClose={handleCloseUi}
      position="left"
      isSaving={isSaving}
      saveButtonText="Save"
      cancelButtonText="Cancel"
      headerContent={
        <div className="flex space-x-2">
          <Button
            variant="success"
            onClick={handleSaveCharacter}
            disabled={isSaving}
            size="sm"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button variant="danger" onClick={handleCloseUi} size="sm">
            Cancel
          </Button>
        </div>
      }
      footerContent={
        <div className="glass-brand-dark p-2 border-t border-brand-700">
          <CameraControls
            onRotate={handleRotateCamera}
            onZoom={handleZoomCamera}
            onFocus={handleFocusCamera}
          />
        </div>
      }
    >
      <div className="flex h-full">
        {/* Left sidebar - Tabs */}
        <TabNavigation
          tabs={[
            { id: 'model', label: 'Character Model' },
            { id: 'face', label: 'Face' },
            { id: 'hair', label: 'Hair' },
            { id: 'appearance', label: 'Appearance' },
            { id: 'clothing', label: 'Clothing' },
          ]}
          activeTab={activeTab}
          onTabChange={(tabId: string) => setActiveTab(tabId as TabType)}
          orientation="vertical"
          className="w-[30%] min-w-[140px] max-w-[200px] border-r border-brand-800"
        />

        {/* Right content - Tab content */}
        <div className="flex-1 p-4 overflow-y-auto text-readable text-responsive-base">
          {activeTab === 'model' && (
            <ModelTab
              currentModel={characterData.model}
              onModelChange={handleModelChange}
            />
          )}

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
    </Layout>
  ) : null;
}
