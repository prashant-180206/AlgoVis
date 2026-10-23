export type WorkspaceKind = "desktop" | "browser";

export interface WorkspaceNode {
  /** Path relative to the workspace root, using forward slashes. */
  readonly path: string;
  readonly name: string;
  readonly kind: "file" | "directory";
  readonly children?: readonly WorkspaceNode[];
}

export interface WorkspaceInfo {
  readonly root: string;
  readonly name: string;
  readonly tree: WorkspaceNode;
}

export interface WorkspaceProvider {
  readonly kind: WorkspaceKind;
  readonly root: string;
  readonly name: string;
  readTree(): Promise<WorkspaceNode>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, contents: string): Promise<void>;
  createFile(path: string): Promise<void>;
  createDirectory(path: string): Promise<void>;
  deletePath(path: string): Promise<void>;
}

export function workspaceName(path: string): string {
  const segments = path.split(/[\\/]/).filter(Boolean);
  return segments[segments.length - 1] ?? path;
}

export function childPath(parent: string, name: string): string {
  return parent ? `${parent}/${name}` : name;
}

export function skipWorkspaceEntry(name: string): boolean {
  return (
    name === "node_modules" ||
    name === "target" ||
    name === ".git" ||
    name === "dist" ||
    name === "build" ||
    name === ".next" ||
    name === ".turbo" ||
    name === ".venv" ||
    name === "__pycache__" ||
    name === ".DS_Store"
  );
}
