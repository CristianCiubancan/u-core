import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import {
  ArrowLeft,
  Building2,
  Home,
  MapPin,
  Navigation,
  Play,
} from 'lucide-react';

import { useNuiEvent } from '@/hooks/useNuiEvent';
import { fetchNui } from '@/utils/fetchNui';
import { isEnvBrowser } from '@/utils/misc';
import { Button } from '@/components/ui/button';
import Paper from '@/components/ui/Paper';

// Locale set is the u-core 15-locale baseline — every plugin ships
// translations for the same set as qb-multicharacter so language
// switching feels consistent across the suite. Don't add or drop
// locales unilaterally; per project_port_handoff_checklist.md, the
// baseline moves only by changing every plugin together.
import ar from '../translations/ar.json';
import cs from '../translations/cs.json';
import de from '../translations/de.json';
import en from '../translations/en.json';
import es from '../translations/es.json';
import fi from '../translations/fi.json';
import fr from '../translations/fr.json';
import it from '../translations/it.json';
import ja from '../translations/ja.json';
import nl from '../translations/nl.json';
import ptbr from '../translations/pt-br.json';
import pt from '../translations/pt.json';
import sv from '../translations/sv.json';
import tr from '../translations/tr.json';
import vi from '../translations/vi.json';

const NAMESPACE = 'qb-spawn';
const BUNDLES: Record<string, unknown> = {
  ar, cs, de, en, es, fi, fr, it, ja, nl, 'pt-br': ptbr, pt, sv, tr, vi,
};
for (const [lng, resources] of Object.entries(BUNDLES)) {
  i18n.addResourceBundle(lng, NAMESPACE, resources, true, true);
}

interface SpawnOption {
  /** Wire-format type. `appartment` keeps the upstream double-p so the
   *  client/server stay drop-in compatible. */
  type: 'current' | 'normal' | 'house' | 'appartment';
  name: string;
  label: string;
}

interface ShowUiMessage {
  action: 'showUi';
  status: boolean;
  locale?: string;
}

interface LocaleChangedMessage {
  action: 'localeChanged';
  code: string;
}

interface SetupLocationsMessage {
  action: 'setupLocations';
  locations: Record<string, { location: string; label: string; coords: unknown }>;
  houses: Array<{ house: string; label: string }>;
  isNew: false;
  firstSpawn?: boolean;
}

interface SetupAppartementsMessage {
  action: 'setupAppartements';
  locations: Record<string, { id?: string; label: string }>;
  isNew: true;
  firstSpawn?: boolean;
}

