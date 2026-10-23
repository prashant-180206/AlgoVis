import {
  childPath,
  skipWorkspaceEntry,
  type WorkspaceNode,
  type WorkspaceProvider,
} from "./types";

function sortNodes(nodes: WorkspaceNode[]): WorkspaceNode[] {
  return nodes.sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === "directory" ? -1 : 1;
    return left.name.localeCompare(right.name, undefined, {
      sensitivity: "base",
    });
  });
}

async function readDirectory(
  handle: FileSystemDirectoryHandle,
  path: string,
  depth: number,
): Promise<WorkspaceNode> {
  const children: WorkspaceNode[] = [];
  if (depth <= 24) {
    try {
      for await (const [name, child] of handle.entries()) {
        if (skipWorkspaceEntry(name)) continue;
        if (child.kind === "directory") {
          children.push(
            await readDirectory(
              child as FileSystemDirectoryHandle,
              childPath(path, name),
              depth + 1,
            ),
          );
        } else {
          children.push({
            path: childPath(path, name),
            name,
            kind: "file",
          });
        }
      }
    } catch {
      // A directory can disappear or lose permission while it is being read.
    }
  }
  return {
    path,
    name: handle.name,
    kind: "directory",
    children: sortNodes(children),
  };
}

class BrowserWorkspaceProvider implements WorkspaceProvider {
  public readonly kind = "browser" as const;
  public readonly root = "";

  public constructor(
    private readonly handle: FileSystemDirectoryHandle,
    public readonly name: string,
  ) {}

  public readTree(): Promise<WorkspaceNode> {
    return readDirectory(this.handle, "", 0);
  }

  public async readFile(path: string): Promise<string> {
    const { directory, name } = await this.resolveParent(path);
    const file = await directory.getFileHandle(name);
    return (await file.getFile()).text();
  }

  public async writeFile(path: string, contents: string): Promise<void> {
    const { directory, name } = await this.resolveParent(path);
    const file = await directory.getFileHandle(name, { create: true });
    const writable = await file.createWritable();
    await writable.write(contents);
    await writable.close();
  }

  public async createFile(path: string): Promise<void> {
    const { directory, name } = await this.resolveParent(path, true);
    try {
      await directory.getFileHandle(name);
      throw new Error(`'${path}' already exists.`);
    } catch (error) {
      if (
        error instanceof Error &&
        error.name !== "NotFoundError" &&
        !error.message.includes("already exists")
      )
        throw error;
      if (error instanceof Error && error.message.includes("already exists"))
        throw error;
    }
    await this.writeFile(path, "");
  }

  public async createDirectory(path: string): Promise<void> {
    await this.resolveDirectory(path, true);
  }

  public async deletePath(path: string): Promise<void> {
    const { directory, name } = await this.resolveParent(path);
    await directory.removeEntry(name, { recursive: true });
  }

  public async renamePath(oldPath: string, newPath: string): Promise<void> {
    if (!oldPath || !newPath || oldPath === newPath) return;
    const source = await this.resolveParent(oldPath);
    const kind = await this.entryKind(source.directory, source.name);
    const destination = await this.resolveParent(newPath, true);
    await this.assertEntryMissing(destination.directory, destination.name, newPath);
    if (kind === "file") {
      const file = await source.directory.getFileHandle(source.name);
      const contents = await (await file.getFile()).text();
      await this.writeFile(newPath, contents);
    } else {
      const sourceDirectory = await source.directory.getDirectoryHandle(
        source.name,
      );
      const destinationDirectory = await destination.directory.getDirectoryHandle(
        destination.name,
        { create: true },
      );
      await this.copyDirectory(sourceDirectory, destinationDirectory);
    }
    await source.directory.removeEntry(source.name, { recursive: true });
  }

  private async entryKind(
    directory: FileSystemDirectoryHandle,
    name: string,
  ): Promise<"file" | "directory"> {
    try {
      await directory.getFileHandle(name);
      return "file";
    } catch (error) {
      if ((error as { name?: string })?.name === "NotFoundError")
        return "directory";
      throw error;
    }
  }

  private async assertEntryMissing(
    directory: FileSystemDirectoryHandle,
    name: string,
    path: string,
  ): Promise<void> {
    try {
      await directory.getFileHandle(name);
      throw new Error(`'${path}' already exists.`);
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists"))
        throw error;
    }
    try {
      await directory.getDirectoryHandle(name);
      throw new Error(`'${path}' already exists.`);
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists"))
        throw error;
    }
  }

  private async copyDirectory(
    source: FileSystemDirectoryHandle,
    destination: FileSystemDirectoryHandle,
  ): Promise<void> {
    for await (const [name, child] of source.entries()) {
      if (child.kind === "directory") {
        await this.copyDirectory(
          child as FileSystemDirectoryHandle,
          await destination.getDirectoryHandle(name, { create: true }),
        );
        continue;
      }
      const file = await (child as FileSystemFileHandle).getFile();
      const target = await destination.getFileHandle(name, { create: true });
      const writable = await target.createWritable();
      await writable.write(await file.arrayBuffer());
      await writable.close();
    }
  }

  private async resolveParent(
    path: string,
    createDirectory = false,
  ): Promise<{ directory: FileSystemDirectoryHandle; name: string }> {
    const segments = path.split("/").filter(Boolean);
    const name = segments.pop();
    if (!name) throw new Error("A file path is required.");
    const directory = await this.resolveDirectory(segments.join("/"), createDirectory);
    return { directory, name };
  }

  private async resolveDirectory(
    path: string,
    create: boolean,
  ): Promise<FileSystemDirectoryHandle> {
    let directory = this.handle;
    for (const segment of path.split("/").filter(Boolean)) {
      directory = await directory.getDirectoryHandle(segment, { create });
    }
    return directory;
  }
}

export function canUseBrowserWorkspace(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.showDirectoryPicker === "function"
  );
}

export async function openBrowserWorkspace(): Promise<
  WorkspaceProvider | undefined
> {
  if (!window.showDirectoryPicker) return undefined;
  const handle = await window.showDirectoryPicker({ mode: "readwrite" });
  return new BrowserWorkspaceProvider(handle, handle.name);
}
