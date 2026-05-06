import * as React from 'react';

import { useNuiEvent } from '@/hooks/useNuiEvent';
import { fetchNui } from '@/utils/fetchNui';

// Local icon-font CSS so the upstream Material Icons + FontAwesome name
// strings (`done`, `local_police`, `fas fa-ambulance`, …) render without
// touching the network. Vite emits these into the per-plugin style.css
// and copies the woff2 files to ./assets/ — both must be in plugin.json's
// `files` block for FXServer to serve them.
import 'material-icons/iconfont/material-icons.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

// ---- contract types -------------------------------------------------------
//
// Mirrors `client/functions.lua` (Notify) + `client/drawtext.lua`. The
// `notify` payload is FLAT (text/length/type/caption/icon at top level);
// the DrawText payloads are NESTED under `data`. Upstream inconsistency,
// preserved verbatim.

type NotifyVariant =
  | 'success'
  | 'primary'
  | 'warning'
  | 'error'
  | 'police'
  | 'ambulance'
  | string;

type NotifyPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'center';

type NotifyPayload = {
  action: 'notify';
  type: NotifyVariant;
  length: number;
  text: string;
  caption?: string;
  icon?: string;
};

type DrawTextPosition = 'left' | 'right' | 'top';

type DrawTextPayload = {
  action: 'DRAW_TEXT' | 'CHANGE_TEXT';
  data: { text: string; position?: DrawTextPosition | string };
};

type HideTextPayload = { action: 'HIDE_TEXT' };
type KeyPressedPayload = { action: 'KEY_PRESSED' };

type VariantDefinition = { classes: string; icon: string };

type NotifyConfig = {
  NotificationStyling: {
    group?: boolean;
    position?: NotifyPosition;
    progress?: boolean;
  };
  VariantDefinitions: Record<string, VariantDefinition>;
};

// Mirrors `js/config.js`'s defaultConfig. Used when getNotifyConfig fails
// or returns null (matches upstream's retry-then-fallback behavior).
const DEFAULT_NOTIFY_CONFIG: NotifyConfig = {
  NotificationStyling: {
    group: true,
    position: 'top-right',
    progress: true,
  },
  VariantDefinitions: {
    success: { classes: 'success', icon: 'done' },
    primary: { classes: 'primary', icon: 'info' },
    error: { classes: 'error', icon: 'dangerous' },
    police: { classes: 'police', icon: 'local_police' },
    ambulance: { classes: 'ambulance', icon: 'fas fa-ambulance' },
  },
};

// Per-variant accent palette. Inline styles (not Tailwind classes) so
// the safelist's brand+gray trim can't purge these — variant stripes
// are part of the contract, not a theme choice.
const VARIANT_ACCENT: Record<string, string> = {
  success: '#10b981',
  primary: '#6366f1',
  warning: '#f59e0b',
  error: '#ef4444',
  police: '#3b82f6',
  ambulance: '#ef4444',
};

const VARIANT_FALLBACK = '#6366f1';

const accentFor = (variant: string): string =>
  VARIANT_ACCENT[variant] ?? VARIANT_FALLBACK;

// ---- icon rendering -------------------------------------------------------

// Detect whether an icon string is a FontAwesome class chain (e.g.
// `fas fa-ambulance`, `far fa-coffee`, `fab fa-twitch`, plus the legacy
// `fa fa-…`). Anything else is treated as a Material Icons ligature name
// — that's the upstream contract Quasar+Material observed.
const isFontAwesomeIcon = (icon: string): boolean =>
  /(?:^|\s)(fa[srbl]?|fa-solid|fa-regular|fa-brands|fa-light|fa-thin|fa-duotone)(?:\s|$)/.test(
    icon
  );

const NotifyIcon: React.FC<{ icon?: string; color: string }> = ({
  icon,
  color,
}) => {
  if (!icon) return null;
  const style: React.CSSProperties = { color, fontSize: '1.25rem' };
  if (isFontAwesomeIcon(icon)) {
    return <i className={icon} style={style} aria-hidden="true" />;
  }
  return (
    <i className="material-icons" style={style} aria-hidden="true">
      {icon}
    </i>
  );
};

// ---- notification host ----------------------------------------------------

type Toast = {
  id: number;
  text: string;
  caption?: string;
  type: NotifyVariant;
  icon?: string;
  length: number;
  count: number;
};

