const WORKSPACE_MODULE_PREFIX = "workspace://root/";

export function workspaceModuleId(relativePath: string): string {
  return (
    WORKSPACE_MODULE_PREFIX +
    relativePath
      .split("/")
      .filter((segment) => segment.length > 0)
      .map(encodeURIComponent)
      .join("/")
  );
}

export function workspaceModulePath(moduleId: string): string | undefined {
  if (!moduleId.startsWith(WORKSPACE_MODULE_PREFIX)) return undefined;
  return moduleId
    .slice(WORKSPACE_MODULE_PREFIX.length)
    .split("/")
    .map((segment) => decodeURIComponent(segment))
    .join("/");
}

export function moduleDisplayName(moduleId: string): string {
  const workspacePath = workspaceModulePath(moduleId);
  if (workspacePath !== undefined) {
    const segments = workspacePath.split("/");
    return segments[segments.length - 1] || workspacePath;
  }
  try {
    return new URL(moduleId).pathname.split("/").pop() || moduleId;
  } catch {
    return moduleId;
  }
}
