// Ambient type shims for the webview project.
//
// Background: tsconfig.webview.json now declares an explicit `types`
// whitelist (vite/client + react). That removes the previous accidental
// global ambient of `@types/node` (R-10), which is correct — the NUI
// runtime is the FiveM CEF/Chromium browser, not Node — but it leaves a
// few existing references stranded:
//
// 1. `process.env.ASSET_SERVER_URL` is consumed by NUI code that runs in
//    the browser and is substituted at build time by Vite's `define`
//    (vite.config.ts:11-23). The runtime path is correct; only the
//    typecheck needs a `process` global. We declare the minimum that
//    Vite's define actually fills in — nothing else from Node's surface.
//
// 2. `NodeJS.Timeout` is referenced as the type of `setTimeout`'s return
//    value in a couple of React `useRef` slots (FormSelect, MenuProvider).
//    Browser `setTimeout` actually returns `number`; we alias the
//    namespace's `Timeout` to the platform's real return type so the
//    existing call sites continue to type-check without misleading anyone
//    into thinking they are running under Node.
//
// Both shims are intentionally minimal. They are NOT a license to read
// other `process.env.X` values or import other Node globals — those
// will continue to fail to type-check, which is exactly the point of
// the types whitelist.

declare const process: {
  readonly env: {
    readonly ASSET_SERVER_URL?: string;
  };
};

declare namespace NodeJS {
  type Timeout = ReturnType<typeof setTimeout>;
}

// Virtual module resolved by the `pluginPageEntry` plugin in vite.config.ts.
// BuildManager sets U_CORE_PLUGIN_PAGE to the absolute path of the per-plugin
// Page.tsx for the current build; the plugin re-exports its default.
declare module 'virtual:plugin-page' {
  const Page: () => import('react').ReactElement;
  export default Page;
}