type ToastWithSpawn = Toast & { spawnedAt: number };

// Container positioning + slide direction per Quasar position. Animation
// translate matches Quasar's default (slide from the relevant edge).
const POSITION_LAYOUT: Record<
  NotifyPosition,
  { container: React.CSSProperties; enterTransform: string; alignItems: string }
> = {
  'top-left': {
    container: { top: '1rem', left: '1rem' },
    enterTransform: 'translateX(-110%)',
    alignItems: 'flex-start',
  },
  'top-right': {
    container: { top: '1rem', right: '1rem' },
    enterTransform: 'translateX(110%)',
    alignItems: 'flex-end',
  },
  'bottom-left': {
    container: { bottom: '1rem', left: '1rem' },
    enterTransform: 'translateX(-110%)',
    alignItems: 'flex-start',
  },
  'bottom-right': {
    container: { bottom: '1rem', right: '1rem' },
    enterTransform: 'translateX(110%)',
    alignItems: 'flex-end',
  },
  top: {
    container: {
      top: '1rem',
      left: '50%',
      transform: 'translateX(-50%)',
    },
    enterTransform: 'translateY(-110%)',
    alignItems: 'center',
  },
  bottom: {
    container: {
      bottom: '1rem',
      left: '50%',
      transform: 'translateX(-50%)',
    },
    enterTransform: 'translateY(110%)',
    alignItems: 'center',
  },
  left: {
    container: { top: '50%', left: '1rem', transform: 'translateY(-50%)' },
    enterTransform: 'translateX(-110%)',
    alignItems: 'flex-start',
  },
  right: {
    container: { top: '50%', right: '1rem', transform: 'translateY(-50%)' },
    enterTransform: 'translateX(110%)',
    alignItems: 'flex-end',
  },
  center: {
    container: {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    },
    enterTransform: 'scale(0.92)',
    alignItems: 'center',
  },
};

const NotifyHost: React.FC = () => {
  const [config, setConfig] = React.useState<NotifyConfig | null>(null);
  const [toasts, setToasts] = React.useState<ToastWithSpawn[]>([]);
  const idRef = React.useRef(0);

  // Mirror upstream: try `getNotifyConfig`, fall back to bundled defaults
  // if the callback errors or returns null. Upstream js/config.js retries
  // once on null; we capture that with the same single retry inside the
  // notify handler so a missed first fetch self-heals on the next toast.
  const loadConfig = React.useCallback(async () => {
    try {
      const cfg = await fetchNui<unknown, NotifyConfig | null>(
        'getNotifyConfig',
        {},
        DEFAULT_NOTIFY_CONFIG
      );
      setConfig(cfg ?? DEFAULT_NOTIFY_CONFIG);
    } catch {
      setConfig(DEFAULT_NOTIFY_CONFIG);
    }
  }, []);

  React.useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  useNuiEvent<NotifyPayload>('notify', (data) => {
    const activeConfig = config ?? DEFAULT_NOTIFY_CONFIG;
    const variant = data.type ?? 'primary';
    const variantDef = activeConfig.VariantDefinitions[variant];
    const icon = data.icon ?? variantDef?.icon;
    const length = data.length ?? 5000;

    setToasts((prev) => {
      // group: collapse repeats with a count badge — Quasar's default.
      if (activeConfig.NotificationStyling.group) {
        const existing = prev.findIndex(
          (t) => t.text === data.text && t.type === variant
        );
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = {
            ...updated[existing],
            count: updated[existing].count + 1,
            // Refresh spawn timer so the dedupe doesn't dismiss early.
            spawnedAt: Date.now(),
            length,
            caption: data.caption ?? updated[existing].caption,
            icon,
          };
          return updated;
        }
      }
      const id = ++idRef.current;
      return [
        ...prev,
        {
          id,
          text: data.text,
          caption: data.caption,
          type: variant,
          icon,
          length,
          count: 1,
          spawnedAt: Date.now(),
        },
      ];
    });
  });

  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (!toasts.length) return null;

  const position: NotifyPosition =
    (config?.NotificationStyling.position as NotifyPosition) ??
    DEFAULT_NOTIFY_CONFIG.NotificationStyling.position!;
  const layout = POSITION_LAYOUT[position] ?? POSITION_LAYOUT['top-right'];
  const showProgress =
    config?.NotificationStyling.progress ??
    DEFAULT_NOTIFY_CONFIG.NotificationStyling.progress!;

  // Newest-first feels right at the top edges; oldest-first at the bottom
  // edges so the newest still sits closest to the corner.
  const ordered =
    position.startsWith('bottom') || position === 'right'
      ? [...toasts]
      : [...toasts].reverse();

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        alignItems: layout.alignItems,
        pointerEvents: 'none',
        ...layout.container,
      }}
    >
      {ordered.map((toast) => (
        <ToastCard
          key={toast.id}
          toast={toast}
          enterTransform={layout.enterTransform}
          showProgress={showProgress}
          onDismiss={() => dismiss(toast.id)}
        />
      ))}
    </div>
  );
};

