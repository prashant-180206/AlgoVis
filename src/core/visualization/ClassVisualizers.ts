import { Graphics } from "pixi.js";
import type { PixiRenderContext } from "./PixiRenderer";
import type { SpecialPixiInstanceRenderer } from "./PixiRenderer";
import type { VisualInstance, VisualObjectNode } from "./VisualizationState";

/**
 * Name-based visualizers for well-known data-structure classes.
 *
 * These run entirely in the visualization layer: the interpreter knows nothing
 * about them. Any class the user names `Stack` (any casing) is drawn as a LIFO
 * stack, `Queue` as a FIFO queue, and so on. Renderers receive the plain
 * projection of the instance plus every projected object, so a class card can
 * reach its nested `items` array or `head` / `root` nodes by label — nested
 * objects that belong to a special-rendered instance are not drawn as
 * standalone cards, they are absorbed into their class visualization.
 */

const C = {
  panel: 0x18241c,
  panelStroke: 0x526456,
  title: 0xd8f27a,
  muted: 0x5f7162,
  faint: 0x4f5e51,
  text: 0xd7e2d6,
  tile: 0x253229,
  tileStroke: 0x526456,
  active: 0xd7f57b,
  activeStroke: 0xeaff9b,
  activeText: 0x172014,
  line: 0x6b7f5c,
  circle: 0x1e2b20,
} as const;

const VALUE_FIELDS = ["value", "val", "data", "item", "element"] as const;
const ARRAY_FIELDS = [
  "items",
  "elements",
  "values",
  "data",
  "list",
  "array",
  "heap",
] as const;

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

function fieldOf(
  instance: VisualInstance,
  candidates: readonly string[],
): { name: string; value: string } | undefined {
  for (const candidate of candidates) {
    const field = instance.fields.find((item) => item.name === candidate);
    if (field) return field;
  }
  return undefined;
}

/** Finds the projected array living at `<instanceLabel>.<fieldName>`. */
function nestedArray(
  context: PixiRenderContext,
  instance: VisualInstance,
): { values: readonly string[] } | undefined {
  const labels = ARRAY_FIELDS.map((field) => `${instance.label}.${field}`);
  const found = context.objects.find(
    (object) =>
      object.type === "array" &&
      labels.some(
        (label) =>
          object.label === label || object.label.startsWith(`${label}.`),
      ),
  );
  return found && found.type === "array" ? { values: found.values } : undefined;
}

function truncate(value: string, maxCharacters: number): string {
  return value.length > maxCharacters
    ? `${value.slice(0, Math.max(1, maxCharacters - 1))}…`
    : value;
}

function drawPanel(
  context: PixiRenderContext,
  title: string,
  subtitle: string,
  instance: VisualInstance,
  x: number,
  y: number,
  width: number,
  height: number,
): { innerX: number; innerY: number; innerWidth: number; innerHeight: number } {
  const panel = new Graphics();
  panel
    .roundRect(x, y, width, height, 8)
    .fill(C.panel)
    .stroke({ width: 1, color: C.panelStroke });
  context.container.addChild(panel);
  context.addText(
    `${instance.label.toUpperCase()} · ${title}`,
    x + 12,
    y + 10,
    {
      size: 10,
      color: C.title,
      bold: true,
    },
  );
  context.addText(subtitle, x + 12, y + 25, { size: 9, color: C.muted });
  return {
    innerX: x + 12,
    innerY: y + 42,
    innerWidth: width - 24,
    innerHeight: y + height - 10 - (y + 42),
  };
}

function fieldLines(
  context: PixiRenderContext,
  instance: VisualInstance,
  innerX: number,
  innerY: number,
  innerWidth: number,
  limit = 6,
): void {
  if (instance.fields.length === 0) {
    context.addText("no fields", innerX, innerY + 4, {
      size: 11,
      color: C.muted,
    });
    return;
  }
  instance.fields.slice(0, limit).forEach((field, index) => {
    context.addText(
      `${field.name}: ${truncate(field.value, Math.max(6, Math.floor((innerWidth - 8) / 7)))}`,
      innerX,
      innerY + index * 16,
      { size: 11, color: C.text },
    );
  });
}

function drawTile(
  context: PixiRenderContext,
  value: string,
  x: number,
  y: number,
  width: number,
  height: number,
  active: boolean,
): void {
  const tile = new Graphics();
  tile
    .roundRect(x, y, width, height, 5)
    .fill(active ? C.active : C.tile)
    .stroke({
      width: active ? 2 : 1,
      color: active ? C.activeStroke : C.tileStroke,
    });
  context.container.addChild(tile);
  context.addText(
    truncate(value, Math.max(2, Math.floor(width / 8.5))),
    x + width / 2,
    y + height / 2 - 7,
    {
      size: Math.min(16, Math.max(10, Math.floor(width / 4.4))),
      color: active ? C.activeText : C.text,
      bold: true,
      anchorX: 0.5,
    },
  );
}

