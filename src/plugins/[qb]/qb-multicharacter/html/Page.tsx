import * as React from 'react';
import { Banknote, LogOut, Play, Plus, Trash2, Wallet, X } from 'lucide-react';

import { useNuiEvent } from '@/hooks/useNuiEvent';
import { fetchNui } from '@/utils/fetchNui';
import { isEnvBrowser } from '@/utils/misc';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { profanityRegex } from './profanity';

type CharInfo = {
  firstname: string;
  lastname: string;
  birthdate?: string;
  gender?: number | string;
  nationality?: string;
  phone?: string;
};

type Money = { cash: number; bank: number; crypto?: number };

type Job = {
  label: string;
  grade?: { name: string; level: number };
};

type Character = {
  cid: number;
  citizenid: string;
  charinfo: CharInfo;
  money: Money;
  job: Job;
};

type UiPayload = {
  action: 'ui';
  customNationality?: boolean;
  toggle?: boolean;
  nChar?: number;
  enableDeleteButton?: boolean;
  translations?: Record<string, string>;
  countries?: string[];
};

type SetupCharactersPayload = {
  action: 'setupCharacters';
  characters?: Character[];
};

type RegisterErrors = Partial<
  Record<'firstname' | 'lastname' | 'nationality' | 'gender' | 'date', string>
>;

type RegisterData = {
  firstname: string;
  lastname: string;
  nationality: string;
  gender: string;
  date: string; // YYYY-MM-DD; matches upstream wire format for `birthdate`
};

const todayIso = (): string => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

const emptyRegister = (): RegisterData => ({
  firstname: '',
  lastname: '',
  nationality: '',
  gender: '',
  date: todayIso(),
});

const moneyFmt = new Intl.NumberFormat('en-US');

// Mock dataset that lets `pnpm dev`'s browser preview render something
// useful — none of this is shipped to FXServer (the simulator only fires
// in `isEnvBrowser`).
const BROWSER_MOCK_TRANSLATIONS: Record<string, string> = {
  characters_header: 'My Characters',
  emptyslot: 'Empty Slot',
  play_button: 'Play',
  create_button: 'Create Character',
  delete_button: 'Delete Character',
  chardel_header: 'Character Registration',
  deletechar_header: 'Delete Character',
  deletechar_description: 'Are you sure you want to delete your character?',
  cancel: 'Cancel',
  confirm: 'Confirm',
  firstname: 'First Name',
  lastname: 'Last Name',
  nationality: 'Nationality',
  gender: 'Gender',
  birthdate: 'Birthdate',
  male: 'Male',
  female: 'Female',
  ran_into_issue: 'We ran into an issue',
  profanity: 'Inputs contain disallowed words.',
  forgotten_field: 'You forgot to fill in a field.',
  firstname_too_short: 'First name must be at least 2 characters.',
  firstname_too_long: 'First name cannot exceed 16 characters.',
  lastname_too_short: 'Last name must be at least 2 characters.',
  lastname_too_long: 'Last name cannot exceed 16 characters.',
  invalid_date: 'Please enter a valid date of birth.',
  err_required: 'Required',
  err_too_short: 'Too short',
  err_too_long: 'Too long',
  err_profanity: 'Not allowed',
  err_invalid_date: 'Invalid date',
  select_character: 'Select a character',
  select_character_subtitle:
    'Choose a slot to begin or create a new identity.',
  empty_slot: 'Empty slot',
  new_character: 'New character',
  disconnect: 'Disconnect',
  job: 'Job',
  cash: 'Cash',
  bank: 'Bank',
};

const BROWSER_MOCK_CHARACTERS: Character[] = [
  {
    cid: 1,
    citizenid: 'ABC12345',
    charinfo: { firstname: 'John', lastname: 'Doe' },
    money: { cash: 1250, bank: 84500 },
    job: { label: 'Police Officer' },
  },
  {
    cid: 2,
    citizenid: 'DEF67890',
    charinfo: { firstname: 'Eva', lastname: 'Mendez' },
    money: { cash: 320, bank: 12_400 },
    job: { label: 'Mechanic' },
  },
];

const BROWSER_MOCK_COUNTRIES = ['United States', 'Romania', 'Japan', 'Brazil'];

const isValidDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map((n) => parseInt(n, 10));
  const dt = new Date(y, m - 1, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return false;
  }
  const currentYear = new Date().getFullYear();
  return y >= 1900 && y <= currentYear;
};

