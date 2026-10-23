import {
  canUseBrowserWorkspace,
  openBrowserWorkspace,
} from "./browser";
import { isTauriRuntime, openDesktopWorkspace } from "./tauri";
import type { WorkspaceProvider } from "./types";

export * from "./modules";
export * from "./types";
export {
  canUseBrowserWorkspace,
  isTauriRuntime,
  openBrowserWorkspace,
  openDesktopWorkspace,
};

export async function openWorkspaceFromMachine(): Promise<
  WorkspaceProvider | undefined
> {
  if (isTauriRuntime()) return openDesktopWorkspace();
  if (canUseBrowserWorkspace()) return openBrowserWorkspace();
  throw new Error(
    "Folder access needs the desktop app or a Chromium browser with the File System Access API.",
  );
}
