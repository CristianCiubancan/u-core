import React, { useState, useEffect, ReactNode } from 'react';
import { CharacterData } from '../../../shared/types';
import { IconWrapper, TabLayout } from '../common';
import Button from '../../../../../../../webview/components/ui/Button';
import {
  GiClothes,
  GiTShirt,
  GiArmoredPants,
  GiRunningShoe,
  GiNecklace,
} from 'react-icons/gi';
import { FaTshirt } from 'react-icons/fa';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import {
  getClothingImage,
  getClothingImageFallback,
} from '../../utils/getClothingImage';

// Custom clothing category button component
interface ClothingCategoryButtonProps {
  id: string;
  activeCategory: string;
  label: string;
  icon: ReactNode;
  onClick: (id: string) => void;
}

const ClothingCategoryButton: React.FC<ClothingCategoryButtonProps> = ({
  id,
  activeCategory,
  label,
  icon,
  onClick,
}) => {
  return (
    <Button
      onClick={() => onClick(id)}
      fullWidth
      className={`${
        activeCategory === id ? 'glass-brand' : 'glass-brand-dark'
      } flex flex-col items-center justify-center py-2`}
    >
      <IconWrapper className="mb-1" size="1.5em">
        {icon}
      </IconWrapper>
      <span className="text-xs">{label}</span>
    </Button>
  );
};

interface ClothingTabProps {
  clothingData: CharacterData['clothing'];
  onClothingChange: (key: string, value: number) => void;
  model: string;
}

// Define the clothing categories with icons
const CLOTHING_CATEGORIES = [
  {
    id: 'tops',
    label: 'Tops',
    componentId: 11,
    maxItems: 20,
    maxTextures: 5,
    icon: <GiTShirt />,
  },
  {
    id: 'undershirt',
    label: 'Undershirt',
    componentId: 8,
    maxItems: 20,
    maxTextures: 5,
    icon: <FaTshirt />,
  },
  {
    id: 'legs',
    label: 'Legs',
    componentId: 4,
    maxItems: 20,
    maxTextures: 5,
    icon: <GiArmoredPants />,
  },
  {
    id: 'shoes',
    label: 'Shoes',
    componentId: 6,
    maxItems: 20,
    maxTextures: 5,
    icon: <GiRunningShoe />,
  },
  {
    id: 'accessories',
    label: 'Accessories',
    componentId: 7,
    maxItems: 20,
    maxTextures: 5,
    icon: <GiNecklace />,
  },
  {
    id: 'torso',
    label: 'Torso',
    componentId: 3,
    maxItems: 20,
    maxTextures: 5,
    icon: <GiClothes />,
  },
];

// ClothingItem component for the grid
interface ClothingItemProps {
  model: string;
  componentId: number;
  drawableId: number;
  textureId: number;
  isSelected: boolean;
  onClick: () => void;
}

