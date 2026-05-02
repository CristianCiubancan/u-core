// Shared vendor entry. Built as a single IIFE that imports the React /
// i18n / icon packages and parks each one on `window` under a known name.
// Per-plugin webview bundles externalize these packages with rollup
// globals pointing at these same window keys, so each plugin's bundle
// is React-free and shares the one copy loaded by this script.
//
// The keys must stay in lock-step with the `globals` map in
// BuildManager.runViteBuild — adding a package here without updating
// the consumer build leaves the plugin with an unresolved external.
//
// `./style.css` is co-imported so Vite emits the Tailwind+theme CSS
// alongside the JS bundle. Tailwind's content glob covers every plugin's
// html/ tree, so this single stylesheet contains every utility class
// any consumer plugin uses.

import './style.css';
import * as React from 'react';
import * as ReactJSXRuntime from 'react/jsx-runtime';
import * as ReactJSXDevRuntime from 'react/jsx-dev-runtime';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import * as ReactI18Next from 'react-i18next';
import * as I18Next from 'i18next';

declare global {
  interface Window {
    React: typeof React;
    ReactJSXRuntime: typeof ReactJSXRuntime;
    ReactJSXDevRuntime: typeof ReactJSXDevRuntime;
    ReactDOM: typeof ReactDOM;
    ReactDOMClient: typeof ReactDOMClient;
    ReactI18Next: typeof ReactI18Next;
    I18Next: typeof I18Next;
  }
}

window.React = React;
window.ReactJSXRuntime = ReactJSXRuntime;
window.ReactJSXDevRuntime = ReactJSXDevRuntime;
window.ReactDOM = ReactDOM;
window.ReactDOMClient = ReactDOMClient;
window.ReactI18Next = ReactI18Next;
window.I18Next = I18Next;
