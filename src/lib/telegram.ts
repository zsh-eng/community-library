import {
  init,
  initData,
  miniApp,
  themeParams,
  viewport,
} from "@telegram-apps/sdk-react";

export async function initTelegramSdk(): Promise<void> {
  init();

  // Mount components. Each call is a no-op if unavailable.
  // TODO: check again for the init
  if (themeParams.mount.isAvailable()) {
    await themeParams.mount();
  }

  if (themeParams.bindCssVars.isAvailable()) {
    themeParams.bindCssVars();
  }

  if (miniApp.mountSync.isAvailable()) {
    miniApp.mountSync();
  }
  if (miniApp.bindCssVars.isAvailable()) {
    miniApp.bindCssVars();
  }

  if (viewport.mount.isAvailable()) {
    await viewport.mount();
  }
  if (viewport.bindCssVars.isAvailable()) {
    viewport.bindCssVars();
  }
  if (viewport.expand.isAvailable()) {
    viewport.expand();
  }

  // Restore init data so user signals are populated.
  initData.restore();

  if (miniApp.ready.isAvailable()) {
    miniApp.ready();
  }
}