function drawArrow(
  context: PixiRenderContext,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  const arrow = new Graphics();
  arrow.moveTo(x1, y1).lineTo(x2, y2).stroke({ width: 1.5, color: C.line });
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 6;
  arrow
    .moveTo(x2, y2)
    .lineTo(
      x2 - head * Math.cos(angle - 0.5),
      y2 - head * Math.sin(angle - 0.5),
    )
    .moveTo(x2, y2)
    .lineTo(
      x2 - head * Math.cos(angle + 0.5),
      y2 - head * Math.sin(angle + 0.5),
    )
    .stroke({ width: 1.5, color: C.line });
  context.container.addChild(arrow);
}

/** Undirected edge: a straight line segment without an arrowhead. */
function drawEdge(
  context: PixiRenderContext,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  const edge = new Graphics();
  edge.moveTo(x1, y1).lineTo(x2, y2).stroke({ width: 1.5, color: C.line });
  context.container.addChild(edge);
}

function drawMarker(
  context: PixiRenderContext,
  text: string,
  centerX: number,
  y: number,
  color: number,
): void {
  context.addText(text, centerX, y, {
    size: 9,
    color,
    bold: true,
    anchorX: 0.5,
  });
}

function drawCircleValue(
  context: PixiRenderContext,
  value: string,
  centerX: number,
  centerY: number,
  radius: number,
  active: boolean,
): void {
  const circle = new Graphics();
  circle
    .circle(centerX, centerY, radius)
    .fill(active ? C.active : C.circle)
    .stroke({
      width: active ? 2 : 1,
      color: active ? C.activeStroke : C.tileStroke,
    });
  context.container.addChild(circle);
  context.addText(
    truncate(value, Math.max(2, Math.floor((radius * 2) / 7.5))),
    centerX,
    centerY - 7,
    {
      size: Math.min(14, Math.max(9, radius - 4)),
      color: active ? C.activeText : C.text,
      bold: true,
      anchorX: 0.5,
    },
  );
}

/* ------------------------------------------------------------------ */
/* Stack, queue, deque                                                 */
/* ------------------------------------------------------------------ */

const renderStack: SpecialPixiInstanceRenderer = (
  context,
  object,
  x,
  y,
  width,
  height,
) => {
  const { innerX, innerY, innerWidth, innerHeight } = drawPanel(
    context,
    "STACK",
    "LIFO · newest on top",
    object,
    x,
    y,
    width,
    height,
  );
  const array = nestedArray(context, object);
  if (!array) {
    fieldLines(context, object, innerX, innerY, innerWidth);
    return;
  }
  if (array.values.length === 0) {
    context.addText("empty stack", innerX, innerY + 8, {
      size: 11,
      color: C.muted,
    });
    return;
  }
  const tileHeight = 24;
  const maxTiles = Math.max(
    1,
    Math.floor((innerHeight - 6) / (tileHeight + 5)),
  );
  const hidden = Math.max(0, array.values.length - maxTiles);
  const visible = array.values.slice(-maxTiles);
  if (hidden > 0)
    drawMarker(
      context,
      `… ${hidden} more below`,
      innerX + innerWidth / 2,
      innerY,
      C.faint,
    );
  const columnWidth = Math.min(120, Math.max(46, innerWidth * 0.45));
  const startRow = hidden > 0 ? 16 : 0;
  visible
    .slice()
    .reverse()
    .forEach((value, index) => {
      // The reversed row order makes the newest element the top tile.
      const absoluteIndex = array.values.length - 1 - index;
      const isTop = index === 0;
      const tileY = innerY + startRow + index * (tileHeight + 5);
      drawTile(context, value, innerX, tileY, columnWidth, tileHeight, isTop);
      drawMarker(
        context,
        `[${absoluteIndex}]`,
        innerX + columnWidth + 20,
        tileY + 6,
        isTop ? C.title : C.faint,
      );
      if (isTop)
        drawMarker(
          context,
          "TOP",
          innerX + innerWidth - 20,
          tileY + 6,
          C.title,
        );
    });
};