const ClothingItem: React.FC<ClothingItemProps> = ({
  model,
  componentId,
  drawableId,
  textureId,
  isSelected,
  onClick,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imagePath, setImagePath] = useState('');

  useEffect(() => {
    // Use medium quality for better previews
    const quality = 'medium';

    // Get the image path from the asset server
    const path = getClothingImage(
      model,
      componentId,
      drawableId,
      textureId,
      quality
    );
    setImagePath(path);

    // Preload the image
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.onerror = () => {
      // Try fallback without texture
      const fallbackPath = getClothingImageFallback(
        model,
        componentId,
        drawableId,
        quality
      );
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        setImageLoaded(true);
        setImagePath(fallbackPath);
      };
      fallbackImg.onerror = () => setImageLoaded(false);
      fallbackImg.src = fallbackPath;
    };
    img.src = path;
  }, [model, componentId, drawableId, textureId]);

  return (
    <div
      className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'ring-2 ring-brand-500 scale-105 glass-brand-dark'
          : 'hover:scale-105 glass-dark'
      }`}
      onClick={onClick}
    >
      {imageLoaded ? (
        <img
          src={imagePath}
          alt={`Clothing item ${drawableId}`}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs text-center">
          {drawableId}
        </div>
      )}
    </div>
  );
};

// Texture Navigation component
interface TextureNavigationProps {
  currentTexture: number;
  maxTextures: number;
  onPrevious: () => void;
  onNext: () => void;
}

const TextureNavigation: React.FC<TextureNavigationProps> = ({
  currentTexture,
  maxTextures,
  onPrevious,
  onNext,
}) => {
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={onPrevious}
        className="p-1 rounded-full glass-dark hover:glass-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-500"
        aria-label="Previous texture"
      >
        <IconWrapper>
          <FaChevronLeft className="text-brand-300" />
        </IconWrapper>
      </button>
      <span className="text-xs text-gray-300">
        {currentTexture + 1}/{maxTextures}
      </span>
      <button
        onClick={onNext}
        className="p-1 rounded-full glass-dark hover:glass-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-500"
        aria-label="Next texture"
      >
        <IconWrapper>
          <FaChevronRight className="text-brand-300" />
        </IconWrapper>
      </button>
    </div>
  );
};

// ClothingGrid component for each category
interface ClothingGridProps {
  category: (typeof CLOTHING_CATEGORIES)[0];
  model: string;
  selectedDrawable: number;
  selectedTexture: number;
  onSelectDrawable: (value: number) => void;
  onSelectTexture: (value: number) => void;
}

const ClothingGrid: React.FC<ClothingGridProps> = ({
  category,
  model,
  selectedDrawable,
  selectedTexture,
  onSelectDrawable,
  onSelectTexture,
}) => {
  // Generate a range of drawable IDs for the grid
  const drawableIds = Array.from({ length: category.maxItems }, (_, i) => i);

  // Handle texture navigation
  const handlePreviousTexture = () => {
    const newTexture =
      selectedTexture <= 0 ? category.maxTextures - 1 : selectedTexture - 1;
    onSelectTexture(newTexture);
  };

  const handleNextTexture = () => {
    const newTexture =
      selectedTexture >= category.maxTextures - 1 ? 0 : selectedTexture + 1;
    onSelectTexture(newTexture);
  };

  return (
    <div className="mb-6 h-full max-h-full overflow-hidden">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center">
          <h4 className="text-sm font-medium mr-4">Styles</h4>
          <TextureNavigation
            currentTexture={selectedTexture}
            maxTextures={category.maxTextures}
            onPrevious={handlePreviousTexture}
            onNext={handleNextTexture}
          />
        </div>
        <span className="text-xs text-gray-400">
          Selected: {selectedDrawable}
        </span>
      </div>
      {/* Styles section with texture navigation */}
      <div className="mb-4 h-full overflow-auto">
        {/* Clothing grid with larger items and fewer columns for better visibility */}
        <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {drawableIds.map((drawableId) => (
            <ClothingItem
              key={`${category.id}-${drawableId}`}
              model={model}
              componentId={category.componentId}
              drawableId={drawableId}
              textureId={selectedTexture}
              isSelected={selectedDrawable === drawableId}
              onClick={() => onSelectDrawable(drawableId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export const ClothingTab: React.FC<ClothingTabProps> = ({
  clothingData,
  onClothingChange,
  model,
}) => {
  // State to track which clothing category is currently active
  const [activeCategory, setActiveCategory] = useState<string>('tops');

  // Function to handle clicking on a clothing category
  const handleCategorySelect = (categoryId: string) => {
    setActiveCategory(categoryId);
  };

  // Get the drawable ID and texture ID for the currently selected category
  const getDrawableAndTexture = () => {
    switch (activeCategory) {
      case 'tops':
        return {
          drawableId: clothingData.tops,
          textureId: clothingData.topsTexture,
        };
      case 'undershirt':
        return {
          drawableId: clothingData.undershirt,
          textureId: clothingData.undershirtTexture,
        };
      case 'legs':
        return {
          drawableId: clothingData.legs,
          textureId: clothingData.legsTexture,
        };
      case 'shoes':
        return {
          drawableId: clothingData.shoes,
          textureId: clothingData.shoesTexture,
        };
      case 'accessories':
        return {
          drawableId: clothingData.accessories,
          textureId: clothingData.accessoriesTexture,
        };
      case 'torso':
        return {
          drawableId: clothingData.torso,
          textureId: clothingData.torsoTexture,
        };
      default:
        return {
          drawableId: clothingData.tops,
          textureId: clothingData.topsTexture,
        };
    }
  };

  const { drawableId, textureId } = getDrawableAndTexture();

  // Handle drawable selection
  const handleDrawableSelect = (value: number) => {
    const key = activeCategory;
    onClothingChange(key, value);
  };

  // Handle texture selection
  const handleTextureSelect = (value: number) => {
    const key = `${activeCategory}Texture`;
    onClothingChange(key, value);
  };

  // Find the current active category object
  const currentCategory =
    CLOTHING_CATEGORIES.find((cat) => cat.id === activeCategory) ||
    CLOTHING_CATEGORIES[0];

  return (
    <TabLayout title="Clothing Customization">
      <div className="flex flex-col gap-4">
        {/* Category selection - horizontal tabs */}
        <div className="grid grid-cols-6 gap-2 pb-3 border-b border-brand-800/30 mb-3">
          {CLOTHING_CATEGORIES.map((category) => (
            <ClothingCategoryButton
              key={category.id}
              id={category.id}
              activeCategory={activeCategory}
              label={category.label}
              icon={category.icon}
              onClick={handleCategorySelect}
            />
          ))}
        </div>

        {/* Clothing grid - full width */}
        <div className="w-full overflow-y-auto max-h-[500px]">
          <ClothingGrid
            category={currentCategory}
            model={model}
            selectedDrawable={drawableId}
            selectedTexture={textureId}
            onSelectDrawable={handleDrawableSelect}
            onSelectTexture={handleTextureSelect}
          />
        </div>
      </div>
    </TabLayout>
  );
};
