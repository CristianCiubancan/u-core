import { FaTshirt } from 'react-icons/fa';
import {
  GiArmoredPants,
  GiClothes,
  GiNecklace,
  GiRunningShoe,
  GiTShirt,
} from 'react-icons/gi';
import {
  ClothingCategory,
  getMaxItemsForComponent,
} from '../../../utils/getClothingImage';

// Define the clothing categories with icons
export const createClothingCategories = (model: string): ClothingCategory[] => [
  {
    id: 'tops',
    label: 'Tops',
    componentId: 11,
    maxItems: getMaxItemsForComponent(model, 11),
    icon: <GiTShirt />,
  },
  {
    id: 'undershirt',
    label: 'Undershirt',
    componentId: 8,
    maxItems: getMaxItemsForComponent(model, 8),
    icon: <FaTshirt />,
  },
  {
    id: 'legs',
    label: 'Legs',
    componentId: 4,
    maxItems: getMaxItemsForComponent(model, 4),
    icon: <GiArmoredPants />,
  },
  {
    id: 'shoes',
    label: 'Shoes',
    componentId: 6,
    maxItems: getMaxItemsForComponent(model, 6),
    icon: <GiRunningShoe />,
  },
  {
    id: 'accessories',
    label: 'Accessories',
    componentId: 7,
    maxItems: getMaxItemsForComponent(model, 7),
    icon: <GiNecklace />,
  },
  {
    id: 'torso',
    label: 'Torso',
    componentId: 3,
    maxItems: getMaxItemsForComponent(model, 3),
    icon: <GiClothes />,
  },
];
