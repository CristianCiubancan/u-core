import * as React from 'react';
import { ArrowRight, Building2, Home, MapPin, RotateCcw } from 'lucide-react';

import { useNuiEvent } from '@/hooks/useNuiEvent';
import { fetchNui } from '@/utils/fetchNui';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';

// ---- contract types -------------------------------------------------------
//
// Mirrors the upstream `client.lua` NUI surface verbatim. Wire spelling
// (`appartment`, `setupAppartements`, `chooseAppa`) is preserved.

type SpawnEntry = {
  // upstream sends `coords`/`location` too, but the UI only ever reads
  // `label`. Keep extras as a passthrough so we don't choke if upstream
  // ever adds fields.
  label: string;
  [key: string]: unknown;
};

type HouseEntry = { house: string; label: string };

type ShowUiPayload = {
  action: 'showUi';
  status: boolean;
  translations?: Record<string, string>;
};

type SetupLocationsPayload = {
  action: 'setupLocations';
  locations: Record<string, SpawnEntry>;
  houses: HouseEntry[];
  isNew: false;
};

type SetupAppartementsPayload = {
  action: 'setupAppartements';
  locations: Record<string, SpawnEntry>;
  isNew: true;
};

type SelectionType = 'current' | 'normal' | 'house' | 'appartment';
type Selection = { type: SelectionType; name: string } | null;

