import * as React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  RotateCw,
  User,
  Smile,
  Shirt,
  Footprints,
  ScanFace,
} from 'lucide-react';
import { useNuiEvent } from '@/hooks/useNuiEvent';
import { fetchNui } from '@/utils/fetchNui';
import { isEnvBrowser } from '@/utils/misc';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// ---- contract types -------------------------------------------------------
//
// Mirrors the upstream `client/main.lua` NUI surface verbatim. Wire spelling
// (`accessoires`, `acessory`) is preserved.

type SkinValue = {
  item: number;
  texture: number;
  defaultItem: number;
  defaultTexture: number;
  shapeMix?: number;
  skinMix?: number;
  defaultShapeMix?: number;
  defaultSkinMix?: number;
};

type SkinData = Record<string, SkinValue>;

type MaxValue = {
  type: string;
  item?: number;
  texture?: number;
  shapeMix?: number;
  skinMix?: number;
};

type MaxValues = Record<string, MaxValue>;

type RoomOutfit = {
  outfitLabel: string;
  outfitData: unknown;
};

type MyOutfit = {
  outfitname: string;
  model: number;
  skin: unknown;
  outfitId: string;
};

type MenuTab = {
  menu: string; // 'character' | 'hair' | 'clothing' | 'accessoires' | 'roomOutfits' | 'myOutfits'
  label: string;
  selected?: boolean;
  outfits?: (RoomOutfit | MyOutfit)[];
};

type OpenPayload = {
  action: 'open';
  menus: MenuTab[];
  currentClothing: SkinData;
  hasTracker: boolean;
  translations?: Record<string, string>;
};

type UpdateMaxPayload = { action: 'updateMax'; maxValues: MaxValues };
type ReloadOutfitsPayload = { action: 'reloadMyOutfits'; outfits: MyOutfit[] };
type ToggleChangePayload = { action: 'toggleChange'; allow: boolean };
type ResetValuesPayload = { action: 'ResetValues' };
type SetVisiblePayload = { action: 'setVisible'; visible: boolean };
type LocaleChangedPayload = {
  action: 'localeChanged';
  translations?: Record<string, string>;
};

// ---- category catalogue ---------------------------------------------------
//
// Each entry maps the upstream skinData key to display metadata and the
// row-kind (item-only, item+texture, facemix sliders, ped-model picker).
// Order matches upstream's index.html top-down.

type RowKind = 'item-texture' | 'item-only' | 'facemix' | 'model';

type CategoryDef = {
  key: string;
  labelKey: string; // ui.* key
  kind: RowKind;
  itemLabelKey?: string; // override "Item"/"Type" inside the row
  textureLabelKey?: string; // override "Texture"/"Color" inside the row
};

const CHARACTER_CATEGORIES: CategoryDef[] = [
  // model row is rendered separately so it can show the current model name
  { key: 'face', labelKey: 'mother', kind: 'item-texture', itemLabelKey: 'type', textureLabelKey: 'skin_color' },
  { key: 'face2', labelKey: 'father', kind: 'item-texture', itemLabelKey: 'type', textureLabelKey: 'skin_color' },
  { key: 'facemix', labelKey: 'parent_mixer', kind: 'facemix' },
  { key: 'nose_0', labelKey: 'nose_width', kind: 'item-only', itemLabelKey: 'width' },
  { key: 'nose_1', labelKey: 'nose_peak_height', kind: 'item-only', itemLabelKey: 'height' },
  { key: 'nose_2', labelKey: 'nose_peak_length', kind: 'item-only', itemLabelKey: 'length' },
  { key: 'nose_3', labelKey: 'nose_bone_height', kind: 'item-only', itemLabelKey: 'height' },
  { key: 'nose_4', labelKey: 'nose_peak_lowering', kind: 'item-only', itemLabelKey: 'lowering' },
  { key: 'nose_5', labelKey: 'nose_bone_twist', kind: 'item-only', itemLabelKey: 'twist' },
  { key: 'eyebrown_high', labelKey: 'eybrow_height', kind: 'item-only', itemLabelKey: 'height' },
  { key: 'eyebrown_forward', labelKey: 'eyebrow_depth', kind: 'item-only', itemLabelKey: 'depth' },
  { key: 'cheek_1', labelKey: 'cheeks_height', kind: 'item-only', itemLabelKey: 'height' },
  { key: 'cheek_2', labelKey: 'cheeks_width', kind: 'item-only', itemLabelKey: 'width' },
  { key: 'cheek_3', labelKey: 'cheeks_depth', kind: 'item-only', itemLabelKey: 'depth' },
  { key: 'eye_opening', labelKey: 'eyes_opening', kind: 'item-only', itemLabelKey: 'opening' },
  { key: 'lips_thickness', labelKey: 'lips_thickness', kind: 'item-only', itemLabelKey: 'thickness' },
  { key: 'jaw_bone_width', labelKey: 'jaw_bone_width', kind: 'item-only', itemLabelKey: 'width' },
  { key: 'jaw_bone_back_lenght', labelKey: 'jaw_bone_length', kind: 'item-only', itemLabelKey: 'length' },
  { key: 'chimp_bone_lowering', labelKey: 'chin_height', kind: 'item-only', itemLabelKey: 'height' },
  { key: 'chimp_bone_lenght', labelKey: 'chin_bone Length', kind: 'item-only', itemLabelKey: 'length' },
  { key: 'chimp_bone_width', labelKey: 'chin_bone_width', kind: 'item-only', itemLabelKey: 'width' },
  { key: 'chimp_hole', labelKey: 'butt_chin', kind: 'item-only', itemLabelKey: 'size' },
  { key: 'neck_thikness', labelKey: 'neck_thickness', kind: 'item-only', itemLabelKey: 'thickness' },
];