function renderQueue(
  context: PixiRenderContext,
  object: VisualInstance,
  x: number,
  y: number,
  width: number,
  height: number,
  bothEnds = false,
): void {
  const { innerX, innerY, innerWidth, innerHeight } = drawPanel(
    context,
    bothEnds ? "DEQUE" : "QUEUE",
    bothEnds ? "FIFO · front & back" : "FIFO · front → rear",
    object,
    x,
    y,
    width,
    height,
  );
  const array = nestedArray(context, object);
  if (!array) {
    fieldLines(context, object, innerX, innerY, innerWidth);
    return;
  }
  if (array.values.length === 0) {
    context.addText("empty queue", innerX, innerY + 8, {
      size: 11,
      color: C.muted,
    });
    return;
  }
  const frontIndex = Number(
    fieldOf(object, ["front", "head", "start", "first"])?.value ?? "0",
  );
  const maxTiles = 6;
  const hidden = Math.max(0, array.values.length - maxTiles);
  const visible = array.values.slice(-maxTiles);
  const gap = 5;
  const tileWidth = Math.max(34, Math.min(56, (innerWidth - gap * 6) / 6));
  const tileHeight = Math.min(46, Math.max(28, innerHeight - 36));
  const totalWidth = visible.length * tileWidth + (visible.length - 1) * gap;
  const startX = innerX + Math.max(0, (innerWidth - totalWidth) / 2);
  const tileY = innerY + 10;
  if (hidden > 0) {
    context.addText(`… ${hidden}`, innerX, tileY + tileHeight / 2 - 7, {
      size: 10,
      color: C.faint,
    });
  }
  visible.forEach((value, index) => {
    const absoluteIndex = array.values.length - visible.length + index;
    const isFront = absoluteIndex === frontIndex;
    const tileX = startX + index * (tileWidth + gap);
    drawTile(context, value, tileX, tileY, tileWidth, tileHeight, isFront);
    if (isFront)
      drawMarker(
        context,
        "FRONT",
        tileX + tileWidth / 2,
        tileY + tileHeight + 5,
        C.title,
      );
    else if (index === visible.length - 1)
      drawMarker(
        context,
        bothEnds ? "BACK" : "REAR",
        tileX + tileWidth / 2,
        tileY + tileHeight + 5,
        C.title,
      );
    else
      drawMarker(
        context,
        `[${absoluteIndex}]`,
        tileX + tileWidth / 2,
        tileY + tileHeight + 5,
        C.faint,
      );
  });
}

/* ------------------------------------------------------------------ */
/* Linked lists and nodes                                              */
/* ------------------------------------------------------------------ */

const NEXT_FIELDS = ["next", "forward", "link"];
const PREV_FIELDS = ["prev", "previous"];

function chainLabels(
  context: PixiRenderContext,
  instance: VisualInstance,
  headFields: readonly string[],
  linkFields: readonly string[],
  maxNodes: number,
): string[] {
  const head = headFields
    .map((field) => `${instance.label}.${field}`)
    .find((label) =>
      context.objects.some(
        (object) => object.type === "instance" && object.label === label,
      ),
    );
  if (!head) return [];
  const labels = [head];
  while (labels.length < maxNodes) {
    const last = labels[labels.length - 1];
    const next = linkFields
      .map((field) => `${last}.${field}`)
      .find((label) =>
        context.objects.some(
          (object) => object.type === "instance" && object.label === label,
        ),
      );
    if (!next) break;
    labels.push(next);
  }
  return labels;
}

function renderList(
  context: PixiRenderContext,
  object: VisualInstance,
  x: number,
  y: number,
  width: number,
  height: number,
  doubly = false,
): void {
  const { innerX, innerY, innerWidth, innerHeight } = drawPanel(
    context,
    doubly ? "LINKED LIST · DOUBLY" : "LINKED LIST",
    "head → … → tail",
    object,
    x,
    y,
    width,
    height,
  );
  const chain = chainLabels(
    context,
    object,
    ["head", "top", "first", "front"],
    NEXT_FIELDS,
    16,
  );
  if (chain.length === 0) {
    context.addText("empty list", innerX, innerY + 10, {
      size: 11,
      color: C.muted,
    });
    fieldLines(
      context,
      object,
      innerX + 78,
      innerY + 10,
      Math.max(80, innerWidth - 78),
      3,
    );
    return;
  }
  const gap = 20;
  const tailBadge = 34;
  const count = Math.max(1, Math.min(chain.length, 5));
  const showMore = chain.length > count;
  const nodeWidth = Math.max(
    40,
    Math.min(
      70,
      Math.floor((innerWidth - gap * (count - 1) - tailBadge) / count),
    ),
  );
  const nodeHeight = 40;
  const rowY = innerY + 14;
  chain.slice(0, count).forEach((label, index) => {
    const node = context.objects.find(
      (candidate) => candidate.type === "instance" && candidate.label === label,
    );
    if (!node || node.type !== "instance") return;
    const nodeX = innerX + index * (nodeWidth + gap);
    const valueField = fieldOf(node, VALUE_FIELDS);
    if (valueField)
      drawTile(
        context,
        valueField.value,
        nodeX,
        rowY,
        nodeWidth,
        nodeHeight,
        index === 0,
      );
    if (index < count - 1)
      drawArrow(
        context,
        nodeX + nodeWidth,
        rowY + nodeHeight / 2,
        nodeX + nodeWidth + gap - 4,
        rowY + nodeHeight / 2,
      );
    drawMarker(
      context,
      index === 0 ? "HEAD" : `[${index}]`,
      nodeX + nodeWidth / 2,
      rowY + nodeHeight + 5,
      index === 0 ? C.title : C.faint,
    );
  });
  const lastX = innerX + (count - 1) * (nodeWidth + gap);
  if (showMore) {
    context.addText(
      `… ${chain.length - count} more`,
      lastX + nodeWidth + 2,
      rowY + 15,
      {
        size: 9,
        color: C.faint,
      },
    );
  } else {
    drawMarker(context, "TAIL", lastX + nodeWidth / 2, rowY - 8, C.title);
  }
  const sizeField = fieldOf(object, ["size", "length", "count"]);
  if (sizeField && rowY + nodeHeight + 28 < innerY + innerHeight)
    drawMarker(
      context,
      `${sizeField.name}: ${sizeField.value}`,
      innerX + innerWidth / 2,
      rowY + nodeHeight + 18,
      C.muted,
    );
}