const Page: React.FC = () => {
  const [visible, setVisible] = React.useState<boolean>(false);
  const [translations, setTranslations] = React.useState<Record<string, string>>({});
  const [isNew, setIsNew] = React.useState<boolean>(false);
  const [normal, setNormal] = React.useState<Record<string, SpawnEntry>>({});
  const [houses, setHouses] = React.useState<HouseEntry[]>([]);
  const [appartments, setAppartments] = React.useState<Record<string, SpawnEntry>>({});
  const [selected, setSelected] = React.useState<Selection>(null);

  const tx = React.useCallback(
    (key: string, fallback?: string): string => translations[key] ?? fallback ?? key,
    [translations]
  );

  // ---- inbound NUI messages ----------------------------------------------

  useNuiEvent<ShowUiPayload>('showUi', (data) => {
    setVisible(!!data.status);
    if (data.translations) setTranslations(data.translations);
    if (!data.status) {
      // Closing — drop the in-flight selection so the next open starts clean.
      setSelected(null);
    }
  });

  useNuiEvent<SetupLocationsPayload>('setupLocations', (data) => {
    setNormal(data.locations ?? {});
    setHouses(data.houses ?? []);
    setAppartments({});
    setIsNew(false);
    setSelected(null);
  });

  useNuiEvent<SetupAppartementsPayload>('setupAppartements', (data) => {
    setNormal({});
    setHouses([]);
    setAppartments(data.locations ?? {});
    setIsNew(true);
    setSelected(null);
  });

  // ---- click handlers ----------------------------------------------------

  const handleClick = React.useCallback((type: SelectionType, name: string) => {
    // Vue contract: only `normal` clicks fire the camera preview. House /
    // current / appartment update selection without a camera nudge.
    if (type === 'normal') {
      void fetchNui('setCam', { posname: name, type });
    }
    setSelected({ type, name });
  }, []);

  const handleConfirm = React.useCallback(() => {
    if (!selected) return;
    if (selected.type === 'appartment') {
      void fetchNui('chooseAppa', { appType: selected.name });
    } else {
      void fetchNui('spawnplayer', {
        spawnloc: selected.name,
        typeLoc: selected.type,
      });
    }
    // Upstream Vue hides itself before the server ack lands; mirror that
    // so the panel doesn't linger during the fade-out.
    setVisible(false);
  }, [selected]);

  // ---- render ------------------------------------------------------------

  if (!visible) return null;

  const normalEntries = Object.entries(normal);
  const appartmentEntries = Object.entries(appartments);
  const showLastLocation = !isNew;
  const isSelected = (type: SelectionType, name: string): boolean =>
    selected?.type === type && selected?.name === name;

  return (
    <div className="fixed inset-0 font-serif text-foreground antialiased pointer-events-none">
      <aside
        className={cn(
          'absolute left-[clamp(2rem,5vw,5rem)] top-[clamp(2rem,6vh,6rem)]',
          'flex w-[clamp(280px,22vw,360px)] flex-col',
          'pointer-events-auto',
          // Opaque-ish panel for readability over the rotating live scene.
          // 90% gray-950 leaves a faint world peek without sacrificing
          // contrast for the eyebrow + row labels. No backdrop-filter
          // (CEF) — rgba alpha only.
          'bg-gray-950/90 border border-border/60',
          'p-[clamp(1rem,1.4vw,1.4rem)]',
          'shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)]',
          'animate-[fadeIn_220ms_ease-out_both]'
        )}
      >
        <header className="mb-[clamp(0.75rem,1.2vw,1.1rem)]">
          <p className="font-mono uppercase text-brand-400/80 tracking-[0.4em] text-[clamp(0.6rem,0.7vw,0.72rem)]">
            {tx('where_would_you_like_to_start', 'Where would you like to start?')}
          </p>
        </header>

        <div className="flex flex-col gap-[clamp(0.4rem,0.7vw,0.625rem)]">
          {showLastLocation && (
            <SpawnRow
              icon={<RotateCcw className="h-3.5 w-3.5" strokeWidth={1.4} />}
              label={tx('last_location', 'Last Location')}
              selected={isSelected('current', 'current')}
              onClick={() => handleClick('current', 'current')}
            />
          )}

          {normalEntries.map(([key, loc]) => (
            <SpawnRow
              key={`normal-${key}`}
              icon={<MapPin className="h-3.5 w-3.5" strokeWidth={1.4} />}
              label={loc.label}
              selected={isSelected('normal', key)}
              onClick={() => handleClick('normal', key)}
            />
          ))}

          {appartmentEntries.map(([key, loc]) => (
            <SpawnRow
              key={`appartment-${key}`}
              icon={<Building2 className="h-3.5 w-3.5" strokeWidth={1.4} />}
              label={loc.label}
              selected={isSelected('appartment', key)}
              onClick={() => handleClick('appartment', key)}
            />
          ))}

          {houses.map((h, idx) => (
            <SpawnRow
              key={`house-${h.house}-${idx}`}
              icon={<Home className="h-3.5 w-3.5" strokeWidth={1.4} />}
              label={h.label}
              selected={isSelected('house', h.house)}
              onClick={() => handleClick('house', h.house)}
            />
          ))}
        </div>

        <div className="mt-[clamp(0.85rem,1.3vw,1.2rem)] flex justify-end">
          <Button
            type="button"
            variant="default"
            onClick={handleConfirm}
            disabled={!selected}
          >
            {tx('confirm', 'Confirm')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </aside>
    </div>
  );
};

// ---- spawn row primitive --------------------------------------------------

type SpawnRowProps = {
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  onClick: () => void;
};

const SpawnRow = React.memo<SpawnRowProps>(({ icon, label, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'dossier-paper group relative flex w-full items-center gap-3 text-left',
      'p-[clamp(0.55rem,0.85vw,0.85rem)]',
      'transition-colors duration-200 hover:border-brand-500/50',
      selected && 'dossier-paper-selected'
    )}
  >
    <span
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
        'border border-input/60 text-foreground/40',
        'transition-colors group-hover:border-brand-400/70 group-hover:text-brand-300',
        selected && 'border-brand-400/80 text-brand-300'
      )}
    >
      {icon}
    </span>
    <span
      className={cn(
        'min-w-0 flex-1 truncate font-mono uppercase tracking-[0.3em]',
        'text-[clamp(0.62rem,0.75vw,0.78rem)]',
        selected ? 'text-foreground' : 'text-foreground/70'
      )}
    >
      {label}
    </span>
  </button>
));
SpawnRow.displayName = 'SpawnRow';

export default Page;
