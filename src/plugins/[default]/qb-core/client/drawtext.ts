/// <reference types="@citizenfx/client" />

// Direct port of qb-core/client/drawtext.lua. Tiny module — four
// NUI helpers (DrawText / ChangeText / HideText / KeyPressed) that
// dispatch to the qb-core NUI layer, plus the four
// `qb-core:client:*Text` net event handlers.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function hideText(): void {
  SendNUIMessage({ action: 'HIDE_TEXT' });
}

function drawText(text: string, position?: string): void {
  SendNUIMessage({
    action: 'DRAW_TEXT',
    data: { text, position: typeof position === 'string' ? position : 'left' },
  });
}

function changeText(text: string, position?: string): void {
  SendNUIMessage({
    action: 'CHANGE_TEXT',
    data: { text, position: typeof position === 'string' ? position : 'left' },
  });
}

function keyPressed(): void {
  void (async () => {
    SendNUIMessage({ action: 'KEY_PRESSED' });
    await sleep(500);
    hideText();
  })();
}

export function installClientDrawText(): void {
  onNet('qb-core:client:DrawText', (text: string, position?: string) => {
    drawText(text, position);
  });
  onNet('qb-core:client:ChangeText', (text: string, position?: string) => {
    changeText(text, position);
  });
  onNet('qb-core:client:HideText', () => {
    hideText();
  });
  onNet('qb-core:client:KeyPressed', () => {
    keyPressed();
  });

  const exportFn = (globalThis as any).exports as (
    name: string,
    fn: unknown
  ) => void;
  exportFn('DrawText', drawText);
  exportFn('ChangeText', changeText);
  exportFn('HideText', hideText);
  exportFn('KeyPressed', keyPressed);
}