const renderNode: SpecialPixiInstanceRenderer = (
  context,
  object,
  x,
  y,
  width,
  height,
) => {
  const { innerX, innerY, innerWidth, innerHeight } = drawPanel(
    context,
    "NODE",
    "value · links",
    object,
    x,
    y,
    width,
    height,
  );
  const valueField = fieldOf(object, VALUE_FIELDS);
  const centerX = innerX + innerWidth / 2;
  const centerY = innerY + Math.max(30, innerHeight / 2 - 6);
  if (valueField)
    drawCircleValue(context, valueField.value, centerX, centerY, 18, true);
  else fieldLines(context, object, innerX, innerY, innerWidth);
  if (fieldOf(object, NEXT_FIELDS)) {
    drawArrow(
      context,
      centerX + 22,
      centerY,
      innerX + innerWidth - 22,
      centerY,
    );
    drawMarker(
      context,
      "next",
      centerX + innerWidth / 2 - 12,
      centerY - 18,
      C.title,
    );
  }
  if (fieldOf(object, PREV_FIELDS)) {
    drawArrow(context, centerX - 22, centerY + 0, innerX + 22, centerY);
    drawMarker(
      context,
      "prev",
      innerX + innerWidth / 2 - 12,
      centerY - 18,
      C.muted,
    );
  }
};

/* ------------------------------------------------------------------ */
/* Trees                                                               */
/* ------------------------------------------------------------------ */

interface PlacedNode {
  readonly label: string;
  readonly depth: number;
  readonly column: number;
  readonly value: string;
  /** Present when the node carries a priority (e.g. treap value·priority). */
  readonly priority?: string;
}

/**
 * Rebuilds a tree purely from projected path labels such as
 * `<tree>.root.left.right`, so no interpreter knowledge of trees is needed.
 * Columns come from an in-order walk, which produces the classic tidy tree
 * layout for binary search trees.
 */
function collectTreeNodes(
  context: PixiRenderContext,
  instance: VisualInstance,
  maxNodes: number,
): PlacedNode[] {
  const byLabel = new Map(
    context.objects.map((object) => [object.label, object] as const),
  );
  const rootLabel = `${instance.label}.root`;
  const root = byLabel.get(rootLabel);
  if (!root || root.type !== "instance") return [];
  const placed = new Map<string, PlacedNode>();
  let columnCursor = 0;
  const place = (path: string, depth: number): number => {
    if (placed.size >= maxNodes) return columnCursor;
    const node = byLabel.get(path);
    if (!node || node.type !== "instance") return columnCursor;
    const leftPath = `${path}.left`;
    const rightPath = `${path}.right`;
    const hasLeft = Boolean(byLabel.get(leftPath));
    const hasRight = Boolean(byLabel.get(rightPath));
    let ownColumn = columnCursor;
    if (hasLeft) {
      place(leftPath, depth + 1);
      ownColumn = columnCursor;
      columnCursor += 1;
    } else {
      ownColumn = columnCursor;
      columnCursor += 1;
    }
    if (hasRight) place(rightPath, depth + 1);
    const valueField = fieldOf(node, VALUE_FIELDS);
    if (valueField)
      placed.set(path, {
        label: path,
        depth,
        column: ownColumn,
        value: valueField.value,
        priority: fieldOf(node, ["priority", "prio"])?.value,
      });
    return ownColumn;
  };
  place(rootLabel, 0);
  return [...placed.values()];
}