const HAIR_CATEGORIES: CategoryDef[] = [
  { key: 'eye_color', labelKey: 'eye_color', kind: 'item-only', itemLabelKey: 'color' },
  { key: 'moles', labelKey: 'moles', kind: 'item-texture', itemLabelKey: 'type', textureLabelKey: 'opacity' },
  { key: 'ageing', labelKey: 'ageing', kind: 'item-texture', itemLabelKey: 'type', textureLabelKey: 'hair_color' },
  { key: 'hair', labelKey: 'hair', kind: 'item-texture', itemLabelKey: 'type', textureLabelKey: 'color' },
  { key: 'eyebrows', labelKey: 'eyebrow', kind: 'item-texture', itemLabelKey: 'type', textureLabelKey: 'color' },
  { key: 'beard', labelKey: 'facial_hair', kind: 'item-texture', itemLabelKey: 'type', textureLabelKey: 'color' },
  { key: 'lipstick', labelKey: 'lipstick', kind: 'item-texture', itemLabelKey: 'type', textureLabelKey: 'color' },
  { key: 'blush', labelKey: 'blush', kind: 'item-texture', itemLabelKey: 'type', textureLabelKey: 'color' },
  { key: 'makeup', labelKey: 'makeup', kind: 'item-texture', itemLabelKey: 'type', textureLabelKey: 'color' },
];

const CLOTHING_CATEGORIES: CategoryDef[] = [
  { key: 'arms', labelKey: 'arms', kind: 'item-texture', itemLabelKey: 'type', textureLabelKey: 'texture' },
  { key: 't-shirt', labelKey: 'undershirt', kind: 'item-texture', itemLabelKey: 'item', textureLabelKey: 'color' },
  { key: 'torso2', labelKey: 'jacket', kind: 'item-texture', itemLabelKey: 'item', textureLabelKey: 'color' },
  { key: 'vest', labelKey: 'vests', kind: 'item-texture', itemLabelKey: 'item', textureLabelKey: 'texture' },
  { key: 'decals', labelKey: 'decals', kind: 'item-texture', itemLabelKey: 'item', textureLabelKey: 'texture' },
  { key: 'accessory', labelKey: 'acessory', kind: 'item-texture', itemLabelKey: 'item', textureLabelKey: 'texture' },
  { key: 'bag', labelKey: 'bags', kind: 'item-texture', itemLabelKey: 'item', textureLabelKey: 'texture' },
  { key: 'pants', labelKey: 'pants', kind: 'item-texture', itemLabelKey: 'item', textureLabelKey: 'texture' },
  { key: 'shoes', labelKey: 'shoes', kind: 'item-texture', itemLabelKey: 'item', textureLabelKey: 'texture' },
];

const ACCESSOIRES_CATEGORIES: CategoryDef[] = [
  { key: 'mask', labelKey: 'mask', kind: 'item-texture', itemLabelKey: 'type', textureLabelKey: 'texture' },
  { key: 'hat', labelKey: 'hat', kind: 'item-texture', itemLabelKey: 'type', textureLabelKey: 'texture' },
  { key: 'glass', labelKey: 'glasses', kind: 'item-texture', itemLabelKey: 'type', textureLabelKey: 'texture' },
  { key: 'ear', labelKey: 'ear_accessories', kind: 'item-texture', itemLabelKey: 'type', textureLabelKey: 'texture' },
  { key: 'watch', labelKey: 'watch', kind: 'item-texture', itemLabelKey: 'type', textureLabelKey: 'texture' },
  { key: 'bracelet', labelKey: 'bracelet', kind: 'item-texture', itemLabelKey: 'type', textureLabelKey: 'texture' },
];

// Camera presets — value 0 toggles back to default; 1=face, 2=torso, 3=legs.
const CAMERA_BUTTONS: { value: number; Icon: React.ComponentType<{ className?: string }>; titleKey: string; titleFallback: string }[] = [
  { value: 1, Icon: Smile, titleKey: 'cam_face', titleFallback: 'Face' },
  { value: 2, Icon: Shirt, titleKey: 'cam_torso', titleFallback: 'Torso' },
  { value: 3, Icon: Footprints, titleKey: 'cam_legs', titleFallback: 'Legs' },
];

// Accessory category has a hard skip at value 13 (bracelet sentinel) —
// arrows must jump 12 → 14 and 14 → 12.
const ACCESSORY_SKIP = 13;