export default function Page() {
  const { t } = useTranslation(NAMESPACE);

  const [visible, setVisible] = useState<boolean>(isEnvBrowser());
  const [presets, setPresets] = useState<SpawnOption[]>([]);
  const [houses, setHouses] = useState<SpawnOption[]>([]);
  const [apartments, setApartments] = useState<SpawnOption[]>([]);
  const [isNew, setIsNew] = useState<boolean>(false);
  // True for the player's first spawn after createCharacter; suppresses
  // the "Last Location" option since `cData.position` would point at
  // the character creation interior. Sourced from qb-multicharacter via
  // the `_firstSpawn` cData marker; see `shared/types.ts`.
  const [firstSpawn, setFirstSpawn] = useState<boolean>(false);
  const [selected, setSelected] = useState<SpawnOption | null>(null);

  useNuiEvent<ShowUiMessage>('showUi', (data) => {
    // Apply the locale piggy-backed on the show payload (see
    // client/index.ts:setDisplay). Covers the boot race where the
    // initial QBCore:Locale:Changed at PlayerLoaded fired before this
    // useNuiEvent attached.
    if (data.locale && BUNDLES[data.locale] && i18n.language !== data.locale) {
      void i18n.changeLanguage(data.locale);
    }
    setVisible(!!data.status);
    if (!data.status) setSelected(null);
  });

  // Live locale change. qb-spawn/client/index.ts has an
  // onNet('QBCore:Locale:Changed') relay that turns the net event into
  // a SendNUIMessage in this resource's iframe, so /locale <code> at
  // any time during the spawn UI re-localizes without a re-mount.
  useNuiEvent<LocaleChangedMessage>('localeChanged', (data) => {
    if (data?.code && BUNDLES[data.code] && i18n.language !== data.code) {
      void i18n.changeLanguage(data.code);
    }
  });

  useNuiEvent<SetupLocationsMessage>('setupLocations', (data) => {
    const presetsNext: SpawnOption[] = Object.entries(data.locations ?? {}).map(
      ([key, loc]) => ({
        type: 'normal',
        name: key,
        label: loc.label,
      })
    );
    const housesNext: SpawnOption[] = (data.houses ?? []).map((h) => ({
      type: 'house',
      name: h.house,
      label: h.label,
    }));
    setPresets(presetsNext);
    setHouses(housesNext);
    setApartments([]);
    setIsNew(false);
    setFirstSpawn(!!data.firstSpawn);
    setSelected(null);
  });

  useNuiEvent<SetupAppartementsMessage>('setupAppartements', (data) => {
    const apartmentsNext: SpawnOption[] = Object.entries(
      data.locations ?? {}
    ).map(([key, loc]) => ({
      type: 'appartment',
      name: key,
      label: loc.label,
    }));
    setApartments(apartmentsNext);
    setPresets([]);
    setHouses([]);
    setIsNew(true);
    setFirstSpawn(!!data.firstSpawn);
    setSelected(null);
  });

  // ---------- Selection wiring ----------

  const onPickLocation = (option: SpawnOption) => {
    setSelected(option);
    // Only `normal` triggers a camera fly-in upstream; preserve that —
    // current/house/apartment have their cameras handled differently
    // (current uses the player's stored position, house/apartment use
    // qb-houses/qb-apartments configs which the client looks up).
    if (option.type === 'normal') {
      void fetchNui('setCam', { posname: option.name, type: option.type });
    } else if (option.type === 'house' || option.type === 'appartment') {
      void fetchNui('setCam', { posname: option.name, type: option.type });
    } else if (option.type === 'current') {
      void fetchNui('setCam', { posname: 'current', type: 'current' });
    }
  };

  const onConfirm = () => {
    if (!selected) return;
    if (selected.type === 'appartment') {
      void fetchNui('chooseAppa', { appType: selected.name });
    } else {
      void fetchNui('spawnplayer', {
        spawnloc: selected.name,
        typeLoc: selected.type,
      });
    }
  };

  const onBack = () => {
    void fetchNui('backToSelect');
  };

  // ---------- Memoized row groups ----------

  // Hide "Last Location" when:
  //   - isNew=true: only apartments are valid spawns for new char with
  //     Apartments.Starting=true (already covered by upstream contract).
  //   - firstSpawn=true: u-core marker for createCharacter where
  //     `cData.position` still points at the char creation interior;
  //     covers the Apartments.Starting=false branch where isNew=false
  //     but the last-location coords are still meaningless.
  const lastLocationOption: SpawnOption | null = useMemo(
    () =>
      isNew || firstSpawn
        ? null
        : { type: 'current', name: 'current', label: t('ui.last_location') },
    [isNew, firstSpawn, t]
  );

  if (!visible) return null;

  const hasOptions =
    apartments.length + presets.length + houses.length > 0 || !!lastLocationOption;

  return (
    <div className="fixed inset-0 font-serif text-gray-100 pointer-events-none">
      <div className="absolute right-4 top-4 bottom-4 w-[clamp(320px,32vw,460px)] flex flex-col gap-2.5 overflow-y-auto overflow-x-hidden pointer-events-auto">
        <Letterhead t={t} />

        <Paper className="flex flex-col px-5 py-4 animate-[fadeIn_240ms_ease-out_both]">
          <div className="flex flex-col divide-y divide-gray-800/60">
            {/* Header: stack eyebrow + title + prompt vertically. The
                prompt used to be a right-side badge, but its full text
                is the page's primary call-to-action — putting it in a
                shrink-0 sibling stole all the horizontal space and
                forced the h2 to truncate to "Spawn Sele…" even at the
                460px clamp upper bound. As a subtitle under the h2 it
                gets to wrap if needed and the title finally renders
                in full. */}
            <header className="pb-3">
              <p className="font-mono text-[8.5px] tracking-[0.35em] text-gray-500 uppercase truncate">
                {t('ui.section_header', { defaultValue: 'Section I · Departure' })}
              </p>
              <h2 className="font-display text-xl font-light leading-tight text-gray-100 mt-1.5">
                {t('ui.page_title', { defaultValue: 'Spawn Selector' })}
              </h2>
              <p className="font-mono text-[9px] tracking-[0.25em] text-gray-400 uppercase mt-2 leading-snug">
                {t('ui.where_would_you_like_to_start')}
              </p>
            </header>

            {lastLocationOption && (
              <SpawnGroup
                label={t('ui.last_location')}
                hideGroupHeader
                options={[lastLocationOption]}
                selected={selected}
                onPick={onPickLocation}
                Icon={Navigation}
              />
            )}

            {presets.length > 0 && (
              <SpawnGroup
                label={t('ui.preset_spawns', { defaultValue: 'Preset Spawns' })}
                options={presets}
                selected={selected}
                onPick={onPickLocation}
                Icon={MapPin}
              />
            )}

            {houses.length > 0 && (
              <SpawnGroup
                label={t('ui.your_houses', { defaultValue: 'Your Houses' })}
                options={houses}
                selected={selected}
                onPick={onPickLocation}
                Icon={Home}
              />
            )}

            {apartments.length > 0 && (
              <SpawnGroup
                label={t('ui.available_apartments', { defaultValue: 'Available Apartments' })}
                options={apartments}
                selected={selected}
                onPick={onPickLocation}
                Icon={Building2}
              />
            )}
          </div>

          {/* Back is always visible (left); Confirm only renders once
              the player picks a spawn (right). Both use the same
              <Button> primitive so footer height is constant whether
              one or two buttons are shown — no reflow on selection. */}
          <footer className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-gray-800/60">
            <Button variant="secondary" onClick={onBack}>
              <ArrowLeft />
              {t('ui.back', { defaultValue: 'Back' })}
            </Button>
            {selected ? (
              <Button onClick={onConfirm}>
                <Play />
                {t('ui.confirm')}
              </Button>
            ) : (
              <span className="inline-flex items-center px-3 py-1.5 border-b border-transparent font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground/70">
                {hasOptions ? '' : '—'}
              </span>
            )}
          </footer>
        </Paper>
      </div>
    </div>
  );
}

