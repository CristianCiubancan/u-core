import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import {
  Briefcase,
  Wallet,
  CircleDollarSign,
  Play,
  Trash2,
  Plus,
  X,
  Loader2,
} from 'lucide-react';

import { useNuiEvent } from '@/hooks/useNuiEvent';
import { fetchNui } from '@/utils/fetchNui';
import { isEnvBrowser } from '@/utils/misc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Paper from '@/components/ui/Paper';

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

const NAMESPACE = 'qb-multicharacter';
const BUNDLES: Record<string, unknown> = {
  ar, cs, de, en, es, fi, fr, it, ja, nl, 'pt-br': ptbr, pt, sv, tr, vi,
};
for (const [lng, resources] of Object.entries(BUNDLES)) {
  i18n.addResourceBundle(lng, NAMESPACE, resources, true, true);
}

interface CharInfo {
  firstname: string;
  lastname: string;
  birthdate: string;
  gender: number | string;
  nationality: string;
  phone?: string;
  account?: string;
  cid?: number | string;
}

interface MoneyInfo {
  cash: number;
  bank: number;
  crypto?: number;
}

interface JobInfo {
  name: string;
  label: string;
  grade?: { level: number; name: string };
  onduty?: boolean;
  isboss?: boolean;
}

interface CharacterRow {
  citizenid: string;
  cid: number;
  license: string;
  name?: string;
  charinfo: CharInfo;
  money: MoneyInfo;
  job: JobInfo;
  position?: string;
}

type Screen = 'loading' | 'characters' | 'register';

const NAME_MAX_LENGTH = 30;
const NATIONALITY_MAX_LENGTH = 40;
const MIN_AGE_YEARS = 18;
const MAX_AGE_YEARS = 100;

interface UiOpenMessage {
  action: 'ui';
  toggle: boolean;
  customNationality: boolean;
  enableDeleteButton: boolean;
  nChar: number;
  countries: string[];
  // Upstream client.lua sends a flat key→phrase map (the `ui.*` slice
  // of qb-multicharacter's Lang phrases, with the `ui.` prefix
  // stripped). Used as the source of truth for keys upstream
  // translates; our extra UI strings (letterhead_title,
  // section_i_roster, etc.) still come from i18next bundles with
  // English defaults.
  translations?: Record<string, string>;
}

interface SetupCharactersMessage {
  action: 'setupCharacters';
  characters: CharacterRow[];
}

const LOADING_STAGES = [
  'retrieving_playerdata',
  'retrieving_playerdata',
  'retrieving_playerdata',
  'validating_playerdata',
  'retrieving_characters',
  'retrieving_characters',
  'validating_characters',
] as const;

const dollar = new Intl.NumberFormat('en-US');

interface RegisterFormData {
  firstname: string;
  lastname: string;
  nationality: string;
  gender: string;
  date: Date | null;
}

const EMPTY_FORM: RegisterFormData = {
  firstname: '',
  lastname: '',
  nationality: '',
  gender: '',
  date: null,
};

