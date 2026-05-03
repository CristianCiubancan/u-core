import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';

import { useNuiEvent } from '../../../../webview/hooks/useNuiEvent';
import { fetchNui } from '../../../../webview/utils/fetchNui';
import { isEnvBrowser } from '../../../../webview/utils/misc';
import Button from '../../../../webview/components/ui/Button';
import FormInput from '../../../../webview/components/forms/FormInput';
import FormSelect from '../../../../webview/components/forms/FormSelect';

import type {
  CharacterRow,
  NewCharacterPayload,
} from '../shared/types';

// Eager-loaded locale bundles. Keeping them static so the bundle is
// self-contained — at ~1.5KB per locale this is much smaller than the
// dynamic-import scaffolding would be.
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

import './style.css';

const NAMESPACE = 'qb-multicharacter';
const BUNDLES: Record<string, unknown> = {
  ar, cs, de, en, es, fi, fr, it, ja, nl, 'pt-br': ptbr, pt, sv, tr, vi,
};
for (const [lng, resources] of Object.entries(BUNDLES)) {
  i18n.addResourceBundle(lng, NAMESPACE, resources, true, true);
}

type Screen = 'loading' | 'characters' | 'register' | 'delete';

interface UiOpenMessage {
  action: 'ui';
  toggle: boolean;
  customNationality: boolean;
  enableDeleteButton: boolean;
  nChar: number;
  countries: string[];
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
  const [registerData, setRegisterData] = useState({
    firstname: '',
    lastname: '',
    nationality: '',
    gender: '',
    date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10),
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  // ---------- NUI inbound ----------

  useNuiEvent<UiOpenMessage>('ui', (data) => {
    setCustomNationality(!!data.customNationality);
    setAllowDelete(!!data.enableDeleteButton);
    setCharacterAmount(data.nChar);
    setNationalities(Array.isArray(data.countries) ? data.countries : []);
    setSelectedIndex(-1);
    setValidationError(null);
    setRegisterData((prev) => ({
      ...prev,
      firstname: '',
      lastname: '',
      nationality: '',
      gender: '',
    }));

    if (data.toggle) {
      setVisible(true);
      setScreen('loading');
      setLoadingStage(0);

      // Mirrors the original's two-step delay: client posts setupCharacters
      // after ~2s, then we wait another 2s of staged loading text before
      // revealing the slot grid. Animations keep dev-mode usable too.
      const stageTimer = window.setInterval(() => {
        setLoadingStage((s) => Math.min(s + 1, LOADING_STAGES.length - 1));
      }, 500);

      const setupTimer = window.setTimeout(() => {
        void fetchNui('setupCharacters');
      }, 2000);

      const finishTimer = window.setTimeout(() => {
        window.clearInterval(stageTimer);
        setScreen('characters');
        setLoadingStage(0);
        void fetchNui('removeBlur');
      }, 4000);

      // Defer cleanup — these IDs are owned by this branch only. We can
      // afford to leak across re-fires; setVisible(true) re-runs from
      // scratch on each open.
      return () => {
        window.clearInterval(stageTimer);
        window.clearTimeout(setupTimer);
        window.clearTimeout(finishTimer);
      };
    } else {
      setVisible(isEnvBrowser());
      setScreen('loading');
    }
  });

  useNuiEvent<SetupCharactersMessage>('setupCharacters', (data) => {
    // Build a sparse 1-indexed array keyed by `cid` so empty slots stay
    // null. The cid is 1-based in the QBCore schema; we keep parity.
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

  // ---------- Slot selection ----------

  const onSlotClick = (index: number) => {
    setSelectedIndex(index);
    const existing = characters[index];
    if (existing) {
      void fetchNui('cDataPed', { cData: existing });
    } else {
      void fetchNui('cDataPed', {});
      resetRegisterData();
      setScreen('register');
    }
  };

  const resetRegisterData = () => {
    setRegisterData({
      firstname: '',
      lastname: '',
      nationality: '',
      gender: '',
      date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10),
    });
    setValidationError(null);
  };

  // ---------- Actions ----------

  const onPlay = () => {
    if (selectedIndex < 1) return;
    const cData = characters[selectedIndex];
    if (!cData) {
      resetRegisterData();
      setScreen('register');
      return;
    }
    void fetchNui('selectCharacter', { cData });
    setScreen('loading');
  };

  const onConfirmDelete = () => {
    if (selectedIndex < 1) return;
    const cData = characters[selectedIndex];
    if (!cData) return;
    void fetchNui('removeCharacter', { citizenid: cData.citizenid });
    setScreen('characters');
  };

  const onCreate = () => {
    const { firstname, lastname, nationality, gender, date } = registerData;
    if (!firstname.trim() || firstname.trim().length < 2) {
      setValidationError(t('ui.forgotten_field'));
      return;
    }
    if (!lastname.trim() || lastname.trim().length < 2) {
      setValidationError(t('ui.forgotten_field'));
      return;
    }
    if (!nationality.trim()) {
      setValidationError(t('ui.forgotten_field'));
      return;
    }
    if (!gender) {
      setValidationError(t('ui.forgotten_field'));
      return;
    }
    if (!date) {
      setValidationError(t('ui.forgotten_field'));
      return;
    }

    const payload: NewCharacterPayload = {
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      nationality: nationality.trim(),
      birthdate: date,
      gender: gender === 'female' ? 1 : 0,
      cid: selectedIndex,
    };
    void fetchNui('createNewCharacter', payload);
    setScreen('loading');
  };

  // ---------- Derived view models ----------

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

  // ---------- Effects ----------

  // Re-init slot array length whenever the announced character cap changes.
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

  if (!visible) return null;

  return (
    <div className="qbm-root">
      <div className="qbm-card glass rounded-2xl p-8 text-on-dark">
        {screen === 'loading' && <LoadingScreen text={t(LOADING_STAGES[loadingStage])} />}

        {screen === 'characters' && (
          <CharactersScreen
            slots={slots}
            selectedIndex={selectedIndex}
            allowDelete={allowDelete}
            onSlotClick={onSlotClick}
            onPlay={onPlay}
            onPrepareDelete={() => setScreen('delete')}
            t={t}
          />
        )}

        {screen === 'register' && (
          <RegisterScreen
            data={registerData}
            customNationality={customNationality}
            nationalityOptions={nationalityOptions}
            genderOptions={genderOptions}
            error={validationError}
            onChange={(patch) => {
              setRegisterData((prev) => ({ ...prev, ...patch }));
              setValidationError(null);
            }}
            onCancel={() => setScreen('characters')}
            onCreate={onCreate}
            t={t}
          />
        )}

        {screen === 'delete' && (
          <DeleteConfirmScreen
            onCancel={() => setScreen('characters')}
            onConfirm={onConfirmDelete}
            t={t}
          />
        )}
      </div>
    </div>
  );
}

// ---------------- Sub-screens ----------------

function LoadingScreen({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16">
      <div className="h-12 w-12 rounded-full border-4 border-brand-500/40 border-t-brand-400 animate-spin" />
      <p className="text-lg opacity-80">{text}</p>
    </div>
  );
}

interface CharactersScreenProps {
  slots: Array<{ index: number; data: CharacterRow | null }>;
  selectedIndex: number;
  allowDelete: boolean;
  onSlotClick: (index: number) => void;
  onPlay: () => void;
  onPrepareDelete: () => void;
  t: (key: string) => string;
}

function CharactersScreen({
  slots,
  selectedIndex,
  allowDelete,
  onSlotClick,
  onPlay,
  onPrepareDelete,
  t,
}: CharactersScreenProps) {
  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-shadow-sm">
          {t('ui.characters_header')}
        </h1>
        <span className="text-sm opacity-60">
          {slots.filter((s) => s.data).length} / {slots.length}
        </span>
      </header>

      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${Math.min(slots.length, 5)}, minmax(0, 1fr))`,
        }}
      >
        {slots.map(({ index, data }) => {
          const isSelected = index === selectedIndex;
          return (
            <button
              key={index}
              type="button"
              onClick={() => onSlotClick(index)}
              className={`qbm-slot glass-brand-dark rounded-xl p-4 flex flex-col justify-between text-left transition-all duration-200 hover:scale-[1.02] ${
                isSelected ? 'qbm-slot-selected' : 'border border-brand-500/20'
              }`}
            >
              {data ? (
                <CharacterSlotContent
                  data={data}
                  isSelected={isSelected}
                  allowDelete={allowDelete}
                  onPlay={onPlay}
                  onPrepareDelete={onPrepareDelete}
                />
              ) : (
                <div className="flex flex-1 items-center justify-center text-5xl text-brand-300/70 select-none">
                  +
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface SlotContentProps {
  data: CharacterRow;
  isSelected: boolean;
  allowDelete: boolean;
  onPlay: () => void;
  onPrepareDelete: () => void;
}

function CharacterSlotContent({
  data,
  isSelected,
  allowDelete,
  onPlay,
  onPrepareDelete,
}: SlotContentProps) {
  return (
    <>
      {isSelected && (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            className="rounded-full bg-brand-500/80 hover:bg-brand-400 px-3 py-1 text-xs font-medium"
          >
            ▶
          </button>
          {allowDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPrepareDelete();
              }}
              className="rounded-full bg-red-600/80 hover:bg-red-500 px-3 py-1 text-xs font-medium"
            >
              ✕
            </button>
          )}
        </div>
      )}

      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2 opacity-80">
          <span className="opacity-60">job</span>
          <span>{data.job?.label ?? '—'}</span>
        </div>
        <div className="flex items-center gap-2 opacity-80">
          <span className="opacity-60">cash</span>
          <span>${dollar.format(data.money?.cash ?? 0)}</span>
        </div>
        <div className="flex items-center gap-2 opacity-80">
          <span className="opacity-60">bank</span>
          <span>${dollar.format(data.money?.bank ?? 0)}</span>
        </div>
      </div>

      <div className="mt-3 truncate text-base font-medium">
        {data.charinfo.firstname} {data.charinfo.lastname}
      </div>
    </>
  );
}

interface RegisterScreenProps {
  data: {
    firstname: string;
    lastname: string;
    nationality: string;
    gender: string;
    date: string;
  };
  customNationality: boolean;
  nationalityOptions: Array<{ label: string; value: string }>;
  genderOptions: Array<{ label: string; value: string }>;
  error: string | null;
  onChange: (patch: Partial<RegisterScreenProps['data']>) => void;
  onCancel: () => void;
  onCreate: () => void;
  t: (key: string) => string;
}

function RegisterScreen({
  data,
  customNationality,
  nationalityOptions,
  genderOptions,
  error,
  onChange,
  onCancel,
  onCreate,
  t,
}: RegisterScreenProps) {
  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-shadow-sm">
          {t('ui.chardel_header')}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-2xl opacity-60 hover:opacity-100 transition"
          aria-label={t('ui.cancel')}
        >
          ×
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormInput
          id="qbm-firstname"
          label={t('ui.firstname')}
          value={data.firstname}
          onChange={(e) => onChange({ firstname: e.target.value })}
        />
        <FormInput
          id="qbm-lastname"
          label={t('ui.lastname')}
          value={data.lastname}
          onChange={(e) => onChange({ lastname: e.target.value })}
        />
        {customNationality ? (
          <FormInput
            id="qbm-nationality"
            label={t('ui.nationality')}
            value={data.nationality}
            onChange={(e) => onChange({ nationality: e.target.value })}
          />
        ) : (
          <FormSelect
            id="qbm-nationality"
            label={t('ui.nationality')}
            options={nationalityOptions}
            value={data.nationality}
            onChange={(value) => onChange({ nationality: value })}
            placeholder={t('ui.nationality')}
          />
        )}
        <FormSelect
          id="qbm-gender"
          label={t('ui.gender')}
          options={genderOptions}
          value={data.gender}
          onChange={(value) => onChange({ gender: value })}
          placeholder={t('ui.gender')}
        />
        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="qbm-date" className="block font-medium">
            {t('ui.birthdate')}
          </label>
          <input
            id="qbm-date"
            type="date"
            value={data.date}
            min="1900-01-01"
            max="2100-12-31"
            onChange={(e) => onChange({ date: e.target.value })}
            className="w-full px-4 py-2 glass-brand-dark rounded-lg border border-brand-500/20 focus:outline-none focus:ring-2 focus:ring-brand-700/50"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-900/30 px-4 py-2 text-sm text-red-200">
          {t('ui.ran_into_issue')} — {error}
        </div>
      )}

      <Button fullWidth size="lg" onClick={onCreate}>
        {t('ui.create_button')}
      </Button>
    </div>
  );
}

interface DeleteConfirmScreenProps {
  onCancel: () => void;
  onConfirm: () => void;
  t: (key: string) => string;
}

function DeleteConfirmScreen({ onCancel, onConfirm, t }: DeleteConfirmScreenProps) {
  return (
    <div className="space-y-5 text-center py-10">
      <h2 className="text-xl font-semibold">{t('ui.deletechar_header')}</h2>
      <p className="opacity-80">{t('ui.deletechar_description')}</p>
      <div className="flex justify-center gap-3">
        <Button onClick={onConfirm} className="bg-red-600/80 hover:bg-red-500">
          {t('ui.confirm')}
        </Button>
        <Button onClick={onCancel}>{t('ui.cancel')}</Button>
      </div>
    </div>
  );
}
