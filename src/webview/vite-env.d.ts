/// <reference types="vite/client" />

// Virtual module resolved by the `pluginPageEntry` plugin in vite.config.ts.
// BuildManager sets U_CORE_PLUGIN_PAGE to the absolute path of the per-plugin
// Page.tsx for the current build; the plugin re-exports its default.
declare module 'virtual:plugin-page' {
  const Page: () => import('react').ReactElement;
  export default Page;
}