const ToastCard: React.FC<{
  toast: ToastWithSpawn;
  enterTransform: string;
  showProgress: boolean;
  onDismiss: () => void;
}> = ({ toast, enterTransform, showProgress, onDismiss }) => {
  const [phase, setPhase] = React.useState<'enter' | 'visible' | 'exit'>(
    'enter'
  );
  const accent = accentFor(toast.type);
  const isMultiline = toast.text.length > 100;

  React.useEffect(() => {
    // Two RAFs: one to commit the initial transform, one to start the
    // transition. Without the second, browsers occasionally batch the
    // class change and the slide is skipped.
    const r1 = requestAnimationFrame(() => {
      const r2 = requestAnimationFrame(() => setPhase('visible'));
      return () => cancelAnimationFrame(r2);
    });
    return () => cancelAnimationFrame(r1);
  }, []);

  // Auto-dismiss after `length` ms; reset on group-bump (spawnedAt changes).
  React.useEffect(() => {
    const exitMs = toast.length;
    const fadeMs = 250;
    const exit = window.setTimeout(() => setPhase('exit'), exitMs);
    const remove = window.setTimeout(onDismiss, exitMs + fadeMs);
    return () => {
      window.clearTimeout(exit);
      window.clearTimeout(remove);
    };
  }, [toast.length, toast.spawnedAt, onDismiss]);

  const transform = phase === 'visible' ? 'none' : enterTransform;
  const opacity = phase === 'visible' ? 1 : 0;

  return (
    <div
      style={{
        minWidth: '14rem',
        maxWidth: '24rem',
        background: 'rgba(20, 20, 26, 0.95)',
        color: '#f4f4f5',
        borderLeft: `4px solid ${accent}`,
        borderRadius: '0.375rem',
        padding: '0.75rem 1rem',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        transform,
        opacity,
        transition: 'transform 250ms ease-out, opacity 250ms ease-out',
        pointerEvents: 'auto',
        position: 'relative',
        overflow: 'hidden',
        fontFamily:
          '"Libre Baskerville", "Segoe UI", system-ui, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '0.625rem',
          alignItems: isMultiline ? 'flex-start' : 'center',
        }}
      >
        <NotifyIcon icon={toast.icon} color={accent} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '0.9375rem',
              lineHeight: 1.35,
              wordBreak: 'break-word',
              fontWeight: 500,
            }}
          >
            {toast.text}
          </div>
          {toast.caption && (
            <div
              style={{
                fontSize: '0.8125rem',
                lineHeight: 1.3,
                opacity: 0.75,
                marginTop: '0.125rem',
              }}
            >
              {toast.caption}
            </div>
          )}
        </div>
        {toast.count > 1 && (
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.125rem 0.4rem',
              borderRadius: '999px',
              background: accent,
              color: '#fff',
              alignSelf: 'flex-start',
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            }}
          >
            {toast.count}
          </span>
        )}
      </div>
      {showProgress && (
        <div
          key={toast.spawnedAt}
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            height: '2px',
            background: accent,
            opacity: 0.85,
            width: phase === 'enter' ? '100%' : '0%',
            transition:
              phase === 'enter'
                ? 'none'
                : `width ${toast.length}ms linear`,
          }}
        />
      )}
    </div>
  );
};

// ---- drawtext host --------------------------------------------------------

type DrawTextState = {
  visible: boolean;
  text: string;
  position: DrawTextPosition;
  pressed: boolean;
};

