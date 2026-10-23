/** Minimal shape shared by runtime and visual environment snapshots. */
export interface EnvironmentLike {
  readonly id: string;
  readonly parentId?: string;
}

export interface EnvironmentTreeNode<T extends EnvironmentLike> {
  readonly environment: T;
  readonly children: readonly EnvironmentTreeNode<T>[];
}

export interface EnvironmentForestOptions<T extends EnvironmentLike> {
  /**
   * Environments that must appear in the forest. Ancestors may also be pulled
   * in through `includeAncestors`, which keeps the block-inside-block shape
   * even when a parent scope is no longer executing.
   */
  readonly shouldInclude: (environment: T) => boolean;
  /**
   * Optional predicate for context ancestors. This is useful for showing a
   * module or closure scope that owns the bindings used by an active child.
   */
  readonly includeAncestors?: (environment: T) => boolean;
  /** The root environment, normally the global scope. */
  readonly rootId?: string;
}

/**
 * Builds a parent/child forest from a flat environment list.
 *
 * The input is kept in insertion order for stable sibling ordering. Included
 * environments whose immediate parent was filtered out are attached to their
 * nearest included ancestor, so the result never contains orphaned subtrees.
 */
export function buildEnvironmentForest<T extends EnvironmentLike>(
  environments: readonly T[],
  options: EnvironmentForestOptions<T>,
): EnvironmentTreeNode<T>[] {
  const byId = new Map(environments.map((environment) => [environment.id, environment]));
  const included = new Set<string>();

  const include = (environment: T): void => {
    if (included.has(environment.id)) return;
    included.add(environment.id);
    if (!options.includeAncestors) return;
    let parent = environment.parentId ? byId.get(environment.parentId) : undefined;
    while (parent) {
      if (options.includeAncestors(parent)) included.add(parent.id);
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }
  };

  environments.forEach((environment) => {
    if (options.shouldInclude(environment)) include(environment);
  });
  if (options.rootId) {
    const root = byId.get(options.rootId);
    if (root) included.add(root.id);
  }

  const nodes = new Map<
    string,
    { environment: T; children: EnvironmentTreeNode<T>[] }
  >();
  included.forEach((id) => {
    const environment = byId.get(id);
    if (environment) nodes.set(id, { environment, children: [] });
  });

  const roots: EnvironmentTreeNode<T>[] = [];
  environments.forEach((environment) => {
    const node = nodes.get(environment.id);
    if (!node) return;

    let parentId = environment.parentId;
    let parent = parentId ? nodes.get(parentId) : undefined;
    while (!parent && parentId) {
      parentId = byId.get(parentId)?.parentId;
      parent = parentId ? nodes.get(parentId) : undefined;
    }

    if (parent) parent.children.push(node);
    else roots.push(node);
  });

  roots.sort((left, right) => {
    if (left.environment.id === options.rootId) return -1;
    if (right.environment.id === options.rootId) return 1;
    return 0;
  });

  return roots;
}
