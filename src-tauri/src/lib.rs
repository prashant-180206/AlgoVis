use serde::Serialize;
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::sync::Mutex;
use tauri::State;

#[derive(Default)]
struct WorkspaceState(Mutex<Option<PathBuf>>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceEntry {
    path: String,
    name: String,
    kind: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    children: Option<Vec<WorkspaceEntry>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceInfo {
    root: String,
    name: String,
    tree: WorkspaceEntry,
}

fn should_skip(name: &str) -> bool {
    matches!(
        name,
        "node_modules"
            | "target"
            | ".git"
            | "dist"
            | "build"
            | ".next"
            | ".turbo"
            | ".venv"
            | "__pycache__"
            | ".DS_Store"
    )
}

fn normalize_path(path: &Path) -> PathBuf {
    let mut normalized = PathBuf::new();
    for component in path.components() {
        match component {
            Component::CurDir => {}
            Component::ParentDir => {
                normalized.pop();
            }
            other => normalized.push(other.as_os_str()),
        }
    }
    normalized
}

fn relative_path(root: &Path, path: &Path) -> String {
    path.strip_prefix(root)
        .map(|value| value.to_string_lossy().replace('\\', "/"))
        .unwrap_or_default()
}

fn path_name(path: &Path, is_root: bool) -> String {
    if !is_root {
        return path
            .file_name()
            .map(|name| name.to_string_lossy().to_string())
            .unwrap_or_else(|| path.display().to_string());
    }
    path.file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| path.display().to_string())
}

fn build_entry(
    root: &Path,
    current: &Path,
    depth: usize,
) -> Result<WorkspaceEntry, String> {
    let is_root = current == root;
    let mut children = Vec::new();

    if depth <= 32 {
        if let Ok(entries) = fs::read_dir(current) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if should_skip(&name) {
                    continue;
                }
                let file_type = match entry.file_type() {
                    Ok(value) => value,
                    Err(_) => continue,
                };
                let path = entry.path();
                if file_type.is_dir() {
                    if let Ok(child) = build_entry(root, &path, depth + 1) {
                        children.push(child);
                    }
                } else if file_type.is_file() {
                    children.push(WorkspaceEntry {
                        path: relative_path(root, &path),
                        name,
                        kind: "file",
                        children: None,
                    });
                }
            }
        }
    }

    children.sort_by(|left, right| {
        left.kind
            .cmp(right.kind)
            .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
    });

    Ok(WorkspaceEntry {
        path: relative_path(root, current),
        name: path_name(current, is_root),
        kind: "directory",
        children: Some(children),
    })
}

fn workspace_root(state: &WorkspaceState) -> Result<PathBuf, String> {
    let guard = state
        .0
        .lock()
        .map_err(|_| "The workspace state is unavailable.".to_string())?;
    guard
        .clone()
        .ok_or_else(|| "No workspace folder is open.".to_string())
}

fn resolve_workspace_path(
    state: &WorkspaceState,
    relative: &str,
) -> Result<PathBuf, String> {
    let root = workspace_root(state)?;
    if relative.trim().is_empty() {
        return Err("A workspace-relative path is required.".to_string());
    }
    let relative_path = Path::new(relative);
    if relative_path.is_absolute() {
        return Err("Absolute paths cannot be used here.".to_string());
    }
    let resolved = normalize_path(&root.join(relative_path));
    if !resolved.starts_with(&root) {
        return Err("The path escapes the open workspace.".to_string());
    }
    if resolved == root {
        return Err("The workspace root cannot be modified directly.".to_string());
    }
    Ok(resolved)
}

#[tauri::command]
fn open_workspace(
    root: String,
    state: State<'_, WorkspaceState>,
) -> Result<WorkspaceInfo, String> {
    let canonical = fs::canonicalize(&root)
        .map_err(|error| format!("Unable to open '{}': {error}", root))?;
    if !canonical.is_dir() {
        return Err(format!("'{}' is not a folder.", canonical.display()));
    }
    let tree = build_entry(&canonical, &canonical, 0)?;
    let name = path_name(&canonical, true);
    {
        let mut guard = state
            .0
            .lock()
            .map_err(|_| "The workspace state is unavailable.".to_string())?;
        *guard = Some(canonical.clone());
    }
    Ok(WorkspaceInfo {
        root: canonical.to_string_lossy().to_string(),
        name,
        tree,
    })
}

#[tauri::command]
fn workspace_tree(state: State<'_, WorkspaceState>) -> Result<WorkspaceEntry, String> {
    let root = workspace_root(&state)?;
    build_entry(&root, &root, 0)
}

#[tauri::command]
fn read_workspace_file(
    path: String,
    state: State<'_, WorkspaceState>,
) -> Result<String, String> {
    let resolved = resolve_workspace_path(&state, &path)?;
    fs::read_to_string(&resolved)
        .map_err(|error| format!("Unable to read '{}': {error}", path))
}

#[tauri::command]
fn write_workspace_file(
    path: String,
    contents: String,
    state: State<'_, WorkspaceState>,
) -> Result<(), String> {
    let resolved = resolve_workspace_path(&state, &path)?;
    if let Some(parent) = resolved.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Unable to create '{}': {error}", path))?;
    }
    fs::write(&resolved, contents)
        .map_err(|error| format!("Unable to save '{}': {error}", path))
}

#[tauri::command]
fn create_workspace_file(
    path: String,
    state: State<'_, WorkspaceState>,
) -> Result<(), String> {
    let resolved = resolve_workspace_path(&state, &path)?;
    if let Some(parent) = resolved.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Unable to create '{}': {error}", path))?;
    }
    fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&resolved)
        .map(|_| ())
        .map_err(|error| format!("Unable to create '{}': {error}", path))
}

#[tauri::command]
fn create_workspace_directory(
    path: String,
    state: State<'_, WorkspaceState>,
) -> Result<(), String> {
    let resolved = resolve_workspace_path(&state, &path)?;
    fs::create_dir_all(&resolved)
        .map_err(|error| format!("Unable to create '{}': {error}", path))
}

#[tauri::command]
fn delete_workspace_path(
    path: String,
    state: State<'_, WorkspaceState>,
) -> Result<(), String> {
    let resolved = resolve_workspace_path(&state, &path)?;
    let metadata = fs::metadata(&resolved)
        .map_err(|error| format!("Unable to find '{}': {error}", path))?;
    if metadata.is_dir() {
        fs::remove_dir_all(&resolved)
            .map_err(|error| format!("Unable to delete '{}': {error}", path))
    } else {
        fs::remove_file(&resolved)
            .map_err(|error| format!("Unable to delete '{}': {error}", path))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(WorkspaceState::default())
        .invoke_handler(tauri::generate_handler![
            open_workspace,
            workspace_tree,
            read_workspace_file,
            write_workspace_file,
            create_workspace_file,
            create_workspace_directory,
            delete_workspace_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
