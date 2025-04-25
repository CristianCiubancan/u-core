import { useCallback, useEffect, useState } from 'react';
import { useNuiEvent } from '../../../../../webview/hooks/useNuiEvent';
import { fetchNui } from '../../../../../utils/fetchNui';
import { isEnvBrowser } from '../../../../../utils/misc';

// Constants
const NUI_EVENT = 'character-create:toggle-ui';

// Character model options
const MODELS = [
  { id: 'mp_m_freemode_01', label: 'Male' },
  { id: 'mp_f_freemode_01', label: 'Female' },
];

// Define types for character data
interface AppearanceOverlay {
  style: number;
  color?: number;
  opacity: number;
}

interface AppearanceData {
  eyebrows: AppearanceOverlay;
  beard: AppearanceOverlay;
  eyeColor: number;
  blemishes: AppearanceOverlay;
  ageing: AppearanceOverlay;
  complexion: AppearanceOverlay;
  moles: AppearanceOverlay;
  sunDamage: AppearanceOverlay;
  makeUp: AppearanceOverlay;
  lipstick: AppearanceOverlay;
  [key: string]: AppearanceOverlay | number;
}

interface CharacterData {
  model: string;
  face: {
    fatherIndex: number;
    motherIndex: number;
    shapeMix: number;
    skinMix: number;
  };
  hair: {
    style: number;
    color: number;
    highlight: number;
  };
  appearance: AppearanceData;
  clothing: {
    torso: number;
    torsoTexture: number;
    legs: number;
    legsTexture: number;
    shoes: number;
    shoesTexture: number;
    accessories: number;
    accessoriesTexture: number;
    undershirt: number;
    undershirtTexture: number;
    tops: number;
    topsTexture: number;
  };
}

// Default character data
const DEFAULT_CHARACTER: CharacterData = {
  model: 'mp_m_freemode_01',
  face: {
    fatherIndex: 0,
    motherIndex: 0,
    shapeMix: 0.5,
    skinMix: 0.5,
  },
  hair: {
    style: 0,
    color: 0,
    highlight: 0,
  },
  appearance: {
    eyebrows: { style: 0, color: 0, opacity: 1.0 },
    beard: { style: 0, color: 0, opacity: 1.0 },
    eyeColor: 0,
    blemishes: { style: 0, opacity: 0.0 },
    ageing: { style: 0, opacity: 0.0 },
    complexion: { style: 0, opacity: 0.0 },
    moles: { style: 0, opacity: 0.0 },
    sunDamage: { style: 0, opacity: 0.0 },
    makeUp: { style: 0, color: 0, opacity: 0.0 },
    lipstick: { style: 0, color: 0, opacity: 0.0 },
  },
  clothing: {
    torso: 0,
    torsoTexture: 0,
    legs: 0,
    legsTexture: 0,
    shoes: 0,
    shoesTexture: 0,
    accessories: 0,
    accessoriesTexture: 0,
    undershirt: 0,
    undershirtTexture: 0,
    tops: 0,
    topsTexture: 0,
  },
};