const renderTree: SpecialPixiInstanceRenderer = (
  context,
  object,
  x,
  y,
  width,
  height,
) => {
  const nameField = fieldOf(object, ["name", "title"]);
  const { innerX, innerY, innerWidth, innerHeight } = drawPanel(
    context,
    "TREE",
    nameField ? `${nameField.value} · root → leaves` : "root → leaves",
    object,
    x,
    y,
    width,
    height,
  );
  const nodes = collectTreeNodes(context, object, 15);
  if (nodes.length === 0) {
    fieldLines(context, object, innerX, innerY, innerWidth);
    return;
  }
  const maxDepth = Math.max(...nodes.map((node) => node.depth));
  const maxColumn = Math.max(...nodes.map((node) => node.column)) + 1;
  const levelHeight = Math.min(
    44,
    Math.max(24, (innerHeight - 14) / Math.max(1, maxDepth + 1)),
  );
  const spacing = innerWidth / Math.max(1, maxColumn);
  const radius = 14;
  const byPath = new Map(nodes.map((node) => [node.label, node] as const));
  const centerOf = (node: PlacedNode): { x: number; y: number } => ({
    x: innerX + spacing * (node.column + 0.5),
    y: innerY + 12 + levelHeight * node.depth,
  });
  nodes.forEach((node) => {
    const path = node.label;
    for (const childPath of [`${path}.left`, `${path}.right`]) {
      const child = byPath.get(childPath);
      if (!child) continue;
      const from = centerOf(node);
      const to = centerOf(child);
      drawArrow(context, from.x, from.y + radius, to.x, to.y - radius);
    }
  });
  nodes.forEach((node) => {
    const center = centerOf(node);
    drawCircleValue(
      context,
      node.value,
      center.x,
      center.y,
      radius,
      node.depth === 0,
    );
    if (node.priority !== undefined)
      drawMarker(
        context,
        `p${node.priority}`,
        center.x,
        center.y + radius + 6,
        C.muted,
      );
  });
};

const renderTreeNode: SpecialPixiInstanceRenderer = (
  context,
  object,
  x,
  y,
  width,
  height,
) => {
  const { innerX, innerY, innerWidth, innerHeight } = drawPanel(
    context,
    "TREE NODE",
    "value · left · right",
    object,
    x,
    y,
    width,
    height,
  );
  const centerX = innerX + innerWidth / 2;
  const centerY = innerY + 34;
  const valueField = fieldOf(object, VALUE_FIELDS);
  if (valueField)
    drawCircleValue(context, valueField.value, centerX, centerY, 16, true);
  else fieldLines(context, object, innerX, innerY, innerWidth);
  const childY = Math.min(innerY + innerHeight - 8, centerY + 40);
  const span = Math.max(44, innerWidth / 2.6);
  if (fieldOf(object, ["left", "prev", "previous"])) {
    drawArrow(
      context,
      centerX - 10,
      centerY + 14,
      centerX - span / 2,
      childY - 14,
    );
  } else {
    drawMarker(context, "left: null", centerX - span / 2, childY - 8, C.faint);
  }
  drawMarker(context, "left", centerX - span / 2 - 12, centerY - 8, C.muted);
  if (fieldOf(object, ["right", "next"])) {
    drawArrow(
      context,
      centerX + 10,
      centerY + 14,
      centerX + span / 2,
      childY - 14,
    );
  } else {
    drawMarker(context, "right: null", centerX + span / 2, childY - 8, C.faint);
  }
  drawMarker(context, "right", centerX + span / 2 + 12, centerY - 8, C.muted);
};

/* ------------------------------------------------------------------ */
/* Heaps and priority queues                                           */
/* ------------------------------------------------------------------ */

function renderHeap(
  context: PixiRenderContext,
  object: VisualInstance,
  x: number,
  y: number,
  width: number,
  height: number,
  variant: "min" | "max" | "generic" = "generic",
): void {
  const title =
    variant === "min" ? "MIN HEAP" : variant === "max" ? "MAX HEAP" : "HEAP";
  const subtitle =
    variant === "generic"
      ? "array indexed as a tree"
      : `${variant === "min" ? "smallest" : "largest"} at index 0`;
  const { innerX, innerY, innerWidth, innerHeight } = drawPanel(
    context,
    title,
    subtitle,
    object,
    x,
    y,
    width,
    height,
  );
  const array = nestedArray(context, object);
  if (!array || array.values.length === 0) {
    fieldLines(context, object, innerX, innerY, innerWidth);
    return;
  }
  const values = array.values.slice(0, 15);
  const levels = Math.floor(Math.log2(values.length)) + 1;
  const levelGap = Math.min(
    34,
    Math.max(22, (innerHeight * 0.66) / Math.max(1, levels)),
  );
  const topY = innerY + 8;
  const centerX = innerX + innerWidth / 2;
  const radius = 12;
  interface HeapNode {
    readonly cx: number;
    readonly cy: number;
    readonly value: string;
  }
  const positions: HeapNode[] = [];
  values.forEach((value, index) => {
    if (index === 0) {
      positions.push({ cx: centerX, cy: topY, value });
      return;
    }
    const parent = positions[Math.floor((index - 1) / 2)];
    const depth = Math.floor(Math.log2(index + 1));
    const direction = index % 2 === 1 ? -1 : 1;
    const spread =
      (innerWidth / Math.max(2.4, levels + 1.6)) * (levels * 0.42 + 0.5);
    positions.push({
      cx: parent.cx + direction * Math.max(30, spread / depth),
      cy: topY + depth * (levelGap + 8),
      value,
    });
  });
  positions.forEach((position, index) => {
    if (index === 0) {
      drawCircleValue(
        context,
        position.value,
        position.cx,
        position.cy,
        radius,
        true,
      );
      drawMarker(
        context,
        variant === "max" ? "MAX" : "MIN",
        position.cx,
        position.cy - radius - 10,
        C.title,
      );
      return;
    }
    const parent = positions[Math.floor((index - 1) / 2)];
    drawArrow(
      context,
      parent.cx,
      parent.cy + radius,
      position.cx,
      position.cy - radius,
    );
    drawCircleValue(
      context,
      position.value,
      position.cx,
      position.cy,
      radius,
      false,
    );
  });
  const remaining = array.values.length - values.length;
  if (remaining > 0)
    context.addText(
      `+${remaining} more not shown`,
      innerX,
      innerY + innerHeight - 12,
      {
        size: 9,
        color: C.faint,
      },
    );
}