type FieldErrors = Partial<Record<keyof RegisterFormData, string>>;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatIsoDate(d: Date | null): string {
  if (!d) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function shiftYears(base: Date, years: number): Date {
  const next = new Date(base);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

export default function Page() {
  const { t } = useTranslation(NAMESPACE);

  const [visible, setVisible] = useState<boolean>(isEnvBrowser());
  const [screen, setScreen] = useState<Screen>('loading');
  const [characterAmount, setCharacterAmount] = useState<number>(0);
  const [characters, setCharacters] = useState<Array<CharacterRow | null>>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [allowDelete, setAllowDelete] = useState<boolean>(true);
  const [customNationality, setCustomNationality] = useState<boolean>(false);
  const [nationalities, setNationalities] = useState<string[]>([]);
  const [loadingStage, setLoadingStage] = useState<number>(0);
  const [registerData, setRegisterData] = useState<RegisterFormData>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  // Upstream's Lang phrases (ui.* slice) flattened by client/main.lua's
  // openCharMenu. Used by tx() below to prefer upstream-provided
  // translations over our i18next defaults for the keys upstream
  // actually ships.
  const [upstream, setUpstream] = useState<Record<string, string>>({});

  // Upstream-aware translation helper. For keys upstream's locales/*.lua
  // ships, prefer the value from the `translations` payload; otherwise
  // fall back to the i18next bundle (with an English defaultValue).
  const tx = (suffix: string, fallback: string): string =>
    upstream[suffix] ?? t(`ui.${suffix}`, { defaultValue: fallback });

  const dateBounds = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      max: shiftYears(today, -MIN_AGE_YEARS),
      min: shiftYears(today, -MAX_AGE_YEARS),
    };
  }, []);

  const timersRef = useRef<{ stage?: number; setup?: number; finish?: number }>(
    {}
  );

  useNuiEvent<UiOpenMessage>('ui', (data) => {
    setCustomNationality(!!data.customNationality);
    setAllowDelete(!!data.enableDeleteButton);
    setCharacterAmount(data.nChar);
    setNationalities(Array.isArray(data.countries) ? data.countries : []);
    setSelectedIndex(-1);
    setFieldErrors({});
    setRegisterData(EMPTY_FORM);
    setDeleteOpen(false);
    if (data.translations) setUpstream(data.translations);

    if (timersRef.current.stage !== undefined) {
      window.clearInterval(timersRef.current.stage);
    }
    if (timersRef.current.setup !== undefined) {
      window.clearTimeout(timersRef.current.setup);
    }
    if (timersRef.current.finish !== undefined) {
      window.clearTimeout(timersRef.current.finish);
    }
    timersRef.current = {};

    if (data.toggle) {
      setVisible(true);
      setScreen('loading');
      setLoadingStage(0);

      timersRef.current.stage = window.setInterval(() => {
        setLoadingStage((s) => Math.min(s + 1, LOADING_STAGES.length - 1));
      }, 500);

      timersRef.current.setup = window.setTimeout(() => {
        void fetchNui('setupCharacters');
      }, 2000);

      timersRef.current.finish = window.setTimeout(() => {
        if (timersRef.current.stage !== undefined) {
          window.clearInterval(timersRef.current.stage);
          timersRef.current.stage = undefined;
        }
        setScreen('characters');
        setLoadingStage(0);
        void fetchNui('removeBlur');
      }, 4000);
    } else {
      setVisible(isEnvBrowser());
      setScreen('loading');
    }
  });

  useNuiEvent<SetupCharactersMessage>('setupCharacters', (data) => {
    const max = characterAmount > 0 ? characterAmount : 5;
    const slots: Array<CharacterRow | null> = new Array(max + 1).fill(null);
    for (const row of data.characters ?? []) {
      const cid = typeof row.cid === 'number' ? row.cid : Number(row.cid);
      if (Number.isFinite(cid) && cid >= 1 && cid <= max) {
        slots[cid] = row;
      }
    }
    setCharacters(slots);
  });

  useEffect(() => {
    if (characterAmount > 0) {
      setCharacters((prev) => {
        const next = new Array<CharacterRow | null>(characterAmount + 1).fill(null);
        for (let i = 1; i < Math.min(prev.length, next.length); i++) {
          next[i] = prev[i] ?? null;
        }
        return next;
      });
    }
  }, [characterAmount]);

  const onSlotClick = (index: number) => {
    setSelectedIndex(index);
    const existing = characters[index];
    if (existing) {
      void fetchNui('cDataPed', { cData: existing });
      setScreen('characters');
    } else {
      setRegisterData(EMPTY_FORM);
      setFieldErrors({});
      void fetchNui('cDataPed', {});
      setScreen('register');
    }
  };

  const onPlay = () => {
    if (selectedIndex < 1) return;
    const cData = characters[selectedIndex];
    if (!cData) return;
    void fetchNui('selectCharacter', { cData });
    setScreen('loading');
  };

  const onConfirmDelete = () => {
    if (selectedIndex < 1) return;
    const cData = characters[selectedIndex];
    if (!cData) return;
    void fetchNui('removeCharacter', { citizenid: cData.citizenid });
    setVisible(false);
    setDeleteOpen(false);
    setScreen('characters');
  };

  const updateRegister = (patch: Partial<RegisterFormData>) => {
    setRegisterData((prev) => {
      const next = { ...prev, ...patch };
      if (patch.gender !== undefined && patch.gender !== prev.gender) {
        void fetchNui('cDataPed', { gender: patch.gender });
      }
      return next;
    });
    setFieldErrors((prev) => {
      let touched = false;
      for (const key of Object.keys(patch)) {
        if (prev[key as keyof RegisterFormData] !== undefined) {
          touched = true;
          break;
        }
      }
      if (!touched) return prev;
      const cleared = { ...prev };
      for (const key of Object.keys(patch)) {
        delete cleared[key as keyof RegisterFormData];
      }
      return cleared;
    });
  };

  const validateField = (
    key: keyof RegisterFormData,
    snapshot: RegisterFormData = registerData
  ): string | undefined => {
    const required = t('ui.error_required', { defaultValue: 'Required' });
    const tooShort = t('ui.error_too_short', {
      defaultValue: 'At least 2 characters',
    });
    const pickOption = t('ui.error_pick_option', {
      defaultValue: 'Pick an option',
    });
    const pickDate = t('ui.error_pick_date', { defaultValue: 'Pick a date' });
    const dateRange = t('ui.error_date_range', {
      defaultValue: 'Out of allowed range',
    });

    switch (key) {
      case 'firstname':
      case 'lastname': {
        const v = snapshot[key]?.trim() ?? '';
        if (v.length === 0) return required;
        if (v.length < 2) return tooShort;
        return undefined;
      }
      case 'nationality':
        if (!snapshot.nationality.trim()) {
          return customNationality ? required : pickOption;
        }
        return undefined;
      case 'gender':
        return snapshot.gender ? undefined : pickOption;
      case 'date': {
        if (!snapshot.date) return pickDate;
        const time = snapshot.date.getTime();
        if (time < dateBounds.min.getTime() || time > dateBounds.max.getTime()) {
          return dateRange;
        }
        return undefined;
      }
    }
  };

  const validateAll = (
    snapshot: RegisterFormData = registerData
  ): FieldErrors => {
    const errors: FieldErrors = {};
    (Object.keys(snapshot) as Array<keyof RegisterFormData>).forEach((k) => {
      const msg = validateField(k, snapshot);
      if (msg) errors[k] = msg;
    });
    return errors;
  };

  const onCreate = () => {
    const errors = validateAll();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    // Upstream client/main.lua's createNewCharacter callback does:
    //   if cData.gender == Lang:t('ui.male') then cData.gender = 0
    //   elseif cData.gender == Lang:t('ui.female') then cData.gender = 1
    // i.e. it expects the localized phrase string and normalizes to
    // 0/1 server-side. We send the localized phrase to match — that
    // string is whatever upstream's `translations` payload provided
    // for `male`/`female`, so it round-trips against Lang:t() exactly.
    const genderLabel = registerData.gender === 'female'
      ? tx('female', 'Female')
      : tx('male', 'Male');
    const payload = {
      firstname: registerData.firstname.trim(),
      lastname: registerData.lastname.trim(),
      nationality: registerData.nationality.trim(),
      birthdate: formatIsoDate(registerData.date),
      gender: genderLabel,
      cid: selectedIndex,
    };
    void fetchNui('createNewCharacter', payload);
    setScreen('loading');
  };

  const onCancelRegister = () => {
    setRegisterData(EMPTY_FORM);
    setFieldErrors({});
    setSelectedIndex(-1);
    setScreen('characters');
  };

  useEffect(() => {
    if (screen !== 'register') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const popoverOpen = document.querySelector(
        '[data-radix-popper-content-wrapper]'
      );
      if (popoverOpen) return;
      onCancelRegister();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  const slots = useMemo(() => {
    const out: Array<{ index: number; data: CharacterRow | null }> = [];
    for (let i = 1; i <= characterAmount; i++) {
      out.push({ index: i, data: characters[i] ?? null });
    }
    return out;
  }, [characters, characterAmount]);

  const nationalityOptions = useMemo(
    () => nationalities.map((c) => ({ label: c, value: c })),
    [nationalities]
  );

  const genderOptions = useMemo(
    () => [
      { label: tx('male', 'Male'), value: 'male' },
      { label: tx('female', 'Female'), value: 'female' },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [upstream, t]
  );

  if (!visible) return null;

  const stageKey = LOADING_STAGES[loadingStage];
  const stageDefaults: Record<string, string> = {
    retrieving_playerdata: 'Retrieving player data',
    validating_playerdata: 'Validating player data',
    retrieving_characters: 'Retrieving characters',
    validating_characters: 'Validating characters',
  };
  const loadingText = tx(stageKey, stageDefaults[stageKey] ?? stageKey);

  return (
    <div className="fixed inset-0 font-serif text-gray-100 pointer-events-none">
      <div className="absolute right-4 top-4 bottom-4 w-[clamp(320px,32vw,460px)] flex flex-col gap-2.5 overflow-y-auto overflow-x-hidden pointer-events-auto">
        <Letterhead />

        {screen === 'loading' && <LoadingPanel text={loadingText} />}
        {screen === 'characters' && (
          <CharactersPanel
            slots={slots}
            selectedIndex={selectedIndex}
            allowDelete={allowDelete}
            onSlotClick={onSlotClick}
            onPlay={onPlay}
            onPrepareDelete={() => setDeleteOpen(true)}
            t={t}
            tx={tx}
          />
        )}
        {screen === 'register' && (
          <RegisterPanel
            data={registerData}
            fieldErrors={fieldErrors}
            customNationality={customNationality}
            nationalityOptions={nationalityOptions}
            genderOptions={genderOptions}
            slotIndex={selectedIndex}
            totalSlots={characterAmount}
            dateMin={dateBounds.min}
            dateMax={dateBounds.max}
            onChange={updateRegister}
            onCancel={onCancelRegister}
            onCreate={onCreate}
            t={t}
            tx={tx}
          />
        )}

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <p className="font-mono text-[9px] tracking-[0.4em] text-destructive uppercase">
                ✕ Void Record
              </p>
              <DialogTitle>
                {characters[selectedIndex]
                  ? `${characters[selectedIndex]!.charinfo.firstname} ${characters[selectedIndex]!.charinfo.lastname}`
                  : tx('deletechar_header', 'Delete Character')}
              </DialogTitle>
              <DialogDescription>
                {tx(
                  'deletechar_description',
                  'Are You Sure You Want To Delete Your Character?'
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
                <X />
                {tx('cancel', 'Cancel')}
              </Button>
              <Button variant="destructive" onClick={onConfirmDelete}>
                <Trash2 />
                {tx('confirm', 'Confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function Letterhead() {
  const { t } = useTranslation(NAMESPACE);
  return (
    <Paper className="px-5 py-4 shrink-0">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-mono text-[8.5px] tracking-[0.35em] text-gray-500 uppercase truncate">
          {t('ui.letterhead_title', { defaultValue: 'Department of Citizen Affairs' })}
        </p>
        <div className="flex items-baseline gap-2 shrink-0 font-mono text-[8.5px]">
          <span className="tracking-[0.3em] text-gray-500 uppercase">
            {t('ui.form_id', { defaultValue: 'FORM C–07' })}
          </span>
          <span className="text-gray-700">·</span>
          <span className="text-gray-600">
            {t('ui.rev', {
              year: new Date().getFullYear(),
              defaultValue: 'rev. {{year}}',
            })}
          </span>
        </div>
      </div>

      <div className="mt-2">
        <h1 className="font-display text-[1.6rem] font-light leading-tight text-gray-50 truncate">
          {t('ui.letterhead_subtitle', { defaultValue: 'Identity Registry' })}
        </h1>
      </div>
    </Paper>
  );
}

function LoadingPanel({ text }: { text: string }) {
  const [dots, setDots] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setDots((d) => (d + 1) % 4), 350);
    return () => window.clearInterval(id);
  }, []);
  return (
    <Paper className="px-6 py-12 flex flex-col items-center justify-center gap-5">
      <div className="flex items-center gap-3">
        <span className="block h-px w-10 bg-gray-700" />
        <span className="font-mono text-[10px] tracking-[0.4em] text-gray-500 uppercase">
          processing
        </span>
        <span className="block h-px w-10 bg-gray-700" />
      </div>
      <p className="font-display text-xl text-gray-100 italic font-light text-center">
        {text}
        <span className="text-brand-400">{'.'.repeat(dots)}</span>
      </p>
    </Paper>
  );
}

interface CharactersPanelProps {
  slots: Array<{ index: number; data: CharacterRow | null }>;
  selectedIndex: number;
  allowDelete: boolean;
  onSlotClick: (index: number) => void;
  onPlay: () => void;
  onPrepareDelete: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
  tx: (suffix: string, fallback: string) => string;
}

function CharactersPanel({
  slots,
  selectedIndex,
  allowDelete,
  onSlotClick,
  onPlay,
  onPrepareDelete,
  t,
  tx,
}: CharactersPanelProps) {
  const selected = slots.find((s) => s.index === selectedIndex);
  const showActions = selected?.data;

  const filledCount = slots.filter((s) => s.data).length;

  return (
    <Paper className="flex flex-col px-5 py-4 animate-[fadeIn_240ms_ease-out_both]">
      <div className="flex flex-col divide-y divide-gray-800/60">
        <header className="pb-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-mono text-[8.5px] tracking-[0.35em] text-gray-500 uppercase truncate">
              {t('ui.section_i_roster', { defaultValue: 'Section I · Roster' })}
            </p>
            <span className="font-mono text-[8.5px] tracking-[0.3em] text-gray-400 uppercase shrink-0">
              {t('ui.on_record', {
                filled: filledCount,
                total: slots.length,
                defaultValue: '{{filled}}/{{total}} on record',
              })}
            </span>
          </div>
          <h2 className="font-display text-xl font-light leading-tight text-gray-100 mt-1.5">
            {tx('characters_header', 'My Characters')}
          </h2>
        </header>
        {slots.map(({ index, data }, idx) => (
          <SlotRow
            key={index}
            index={index}
            data={data}
            isSelected={index === selectedIndex}
            onClick={() => onSlotClick(index)}
            t={t}
            tx={tx}
            mountDelay={idx * 50}
          />
        ))}
      </div>

      <footer className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-gray-800/60">
        {showActions ? (
          <>
            <Button onClick={onPlay}>
              <Play />
              {tx('play_button', 'Play')}
            </Button>
            {allowDelete && (
              <Button variant="destructive" onClick={onPrepareDelete}>
                <Trash2 />
                {tx('delete_button', 'Delete Character')}
              </Button>
            )}
          </>
        ) : (
          <span className="inline-flex items-center px-3 py-1.5 border-b border-transparent font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground/70">
            {t('ui.select_a_file_hint', { defaultValue: 'Select a file' })}
          </span>
        )}
      </footer>
    </Paper>
  );
}

interface SlotRowProps {
  index: number;
  data: CharacterRow | null;
  isSelected: boolean;
  onClick: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
  tx: (suffix: string, fallback: string) => string;
  mountDelay: number;
}

function SlotRow({
  index,
  data,
  isSelected,
  onClick,
  t,
  tx,
  mountDelay,
}: SlotRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{ animationDelay: `${mountDelay}ms` }}
      className={[
        'group cursor-pointer outline-none',
        'grid grid-cols-[2.75rem_1fr_auto] items-center gap-2.5',
        'px-3 py-2.5 border-l-2',
        'transition-colors duration-150',
        'animate-[fadeIn_300ms_ease-out_both]',
        'focus-visible:ring-1 focus-visible:ring-brand-500/60',
        isSelected
          ? 'border-brand-500/70 bg-brand-500/[0.04]'
          : 'border-transparent hover:bg-gray-100/[0.025]',
      ].join(' ')}
    >
      <div className="font-mono text-[8.5px] tracking-[0.25em] text-gray-500 uppercase leading-tight">
        <div className="text-gray-600">File</div>
        <div className="text-gray-200 text-[15px] font-display tracking-normal leading-tight">
          {String(index).padStart(2, '0')}
        </div>
      </div>

      <div className="min-w-0">
        {data ? <SlotIdentity data={data} /> : <SlotEmpty tx={tx} />}
      </div>

      <div className="shrink-0">
        {isSelected && data && (
          <span className="font-mono text-[8.5px] tracking-[0.3em] text-brand-400 uppercase">
            ▸&nbsp;{t('ui.active_badge', { defaultValue: 'Active' })}
          </span>
        )}
        {!data && (
          <Plus
            className="h-4 w-4 text-gray-600 group-hover:text-brand-400 transition-colors duration-150"
            strokeWidth={1.5}
          />
        )}
      </div>
    </div>
  );
}

function SlotIdentity({ data }: { data: CharacterRow }) {
  const fullName = `${data.charinfo.firstname} ${data.charinfo.lastname}`.trim();
  return (
    <>
      <p className="font-display text-[15px] font-light text-gray-50 leading-tight truncate">
        {fullName || '—'}
      </p>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 font-mono text-[9.5px] text-gray-400">
        <span className="inline-flex items-center gap-1 truncate max-w-full">
          <Briefcase className="text-gray-500 shrink-0" />
          <span className="truncate">{data.job?.label ?? '—'}</span>
        </span>
        <span className="inline-flex items-center gap-1 shrink-0">
          <CircleDollarSign className="text-gray-500" />
          ${dollar.format(data.money?.cash ?? 0)}
        </span>
        <span className="inline-flex items-center gap-1 shrink-0">
          <Wallet className="text-gray-500" />
          ${dollar.format(data.money?.bank ?? 0)}
        </span>
      </div>
    </>
  );
}

function SlotEmpty({ tx }: { tx: (suffix: string, fallback: string) => string }) {
  return (
    <div className="font-mono text-[9.5px] tracking-[0.25em] text-gray-500 uppercase group-hover:text-gray-300 transition-colors truncate">
      {tx('create_button', 'Create Character')}
    </div>
  );
}

interface RegisterPanelProps {
  data: RegisterFormData;
  fieldErrors: FieldErrors;
  customNationality: boolean;
  nationalityOptions: Array<{ label: string; value: string }>;
  genderOptions: Array<{ label: string; value: string }>;
  slotIndex: number;
  totalSlots: number;
  dateMin: Date;
  dateMax: Date;
  onChange: (patch: Partial<RegisterFormData>) => void;
  onCancel: () => void;
  onCreate: () => void;
  t: (k: string, options?: Record<string, unknown>) => string;
  tx: (suffix: string, fallback: string) => string;
}

function RegisterPanel({
  data,
  fieldErrors,
  customNationality,
  nationalityOptions,
  genderOptions,
  slotIndex,
  totalSlots,
  dateMin,
  dateMax,
  onChange,
  onCancel,
  onCreate,
  t,
  tx,
}: RegisterPanelProps) {
  const visibleError = (key: keyof RegisterFormData) => fieldErrors[key];

  const [openSelect, setOpenSelect] = useState<
    'nationality' | 'gender' | null
  >(null);
  const selectOpenChange =
    (key: 'nationality' | 'gender') => (open: boolean) =>
      setOpenSelect(open ? key : (cur) => (cur === key ? null : cur));

  const [nationalityReady, setNationalityReady] = useState(false);
  useEffect(() => {
    if (openSelect !== 'nationality') {
      setNationalityReady(false);
      return;
    }
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setNationalityReady(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      if (inner) cancelAnimationFrame(inner);
    };
  }, [openSelect]);

  const nationalityItems = useMemo(
    () =>
      nationalityOptions.map((opt) => (
        <SelectItem key={opt.value} value={opt.value}>
          {opt.label}
        </SelectItem>
      )),
    [nationalityOptions]
  );
  const genderItems = useMemo(
    () =>
      genderOptions.map((opt) => (
        <SelectItem key={opt.value} value={opt.value}>
          {opt.label}
        </SelectItem>
      )),
    [genderOptions]
  );

  return (
    <Paper className="flex flex-col px-5 py-4 animate-[fadeIn_240ms_ease-out_both]">
      <form
        className="contents"
        onSubmit={(e) => {
          e.preventDefault();
          onCreate();
        }}
        noValidate
      >
        <header className="flex items-start justify-between gap-3 pb-3 mb-4 border-b border-gray-800/60">
          <div className="min-w-0">
            <p className="font-mono text-[8.5px] tracking-[0.35em] text-gray-500 uppercase truncate">
              {t('ui.section_ii_enrollment', {
                defaultValue: 'Section II · Enrollment',
              })}
            </p>
            <h2 className="font-display text-xl font-light leading-tight text-gray-100 mt-1.5 truncate">
              {tx('chardel_header', 'Character Registration')}
            </h2>
          </div>
          <span className="font-mono text-[8.5px] tracking-[0.3em] text-gray-400 uppercase shrink-0">
            {t('ui.file_progress', {
              current: String(slotIndex).padStart(2, '0'),
              total: String(totalSlots).padStart(2, '0'),
              defaultValue: 'File {{current}}/{{total}}',
            })}
          </span>
        </header>

        <div className="grid grid-cols-1 gap-3">
          <Field
            id="qbm-firstname"
            label={tx('firstname', 'First Name')}
            error={visibleError('firstname')}
          >
            <Input
              id="qbm-firstname"
              value={data.firstname}
              onChange={(e) => onChange({ firstname: e.target.value })}
              aria-invalid={!!visibleError('firstname')}
              aria-describedby={
                visibleError('firstname') ? 'qbm-firstname-error' : undefined
              }
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={NAME_MAX_LENGTH}
            />
          </Field>
          <Field
            id="qbm-lastname"
            label={tx('lastname', 'Last Name')}
            error={visibleError('lastname')}
          >
            <Input
              id="qbm-lastname"
              value={data.lastname}
              onChange={(e) => onChange({ lastname: e.target.value })}
              aria-invalid={!!visibleError('lastname')}
              aria-describedby={
                visibleError('lastname') ? 'qbm-lastname-error' : undefined
              }
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={NAME_MAX_LENGTH}
            />
          </Field>
          {customNationality ? (
            <Field
              id="qbm-nationality"
              label={tx('nationality', 'Nationality')}
              error={visibleError('nationality')}
            >
              <Input
                id="qbm-nationality"
                value={data.nationality}
                onChange={(e) => onChange({ nationality: e.target.value })}
                aria-invalid={!!visibleError('nationality')}
                aria-describedby={
                  visibleError('nationality')
                    ? 'qbm-nationality-error'
                    : undefined
                }
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={NATIONALITY_MAX_LENGTH}
              />
            </Field>
          ) : (
            <Field
              id="qbm-nationality"
              label={tx('nationality', 'Nationality')}
              error={visibleError('nationality')}
            >
              <Select
                value={data.nationality}
                open={openSelect === 'nationality'}
                onOpenChange={selectOpenChange('nationality')}
                onValueChange={(value) => onChange({ nationality: value })}
              >
                <SelectTrigger
                  id="qbm-nationality"
                  aria-invalid={!!visibleError('nationality')}
                  aria-describedby={
                    visibleError('nationality')
                      ? 'qbm-nationality-error'
                      : undefined
                  }
                >
                  <SelectValue placeholder={tx('nationality', 'Nationality')}>
                    {data.nationality || undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {nationalityReady ? (
                    nationalityItems
                  ) : (
                    <div
                      className="flex items-center justify-center gap-2 py-6 font-mono text-[9.5px] tracking-[0.3em] uppercase text-muted-foreground/70"
                      role="status"
                      aria-live="polite"
                    >
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Loading</span>
                    </div>
                  )}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field
            id="qbm-gender"
            label={tx('gender', 'Gender')}
            error={visibleError('gender')}
          >
            <Select
              value={data.gender}
              open={openSelect === 'gender'}
              onOpenChange={selectOpenChange('gender')}
              onValueChange={(value) => onChange({ gender: value })}
            >
              <SelectTrigger
                id="qbm-gender"
                aria-invalid={!!visibleError('gender')}
                aria-describedby={
                  visibleError('gender') ? 'qbm-gender-error' : undefined
                }
              >
                <SelectValue placeholder={tx('gender', 'Gender')} />
              </SelectTrigger>
              <SelectContent>{genderItems}</SelectContent>
            </Select>
          </Field>
          <DatePicker
            id="qbm-birthdate"
            label={tx('birthdate', 'Birthdate')}
            selected={data.date}
            onChange={(date) => onChange({ date: date ?? null })}
            error={visibleError('date')}
            minDate={dateMin}
            maxDate={dateMax}
            defaultMonth={dateMax}
            yearNav
            placeholder={tx('birthdate', 'Birthdate')}
          />
        </div>

        <footer className="flex items-center justify-end gap-2 pt-3 mt-4 min-h-12 border-t border-gray-800/60">
          <Button
            type="button"
            variant="secondary"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onCancel}
          >
            <X />
            {tx('cancel', 'Cancel')}
          </Button>
          <Button type="submit">
            <Play />
            {tx('create_button', 'Create Character')}
          </Button>
        </footer>
      </form>
    </Paper>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className={error ? 'text-destructive' : undefined}
      >
        {label}
      </Label>
      {children}
      {error && (
        <p
          id={`${id}-error`}
          className="font-mono text-[9px] tracking-[0.2em] uppercase text-destructive animate-[fadeIn_180ms_ease-out_both]"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
