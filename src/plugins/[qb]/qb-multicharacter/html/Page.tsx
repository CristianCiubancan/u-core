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

import type {
  CharacterRow,
  NewCharacterPayload,
} from '../shared/types';

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
  locale?: string;
}

interface SetupCharactersMessage {
  action: 'setupCharacters';
  characters: CharacterRow[];
}

const LOADING_STAGES = [
  'ui.retrieving_playerdata',
  'ui.retrieving_playerdata',
  'ui.retrieving_playerdata',
  'ui.validating_playerdata',
  'ui.retrieving_characters',
  'ui.retrieving_characters',
  'ui.validating_characters',
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
type FieldTouched = Partial<Record<keyof RegisterFormData, boolean>>;

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
  const [fieldTouched, setFieldTouched] = useState<FieldTouched>({});
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);

  // Bounds for the birthdate picker. Recomputed once per session — fine
  // since the player is unlikely to keep this menu open across midnight.
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

  // ---------- NUI inbound ----------

  useNuiEvent<UiOpenMessage>('ui', (data) => {
    if (data.locale && BUNDLES[data.locale] && i18n.language !== data.locale) {
      void i18n.changeLanguage(data.locale);
    }

    setCustomNationality(!!data.customNationality);
    setAllowDelete(!!data.enableDeleteButton);
    setCharacterAmount(data.nChar);
    setNationalities(Array.isArray(data.countries) ? data.countries : []);
    setSelectedIndex(-1);
    setFieldErrors({});
    setFieldTouched({});
    setRegisterData(EMPTY_FORM);
    setDeleteOpen(false);

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

  // ---------- Slot interaction ----------

  const onSlotClick = (index: number) => {
    setSelectedIndex(index);
    const existing = characters[index];
    if (existing) {
      void fetchNui('cDataPed', { cData: existing });
      setScreen('characters');
    } else {
      setRegisterData(EMPTY_FORM);
      setFieldErrors({});
      setFieldTouched({});
      void fetchNui('cDataPed', {});
      setScreen('register');
    }
  };

  // ---------- Actions ----------

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
    setDeleteOpen(false);
    setScreen('characters');
  };

  const updateRegister = (patch: Partial<RegisterFormData>) => {
    setRegisterData((prev) => {
      const next = { ...prev, ...patch };
      // Re-render the preview ped when gender flips so the player can see
      // the model swap mid-form. Empty cData payload tells the client this
      // is the "no character yet" branch; it picks the model from `gender`.
      if (patch.gender !== undefined && patch.gender !== prev.gender) {
        void fetchNui('cDataPed', { gender: patch.gender });
      }
      return next;
    });
    setFieldErrors((prev) => {
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
    const required = t('ui.forgotten_field');
    switch (key) {
      case 'firstname':
      case 'lastname': {
        const v = snapshot[key]?.trim() ?? '';
        return v.length < 2 ? required : undefined;
      }
      case 'nationality':
        return snapshot.nationality.trim() ? undefined : required;
      case 'gender':
        return snapshot.gender ? undefined : required;
      case 'date':
        return snapshot.date ? undefined : required;
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

  const handleFieldBlur = (key: keyof RegisterFormData) => {
    setFieldTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
    const msg = validateField(key);
    setFieldErrors((prev) => {
      // If validation passes, drop the error. If it fails, set it.
      if (!msg) {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      }
      if (prev[key] === msg) return prev;
      return { ...prev, [key]: msg };
    });
  };

  const onCreate = () => {
    const errors = validateAll();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Mark every field touched so the errors stay visible even if the
      // user blurs out without changing anything.
      setFieldTouched({
        firstname: true,
        lastname: true,
        nationality: true,
        gender: true,
        date: true,
      });
      return;
    }
    const payload: NewCharacterPayload = {
      firstname: registerData.firstname.trim(),
      lastname: registerData.lastname.trim(),
      nationality: registerData.nationality.trim(),
      birthdate: formatIsoDate(registerData.date),
      gender: registerData.gender === 'female' ? 1 : 0,
      cid: selectedIndex,
    };
    void fetchNui('createNewCharacter', payload);
    setScreen('loading');
  };

  const onCancelRegister = () => {
    setRegisterData(EMPTY_FORM);
    setFieldErrors({});
    setFieldTouched({});
    // Drop the empty-slot highlight when bailing out — leaving the
    // selected rail on a slot that no longer corresponds to anything
    // actionable made the action bar's "Select a file" hint feel
    // contradictory.
    setSelectedIndex(-1);
    setScreen('characters');
  };

  // Esc bails out of the register flow back to the slot grid. Scoped to
  // the register screen so we don't fight Radix's Dialog/Popover Esc
  // handlers (those stop propagation when open). Capture-phase listener
  // so we react before any portal'd primitive's bubble handler.
  useEffect(() => {
    if (screen !== 'register') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Don't bail if a popover/dialog is open — Radix handles those.
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

  // ---------- Derived ----------

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
      { label: t('ui.male'), value: 'male' },
      { label: t('ui.female'), value: 'female' },
    ],
    [t]
  );

  if (!visible) return null;

  return (
    <div className="fixed inset-0 font-serif text-gray-100 pointer-events-none">
      {/* Right column. The outer fixed wrapper stays pointer-events-none
          so the empty area doesn't eat unrelated UI hits, but the column
          itself takes pointer-events-auto — overflow-y-auto only scrolls
          when the element receives wheel events, and pointer-events-none
          would silently swallow them. The "gaps between papers" effect
          is purely visual; click-through doesn't matter because
          SetNuiFocus is on while the menu is up. */}
      <div className="absolute right-4 top-4 bottom-4 w-[clamp(320px,32vw,460px)] flex flex-col gap-2.5 overflow-y-auto overflow-x-hidden pointer-events-auto pr-1">
        <Letterhead />

        {screen === 'loading' && (
          <LoadingPanel text={t(LOADING_STAGES[loadingStage])} />
        )}
        {screen === 'characters' && (
          <CharactersPanel
            slots={slots}
            selectedIndex={selectedIndex}
            allowDelete={allowDelete}
            onSlotClick={onSlotClick}
            onPlay={onPlay}
            onPrepareDelete={() => setDeleteOpen(true)}
            t={t}
          />
        )}
        {screen === 'register' && (
          <RegisterPanel
            data={registerData}
            fieldErrors={fieldErrors}
            fieldTouched={fieldTouched}
            customNationality={customNationality}
            nationalityOptions={nationalityOptions}
            genderOptions={genderOptions}
            slotIndex={selectedIndex}
            totalSlots={characterAmount}
            dateMin={dateBounds.min}
            dateMax={dateBounds.max}
            onChange={updateRegister}
            onBlurField={handleFieldBlur}
            onCancel={onCancelRegister}
            onCreate={onCreate}
            t={t}
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
                  : t('ui.deletechar_header')}
              </DialogTitle>
              <DialogDescription>
                {t('ui.deletechar_description')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
                <X />
                {t('ui.cancel')}
              </Button>
              <Button variant="destructive" onClick={onConfirmDelete}>
                <Trash2 />
                {t('ui.confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// ============================================================
// Letterhead (its own paper, compact)
// ============================================================

function Letterhead() {
  return (
    <Paper className="px-5 py-4 shrink-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[8.5px] tracking-[0.35em] text-gray-500 uppercase truncate">
            Department of Citizen Affairs
          </p>
          <h1 className="font-display text-[1.6rem] font-light leading-tight mt-1.5 text-gray-50">
            Identity Registry
          </h1>
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono text-[8.5px] tracking-[0.3em] text-gray-500 uppercase">
            Form&nbsp;C–07
          </p>
          <p className="font-mono text-[8.5px] text-gray-600 mt-0.5">
            rev.&nbsp;{new Date().getFullYear()}
          </p>
        </div>
      </div>
    </Paper>
  );
}

// ============================================================
// Loading
// ============================================================

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

// ============================================================
// Character grid
// ============================================================

interface CharactersPanelProps {
  slots: Array<{ index: number; data: CharacterRow | null }>;
  selectedIndex: number;
  allowDelete: boolean;
  onSlotClick: (index: number) => void;
  onPlay: () => void;
  onPrepareDelete: () => void;
  t: (key: string) => string;
}

function CharactersPanel({
  slots,
  selectedIndex,
  allowDelete,
  onSlotClick,
  onPlay,
  onPrepareDelete,
  t,
}: CharactersPanelProps) {
  const selected = slots.find((s) => s.index === selectedIndex);
  const showActions = selected?.data;

  return (
    <>
      {/* Section header gets its own paper so it has the same visual
          weight as the letterhead above. Keeping headers as floating
          text broke the rhythm — sections looked unfinished compared
          to the rest of the stack. */}
      <Paper className="px-5 py-3 shrink-0">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-light leading-none text-gray-100 truncate">
            {t('ui.characters_header')}
          </h2>
          <span className="font-mono text-[8.5px] tracking-[0.3em] text-gray-400 uppercase shrink-0">
            {slots.filter((s) => s.data).length}/{slots.length} on record
          </span>
        </div>
      </Paper>

      {slots.map(({ index, data }, idx) => (
        <SlotRow
          key={index}
          index={index}
          data={data}
          isSelected={index === selectedIndex}
          onClick={() => onSlotClick(index)}
          t={t}
          mountDelay={idx * 50}
        />
      ))}

      <Paper className="px-3.5 py-2.5 flex items-center justify-end gap-2 mt-auto">
        {showActions ? (
          <>
            <Button onClick={onPlay}>
              <Play />
              {t('ui.play_button')}
            </Button>
            {allowDelete && (
              <Button variant="destructive" onClick={onPrepareDelete}>
                <Trash2 />
                {t('ui.delete_button')}
              </Button>
            )}
          </>
        ) : (
          <span className="font-mono text-[8.5px] tracking-[0.3em] text-gray-500 uppercase">
            Select a file
          </span>
        )}
      </Paper>
    </>
  );
}

interface SlotRowProps {
  index: number;
  data: CharacterRow | null;
  isSelected: boolean;
  onClick: () => void;
  t: (key: string) => string;
  mountDelay: number;
}

function SlotRow({
  index,
  data,
  isSelected,
  onClick,
  t,
  mountDelay,
}: SlotRowProps) {
  return (
    <Paper
      selected={isSelected}
      style={{ animationDelay: `${mountDelay}ms` }}
      className="group cursor-pointer transition-colors duration-200 hover:border-gray-700 focus-within:ring-1 focus-within:ring-brand-500/60 animate-[fadeIn_300ms_ease-out_both]"
    >
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
        className="grid grid-cols-[2.75rem_1fr_auto] items-center gap-2.5 px-3 py-2.5 outline-none"
      >
        {/* file number (left) */}
        <div className="font-mono text-[8.5px] tracking-[0.25em] text-gray-500 uppercase leading-tight">
          <div className="text-gray-600">File</div>
          <div className="text-gray-200 text-[15px] font-display tracking-normal leading-tight">
            {String(index).padStart(2, '0')}
          </div>
        </div>

        {/* identity (center) */}
        <div className="min-w-0">
          {data ? <SlotIdentity data={data} /> : <SlotEmpty t={t} />}
        </div>

        {/* status badge (right) */}
        <div className="shrink-0">
          {isSelected && data && (
            <span className="font-mono text-[8.5px] tracking-[0.3em] text-brand-400 uppercase">
              ▸&nbsp;Active
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
    </Paper>
  );
}

function SlotIdentity({ data }: { data: CharacterRow }) {
  const fullName = `${data.charinfo.firstname} ${data.charinfo.lastname}`.trim();
  return (
    <>
      <p className="font-display text-[15px] font-light text-gray-50 leading-tight truncate">
        {fullName || '—'}
      </p>
      {/* Stats wrap to a second row when the column is too narrow rather
          than truncating to "..." or pushing the active badge off-screen. */}
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

function SlotEmpty({ t }: { t: (k: string) => string }) {
  return (
    <div className="font-mono text-[9.5px] tracking-[0.25em] text-gray-500 uppercase group-hover:text-gray-300 transition-colors truncate">
      {t('ui.create_button')}
    </div>
  );
}

// ============================================================
// Register form
// ============================================================

interface RegisterPanelProps {
  data: RegisterFormData;
  fieldErrors: FieldErrors;
  fieldTouched: FieldTouched;
  customNationality: boolean;
  nationalityOptions: Array<{ label: string; value: string }>;
  genderOptions: Array<{ label: string; value: string }>;
  slotIndex: number;
  totalSlots: number;
  dateMin: Date;
  dateMax: Date;
  onChange: (patch: Partial<RegisterFormData>) => void;
  onBlurField: (key: keyof RegisterFormData) => void;
  onCancel: () => void;
  onCreate: () => void;
  t: (k: string) => string;
}

function RegisterPanel({
  data,
  fieldErrors,
  fieldTouched,
  customNationality,
  nationalityOptions,
  genderOptions,
  slotIndex,
  totalSlots,
  dateMin,
  dateMax,
  onChange,
  onBlurField,
  onCancel,
  onCreate,
  t,
}: RegisterPanelProps) {
  // Only surface error captions for fields the user has touched (or that
  // were force-touched on submit). Avoids screaming red on first paint.
  const visibleError = (key: keyof RegisterFormData) =>
    fieldTouched[key] ? fieldErrors[key] : undefined;

  return (
    <Paper className="flex flex-col px-5 py-4 animate-[fadeIn_240ms_ease-out_both]">
      <form
        // display: contents lets the form participate in the Paper's
        // flex layout without nesting an extra block element. Native
        // submit semantics give us free Enter-to-submit.
        className="contents"
        onSubmit={(e) => {
          e.preventDefault();
          onCreate();
        }}
        noValidate
      >
        {/* Section header. The hairline below it is the visual seam
            between header and body — replaces the old "header paper +
            fields paper + action paper" stack with a single cohesive
            document. */}
        <header className="flex items-start justify-between gap-3 pb-3 mb-4 border-b border-gray-800/60">
          <div className="min-w-0">
            <p className="font-mono text-[8.5px] tracking-[0.35em] text-gray-500 uppercase truncate">
              Section II · Enrollment
            </p>
            <h2 className="font-display text-xl font-light leading-none text-gray-100 mt-1.5 truncate">
              {t('ui.chardel_header')}
            </h2>
          </div>
          <span className="font-mono text-[8.5px] tracking-[0.3em] text-gray-400 uppercase shrink-0">
            File&nbsp;{String(slotIndex).padStart(2, '0')}/
            {String(totalSlots).padStart(2, '0')}
          </span>
        </header>

        <div className="grid grid-cols-1 gap-3">
          <Field
            id="qbm-firstname"
            label={t('ui.firstname')}
            error={visibleError('firstname')}
          >
            <Input
              id="qbm-firstname"
              value={data.firstname}
              onChange={(e) => onChange({ firstname: e.target.value })}
              onBlur={() => onBlurField('firstname')}
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
            label={t('ui.lastname')}
            error={visibleError('lastname')}
          >
            <Input
              id="qbm-lastname"
              value={data.lastname}
              onChange={(e) => onChange({ lastname: e.target.value })}
              onBlur={() => onBlurField('lastname')}
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
              label={t('ui.nationality')}
              error={visibleError('nationality')}
            >
              <Input
                id="qbm-nationality"
                value={data.nationality}
                onChange={(e) => onChange({ nationality: e.target.value })}
                onBlur={() => onBlurField('nationality')}
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
              label={t('ui.nationality')}
              error={visibleError('nationality')}
            >
              <Select
                value={data.nationality}
                onValueChange={(value) => {
                  onChange({ nationality: value });
                  // Selects don't fire native blur the way Inputs do;
                  // we mark the field touched on selection. We DON'T
                  // attach onBlur to SelectTrigger — doing that triggers
                  // a parent setState during Radix's pointer flow and
                  // can leave a previously-open Select stuck open when
                  // the user clicks a sibling Select's trigger.
                  onBlurField('nationality');
                }}
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
                  <SelectValue placeholder={t('ui.nationality')} />
                </SelectTrigger>
                <SelectContent>
                  {nationalityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field
            id="qbm-gender"
            label={t('ui.gender')}
            error={visibleError('gender')}
          >
            <Select
              value={data.gender}
              onValueChange={(value) => {
                onChange({ gender: value });
                onBlurField('gender');
              }}
            >
              <SelectTrigger
                id="qbm-gender"
                aria-invalid={!!visibleError('gender')}
                aria-describedby={
                  visibleError('gender') ? 'qbm-gender-error' : undefined
                }
              >
                <SelectValue placeholder={t('ui.gender')} />
              </SelectTrigger>
              <SelectContent>
                {genderOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DatePicker
            id="qbm-birthdate"
            label={t('ui.birthdate')}
            selected={data.date}
            onChange={(date) => {
              onChange({ date: date ?? null });
              onBlurField('date');
            }}
            onBlur={() => onBlurField('date')}
            error={visibleError('date')}
            minDate={dateMin}
            maxDate={dateMax}
            defaultMonth={dateMax}
            yearNav
            placeholder={t('ui.birthdate')}
          />
        </div>

        <footer className="flex items-center justify-end gap-2 pt-3 mt-4 border-t border-gray-800/60">
          <Button type="button" variant="secondary" onClick={onCancel}>
            <X />
            {t('ui.cancel')}
          </Button>
          <Button type="submit">
            <Play />
            {t('ui.create_button')}
          </Button>
        </footer>
      </form>
    </Paper>
  );
}

// ============================================================
// Field — small wrapper that pairs a Label and inline error caption
// around any input primitive. Keeps the form fields visually aligned
// without each call site repeating the wrapper markup.
// ============================================================

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
