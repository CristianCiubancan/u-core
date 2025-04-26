# Clothing Images Directory

This directory contains clothing preview images for the character creation interface.

## Image Naming Convention

Images should follow this naming pattern:
- `[gender]_[componentId]_[drawableId]_[textureId].png`

Where:
- `gender` is either "male" or "female"
- `componentId` is the FiveM clothing component ID (e.g., 11 for tops, 4 for legs)
- `drawableId` is the drawable variation ID
- `textureId` is the texture variation ID

Example: `male_11_0_0.png` would be the image for male tops, drawable 0, texture 0.

## Component IDs Reference

- 0: Face
- 1: Mask
- 2: Hair
- 3: Torso
- 4: Legs
- 5: Bags/Parachute
- 6: Shoes
- 7: Accessories
- 8: Undershirt
- 9: Body Armor
- 10: Decals
- 11: Tops

## Fallback System

If an image with a specific texture ID is not found, the system will try to load an image without the texture ID:
- First try: `[gender]_[componentId]_[drawableId]_[textureId].png`
- Fallback: `[gender]_[componentId]_[drawableId].png`

If no image is found, a placeholder with the drawable ID will be shown.