const Page: React.FC = () => {
  const [visible, setVisible] = React.useState<boolean>(isEnvBrowser());
  const [translations, setTranslations] = React.useState<
    Record<string, string>
  >(isEnvBrowser() ? BROWSER_MOCK_TRANSLATIONS : {});
  const [characterAmount, setCharacterAmount] = React.useState<number>(
    isEnvBrowser() ? 4 : 0
  );
  const [characters, setCharacters] = React.useState<
    Record<number, Character>
  >(() => {
    if (!isEnvBrowser()) return {};
    const indexed: Record<number, Character> = {};
    for (const c of BROWSER_MOCK_CHARACTERS) indexed[c.cid] = c;
    return indexed;
  });
  const [countries, setCountries] = React.useState<string[]>(
    isEnvBrowser() ? BROWSER_MOCK_COUNTRIES : []
  );
  const [customNationality, setCustomNationality] =
    React.useState<boolean>(false);
  const [allowDelete, setAllowDelete] = React.useState<boolean>(
    isEnvBrowser() ? true : false
  );
  const [hasCharacters, setHasCharacters] = React.useState<boolean>(
    isEnvBrowser() ? true : false
  );

  const [selectedCid, setSelectedCid] = React.useState<number>(-1);
  const [view, setView] = React.useState<'grid' | 'register'>('grid');
  const [showDelete, setShowDelete] = React.useState<boolean>(false);
  const [registerData, setRegisterData] = React.useState<RegisterData>(
    emptyRegister
  );
  const [errors, setErrors] = React.useState<RegisterErrors>({});

  // One-at-a-time Select coordinator. Radix's DismissableLayer was
  // unreliable when sibling Selects shared the form (per the
  // feedback_radix_select_onblur memory).
  const [openSelect, setOpenSelect] = React.useState<
    'gender' | 'nationality' | null
  >(null);

  const tx = React.useCallback(
    (key: string, fallback?: string): string =>
      translations[key] ?? fallback ?? key,
    [translations]
  );

  const tcap = React.useCallback(
    (key: string, fallback: string): string => tx(key, fallback).toUpperCase(),
    [tx]
  );

  // ---- inbound NUI messages ------------------------------------------

  useNuiEvent<UiPayload>('ui', (data) => {
    if (typeof data.toggle === 'boolean') setVisible(!!data.toggle);

    if (typeof data.customNationality === 'boolean') {
      setCustomNationality(data.customNationality);
    }
    if (typeof data.enableDeleteButton === 'boolean') {
      setAllowDelete(data.enableDeleteButton);
    }
    if (data.translations) setTranslations(data.translations);
    if (data.countries) setCountries(data.countries);
    if (typeof data.nChar === 'number') setCharacterAmount(data.nChar);

    setSelectedCid(-1);
    setView('grid');
    setShowDelete(false);
    setErrors({});
    setRegisterData(emptyRegister());

    if (data.toggle) {
      setHasCharacters(false);
      // No fake progress theatre — fetch immediately. Lua replies via
      // SendNUIMessage('setupCharacters'), which our handler below
      // receives.
      void fetchNui('setupCharacters');
    }
  });

  useNuiEvent<SetupCharactersPayload>('setupCharacters', (data) => {
    const list = data.characters ?? [];
    const indexed: Record<number, Character> = {};
    for (const c of list) indexed[c.cid] = c;
    setCharacters(indexed);
    setHasCharacters(true);
    // Upstream Vue cleared the timecycle blur after its 4s loading
    // theatre — we do the same as soon as the grid is ready.
    void fetchNui('removeBlur');
  });

  // ---- grid actions ---------------------------------------------------

  const handleSlotClick = (cid: number) => {
    setSelectedCid(cid);
    const existing = characters[cid];
    if (existing) {
      void fetchNui('cDataPed', { cData: existing });
    } else {
      void fetchNui('cDataPed', {});
      // Empty slot → upstream behavior is to jump straight into the
      // register flow.
      setRegisterData(emptyRegister());
      setErrors({});
      setView('register');
    }
  };

  const handlePlay = () => {
    if (selectedCid === -1) return;
    const data = characters[selectedCid];
    if (!data) return;
    void fetchNui('selectCharacter', { cData: data });
  };

  const handleDeleteConfirm = () => {
    const target = characters[selectedCid];
    if (!target) {
      setShowDelete(false);
      return;
    }
    void fetchNui('removeCharacter', { citizenid: target.citizenid });
    setShowDelete(false);
  };

  const handleDisconnect = () => {
    void fetchNui('disconnectButton');
  };

  // ---- register form --------------------------------------------------

  const validate = (data: RegisterData): RegisterErrors => {
    const next: RegisterErrors = {};
    if (!data.firstname) next.firstname = tcap('err_required', 'Required');
    else if (data.firstname.length < 2)
      next.firstname = tcap('err_too_short', 'Too short');
    else if (data.firstname.length > 16)
      next.firstname = tcap('err_too_long', 'Too long');
    else if (profanityRegex.test(data.firstname))
      next.firstname = tcap('err_profanity', 'Not allowed');

    if (!data.lastname) next.lastname = tcap('err_required', 'Required');
    else if (data.lastname.length < 2)
      next.lastname = tcap('err_too_short', 'Too short');
    else if (data.lastname.length > 16)
      next.lastname = tcap('err_too_long', 'Too long');
    else if (profanityRegex.test(data.lastname))
      next.lastname = tcap('err_profanity', 'Not allowed');

    if (!data.nationality) next.nationality = tcap('err_required', 'Required');
    else if (profanityRegex.test(data.nationality))
      next.nationality = tcap('err_profanity', 'Not allowed');

    if (!data.gender) next.gender = tcap('err_required', 'Required');

    if (!data.date) next.date = tcap('err_required', 'Required');
    else if (!isValidDate(data.date))
      next.date = tcap('err_invalid_date', 'Invalid date');

    return next;
  };

  const setField = <K extends keyof RegisterData>(
    field: K,
    value: RegisterData[K]
  ) => {
    setRegisterData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof RegisterErrors]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as keyof RegisterErrors];
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate(registerData);
    if (Object.keys(v).length > 0) {
      setErrors(v);
      return;
    }
    // gender on the wire is the LOCALIZED phrase; lua compares it to
    // Lang:t('ui.male')/('ui.female') and flips it to 0/1. tx() returns
    // the same value Lang:t() does, so this round-trips cleanly.
    void fetchNui('createNewCharacter', {
      firstname: registerData.firstname,
      lastname: registerData.lastname,
      nationality: registerData.nationality,
      birthdate: registerData.date,
      gender: registerData.gender,
      cid: selectedCid,
    });
    setView('grid');
  };

  const handleCancelRegister: React.MouseEventHandler<HTMLButtonElement> = (
    e
  ) => {
    // preventDefault on mousedown so the click doesn't get eaten by a
    // blur-driven layout shift on the active input (memory:
    // feedback_dismiss_blur_cascade).
    e.preventDefault();
    setView('grid');
    setErrors({});
  };

  // Memoize the country list — closed Selects still evaluate their JSX
  // children every parent re-render, and the country list runs ~250
  // items.
  const countryItems = React.useMemo(
    () =>
      countries.map((country) => (
        <SelectItem key={country} value={country}>
          {country}
        </SelectItem>
      )),
    [countries]
  );

  // ---- render ---------------------------------------------------------

  if (!visible) return null;

  const slots = Array.from({ length: characterAmount }, (_, i) => i + 1);
  const selected = selectedCid !== -1 ? characters[selectedCid] : undefined;
  const showLoading = !hasCharacters && view === 'grid';

  return (
    <div className="fixed inset-0 flex items-center justify-center font-serif text-foreground antialiased pointer-events-auto">
      <div className="w-full max-w-5xl px-8 py-10">
        <header className="mb-8 flex items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-brand-400/80">
              {tx('characters_header', 'My Characters')}
            </p>
            <h1 className="mt-2 font-display text-4xl font-light leading-tight text-balance">
              {tx('select_character', 'Select a character')}
            </h1>
            <p className="mt-1 font-serif text-sm text-foreground/60">
              {tx(
                'select_character_subtitle',
                'Choose a slot to begin or create a new identity.'
              )}
            </p>
          </div>

          {view === 'grid' && !showLoading && (
            <button
              type="button"
              onClick={handleDisconnect}
              className="dossier-action group inline-flex items-center gap-2 text-foreground/60 hover:text-destructive border-b border-input/60 hover:border-destructive/70"
            >
              <LogOut className="h-3.5 w-3.5" />
              {tx('disconnect', 'Disconnect')}
            </button>
          )}
        </header>

        {showLoading && (
          <div className="dossier-paper p-12 flex items-center justify-center">
            <div className="flex items-center gap-4 text-foreground/70">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-400 animate-pulse" />
              <span className="font-mono text-[10px] tracking-[0.35em] uppercase">
                {tx('retrieving_characters', 'Retrieving characters')}
              </span>
            </div>
          </div>
        )}

        {!showLoading && view === 'grid' && (
          <div
            className={cn(
              'grid gap-5',
              characterAmount <= 2 && 'grid-cols-2',
              characterAmount === 3 && 'grid-cols-3',
              characterAmount >= 4 && 'grid-cols-2 md:grid-cols-4'
            )}
          >
            {slots.map((cid) => {
              const c = characters[cid];
              const isSelected = selectedCid === cid;
              if (!c) {
                return (
                  <button
                    key={cid}
                    type="button"
                    onClick={() => handleSlotClick(cid)}
                    className={cn(
                      'dossier-paper group relative flex h-64 flex-col items-center justify-center gap-3',
                      'transition-colors duration-200 hover:border-brand-500/50',
                      isSelected && 'dossier-paper-selected'
                    )}
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full border border-input/60 text-foreground/40 transition-colors group-hover:border-brand-400/70 group-hover:text-brand-300">
                      <Plus className="h-7 w-7" strokeWidth={1.25} />
                    </span>
                    <span className="font-mono text-[9px] tracking-[0.35em] uppercase text-foreground/50">
                      {tx('empty_slot', 'Empty slot')}
                    </span>
                  </button>
                );
              }

              return (
                <button
                  key={cid}
                  type="button"
                  onClick={() => handleSlotClick(cid)}
                  className={cn(
                    'dossier-paper group relative flex h-64 flex-col p-4 text-left',
                    'transition-colors duration-200 hover:border-brand-500/40',
                    isSelected && 'dossier-paper-selected'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-[9px] tracking-[0.35em] uppercase text-foreground/40">
                      #{String(cid).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="mt-auto space-y-3">
                    <div>
                      <p className="font-display text-xl leading-tight text-balance">
                        {c.charinfo.firstname} {c.charinfo.lastname}
                      </p>
                      <p className="mt-0.5 font-mono text-[9.5px] tracking-[0.25em] uppercase text-foreground/55">
                        {c.job?.label}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/40 pt-3 text-[12px] text-foreground/75">
                      <span className="inline-flex items-center gap-1.5">
                        <Wallet className="h-3.5 w-3.5 text-brand-400/80" />
                        ${moneyFmt.format(c.money?.cash ?? 0)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Banknote className="h-3.5 w-3.5 text-brand-400/80" />
                        ${moneyFmt.format(c.money?.bank ?? 0)}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute right-3 top-3 flex gap-2">
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={tx('play_button', 'Play')}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          handlePlay();
                        }}
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter' || ev.key === ' ') {
                            ev.preventDefault();
                            ev.stopPropagation();
                            handlePlay();
                          }
                        }}
                        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-brand-500/50 bg-brand-500/10 text-brand-300 transition-colors hover:bg-brand-500/25 hover:text-brand-100"
                      >
                        <Play className="h-3.5 w-3.5" fill="currentColor" />
                      </span>
                      {allowDelete && (
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={tx('delete_button', 'Delete')}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setShowDelete(true);
                          }}
                          onKeyDown={(ev) => {
                            if (ev.key === 'Enter' || ev.key === ' ') {
                              ev.preventDefault();
                              ev.stopPropagation();
                              setShowDelete(true);
                            }
                          }}
                          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-destructive/50 bg-destructive/10 text-destructive transition-colors hover:bg-destructive/25"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {view === 'register' && (
          <form
            onSubmit={handleSubmit}
            className="dossier-paper relative mx-auto max-w-xl p-8"
          >
            <div className="flex items-start justify-between border-b border-border/50 pb-4">
              <div>
                <p className="font-mono text-[9.5px] tracking-[0.4em] uppercase text-brand-400/80">
                  {tx('new_character', 'New character')}
                </p>
                <h2 className="mt-1 font-display text-2xl font-light">
                  {tx('chardel_header', 'Character Registration')}
                </h2>
              </div>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleCancelRegister}
                aria-label={tx('cancel', 'Cancel')}
                className="text-foreground/50 transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5">
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="firstname">
                  {tx('firstname', 'First Name')}
                </Label>
                <Input
                  id="firstname"
                  value={registerData.firstname}
                  onChange={(e) => setField('firstname', e.target.value)}
                  aria-invalid={!!errors.firstname}
                  maxLength={32}
                  autoComplete="off"
                />
                {errors.firstname && <ErrorCaption text={errors.firstname} />}
              </div>

              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="lastname">{tx('lastname', 'Last Name')}</Label>
                <Input
                  id="lastname"
                  value={registerData.lastname}
                  onChange={(e) => setField('lastname', e.target.value)}
                  aria-invalid={!!errors.lastname}
                  maxLength={32}
                  autoComplete="off"
                />
                {errors.lastname && <ErrorCaption text={errors.lastname} />}
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="nationality">
                  {tx('nationality', 'Nationality')}
                </Label>
                {customNationality ? (
                  <>
                    <Input
                      id="nationality"
                      value={registerData.nationality}
                      onChange={(e) => setField('nationality', e.target.value)}
                      aria-invalid={!!errors.nationality}
                      autoComplete="off"
                    />
                    {errors.nationality && (
                      <ErrorCaption text={errors.nationality} />
                    )}
                  </>
                ) : (
                  <>
                    <Select
                      open={openSelect === 'nationality'}
                      onOpenChange={(o) =>
                        setOpenSelect(o ? 'nationality' : null)
                      }
                      value={registerData.nationality}
                      onValueChange={(v) => setField('nationality', v)}
                    >
                      <SelectTrigger
                        id="nationality"
                        aria-invalid={!!errors.nationality}
                      >
                        <SelectValue
                          placeholder={tx('nationality', 'Nationality')}
                        />
                      </SelectTrigger>
                      <SelectContent>{countryItems}</SelectContent>
                    </Select>
                    {errors.nationality && (
                      <ErrorCaption text={errors.nationality} />
                    )}
                  </>
                )}
              </div>

              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="gender">{tx('gender', 'Gender')}</Label>
                <Select
                  open={openSelect === 'gender'}
                  onOpenChange={(o) => setOpenSelect(o ? 'gender' : null)}
                  value={registerData.gender}
                  onValueChange={(v) => setField('gender', v)}
                >
                  <SelectTrigger id="gender" aria-invalid={!!errors.gender}>
                    <SelectValue placeholder={tx('gender', 'Gender')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={tx('male', 'Male')}>
                      {tx('male', 'Male')}
                    </SelectItem>
                    <SelectItem value={tx('female', 'Female')}>
                      {tx('female', 'Female')}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <ErrorCaption text={errors.gender} />}
              </div>

              <div className="space-y-1.5 col-span-1">
                <DatePicker
                  id="birthdate"
                  label={tx('birthdate', 'Birthdate')}
                  selected={
                    registerData.date && isValidDate(registerData.date)
                      ? new Date(registerData.date + 'T00:00:00')
                      : null
                  }
                  onChange={(d) =>
                    setField(
                      'date',
                      d
                        ? `${d.getFullYear()}-${String(
                            d.getMonth() + 1
                          ).padStart(2, '0')}-${String(d.getDate()).padStart(
                            2,
                            '0'
                          )}`
                        : ''
                    )
                  }
                  error={errors.date}
                  minDate={new Date(1900, 0, 1)}
                  maxDate={new Date()}
                  yearNav
                />
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-3 border-t border-border/50 pt-5">
              <Button
                type="button"
                variant="secondary"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleCancelRegister}
              >
                {tx('cancel', 'Cancel')}
              </Button>
              <Button type="submit" size="lg">
                {tx('create_button', 'Create Character')}
              </Button>
            </div>
          </form>
        )}
      </div>

      <AlertDialog
        open={showDelete}
        onOpenChange={(o) => setShowDelete(o)}
      >
        <AlertDialogContent
          // The shadcn primitive ships backdrop-blur-md baked in. CEF
          // can't render that reliably and it's measurably expensive
          // even where it does (memory: project_backdrop_filter_cost_cef).
          className="bg-popover/95 backdrop-blur-none border-border/70"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tx('deletechar_header', 'Delete Character')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tx(
                'deletechar_description',
                'Are you sure you want to delete your character?'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onMouseDown={(e) => e.preventDefault()}>
              {tx('cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              {tx('confirm', 'Confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const ErrorCaption: React.FC<{ text: string }> = ({ text }) => (
  <p
    className="font-mono text-[9px] tracking-[0.2em] uppercase text-destructive"
    role="alert"
  >
    {text}
  </p>
);

export default Page;
