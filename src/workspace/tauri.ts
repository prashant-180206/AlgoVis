import { invoke, isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { exampleFiles } from "../examples";
import {
  type WorkspaceInfo,
  type WorkspaceNode,
  type WorkspaceProvider,
} from "./types";

export function isTauriRuntime(): boolean {
  return isTauri();
}

class TauriWorkspaceProvider implements WorkspaceProvider {
  public readonly kind = "desktop" as const;

  public constructor(
    public readonly root: string,
    public readonly name: string,
  ) {}

  public readTree(): Promise<WorkspaceNode> {
    return invoke<WorkspaceNode>("workspace_tree");
  }

  public readFile(path: string): Promise<string> {
    return invoke<string>("read_workspace_file", { path });
  }

  public async writeFile(path: string, contents: string): Promise<void> {
    await invoke("write_workspace_file", { path, contents });
  }

  public async createFile(path: string): Promise<void> {
    await invoke("create_workspace_file", { path });
  }

  public async createDirectory(path: string): Promise<void> {
    await invoke("create_workspace_directory", { path });
  }

  public async deletePath(path: string): Promise<void> {
    await invoke("delete_workspace_path", { path });
  }

  public async renamePath(oldPath: string, newPath: string): Promise<void> {
    await invoke("rename_workspace_path", { oldPath, newPath });
  }
}

export async function openDesktopWorkspace(): Promise<
  WorkspaceProvider | undefined
> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Open workspace folder",
  });
  if (typeof selected !== "string") return undefined;
  return openDesktopWorkspaceRoot(selected);
}

export async function openDesktopWorkspaceRoot(
  root: string,
): Promise<WorkspaceProvider> {
  const info = await invoke<WorkspaceInfo>("open_workspace", { root });
  return new TauriWorkspaceProvider(info.root, info.name);
}

/**
 * Opens a sensible default folder on startup: `?workspace=` from the URL,
 * otherwise the AppData `examples` folder with the ready-made data-structure
 * scripts, and finally the project folder that launched the desktop app.
 * Returns `undefined` in the browser, where a folder can only be opened by a
 * user gesture.
 */
export async function openDefaultDesktopWorkspace(): Promise<
  WorkspaceProvider | undefined
> {
  if (!isTauri()) return undefined;
  const requested = new URLSearchParams(window.location.search).get("workspace");
  if (requested) return openDesktopWorkspaceRoot(requested);
  try {
    const info = await invoke<WorkspaceInfo>("ensure_examples_dir", {
      files: exampleFiles(),
    });
    return new TauriWorkspaceProvider(info.root, info.name);
  } catch {
    try {
      const info = await invoke<WorkspaceInfo>("default_workspace");
      return new TauriWorkspaceProvider(info.root, info.name);
    } catch {
      return undefined;
    }
  }
}
