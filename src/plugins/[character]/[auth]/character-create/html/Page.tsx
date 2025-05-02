import { useEffect, useState } from 'react';
import { useNuiEvent } from '../../../../../webview/hooks/useNuiEvent';
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
  DraggableArea,
  ClothingVariationsSection,
} from './components';
import { TabButton } from './components/common';
import { NUI_EVENT } from '../shared/types';
import {
  CharacterDataProvider,
  useCharacterData,
} from './context/CharacterDataContext';

// Main content component that uses the context
function CharacterCreationContent() {
  const [isOpen, setIsOpen] = useState(isEnvBrowser());

  // Get all data and functions from context
  const { activeTab, setActiveTab, handleCloseUi, setActiveFocus } =
    useCharacterData();

  // Listen for toggle events from the client script
  useNuiEvent(NUI_EVENT, (data: any) => {
    setIsOpen(data?.data);
  });

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

  const handleSetActiveTab = (tab: string) => {
    if (tab === activeTab) return;
    switch (tab) {
      case 'face':
        setActiveFocus('head');
        break;
      case 'hair':
        setActiveFocus('head');
        break;
      case 'appearance':
        setActiveFocus('body');
        break;
      case 'clothing':
        setActiveFocus('body');
        break;
      default:
        break;
    }

    setActiveTab(tab as any);
  };

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
          <ModelPicker />
          {/* Tabs */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            <TabButton
              tab="face"
              activeTab={activeTab}
              label="Face"
              icon={<FaFaceSmile />}
              onClick={handleSetActiveTab}
            />
            <TabButton
              tab="hair"
              activeTab={activeTab}
              label="Hair"
              icon={<FaScissors />}
              onClick={handleSetActiveTab}
            />
            <TabButton
              tab="appearance"
              activeTab={activeTab}
              label="Appearance"
              icon={<MdOutlineColorLens />}
              onClick={handleSetActiveTab}
            />
            <TabButton
              tab="clothing"
              activeTab={activeTab}
              label="Clothing"
              icon={<GiClothes />}
              onClick={handleSetActiveTab}
            />
          </div>
        </div>
        {/* Right content - Tab content */}
        <div className="flex-1 p-4 min-h-0 flex flex-col text-responsive-base">
          {activeTab === 'face' && <FaceTab />}
          {activeTab === 'hair' && <HairTab />}
          {activeTab === 'appearance' && <AppearanceTab />}
          {activeTab === 'clothing' && <ClothingTab />}
        </div>
      </div>

      {/* Camera controls panel */}
      <div className="w-[220px] h-full max-h-full overflow-hidden flex flex-col gap-2">
        <div className="glass-brand-dark p-2 border-t border-brand-700 mb-auto rounded-b-lg">
          <CameraControls />
        </div>
        {activeTab === 'clothing' && (
          <div className="h-full w-full max-h-[calc(100vh-300px)] overflow-y-auto overflow-x-hidden">
            <ClothingVariationsSection />
          </div>
        )}
      </div>

      {/* Draggable area for character rotation and zoom */}
      <div className="flex-1 flex items-center justify-center">
        <DraggableArea className="w-full h-[70vh] glass-dark/30 rounded-lg" />
      </div>
    </div>
  ) : null;
}

// Wrap the main component with the provider
export default function Page() {
  return (
    <CharacterDataProvider>
      <CharacterCreationContent />
    </CharacterDataProvider>
  );
}
