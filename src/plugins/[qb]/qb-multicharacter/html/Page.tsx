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

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatIsoDate(d: Date | null): string {
  if (!d) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
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

  const validateForm = (): FieldErrors => {
    const errors: FieldErrors = {};
    const required = t('ui.forgotten_field');
    if (!registerData.firstname.trim() || registerData.firstname.trim().length < 2) {
      errors.firstname = required;
    }
    if (!registerData.lastname.trim() || registerData.lastname.trim().length < 2) {
      errors.lastname = required;
    }
    if (!registerData.nationality.trim()) errors.nationality = required;
    if (!registerData.gender) errors.gender = required;
    if (!registerData.date) errors.date = required;
    return errors;
  };

  const onCreate = () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
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
            customNationality={customNationality}
            nationalityOptions={nationalityOptions}
            genderOptions={genderOptions}
            slotIndex={selectedIndex}
            totalSlots={characterAmount}
            onChange={updateRegister}
            onCancel={() => setScreen('characters')}
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
        style={{ animationDelay: `${mountDelay}ms` }}
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
            <Plus className="text-lg text-gray-600 group-hover:text-brand-400 transition-colors" />
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
  customNationality: boolean;
  nationalityOptions: Array<{ label: string; value: string }>;
  genderOptions: Array<{ label: string; value: string }>;
  slotIndex: number;
  totalSlots: number;
  onChange: (patch: Partial<RegisterFormData>) => void;
  onCancel: () => void;
  onCreate: () => void;
  t: (k: string) => string;
}

function RegisterPanel({
  data,
  fieldErrors,
  customNationality,
  nationalityOptions,
  genderOptions,
  slotIndex,
  totalSlots,
  onChange,
  onCancel,
  onCreate,
  t,
}: RegisterPanelProps) {
  return (
    <>
      {/* Section header in its own paper — matches the letterhead's
          padding and weight so the form has a clear visual root. */}
      <Paper className="px-5 py-4 shrink-0">
        <div className="flex items-start justify-between gap-3">
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
        </div>
      </Paper>

      {/* Form fields paper. The Radix-based Select / DatePicker popups
          portal to document.body and pick their own collision-aware
          placement, so we no longer need z-index gymnastics on the
          form paper. */}
      <Paper className="px-5 py-4">
        <div className="grid grid-cols-1 gap-3">
          <Field
            id="qbm-firstname"
            label={t('ui.firstname')}
            error={fieldErrors.firstname}
          >
            <Input
              id="qbm-firstname"
              value={data.firstname}
              onChange={(e) => onChange({ firstname: e.target.value })}
              aria-invalid={!!fieldErrors.firstname}
            />
          </Field>
          <Field
            id="qbm-lastname"
            label={t('ui.lastname')}
            error={fieldErrors.lastname}
          >
            <Input
              id="qbm-lastname"
              value={data.lastname}
              onChange={(e) => onChange({ lastname: e.target.value })}
              aria-invalid={!!fieldErrors.lastname}
            />
          </Field>
          {customNationality ? (
            <Field
              id="qbm-nationality"
              label={t('ui.nationality')}
              error={fieldErrors.nationality}
            >
              <Input
                id="qbm-nationality"
                value={data.nationality}
                onChange={(e) => onChange({ nationality: e.target.value })}
                aria-invalid={!!fieldErrors.nationality}
              />
            </Field>
          ) : (
            <Field
              id="qbm-nationality"
              label={t('ui.nationality')}
              error={fieldErrors.nationality}
            >
              <Select
                value={data.nationality}
                onValueChange={(value) => onChange({ nationality: value })}
              >
                <SelectTrigger
                  id="qbm-nationality"
                  aria-invalid={!!fieldErrors.nationality}
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
            error={fieldErrors.gender}
          >
            <Select
              value={data.gender}
              onValueChange={(value) => onChange({ gender: value })}
            >
              <SelectTrigger
                id="qbm-gender"
                aria-invalid={!!fieldErrors.gender}
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
            onChange={(date) => onChange({ date: date ?? null })}
            error={fieldErrors.date}
          />
        </div>
      </Paper>

      {/* Action bar paper */}
      <Paper className="px-3.5 py-2.5 flex items-center justify-end gap-2 mt-auto">
        <Button variant="secondary" onClick={onCancel}>
          <X />
          {t('ui.cancel')}
        </Button>
        <Button onClick={onCreate}>
          <Play />
          {t('ui.create_button')}
        </Button>
      </Paper>
    </>
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
          className="font-mono text-[9px] tracking-[0.2em] uppercase text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
