import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import {
  PiBriefcaseLight,
  PiBankLight,
  PiMoneyLight,
  PiPlayFill,
  PiTrashLight,
  PiPlusLight,
  PiXLight,
} from 'react-icons/pi';

import { useNuiEvent } from '../../../../webview/hooks/useNuiEvent';
import { fetchNui } from '../../../../webview/utils/fetchNui';
import { isEnvBrowser } from '../../../../webview/utils/misc';
import FormInput from '../../../../webview/components/forms/FormInput';
import FormSelect from '../../../../webview/components/forms/FormSelect';
import DatePicker from '../../../../webview/components/forms/DatePicker';

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
      {/* The right-side column is intentionally NOT a solid panel —
          individual "papers" stack with breathing room between them so
          the game world shows through the gaps. pointer-events-none on
          the column itself plus pointer-events-auto per paper means
          clicks fall through the gaps to FiveM. */}
      <div className="absolute right-4 top-4 bottom-4 w-[clamp(320px,32vw,460px)] flex flex-col gap-2.5 overflow-y-auto overflow-x-hidden pointer-events-none pr-1">
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

        {deleteOpen && screen === 'characters' && (
          <DeleteOverlay
            character={characters[selectedIndex] ?? null}
            onCancel={() => setDeleteOpen(false)}
            onConfirm={onConfirmDelete}
            t={t}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// Paper — base translucent tile with backdrop blur
// ============================================================

interface PaperProps {
  children: React.ReactNode;
  className?: string;
  selected?: boolean;
  interactive?: boolean;
}

function Paper({
  children,
  className = '',
  selected = false,
  interactive = false,
}: PaperProps) {
  return (
    <div
      className={[
        'relative bg-zinc-950/65 backdrop-blur-md border border-zinc-800/60',
        'shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
        'pointer-events-auto',
        interactive ? 'transition-colors duration-200' : '',
        selected
          ? 'border-brand-500/60 bg-zinc-900/70 shadow-[inset_2px_0_0_0_rgba(99,102,241,0.9),0_8px_32px_rgba(0,0,0,0.4)]'
          : '',
        className,
      ].join(' ')}
    >
      {children}
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
          <p className="font-mono text-[8.5px] tracking-[0.35em] text-zinc-500 uppercase truncate">
            Department of Citizen Affairs
          </p>
          <h1 className="font-display text-[1.6rem] font-light leading-tight mt-1.5 text-zinc-50">
            Identity Registry
          </h1>
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono text-[8.5px] tracking-[0.3em] text-zinc-500 uppercase">
            Form&nbsp;C–07
          </p>
          <p className="font-mono text-[8.5px] text-zinc-600 mt-0.5">
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
        <span className="block h-px w-10 bg-zinc-700" />
        <span className="font-mono text-[10px] tracking-[0.4em] text-zinc-500 uppercase">
          processing
        </span>
        <span className="block h-px w-10 bg-zinc-700" />
      </div>
      <p className="font-display text-xl text-zinc-100 italic font-light text-center">
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
      {/* Section header floats above the cards — no paper. text-shadow
          keeps it legible if the camera framing ever puts a bright
          surface behind the column. */}
      <div className="flex items-baseline justify-between gap-2 px-0.5 pt-1 pointer-events-none [text-shadow:_0_1px_4px_rgba(0,0,0,0.85)]">
        <h2 className="font-display text-lg font-light text-zinc-100 truncate">
          {t('ui.characters_header')}
        </h2>
        <span className="font-mono text-[8.5px] tracking-[0.3em] text-zinc-300 uppercase shrink-0">
          {slots.filter((s) => s.data).length}/{slots.length} on record
        </span>
      </div>

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
            <ActionLink
              icon={<PiPlayFill className="text-[13px]" />}
              label={t('ui.play_button')}
              onClick={onPlay}
              accent
            />
            {allowDelete && (
              <ActionLink
                icon={<PiTrashLight className="text-[13px]" />}
                label={t('ui.delete_button')}
                onClick={onPrepareDelete}
                danger
              />
            )}
          </>
        ) : (
          <span className="font-mono text-[8.5px] tracking-[0.3em] text-zinc-500 uppercase">
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
      interactive
      className="group cursor-pointer hover:border-zinc-700 focus-within:ring-1 focus-within:ring-brand-500/60 animate-[fadeIn_300ms_ease-out_both]"
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
        <div className="font-mono text-[8.5px] tracking-[0.25em] text-zinc-500 uppercase leading-tight">
          <div className="text-zinc-600">File</div>
          <div className="text-zinc-200 text-[15px] font-display tracking-normal leading-tight">
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
            <PiPlusLight className="text-lg text-zinc-600 group-hover:text-brand-400 transition-colors" />
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
      <p className="font-display text-[15px] font-light text-zinc-50 leading-tight truncate">
        {fullName || '—'}
      </p>
      {/* Stats wrap to a second row when the column is too narrow rather
          than truncating to "..." or pushing the active badge off-screen. */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 font-mono text-[9.5px] text-zinc-400">
        <span className="inline-flex items-center gap-1 truncate max-w-full">
          <PiBriefcaseLight className="text-zinc-500 shrink-0" />
          <span className="truncate">{data.job?.label ?? '—'}</span>
        </span>
        <span className="inline-flex items-center gap-1 shrink-0">
          <PiMoneyLight className="text-zinc-500" />
          ${dollar.format(data.money?.cash ?? 0)}
        </span>
        <span className="inline-flex items-center gap-1 shrink-0">
          <PiBankLight className="text-zinc-500" />
          ${dollar.format(data.money?.bank ?? 0)}
        </span>
      </div>
    </>
  );
}

function SlotEmpty({ t }: { t: (k: string) => string }) {
  return (
    <div className="font-mono text-[9.5px] tracking-[0.25em] text-zinc-500 uppercase group-hover:text-zinc-300 transition-colors truncate">
      {t('ui.create_button')}
    </div>
  );
}

// ============================================================
// Inline action link (text + icon, hairline border, no rounded glass pill)
// ============================================================

interface ActionLinkProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  accent?: boolean;
  danger?: boolean;
}

function ActionLink({ icon, label, onClick, accent, danger }: ActionLinkProps) {
  const tone = danger
    ? 'text-red-300 hover:text-red-200 border-red-500/40 hover:border-red-400'
    : accent
      ? 'text-brand-300 hover:text-brand-200 border-brand-500/50 hover:border-brand-400'
      : 'text-zinc-300 hover:text-zinc-100 border-zinc-700 hover:border-zinc-500';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 border-b border-l-0 border-r-0 border-t-0 ${tone} transition-colors font-mono text-[9.5px] tracking-[0.25em] uppercase whitespace-nowrap`}
    >
      {icon}
      <span>{label}</span>
    </button>
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
      {/* Floating section header */}
      <div className="flex items-end justify-between gap-2 px-0.5 pt-1 [text-shadow:_0_1px_4px_rgba(0,0,0,0.85)] pointer-events-none">
        <div className="min-w-0">
          <p className="font-mono text-[8.5px] tracking-[0.35em] text-zinc-300 uppercase truncate">
            Section II · Enrollment
          </p>
          <h2 className="font-display text-lg font-light text-zinc-100 mt-0.5 truncate">
            {t('ui.chardel_header')}
          </h2>
        </div>
        <span className="font-mono text-[8.5px] tracking-[0.3em] text-zinc-300 uppercase shrink-0">
          File&nbsp;{String(slotIndex).padStart(2, '0')}/
          {String(totalSlots).padStart(2, '0')}
        </span>
      </div>

      {/* Form fields paper */}
      <Paper className="px-4 py-4">
        <div className="grid grid-cols-1 gap-3">
          <FormInput
            id="qbm-firstname"
            label={t('ui.firstname')}
            value={data.firstname}
            onChange={(e) => onChange({ firstname: e.target.value })}
            error={fieldErrors.firstname}
          />
          <FormInput
            id="qbm-lastname"
            label={t('ui.lastname')}
            value={data.lastname}
            onChange={(e) => onChange({ lastname: e.target.value })}
            error={fieldErrors.lastname}
          />
          {customNationality ? (
            <FormInput
              id="qbm-nationality"
              label={t('ui.nationality')}
              value={data.nationality}
              onChange={(e) => onChange({ nationality: e.target.value })}
              error={fieldErrors.nationality}
            />
          ) : (
            <FormSelect
              id="qbm-nationality"
              label={t('ui.nationality')}
              options={nationalityOptions}
              value={data.nationality}
              onChange={(value) => onChange({ nationality: value })}
              placeholder={t('ui.nationality')}
              error={fieldErrors.nationality}
            />
          )}
          <FormSelect
            id="qbm-gender"
            label={t('ui.gender')}
            options={genderOptions}
            value={data.gender}
            onChange={(value) => onChange({ gender: value })}
            placeholder={t('ui.gender')}
            error={fieldErrors.gender}
          />
          <DatePicker
            id="qbm-birthdate"
            label={t('ui.birthdate')}
            selected={data.date}
            onChange={(date) => onChange({ date })}
            error={fieldErrors.date}
          />
        </div>
      </Paper>

      {/* Action bar paper */}
      <Paper className="px-3.5 py-2.5 flex items-center justify-end gap-2 mt-auto">
        <ActionLink
          icon={<PiXLight className="text-[13px]" />}
          label={t('ui.cancel')}
          onClick={onCancel}
        />
        <ActionLink
          icon={<PiPlayFill className="text-[13px]" />}
          label={t('ui.create_button')}
          onClick={onCreate}
          accent
        />
      </Paper>
    </>
  );
}

// ============================================================
// Delete overlay (modal that doesn't replace the grid)
// ============================================================

interface DeleteOverlayProps {
  character: CharacterRow | null;
  onCancel: () => void;
  onConfirm: () => void;
  t: (k: string) => string;
}

function DeleteOverlay({
  character,
  onCancel,
  onConfirm,
  t,
}: DeleteOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_180ms_ease-out_both] pointer-events-auto"
      onClick={onCancel}
    >
      <div
        className="relative w-[400px] max-w-[90vw] bg-zinc-950 border border-zinc-800 shadow-[0_30px_120px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-px -left-px w-10 h-px bg-red-500/80" />
        <div className="absolute -top-px -left-px w-px h-10 bg-red-500/80" />

        <div className="p-6 space-y-4">
          <p className="font-mono text-[9px] tracking-[0.4em] text-red-400 uppercase">
            ✕ Void Record
          </p>
          <h3 className="font-display text-xl font-light text-zinc-100 leading-tight">
            {character
              ? `${character.charinfo.firstname} ${character.charinfo.lastname}`
              : t('ui.deletechar_header')}
          </h3>
          <p className="text-sm text-zinc-400 font-serif italic leading-snug">
            {t('ui.deletechar_description')}
          </p>

          <div className="flex items-center justify-end gap-2 pt-1">
            <ActionLink
              icon={<PiXLight className="text-[13px]" />}
              label={t('ui.cancel')}
              onClick={onCancel}
            />
            <ActionLink
              icon={<PiTrashLight className="text-[13px]" />}
              label={t('ui.confirm')}
              onClick={onConfirm}
              danger
            />
          </div>
        </div>
      </div>
    </div>
  );
}