// ---- main page ------------------------------------------------------------

const Page: React.FC = () => {
  const [open, setOpen] = React.useState<boolean>(false);
  const [visible, setVisible] = React.useState<boolean>(true);
  const [translations, setTranslations] = React.useState<Record<string, string>>({});
  const [menus, setMenus] = React.useState<MenuTab[]>([]);
  const [activeMenu, setActiveMenu] = React.useState<string>('');
  const [skin, setSkin] = React.useState<SkinData>({});
  const [maxValues, setMaxValues] = React.useState<MaxValues>({});
  const [hasTracker, setHasTracker] = React.useState<boolean>(false);
  const [canChange, setCanChange] = React.useState<boolean>(true);
  const [activeCam, setActiveCam] = React.useState<number | null>(null);
  const [currentModel, setCurrentModel] = React.useState<string>('mp_m_freemode_01');
  const [myOutfits, setMyOutfits] = React.useState<MyOutfit[]>([]);
  const [roomOutfits, setRoomOutfits] = React.useState<RoomOutfit[]>([]);
  const [outfitDialogOpen, setOutfitDialogOpen] = React.useState<boolean>(false);
  const [outfitName, setOutfitName] = React.useState<string>('');
  const [outfitNameError, setOutfitNameError] = React.useState<boolean>(false);

  // Scroll the body back to the top whenever the active tab changes —
  // shadcn ScrollArea forwards its ref to the Radix Root, not the
  // viewport, so we query the viewport via Radix's documented
  // data-attribute. Without this, scrolling halfway through Hair and
  // then jumping to Clothing strands the user mid-list.
  const scrollRootRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const viewport = scrollRootRef.current?.querySelector<HTMLElement>(
      '[data-radix-scroll-area-viewport]'
    );
    if (viewport) viewport.scrollTop = 0;
  }, [activeMenu]);

  const tx = React.useCallback(
    (key: string, fallback?: string): string =>
      translations[key] ?? fallback ?? key,
    [translations]
  );

  // ---- inbound NUI messages ----------------------------------------------

  useNuiEvent<OpenPayload>('open', (data) => {
    if (data.translations) setTranslations(data.translations);
    setMenus(data.menus ?? []);
    setSkin(data.currentClothing ?? {});
    setHasTracker(!!data.hasTracker);
    setCanChange(true);
    setActiveCam(null);
    setOutfitDialogOpen(false);
    setOutfitName('');
    setOutfitNameError(false);
    // Buckets each Lua flow ships separately. Find the one marked
    // selected — fall back to the first menu — and bucket per-tab outfits.
    const selectedMenu = data.menus?.find((m) => m.selected) ?? data.menus?.[0];
    setActiveMenu(selectedMenu?.menu ?? '');
    const room = data.menus?.find((m) => m.menu === 'roomOutfits');
    const mine = data.menus?.find((m) => m.menu === 'myOutfits');
    setRoomOutfits((room?.outfits ?? []) as RoomOutfit[]);
    setMyOutfits((mine?.outfits ?? []) as MyOutfit[]);
    setVisible(true);
    setOpen(true);
  });

  useNuiEvent<UpdateMaxPayload>('updateMax', (data) => {
    setMaxValues(data.maxValues ?? {});
  });

  useNuiEvent<ReloadOutfitsPayload>('reloadMyOutfits', (data) => {
    setMyOutfits(data.outfits ?? []);
  });

  useNuiEvent<ToggleChangePayload>('toggleChange', (data) => {
    setCanChange(!!data.allow);
  });

  useNuiEvent<ResetValuesPayload>('ResetValues', () => {
    setSkin((prev) => {
      const next: SkinData = {};
      for (const [k, v] of Object.entries(prev)) {
        next[k] = { ...v, item: v.defaultItem, texture: v.defaultTexture };
      }
      return next;
    });
  });

  // Pause-menu / quit-warning suspend (project_nui_focus_suspension).
  useNuiEvent<SetVisiblePayload>('setVisible', (data) => {
    if (typeof data.visible === 'boolean') setVisible(data.visible);
  });

  useNuiEvent<LocaleChangedPayload>('localeChanged', (data) => {
    if (data.translations) setTranslations(data.translations);
  });

  // Window-focus handshake — covers FiveM X-button / ALT+F4 prompts.
  React.useEffect(() => {
    if (isEnvBrowser()) return;
    const onBlur = () => {
      if (!open) return;
      void fetchNui('uiBlurred');
    };
    const onFocus = () => {
      if (!open) return;
      void fetchNui('uiFocused');
    };
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, [open]);

  // Keyboard: A/D rotate camera around ped (matches upstream).
  React.useEffect(() => {
    if (!open || !visible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't capture while editing an input — the user is typing.
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.key === 'd' || e.key === 'D') {
        void fetchNui('rotateRight');
      } else if (e.key === 'a' || e.key === 'A') {
        void fetchNui('rotateLeft');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, visible]);

  // ---- helpers -----------------------------------------------------------

  const sendUpdate = React.useCallback(
    (clothingType: string, articleNumber: number, type: string) => {
      void fetchNui('updateSkin', { clothingType, articleNumber, type });
    },
    []
  );

  const sendUpdateOnInput = React.useCallback(
    (clothingType: string, articleNumber: number, type: string) => {
      void fetchNui('updateSkinOnInput', { clothingType, articleNumber, type });
    },
    []
  );

  // Mirrors QBClothing.ResetItemTexture in upstream script.js — when an
  // item arrow advances on a hair/eyebrows/beard/etc. category, the
  // texture snaps back to the category's defaultTexture.
  const resetTexture = React.useCallback(
    (categoryKey: string) => {
      const cat = skin[categoryKey];
      if (!cat) return;
      setSkin((prev) => {
        const cur = prev[categoryKey];
        if (!cur) return prev;
        return {
          ...prev,
          [categoryKey]: { ...cur, texture: cur.defaultTexture },
        };
      });
      sendUpdate(categoryKey, cat.defaultTexture, 'texture');
    },
    [skin, sendUpdate]
  );

  // Single source of truth for "what value would the next arrow press
  // produce, accounting for accessory's hard skip and tracker lockout."
  const computeStepped = React.useCallback(
    (categoryKey: string, current: number, delta: 1 | -1): number => {
      const next = current + delta;
      if (categoryKey === 'accessory') {
        if (delta === 1 && next === ACCESSORY_SKIP) return ACCESSORY_SKIP + 1; // 12 → 14
        if (delta === -1 && next === ACCESSORY_SKIP) return ACCESSORY_SKIP - 1; // 14 → 12
      }
      return next;
    },
    []
  );

  const handleArrow = React.useCallback(
    (
      categoryKey: string,
      buttonType: 'item' | 'texture',
      delta: 1 | -1
    ) => {
      if (!canChange) return;
      if (hasTracker && categoryKey === 'accessory') {
        void fetchNui('TrackerError');
        return;
      }
      const cur = skin[categoryKey];
      if (!cur) return;
      const currentVal = buttonType === 'item' ? cur.item : cur.texture;
      const next = computeStepped(categoryKey, currentVal, delta);
      const max = maxValues[categoryKey];
      const upperBound =
        buttonType === 'item' ? max?.item ?? 0 : max?.texture ?? 0;
      const lowerBound =
        buttonType === 'item' ? cur.defaultItem : cur.defaultTexture;
      // Upper bound only checked on increments (matches upstream); lower
      // bound on decrements.
      if (delta === 1 && next > upperBound) return;
      if (delta === -1 && next < lowerBound) return;

      setSkin((prev) => ({
        ...prev,
        [categoryKey]: {
          ...prev[categoryKey],
          [buttonType]: next,
        },
      }));
      sendUpdate(categoryKey, next, buttonType);
      if (buttonType === 'item') {
        // Texture snap-back on item change — matches upstream.
        resetTexture(categoryKey);
      }
    },
    [canChange, hasTracker, skin, maxValues, computeStepped, sendUpdate, resetTexture]
  );

  const handleNumberInput = React.useCallback(
    (categoryKey: string, buttonType: 'item' | 'texture', raw: string) => {
      if (hasTracker && categoryKey === 'accessory') {
        void fetchNui('TrackerError');
        return;
      }
      const parsed = parseInt(raw, 10);
      if (Number.isNaN(parsed)) return;
      let next = parsed;
      if (categoryKey === 'accessory' && next === ACCESSORY_SKIP) {
        // Don't let users type the sentinel value.
        next = ACCESSORY_SKIP - 1;
      }
      setSkin((prev) => ({
        ...prev,
        [categoryKey]: {
          ...prev[categoryKey],
          [buttonType]: next,
        },
      }));
      sendUpdateOnInput(categoryKey, next, buttonType);
    },
    [hasTracker, sendUpdateOnInput]
  );

  const handleSlider = React.useCallback(
    (type: 'shapeMix' | 'skinMix', value: number) => {
      if (!canChange) return;
      setSkin((prev) => {
        const cur = prev.facemix;
        if (!cur) return prev;
        return {
          ...prev,
          facemix: { ...cur, [type]: value },
        };
      });
      sendUpdate('facemix', value, type);
    },
    [canChange, sendUpdate]
  );

  const handleModelArrow = React.useCallback(
    async (delta: 1 | -1) => {
      if (!canChange) return;
      const modelCat = skin.model ?? { item: 1, texture: 0, defaultItem: 1, defaultTexture: 0 };
      const next = (modelCat.item ?? 1) + delta;
      if (next < 1) return;
      setSkin((prev) => ({
        ...prev,
        model: { ...(prev.model ?? modelCat), item: next },
      }));
      const modelName = await fetchNui<{ ped: number }, string>('setCurrentPed', { ped: next });
      if (typeof modelName === 'string') {
        setCurrentModel(modelName);
      }
    },
    [canChange, skin]
  );

  const handleCamPreset = React.useCallback(
    (value: number) => {
      // Toggle: clicking the active button flips back to default (0).
      const next = activeCam === value ? 0 : value;
      setActiveCam(next === 0 ? null : value);
      void fetchNui('setupCam', { value: next });
    },
    [activeCam]
  );

  const handlePedRotate = React.useCallback((dir: 'left' | 'right') => {
    void fetchNui('rotateCam', { type: dir });
  }, []);

  const handleConfirm = React.useCallback(() => {
    setOpen(false);
    void fetchNui('saveClothing');
    void fetchNui('close');
  }, []);

  const handleCancel = React.useCallback(() => {
    setOpen(false);
    void fetchNui('resetOutfit');
    void fetchNui('close');
  }, []);

  const handleSaveOutfitOpen = React.useCallback(() => {
    setOutfitName('');
    setOutfitNameError(false);
    setOutfitDialogOpen(true);
  }, []);

  const handleSaveOutfitConfirm = React.useCallback(() => {
    const trimmed = outfitName.trim();
    if (!trimmed) {
      setOutfitNameError(true);
      return;
    }
    void fetchNui('saveOutfit', { outfitName: trimmed });
    setOutfitDialogOpen(false);
    setOutfitName('');
    setOutfitNameError(false);
  }, [outfitName]);

  const handleSelectRoomOutfit = React.useCallback((outfit: RoomOutfit) => {
    void fetchNui('selectOutfit', {
      outfitData: outfit.outfitData,
      outfitName: outfit.outfitLabel,
    });
  }, []);

  const handleSelectMyOutfit = React.useCallback((outfit: MyOutfit) => {
    void fetchNui('selectOutfit', {
      outfitData: outfit.skin,
      outfitName: outfit.outfitname,
      outfitId: outfit.outfitId,
    });
  }, []);

  const handleDeleteMyOutfit = React.useCallback((outfit: MyOutfit) => {
    void fetchNui('removeOutfit', {
      outfitData: outfit.skin,
      outfitName: outfit.outfitname,
      outfitId: outfit.outfitId,
    });
  }, []);

  // ---- render ------------------------------------------------------------

  if (!open || !visible) return null;

  const activeIsOutfits = activeMenu === 'roomOutfits' || activeMenu === 'myOutfits';
  const showSaveOutfitButton = activeMenu === 'character' || activeMenu === 'hair' || activeMenu === 'clothing' || activeMenu === 'accessoires';

  return (
    <div className="fixed inset-0 font-serif text-foreground antialiased pointer-events-none">
      {/* Camera presets — vertical column, centered on the left edge. */}
      <div
        className={cn(
          'pointer-events-auto absolute top-1/2 -translate-y-1/2 left-[clamp(1rem,2vw,2rem)]',
          'flex flex-col gap-2',
          'animate-[fadeIn_220ms_ease-out_both]'
        )}
      >
        <CamButton
          active={activeCam === null}
          onClick={() => handleCamPreset(0)}
          title={tx('cam_full', 'Full')}
        >
          <User className="h-4 w-4" strokeWidth={1.4} />
        </CamButton>
        {CAMERA_BUTTONS.map(({ value, Icon, titleKey, titleFallback }) => (
          <CamButton
            key={value}
            active={activeCam === value}
            onClick={() => handleCamPreset(value)}
            title={tx(titleKey, titleFallback)}
          >
            <Icon className="h-4 w-4" />
          </CamButton>
        ))}
        <div className="mt-3 flex flex-col gap-2 border-t border-border/40 pt-3">
          <CamButton onClick={() => handlePedRotate('left')} title={tx('rotate_left', 'Rotate left')}>
            <RotateCcw className="h-4 w-4" />
          </CamButton>
          <CamButton onClick={() => handlePedRotate('right')} title={tx('rotate_right', 'Rotate right')}>
            <RotateCw className="h-4 w-4" />
          </CamButton>
        </div>
      </div>

      {/* Main panel — anchored to the right, allows the rotating ped to
          stay visible. Opaque-ish gray-950 (no backdrop-filter for CEF). */}
      <aside
        className={cn(
          'pointer-events-auto absolute top-[clamp(1rem,3vh,3rem)] bottom-[clamp(1rem,3vh,3rem)]',
          'right-[clamp(1rem,2vw,2rem)] flex flex-col',
          'w-[clamp(340px,32vw,420px)]',
          'bg-gray-950/90 border border-border/60',
          'shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)]',
          'animate-[fadeIn_220ms_ease-out_both]'
        )}
      >
        {/* Tab strip */}
        <div className="flex flex-row shrink-0 border-b border-border/60">
          {menus.map((m) => (
            <button
              key={m.menu}
              type="button"
              title={m.label}
              onClick={() => setActiveMenu(m.menu)}
              className={cn(
                // min-w-0 lets flex-1 shrink the button below content
                // width so `truncate` can actually clip; without it,
                // long localized labels (e.g. de "Accessoires" inside
                // a 4-tab strip) push the strip past the panel edge.
                'flex-1 min-w-0 py-3 px-2 text-center font-mono uppercase tracking-[0.25em]',
                'truncate text-[clamp(0.55rem,0.7vw,0.7rem)] transition-colors',
                activeMenu === m.menu
                  ? 'text-brand-300 border-b-2 border-brand-400 -mb-px'
                  : 'text-foreground/60 hover:text-foreground/90'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <ScrollArea ref={scrollRootRef} className="flex-1">
          <div className="px-[clamp(0.85rem,1.2vw,1.2rem)] py-[clamp(0.85rem,1.2vw,1.2rem)] flex flex-col gap-[clamp(0.6rem,0.9vw,0.9rem)]">
            {activeMenu === 'character' && (
              <>
                {/* <ModelRow
                  current={currentModel}
                  index={skin.model?.item ?? 1}
                  tx={tx}
                  canChange={canChange}
                  onArrow={handleModelArrow}
                /> */}
                {CHARACTER_CATEGORIES.map((cat) =>
                  renderRow(cat, skin, maxValues, hasTracker, canChange, tx, handleArrow, handleNumberInput, handleSlider)
                )}
              </>
            )}
            {activeMenu === 'hair' &&
              HAIR_CATEGORIES.map((cat) =>
                renderRow(cat, skin, maxValues, hasTracker, canChange, tx, handleArrow, handleNumberInput, handleSlider)
              )}
            {activeMenu === 'clothing' &&
              CLOTHING_CATEGORIES.map((cat) =>
                renderRow(cat, skin, maxValues, hasTracker, canChange, tx, handleArrow, handleNumberInput, handleSlider)
              )}
            {activeMenu === 'accessoires' &&
              ACCESSOIRES_CATEGORIES.map((cat) =>
                renderRow(cat, skin, maxValues, hasTracker, canChange, tx, handleArrow, handleNumberInput, handleSlider)
              )}
            {activeMenu === 'roomOutfits' && (
              <OutfitGrid>
                {roomOutfits.map((o, idx) => (
                  <OutfitCard
                    key={`room-${idx}`}
                    label={o.outfitLabel}
                    onSelect={() => handleSelectRoomOutfit(o)}
                    selectLabel={tx('select_outfit', 'Select Outfit')}
                  />
                ))}
                {roomOutfits.length === 0 && <EmptyHint label={tx('no_room_outfits', 'No preset outfits')} />}
              </OutfitGrid>
            )}
            {activeMenu === 'myOutfits' && (
              <OutfitGrid>
                {myOutfits.map((o, idx) => (
                  <OutfitCard
                    key={`mine-${o.outfitId ?? idx}`}
                    label={o.outfitname}
                    onSelect={() => handleSelectMyOutfit(o)}
                    onDelete={() => handleDeleteMyOutfit(o)}
                    selectLabel={tx('select', 'Select')}
                    deleteLabel={tx('delete', 'Delete')}
                  />
                ))}
                {myOutfits.length === 0 && <EmptyHint label={tx('no_saved_outfits', 'No saved outfits')} />}
              </OutfitGrid>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="shrink-0 border-t border-border/60 px-[clamp(0.85rem,1.2vw,1.2rem)] py-[clamp(0.6rem,0.9vw,0.9rem)] flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleCancel}
          >
            {tx('btn_cancel', 'Cancel')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSaveOutfitOpen}
            disabled={!showSaveOutfitButton}
          >
            {tx('btn_saveOutfit', 'Save Outfit')}
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleConfirm}
          >
            {tx('btn_confirm', 'Confirm')}
          </Button>
        </div>
      </aside>

      {/* Save-outfit name dialog */}
      <Dialog open={outfitDialogOpen} onOpenChange={setOutfitDialogOpen}>
        <DialogContent className="bg-gray-950/95 backdrop-blur-none border-border/70">
          <DialogHeader>
            <DialogTitle>{tx('outfit_name', 'Outfit Name')}</DialogTitle>
            <DialogDescription>
              {tx('outfit_name_hint', 'Pick a name to save this outfit under.')}
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={outfitName}
            onChange={(e) => {
              setOutfitName(e.target.value);
              if (outfitNameError) setOutfitNameError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveOutfitConfirm();
            }}
            placeholder={tx('outfit_name', 'Outfit Name')}
            aria-invalid={outfitNameError}
          />
          {outfitNameError && (
            <p className="dossier-error mt-2">{tx('outfit_name_required', 'Name required')}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setOutfitDialogOpen(false)}
            >
              {tx('btn_cancel', 'Cancel')}
            </Button>
            <Button type="button" variant="default" size="sm" onClick={handleSaveOutfitConfirm}>
              {tx('btn_confirm', 'Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ---- row primitives -------------------------------------------------------

function renderRow(
  cat: CategoryDef,
  skin: SkinData,
  maxValues: MaxValues,
  hasTracker: boolean,
  canChange: boolean,
  tx: (k: string, f?: string) => string,
  onArrow: (key: string, type: 'item' | 'texture', delta: 1 | -1) => void,
  onInput: (key: string, type: 'item' | 'texture', raw: string) => void,
  onSlider: (type: 'shapeMix' | 'skinMix', value: number) => void
) {
  const value = skin[cat.key];
  if (!value) return null;
  if (cat.kind === 'facemix') {
    return (
      <FacemixRow
        key={cat.key}
        labelKey={cat.labelKey}
        shapeMix={value.shapeMix ?? 0.5}
        skinMix={value.skinMix ?? 0.5}
        canChange={canChange}
        tx={tx}
        onSlider={onSlider}
      />
    );
  }
  return (
    <EditorRow
      key={cat.key}
      cat={cat}
      value={value}
      max={maxValues[cat.key]}
      hasTracker={hasTracker}
      canChange={canChange}
      tx={tx}
      onArrow={onArrow}
      onInput={onInput}
    />
  );
}

type EditorRowProps = {
  cat: CategoryDef;
  value: SkinValue;
  max: MaxValue | undefined;
  hasTracker: boolean;
  canChange: boolean;
  tx: (k: string, f?: string) => string;
  onArrow: (key: string, type: 'item' | 'texture', delta: 1 | -1) => void;
  onInput: (key: string, type: 'item' | 'texture', raw: string) => void;
};

const EditorRow: React.FC<EditorRowProps> = ({
  cat,
  value,
  max,
  hasTracker,
  canChange,
  tx,
  onArrow,
  onInput,
}) => {
  const lockedAccessory = hasTracker && cat.key === 'accessory';
  const itemMax = max?.item ?? 0;
  const textureMax = max?.texture ?? 0;
  const showTexture = cat.kind === 'item-texture';

  return (
    <div className="dossier-paper px-3 py-3">
      <p className="dossier-label mb-2.5 text-center">{tx(cat.labelKey, prettify(cat.labelKey))}</p>
      <div className="flex flex-col gap-2">
        <SubControl
          label={tx(cat.itemLabelKey ?? 'item', 'Item')}
          value={value.item}
          max={itemMax}
          locked={lockedAccessory || !canChange}
          onLeft={() => onArrow(cat.key, 'item', -1)}
          onRight={() => onArrow(cat.key, 'item', 1)}
          onInput={(raw) => onInput(cat.key, 'item', raw)}
        />
        {showTexture && (
          <SubControl
            label={tx(cat.textureLabelKey ?? 'texture', 'Texture')}
            value={value.texture}
            max={textureMax}
            locked={lockedAccessory || !canChange}
            onLeft={() => onArrow(cat.key, 'texture', -1)}
            onRight={() => onArrow(cat.key, 'texture', 1)}
            onInput={(raw) => onInput(cat.key, 'texture', raw)}
          />
        )}
      </div>
    </div>
  );
};

type SubControlProps = {
  label: string;
  value: number;
  max: number;
  locked: boolean;
  onLeft: () => void;
  onRight: () => void;
  onInput: (raw: string) => void;
};

const SubControl: React.FC<SubControlProps> = ({
  label,
  value,
  max,
  locked,
  onLeft,
  onRight,
  onInput,
}) => {
  // Mirror the input value locally so the user can type freely; commit
  // on blur or Enter. Saves a fetchNui per keystroke when typing fast.
  const [local, setLocal] = React.useState<string>(String(value));
  React.useEffect(() => {
    setLocal(String(value));
  }, [value]);

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-center gap-2">
      <span className="font-mono uppercase tracking-[0.25em] text-[10px] text-foreground/55">
        {label}
      </span>
      <span className="text-[10px] font-mono text-foreground/40 text-right tabular-nums">
        / {max}
      </span>
      <button
        type="button"
        disabled={locked}
        onClick={onLeft}
        className={cn(
          'flex h-7 w-7 items-center justify-center border border-border/50',
          'text-foreground/70 transition-colors',
          'hover:border-brand-400/70 hover:text-brand-300',
          'disabled:opacity-40 disabled:pointer-events-none'
        )}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <input
        type="number"
        value={local}
        disabled={locked}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          if (local !== String(value)) onInput(local);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        className={cn(
          'h-7 w-14 bg-transparent border border-border/40 text-center',
          'font-mono text-[11px] tabular-nums text-foreground',
          'focus-visible:outline-none focus-visible:border-brand-400',
          'disabled:opacity-40'
        )}
      />
      <button
        type="button"
        disabled={locked}
        onClick={onRight}
        className={cn(
          'flex h-7 w-7 items-center justify-center border border-border/50',
          'text-foreground/70 transition-colors',
          'hover:border-brand-400/70 hover:text-brand-300',
          'disabled:opacity-40 disabled:pointer-events-none'
        )}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

type FacemixRowProps = {
  labelKey: string;
  shapeMix: number;
  skinMix: number;
  canChange: boolean;
  tx: (k: string, f?: string) => string;
  onSlider: (type: 'shapeMix' | 'skinMix', value: number) => void;
};

const FacemixRow: React.FC<FacemixRowProps> = ({
  labelKey,
  shapeMix,
  skinMix,
  canChange,
  tx,
  onSlider,
}) => {
  return (
    <div className="dossier-paper px-3 py-3">
      <p className="dossier-label mb-2.5 text-center">{tx(labelKey, 'Parent Mixer')}</p>
      <div className="flex flex-col gap-3">
        <FacemixSlider
          label={tx('shape_mix', 'Shape Mix')}
          leftLabel={tx('mother', 'Mother')}
          rightLabel={tx('father', 'Father')}
          value={shapeMix}
          disabled={!canChange}
          onChange={(v) => onSlider('shapeMix', v)}
        />
        <FacemixSlider
          label={tx('skin_mix', 'Skin Mix')}
          leftLabel={tx('mother', 'Mother')}
          rightLabel={tx('father', 'Father')}
          value={skinMix}
          disabled={!canChange}
          onChange={(v) => onSlider('skinMix', v)}
        />
      </div>
    </div>
  );
};

type FacemixSliderProps = {
  label: string;
  leftLabel: string;
  rightLabel: string;
  value: number;
  disabled: boolean;
  onChange: (v: number) => void;
};

const FacemixSlider: React.FC<FacemixSliderProps> = ({
  label,
  leftLabel,
  rightLabel,
  value,
  disabled,
  onChange,
}) => (
  <div>
    <p className="dossier-label mb-1.5 text-center">{label}</p>
    <Slider
      value={[value]}
      min={0}
      max={0.99}
      step={0.01}
      disabled={disabled}
      onValueChange={(v) => onChange(v[0] ?? 0)}
    />
    <div className="mt-1.5 flex justify-between font-mono uppercase tracking-[0.25em] text-[9px] text-foreground/45">
      <span>{leftLabel}</span>
      <span>{rightLabel}</span>
    </div>
  </div>
);

type ModelRowProps = {
  current: string;
  index: number;
  tx: (k: string, f?: string) => string;
  canChange: boolean;
  onArrow: (delta: 1 | -1) => void;
};

const ModelRow: React.FC<ModelRowProps> = ({ current, index, tx, canChange, onArrow }) => (
  <div className="dossier-paper px-3 py-3">
    <p className="dossier-label mb-2.5 text-center flex items-center justify-center gap-2">
      <ScanFace className="h-3.5 w-3.5" />
      {tx('player_model', 'Player Model')}
    </p>
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-center gap-2">
      <span className="font-mono uppercase tracking-[0.25em] text-[10px] text-foreground/55">
        {tx('model', 'Model')}
      </span>
      <span />
      <button
        type="button"
        disabled={!canChange}
        onClick={() => onArrow(-1)}
        className="flex h-7 w-7 items-center justify-center border border-border/50 hover:border-brand-400/70 hover:text-brand-300 disabled:opacity-40 disabled:pointer-events-none"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <span className="h-7 w-14 flex items-center justify-center font-mono text-[11px] tabular-nums text-foreground border border-border/40">
        {index}
      </span>
      <button
        type="button"
        disabled={!canChange}
        onClick={() => onArrow(1)}
        className="flex h-7 w-7 items-center justify-center border border-border/50 hover:border-brand-400/70 hover:text-brand-300 disabled:opacity-40 disabled:pointer-events-none"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
    <p className="mt-2 text-center font-mono text-[10px] tracking-[0.2em] text-foreground/55 break-all">
      {current}
    </p>
  </div>
);

type CamButtonProps = React.PropsWithChildren<{
  active?: boolean;
  onClick: () => void;
  title: string;
}>;

const CamButton: React.FC<CamButtonProps> = ({ active, onClick, title, children }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={cn(
      'flex h-9 w-9 items-center justify-center border transition-colors',
      // Active vs inactive must read unambiguously against the live game
      // scene. A translucent fill (bg-brand-500/20) was indistinguishable
      // from the dark inactive backdrop in CEF — switched to a solid brand
      // fill + ring so the selected POV is obvious without inspection.
      active
        ? 'border-brand-400 bg-brand-500 text-primary-foreground ring-1 ring-brand-300/60'
        : 'border-border/30 bg-gray-950/85 text-foreground/40 hover:border-brand-400/60 hover:text-brand-300'
    )}
  >
    {children}
  </button>
);

const OutfitGrid: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="grid grid-cols-1 gap-2">{children}</div>
);

type OutfitCardProps = {
  label: string;
  selectLabel: string;
  onSelect: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
};

const OutfitCard: React.FC<OutfitCardProps> = ({
  label,
  selectLabel,
  onSelect,
  onDelete,
  deleteLabel,
}) => (
  <div className="dossier-paper px-3 py-3 flex flex-col gap-2">
    <p className="font-display text-[14px] text-foreground/90 break-words">{label}</p>
    <div className="flex gap-2">
      <Button type="button" variant="default" size="sm" className="flex-1" onClick={onSelect}>
        {selectLabel}
      </Button>
      {onDelete && deleteLabel && (
        <Button type="button" variant="destructive" size="sm" className="flex-1" onClick={onDelete}>
          {deleteLabel}
        </Button>
      )}
    </div>
  </div>
);

const EmptyHint: React.FC<{ label: string }> = ({ label }) => (
  <p className="text-center font-mono uppercase tracking-[0.3em] text-[10px] text-foreground/40 py-6">
    {label}
  </p>
);

function prettify(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default Page;