const DRAWTEXT_POSITION: Record<DrawTextPosition, React.CSSProperties> = {
  left: { top: '50%', left: '1rem', transform: 'translateY(-50%)' },
  right: { top: '50%', right: '1rem', transform: 'translateY(-50%)' },
  top: { top: '0.625rem', left: '50%', transform: 'translateX(-50%)' },
};

const DRAWTEXT_HIDDEN: Record<DrawTextPosition, React.CSSProperties> = {
  left: { top: '50%', left: '-100px', transform: 'translateY(-50%)' },
  right: { top: '50%', right: '-100px', transform: 'translateY(-50%)' },
  top: { top: '-100px', left: '50%', transform: 'translateX(-50%)' },
};

const normalizePosition = (p?: string): DrawTextPosition => {
  if (p === 'top' || p === 'right' || p === 'left') return p;
  return 'left';
};

const DrawTextHost: React.FC = () => {
  const [state, setState] = React.useState<DrawTextState>({
    visible: false,
    text: '',
    position: 'left',
    pressed: false,
  });

  // CHANGE_TEXT animates the swap: hide → wait → re-show with new text.
  // Track the timeout so a stack of CHANGE_TEXT calls collapses to the
  // last one (matches upstream: each fires its own setTimeout, but the
  // visible state is just the latest one's delayed update).
  const swapTimerRef = React.useRef<number | null>(null);

  const clearSwapTimer = () => {
    if (swapTimerRef.current !== null) {
      window.clearTimeout(swapTimerRef.current);
      swapTimerRef.current = null;
    }
  };

  useNuiEvent<DrawTextPayload>('DRAW_TEXT', (data) => {
    clearSwapTimer();
    const position = normalizePosition(data.data?.position);
    setState({
      visible: true,
      text: data.data?.text ?? '',
      position,
      pressed: false,
    });
  });

  useNuiEvent<DrawTextPayload>('CHANGE_TEXT', (data) => {
    clearSwapTimer();
    const position = normalizePosition(data.data?.position);
    // Phase 1: pressed flash + slide out.
    setState((prev) => ({ ...prev, pressed: true, visible: false }));
    swapTimerRef.current = window.setTimeout(() => {
      // Phase 2: 500ms later, swap text + position and slide back in.
      setState({
        visible: true,
        text: data.data?.text ?? '',
        position,
        pressed: false,
      });
      swapTimerRef.current = null;
    }, 500);
  });

  useNuiEvent<HideTextPayload>('HIDE_TEXT', () => {
    clearSwapTimer();
    setState((prev) => ({ ...prev, visible: false, pressed: false }));
  });

  useNuiEvent<KeyPressedPayload>('KEY_PRESSED', () => {
    setState((prev) => ({ ...prev, pressed: true }));
    // Upstream auto-hides 500ms later via CreateThread → Wait(500) → hide.
    swapTimerRef.current = window.setTimeout(() => {
      setState((prev) => ({ ...prev, visible: false, pressed: false }));
      swapTimerRef.current = null;
    }, 500);
  });

  // Cleanup on unmount.
  React.useEffect(() => () => clearSwapTimer(), []);

  if (!state.text) return null;

  const positionStyle = state.visible
    ? DRAWTEXT_POSITION[state.position]
    : DRAWTEXT_HIDDEN[state.position];

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 9998,
        background: state.pressed
          ? 'rgba(193, 1, 20, 0.92)' // upstream --active-bg = error red
          : 'rgba(23, 23, 23, 0.9)',
        color: 'white',
        padding: '0.45rem 0.6rem',
        borderRadius: '0.15rem',
        boxShadow: '0 1px 3px 1px rgba(0, 0, 0, 0.15)',
        opacity: state.visible ? 1 : 0,
        transition: 'all 0.5s ease-out',
        fontFamily: '"Exo 2", "Segoe UI", system-ui, sans-serif',
        fontWeight: 300,
        pointerEvents: 'none',
        ...positionStyle,
      }}
      // Upstream uses text.innerHTML — calling resources rely on this for
      // <br>, color spans, etc. Sanitizing breaks the contract.
      dangerouslySetInnerHTML={{ __html: state.text }}
    />
  );
};

// ---- root -----------------------------------------------------------------

const Page: React.FC = () => {
  return (
    <>
      <NotifyHost />
      <DrawTextHost />
    </>
  );
};

export default Page;