export default function Page() {
  const [isOpen, setIsOpen] = useState(isEnvBrowser());
  const [activeTab, setActiveTab] = useState('model');
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
    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-900 text-white rounded-lg shadow-lg w-full max-w-4xl overflow-hidden">
        {/* Header */}
        <div className="bg-blue-900 p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Character Creation</h1>
          <div>
            <button
              onClick={handleSaveCharacter}
              disabled={isSaving}
              className="bg-green-600 text-white py-2 px-4 rounded mr-2 hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save & Continue'}
            </button>
            <button
              onClick={handleCloseUi}
              className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[600px]">
          {/* Left sidebar - Tabs */}
          <div className="w-48 bg-gray-800 p-4">
            <nav className="space-y-2">
              <button
                className={`w-full text-left p-2 rounded ${
                  activeTab === 'model' ? 'bg-blue-700' : 'hover:bg-gray-700'
                }`}
                onClick={() => setActiveTab('model')}
              >
                Character Model
              </button>
              <button
                className={`w-full text-left p-2 rounded ${
                  activeTab === 'face' ? 'bg-blue-700' : 'hover:bg-gray-700'
                }`}
                onClick={() => setActiveTab('face')}
              >
                Face
              </button>
              <button
                className={`w-full text-left p-2 rounded ${
                  activeTab === 'hair' ? 'bg-blue-700' : 'hover:bg-gray-700'
                }`}
                onClick={() => setActiveTab('hair')}
              >
                Hair
              </button>
              <button
                className={`w-full text-left p-2 rounded ${
                  activeTab === 'appearance'
                    ? 'bg-blue-700'
                    : 'hover:bg-gray-700'
                }`}
                onClick={() => setActiveTab('appearance')}
              >
                Appearance
              </button>
              <button
                className={`w-full text-left p-2 rounded ${
                  activeTab === 'clothing' ? 'bg-blue-700' : 'hover:bg-gray-700'
                }`}
                onClick={() => setActiveTab('clothing')}
              >
                Clothing
              </button>
            </nav>

            {/* Camera controls */}
            <div className="mt-8">
              <h3 className="font-bold mb-2">Camera Controls</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleRotateCamera('left')}
                  className="bg-gray-700 p-2 rounded hover:bg-gray-600"
                >
                  ← Rotate
                </button>
                <button
                  onClick={() => handleRotateCamera('right')}
                  className="bg-gray-700 p-2 rounded hover:bg-gray-600"
                >
                  Rotate →
                </button>
                <button
                  onClick={() => handleZoomCamera('in')}
                  className="bg-gray-700 p-2 rounded hover:bg-gray-600"
                >
                  Zoom In
                </button>
                <button
                  onClick={() => handleZoomCamera('out')}
                  className="bg-gray-700 p-2 rounded hover:bg-gray-600"
                >
                  Zoom Out
                </button>
              </div>

              <h3 className="font-bold mt-4 mb-2">Focus</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleFocusCamera('head')}
                  className="bg-gray-700 p-2 rounded hover:bg-gray-600"
                >
                  Head
                </button>
                <button
                  onClick={() => handleFocusCamera('body')}
                  className="bg-gray-700 p-2 rounded hover:bg-gray-600"
                >
                  Body
                </button>
                <button
                  onClick={() => handleFocusCamera('legs')}
                  className="bg-gray-700 p-2 rounded hover:bg-gray-600"
                >
                  Legs
                </button>
              </div>
            </div>
          </div>

          {/* Right content - Tab content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Model Tab */}
            {activeTab === 'model' && (
              <div>
                <h2 className="text-xl font-bold mb-4">
                  Select Character Model
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {MODELS.map((model) => (
                    <button
                      key={model.id}
                      className={`p-4 rounded ${
                        characterData.model === model.id
                          ? 'bg-blue-700'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                      onClick={() => handleModelChange(model.id)}
                    >
                      {model.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Face Tab */}
            {activeTab === 'face' && (
              <div>
                <h2 className="text-xl font-bold mb-4">Face Customization</h2>

                <div className="mb-4">
                  <label className="block mb-2">Father</label>
                  <input
                    type="range"
                    min="0"
                    max="45"
                    value={characterData.face.fatherIndex}
                    onChange={(e) =>
                      handleFaceChange('fatherIndex', parseInt(e.target.value))
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs">
                    <span>0</span>
                    <span>45</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block mb-2">Mother</label>
                  <input
                    type="range"
                    min="0"
                    max="45"
                    value={characterData.face.motherIndex}
                    onChange={(e) =>
                      handleFaceChange('motherIndex', parseInt(e.target.value))
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs">
                    <span>0</span>
                    <span>45</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block mb-2">
                    Shape Mix (Father - Mother)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={characterData.face.shapeMix}
                    onChange={(e) =>
                      handleFaceChange('shapeMix', parseFloat(e.target.value))
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs">
                    <span>Father</span>
                    <span>Mother</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block mb-2">
                    Skin Mix (Father - Mother)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={characterData.face.skinMix}
                    onChange={(e) =>
                      handleFaceChange('skinMix', parseFloat(e.target.value))
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs">
                    <span>Father</span>
                    <span>Mother</span>
                  </div>
                </div>
              </div>
            )}

            {/* Hair Tab */}
            {activeTab === 'hair' && (
              <div>
                <h2 className="text-xl font-bold mb-4">Hair Customization</h2>

                <div className="mb-4">
                  <label className="block mb-2">Hair Style</label>
                  <input
                    type="range"
                    min="0"
                    max="73"
                    value={characterData.hair.style}
                    onChange={(e) =>
                      handleHairChange('style', parseInt(e.target.value))
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between">
                    <span>Style: {characterData.hair.style}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block mb-2">Hair Color</label>
                  <input
                    type="range"
                    min="0"
                    max="63"
                    value={characterData.hair.color}
                    onChange={(e) =>
                      handleHairChange('color', parseInt(e.target.value))
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between">
                    <span>Color: {characterData.hair.color}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block mb-2">Hair Highlight</label>
                  <input
                    type="range"
                    min="0"
                    max="63"
                    value={characterData.hair.highlight}
                    onChange={(e) =>
                      handleHairChange('highlight', parseInt(e.target.value))
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between">
                    <span>Highlight: {characterData.hair.highlight}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div>
                <h2 className="text-xl font-bold mb-4">
                  Appearance Customization
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div className="mb-4">
                    <label className="block mb-2">Eyebrows Style</label>
                    <input
                      type="range"
                      min="0"
                      max="33"
                      value={characterData.appearance.eyebrows.style}
                      onChange={(e) =>
                        handleAppearanceChange(
                          'eyebrows',
                          'style',
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between">
                      <span>
                        Style: {characterData.appearance.eyebrows.style}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block mb-2">Eyebrows Color</label>
                    <input
                      type="range"
                      min="0"
                      max="63"
                      value={characterData.appearance.eyebrows.color}
                      onChange={(e) =>
                        handleAppearanceChange(
                          'eyebrows',
                          'color',
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between">
                      <span>
                        Color: {characterData.appearance.eyebrows.color}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block mb-2">Beard Style</label>
                    <input
                      type="range"
                      min="0"
                      max="28"
                      value={characterData.appearance.beard.style}
                      onChange={(e) =>
                        handleAppearanceChange(
                          'beard',
                          'style',
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between">
                      <span>Style: {characterData.appearance.beard.style}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block mb-2">Beard Color</label>
                    <input
                      type="range"
                      min="0"
                      max="63"
                      value={characterData.appearance.beard.color}
                      onChange={(e) =>
                        handleAppearanceChange(
                          'beard',
                          'color',
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between">
                      <span>Color: {characterData.appearance.beard.color}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block mb-2">Eye Color</label>
                    <input
                      type="range"
                      min="0"
                      max="31"
                      value={characterData.appearance.eyeColor}
                      onChange={(e) =>
                        setCharacterData((prev) => ({
                          ...prev,
                          appearance: {
                            ...prev.appearance,
                            eyeColor: parseInt(e.target.value),
                          },
                        }))
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between">
                      <span>Color: {characterData.appearance.eyeColor}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Clothing Tab */}
            {activeTab === 'clothing' && (
              <div>
                <h2 className="text-xl font-bold mb-4">
                  Clothing Customization
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div className="mb-4">
                    <label className="block mb-2">Tops</label>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={characterData.clothing.tops}
                      onChange={(e) =>
                        handleClothingChange('tops', parseInt(e.target.value))
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between">
                      <span>Style: {characterData.clothing.tops}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block mb-2">Tops Texture</label>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      value={characterData.clothing.topsTexture}
                      onChange={(e) =>
                        handleClothingChange(
                          'topsTexture',
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between">
                      <span>Texture: {characterData.clothing.topsTexture}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block mb-2">Undershirt</label>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={characterData.clothing.undershirt}
                      onChange={(e) =>
                        handleClothingChange(
                          'undershirt',
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between">
                      <span>Style: {characterData.clothing.undershirt}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block mb-2">Undershirt Texture</label>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      value={characterData.clothing.undershirtTexture}
                      onChange={(e) =>
                        handleClothingChange(
                          'undershirtTexture',
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between">
                      <span>
                        Texture: {characterData.clothing.undershirtTexture}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block mb-2">Legs</label>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={characterData.clothing.legs}
                      onChange={(e) =>
                        handleClothingChange('legs', parseInt(e.target.value))
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between">
                      <span>Style: {characterData.clothing.legs}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block mb-2">Legs Texture</label>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      value={characterData.clothing.legsTexture}
                      onChange={(e) =>
                        handleClothingChange(
                          'legsTexture',
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between">
                      <span>Texture: {characterData.clothing.legsTexture}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block mb-2">Shoes</label>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={characterData.clothing.shoes}
                      onChange={(e) =>
                        handleClothingChange('shoes', parseInt(e.target.value))
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between">
                      <span>Style: {characterData.clothing.shoes}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block mb-2">Shoes Texture</label>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      value={characterData.clothing.shoesTexture}
                      onChange={(e) =>
                        handleClothingChange(
                          'shoesTexture',
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between">
                      <span>
                        Texture: {characterData.clothing.shoesTexture}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  ) : null;
}