// `t` is typed loosely here so we can pass i18n options (defaultValue)
// without forcing TFunction's full generic signature into the prop.
function Letterhead({
  t,
}: {
  t: (k: string, opts?: { defaultValue?: string }) => string;
}) {
  return (
    <Paper className="px-5 py-4 shrink-0 animate-[fadeIn_240ms_ease-out_both]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[8.5px] tracking-[0.35em] text-gray-500 uppercase truncate">
            {t('ui.letterhead_title', { defaultValue: 'Field Office' })}
          </p>
          <h1 className="font-display text-2xl font-light leading-tight text-gray-50 mt-1 truncate">
            {t('ui.letterhead_subtitle', { defaultValue: 'Spawn Coordinator' })}
          </h1>
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono text-[8.5px] tracking-[0.3em] text-gray-500 uppercase">
            {t('ui.form_id', { defaultValue: 'FORM S-08' })}
          </p>
          <p className="font-mono text-[9.5px] tracking-[0.25em] text-gray-400 mt-1">
            rev. 2026
          </p>
        </div>
      </div>
    </Paper>
  );
}

interface SpawnGroupProps {
  label: string;
  options: SpawnOption[];
  selected: SpawnOption | null;
  onPick: (option: SpawnOption) => void;
  /** Skip rendering the group header eyebrow — used for the
   *  single-row "Last Location" group where a label would feel
   *  redundant. */
  hideGroupHeader?: boolean;
  // Forwarded as a JSX component so each group's icon stays consistent
  // without each option carrying its own lookup.
  Icon: typeof MapPin;
}

function SpawnGroup({
  label,
  options,
  selected,
  onPick,
  hideGroupHeader,
  Icon,
}: SpawnGroupProps) {
  return (
    <div className="flex flex-col">
      {!hideGroupHeader && (
        <p className="font-mono text-[8px] tracking-[0.4em] uppercase text-gray-500 px-1 pt-2.5 pb-1">
          {label}
        </p>
      )}
      <div className="flex flex-col">
        {options.map((option) => {
          const isSelected =
            selected?.type === option.type && selected?.name === option.name;
          return (
            <button
              key={`${option.type}:${option.name}`}
              type="button"
              onClick={() => onPick(option)}
              // Same row vocabulary as qb-multicharacter's SlotRow:
              // border-l-2 always reserved (transparent → brand on
              // selected) so picking never shifts horizontal layout.
              className={[
                'group cursor-pointer outline-none text-left',
                'grid grid-cols-[1.75rem_1fr_auto] items-center gap-2.5',
                'px-3 py-2.5 border-l-2',
                'transition-colors duration-150',
                'focus-visible:ring-1 focus-visible:ring-brand-500/60',
                isSelected
                  ? 'border-brand-500/70 bg-brand-500/[0.04]'
                  : 'border-transparent hover:bg-gray-100/[0.025]',
              ].join(' ')}
            >
              <Icon
                className={[
                  'h-4 w-4 transition-colors duration-150',
                  isSelected
                    ? 'text-brand-400'
                    : 'text-gray-500 group-hover:text-gray-300',
                ].join(' ')}
                strokeWidth={1.5}
              />
              <span
                className={[
                  'font-display text-[15px] font-light leading-tight truncate',
                  isSelected ? 'text-gray-50' : 'text-gray-200',
                ].join(' ')}
              >
                {option.label}
              </span>
              {isSelected && (
                <span className="font-mono text-[8.5px] tracking-[0.3em] text-brand-400 uppercase shrink-0">
                  ▸&nbsp;Selected
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Silence unused-import if useEffect ever drops out of edits — kept on
// hand for downstream extensions like keyboard nav.
void useEffect;
