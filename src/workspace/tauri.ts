import { invoke, isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
  type WorkspaceInfo,
  type WorkspaceNode,
  type WorkspaceProvider,
} from "./types";

interface DesktopWorkspaceInfo extends WorkspaceInfo {
  readonly tree: WorkspaceNode;
}

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

  const info = await invoke<DesktopWorkspaceInfo>("open_workspace", {
    root: selected,
  });
  return new TauriWorkspaceProvider(info.root, info.name);
}