/* ------------------------------------------------------------------ */
/* Graph                                                               */
/* ------------------------------------------------------------------ */

const GRAPH_LINK_FIELDS = ["adjacency", "neighbors", "edges"] as const;
const GRAPH_MAX_VERTICES = 12;

/**
 * Pulls the vertex name out of a neighbour display value, which is either the
 * raw name ("B") or a weighted pair projected as "[B, 7]".
 */
function graphNeighbor(entry: string): string {
  const trimmed = entry.trim();
  if (trimmed.startsWith("[") && trimmed.includes(",")) {
    return trimmed.replace(/^\[/, "").split(",")[0].trim();
  }
  return trimmed;
}

const renderGraph: SpecialPixiInstanceRenderer = (
  context,
  object,
  x,
  y,
  width,
  height,
) => {
  const { innerX, innerY, innerWidth, innerHeight } = drawPanel(
    context,
    "GRAPH",
    "vertex → neighbours",
    object,
    x,
    y,
    width,
    height,
  );
  const adjacencyField = fieldOf(object, GRAPH_LINK_FIELDS);
  const candidates = adjacencyField
    ? [adjacencyField.name, ...GRAPH_LINK_FIELDS]
    : [...GRAPH_LINK_FIELDS];
  const adjacency = context.objects.find(
    (candidate) =>
      candidate.type === "object" &&
      candidates.some((name) => candidate.label === `${object.label}.${name}`),
  );
  if (
    !adjacency ||
    adjacency.type !== "object" ||
    adjacency.fields.length === 0
  ) {
    fieldLines(context, object, innerX, innerY, innerWidth);
    return;
  }
  const adjacencyLabel = adjacency.label;
  const links = new Map<string, readonly string[]>();
  const vertexes: string[] = [];
  adjacency.fields.forEach((field) => {
    const nested = context.objects.find(
      (item) =>
        item.type === "array" &&
        item.label === `${adjacencyLabel}.${field.name}`,
    );
    const values =
      nested && nested.type === "array"
        ? nested.values
        : field.value
            .replace(/^\[|\]$/g, "")
            .split(",")
            .map((entry) => entry.trim());
    links.set(field.name, values);
    vertexes.push(field.name);
    values.forEach((entry) => {
      const neighbor = graphNeighbor(entry);
      if (
        neighbor &&
        !vertexes.includes(neighbor) &&
        vertexes.length < GRAPH_MAX_VERTICES * 3
      )
        vertexes.push(neighbor);
    });
  });
  const shown = vertexes.slice(0, GRAPH_MAX_VERTICES);
  const centerX = innerX + innerWidth / 2;
  const centerY = innerY + innerHeight / 2;
  // Regular polygon: all vertices on one circle, edges drawn as chords.
  const layoutRadius = Math.max(
    36,
    Math.min((innerWidth - 80) / 2, (innerHeight - 58) / 2),
  );
  const longest = Math.max(1, ...shown.map((name) => name.length));
  const radius = Math.max(13, Math.min(20, Math.ceil(3.75 * longest)));
  const positions = new Map<string, { x: number; y: number }>();
  shown.forEach((name, index) => {
    if (shown.length === 1) {
      positions.set(name, { x: centerX, y: centerY });
      return;
    }
    const angle = ((-90 + (360 * index) / shown.length) * Math.PI) / 180;
    positions.set(name, {
      x: centerX + layoutRadius * Math.cos(angle),
      y: centerY + layoutRadius * Math.sin(angle),
    });
  });
  const pairOf = (a: string, b: string): string =>
    a < b ? `${a}|${b}` : `${b}|${a}`;
  const drawn = new Set<string>();
  shown.forEach((from) => {
    for (const entry of links.get(from) ?? []) {
      const to = graphNeighbor(entry);
      if (from === to || !positions.has(from) || !positions.has(to)) continue;
      if (drawn.has(pairOf(from, to))) continue;
      drawn.add(pairOf(from, to));
      const start = positions.get(from)!;
      const end = positions.get(to)!;
      const deltaX = end.x - start.x;
      const deltaY = end.y - start.y;
      const distance = Math.hypot(deltaX, deltaY) || 1;
      const pad = radius + 3;
      const startX = start.x + (deltaX / distance) * pad;
      const startY = start.y + (deltaY / distance) * pad;
      const endX = end.x - (deltaX / distance) * pad;
      const endY = end.y - (deltaY / distance) * pad;
      const twoWay = (links.get(to) ?? []).some(
        (back) => graphNeighbor(back) === from,
      );
      if (twoWay) drawEdge(context, startX, startY, endX, endY);
      else drawArrow(context, startX, startY, endX, endY);
    }
  });
  positions.forEach((position, name) => {
    drawCircleValue(context, name, position.x, position.y, radius, false);
  });
  const hidden = vertexes.length - shown.length;
  if (hidden > 0)
    context.addText(`… ${hidden} more vertices`, innerX, y + height - 14, {
      size: 9,
      color: C.faint,
    });
};
/* ------------------------------------------------------------------ */
/* Matrix                                                              */
/* ------------------------------------------------------------------ */

/** Parses an array display string such as "[4, 3]" into cell values. */
function parseArrayDisplay(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[")) return [trimmed];
  const inner = trimmed.replace(/^\[/, "").replace(/\]$/, "").trim();
  if (inner.length === 0) return [];
  return inner.split(",").map((part) => part.trim());
}

const renderMatrix: SpecialPixiInstanceRenderer = (
  context,
  object,
  x,
  y,
  width,
  height,
) => {
  const { innerX, innerY, innerWidth, innerHeight } = drawPanel(
    context,
    "MATRIX",
    "data[row][column]",
    object,
    x,
    y,
    width,
    height,
  );
  const dataField = fieldOf(object, ARRAY_FIELDS);
  const dataLabel = dataField ? `${object.label}.${dataField.name}` : undefined;
  const rowNodes = context.objects
    .filter(
      (candidate) =>
        candidate.type === "array" &&
        dataLabel !== undefined &&
        candidate.label.startsWith(`${dataLabel}.`),
    )
    .map((candidate) => {
      if (candidate.type !== "array") return undefined;
      const index = Number(candidate.label.slice((dataLabel ?? "").length + 1));
      return Number.isFinite(index)
        ? { index, values: candidate.values }
        : undefined;
    })
    .filter((row): row is { index: number; values: readonly string[] } =>
      Boolean(row),
    )
    .sort((first, second) => first.index - second.index);
  const outerArray = dataLabel
    ? context.objects.find(
        (candidate) =>
          candidate.type === "array" && candidate.label === dataLabel,
      )
    : undefined;
  const rows: string[][] =
    rowNodes.length > 0
      ? rowNodes.map((row) => row.values.map((value) => value.trim()))
      : outerArray && outerArray.type === "array"
        ? outerArray.values.map((row) => parseArrayDisplay(row))
        : [];
  if (rows.length === 0 || rows.every((row) => row.length === 0)) {
    fieldLines(context, object, innerX, innerY, innerWidth);
    return;
  }
  const rowCount = Math.min(rows.length, 8);
  const columnCount = Math.max(
    1,
    ...rows.slice(0, rowCount).map((row) => row.length),
  );
  const gap = 4;
  const rowMarkers = rowCount > 1 ? 20 : 0;
  const cellWidth = Math.max(
    26,
    Math.min(
      64,
      Math.floor(
        (innerWidth - gap * Math.max(1, columnCount - 1) - rowMarkers) /
          columnCount,
      ),
    ),
  );
  const cellHeight = Math.max(
    18,
    Math.min(
      38,
      Math.floor((innerHeight - gap * Math.max(1, rowCount - 1)) / rowCount),
    ),
  );
  const gridWidth = columnCount * cellWidth + (columnCount - 1) * gap;
  const gridHeight = rowCount * cellHeight + (rowCount - 1) * gap;
  const startX =
    innerX + Math.max(rowMarkers, Math.floor((innerWidth - gridWidth) / 2));
  const startY = innerY + Math.floor((innerHeight - gridHeight) / 2);
  for (let row = 0; row < rowCount; row++) {
    const tileY = startY + row * (cellHeight + gap);
    if (rowMarkers > 0)
      drawMarker(
        context,
        `[${row}]`,
        innerX + rowMarkers - 6,
        tileY + cellHeight / 2 - 5,
        C.faint,
      );
    for (let column = 0; column < columnCount; column++) {
      const tileX = startX + column * (cellWidth + gap);
      drawTile(
        context,
        rows[row][column] ?? "·",
        tileX,
        tileY,
        cellWidth,
        cellHeight,
        false,
      );
    }
  }
  if (rows.length > rowCount)
    context.addText(
      `… ${rows.length - rowCount} more rows`,
      innerX,
      y + height - 14,
      {
        size: 9,
        color: C.faint,
      },
    );
};

/* ------------------------------------------------------------------ */
/* Content-driven card heights                                         */
/* ------------------------------------------------------------------ */

const GRAPH_CLASS_NAMES = ["graph", "adjacencylist"] as const;
const TREE_CLASS_NAMES = [
  "tree",
  "binarytree",
  "treap",
  "bst",
  "binarysearchtree",
  "bsttree",
  "searchtree",
  "avltree",
] as const;
const HEAP_CLASS_NAMES = [
  "heap",
  "minheap",
  "maxheap",
  "priorityqueue",
] as const;
const LIST_CLASS_NAMES = [
  "list",
  "linkedlist",
  "singlylinkedlist",
  "doublylinkedlist",
] as const;
const NODE_CLASS_NAMES = ["node", "listnode"] as const;
const TREE_NODE_CLASS_NAMES = ["treenode", "bstnode", "avlnode"] as const;

/** Top-level element count of the instance's main nested collection. */
function itemCount(
  instance: VisualInstance,
  objects: readonly VisualObjectNode[],
  fields: readonly string[],
): number {
  for (const field of fields) {
    const nested = objects.find(
      (object) => object.label === `${instance.label}.${field}`,
    );
    if (!nested) continue;
    if (nested.type === "array") return nested.values.length;
    if (nested.type === "object") return Math.max(1, nested.fields.length);
  }
  return 0;
}

/**
 * Recommended card height for a special-rendered class instance, sized to
 * its content so cards show their values instead of truncating them — and
 * never stretch into needlessly tall placeholders when nearly empty.
 */
export function classCardHeight(
  instance: VisualInstance,
  objects: readonly VisualObjectNode[],
): number {
  const key = instance.className.toLowerCase();
  if (key === "stack") {
    const count = itemCount(instance, objects, ARRAY_FIELDS);
    return Math.max(130, Math.min(390, 70 + count * 29));
  }
  if (key === "queue" || key === "deque") return 140;
  if (LIST_CLASS_NAMES.includes(key as (typeof LIST_CLASS_NAMES)[number]))
    return 140;
  if (NODE_CLASS_NAMES.includes(key as (typeof NODE_CLASS_NAMES)[number]))
    return 124;
  if (
    TREE_NODE_CLASS_NAMES.includes(
      key as (typeof TREE_NODE_CLASS_NAMES)[number],
    )
  )
    return 170;
  if (TREE_CLASS_NAMES.includes(key as (typeof TREE_CLASS_NAMES)[number]))
    return 210;
  if (HEAP_CLASS_NAMES.includes(key as (typeof HEAP_CLASS_NAMES)[number])) {
    const count = Math.max(1, itemCount(instance, objects, ARRAY_FIELDS));
    const levels = Math.floor(Math.log2(count)) + 1;
    return Math.max(170, Math.min(390, 62 + levels * 44));
  }
  if (GRAPH_CLASS_NAMES.includes(key as (typeof GRAPH_CLASS_NAMES)[number]))
    return 280;
  if (key === "matrix" || key === "grid") {
    const dataField = fieldOf(instance, ARRAY_FIELDS);
    const rows = dataField
      ? objects.filter(
          (object) =>
            object.type === "array" &&
            object.label.startsWith(`${instance.label}.${dataField.name}.`),
        ).length
      : 0;
    return Math.max(120, Math.min(340, 68 + Math.max(1, rows) * 34));
  }
  return 176;
}

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

export const defaultClassRenderers: Readonly<
  Record<string, SpecialPixiInstanceRenderer>
> = {
  stack: renderStack,
  queue: (context, object, x, y, width, height) =>
    renderQueue(context, object, x, y, width, height),
  deque: (context, object, x, y, width, height) =>
    renderQueue(context, object, x, y, width, height, true),
  linkedlist: (context, object, x, y, width, height) =>
    renderList(context, object, x, y, width, height),
  singlylinkedlist: (context, object, x, y, width, height) =>
    renderList(context, object, x, y, width, height),
  list: (context, object, x, y, width, height) =>
    renderList(context, object, x, y, width, height),
  doublylinkedlist: (context, object, x, y, width, height) =>
    renderList(context, object, x, y, width, height, true),
  listnode: renderNode,
  node: renderNode,
  treenode: renderTreeNode,
  bstnode: renderTreeNode,
  avlnode: renderTreeNode,
  tree: renderTree,
  binarytree: renderTree,
  treap: renderTree,
  bst: renderTree,
  binarysearchtree: renderTree,
  bsttree: renderTree,
  searchtree: renderTree,
  avltree: renderTree,
  minheap: (context, object, x, y, width, height) =>
    renderHeap(context, object, x, y, width, height, "min"),
  maxheap: (context, object, x, y, width, height) =>
    renderHeap(context, object, x, y, width, height, "max"),
  heap: (context, object, x, y, width, height) =>
    renderHeap(context, object, x, y, width, height),
  priorityqueue: (context, object, x, y, width, height) =>
    renderHeap(context, object, x, y, width, height, "min"),
  graph: renderGraph,
  adjacencylist: renderGraph,
  topologicalsort: renderGraph,
  matrix: renderMatrix,
  grid: renderMatrix,
};
