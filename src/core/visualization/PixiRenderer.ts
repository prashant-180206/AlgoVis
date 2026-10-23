import { Application, Container, Graphics, Text } from "pixi.js";
import {
  buildEnvironmentForest,
  type EnvironmentTreeNode,
} from "./EnvironmentTree";
import type {
  VisualArray,
  VisualEnvironment,
  VisualInstance,
  VisualObjectNode,
  VisualVariable,
  VisualizationState,
} from "./VisualizationState";

const FONT_FAMILY = "DM Mono, IBM Plex Mono, monospace";

const COLORS = {
  card: 0x18241c,
  cardInactive: 0x151b17,
  cardStroke: 0x526456,
  cardStrokeActive: 0x8aa65f,
  title: 0xd8f27a,
  muted: 0x5f7162,
  text: 0xd7e2d6,
  value: 0xc6d8a9,
  tile: 0x253229,
  tileStroke: 0x526456,
  tileActive: 0xd7f56b,
  tileActiveStroke: 0xeaff9b,
  tileActiveText: 0x172014,
  panel: 0x18241c,
} as const;

interface Point {
  x: number;
  y: number;
}

interface EnvironmentLayout {
  readonly node: EnvironmentTreeNode<VisualEnvironment>;
  readonly variables: readonly VisualVariable[];
  readonly children: readonly EnvironmentLayout[];
  readonly height: number;
}

export interface PixiTextOptions {
  size?: number;
  color?: number;
  bold?: boolean;
  anchorX?: number;
}

export interface PixiRenderContext {
  readonly container: Container;
  addText: (
    value: string,
    x: number,
    y: number,
    options?: PixiTextOptions,
  ) => Text;
}

export type SpecialPixiInstanceRenderer = (
  context: PixiRenderContext,
  object: VisualInstance,
  x: number,
  y: number,
  width: number,
  height: number,
) => void;

/**
 * PixiJS renderer for the projected visualization state.
 *
 * The renderer owns a Pixi Application plus one world container. Panning moves
 * the world; every `render(state)` call rebuilds the display list from the
 * immutable projection, so a step change is always a complete, safe redraw.
 */
export class PixiRenderer {
  private app?: Application;
  private host?: HTMLElement;
  private resizeObserver?: ResizeObserver;
  private readonly world = new Container();
  private readonly content = new Container();
  private readonly specialRenderers = new Map<string, SpecialPixiInstanceRenderer>();
  private state?: VisualizationState;
  private removedListeners?: () => void;
  private destroyed = false;
  private dragging = false;
  private lastPointer?: Point;

  public registerClassRenderer(
    className: string,
    renderer: SpecialPixiInstanceRenderer,
  ): void {
    this.specialRenderers.set(className, renderer);
  }

  public async init(host: HTMLElement): Promise<void> {
    if (this.app || this.destroyed) return;
    this.host = host;
    const app = new Application();
    await app.init({
      width: Math.max(1, host.clientWidth),
      height: Math.max(1, host.clientHeight),
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
      powerPreference: "high-performance",
    });
    if (this.destroyed) {
      app.destroy(
        { removeView: true, releaseGlobalResources: true },
        { children: true },
      );
      return;
    }
    this.app = app;
    app.canvas.style.display = "block";
    app.canvas.style.width = "100%";
    app.canvas.style.height = "100%";
    app.canvas.style.touchAction = "none";
    host.appendChild(app.canvas);

    this.world.addChild(this.content);
    app.stage.addChild(this.world);
    this.installPointerHandlers(app.canvas);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
  }

  public render(state: VisualizationState): void {
    this.state = state;
    this.draw();
  }

  public panBy(deltaX: number, deltaY: number): void {
    this.world.x += deltaX;
    this.world.y += deltaY;
  }

  public resetView(): void {
    this.world.position.set(0, 0);
    this.draw();
  }

  public destroy(): void {
    this.destroyed = true;
    this.removedListeners?.();
    this.removedListeners = undefined;
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    const app = this.app;
    this.app = undefined;
    this.state = undefined;
    if (app) {
      app.destroy(
        { removeView: true, releaseGlobalResources: true },
        { children: true },
      );
    }
  }

  private resize(): void {
    if (!this.app || !this.host) return;
    const width = Math.max(1, Math.floor(this.host.clientWidth));
    const height = Math.max(1, Math.floor(this.host.clientHeight));
    this.app.renderer.resize(width, height);
    this.draw();
  }

  private draw(): void {
    if (!this.app || !this.state) return;
    this.clearContent();
    const width = this.app.screen.width;
    const height = this.app.screen.height;
    const forest = buildEnvironmentForest(this.state.environments, {
      shouldInclude: (environment) => environment.active,
      includeAncestors: (environment) =>
        environment.kind === "global" ||
        environment.variables.some((variable) => !variable.builtin),
      rootId: this.state.rootEnvironmentId,
    });
    let y = 22;
    y = this.drawEnvironmentForest(forest, width, y);
    if (this.state.objects.length > 0) {
      y += 18;
      this.addText("DATA STRUCTURES", 26, y, {
        size: 10,
        color: COLORS.muted,
        bold: true,
      });
      y += 20;
      const columns = Math.max(1, Math.floor((width - 48) / 430));
      const gap = 16;
      const cardWidth = (width - 48 - (columns - 1) * gap) / columns;
      const rowHeight = 190;
      this.state.objects.forEach((object, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        this.drawObject(
          object,
          24 + column * (cardWidth + gap),
          y + row * rowHeight,
          cardWidth,
          176,
        );
      });
      y += Math.ceil(this.state.objects.length / columns) * rowHeight;
    }
    if (forest.length === 0 && this.state.objects.length === 0) {
      this.addText(
        "Run or step the program to materialize runtime objects",
        width / 2,
        height / 2,
        { size: 13, color: 0x8d9c90, anchorX: 0.5 },
      );
    }
  }

  private clearContent(): void {
    const children = this.content.removeChildren();
    children.forEach((child) => child.destroy({ children: true }));
  }

  private drawEnvironmentForest(
    forest: readonly EnvironmentTreeNode<VisualEnvironment>[],
    width: number,
    y: number,
  ): number {
    if (forest.length === 0) return y;
    const rootWidth = Math.max(320, Math.min(width - 48, 860));
    this.addText("ENVIRONMENT NEST", 26, y, {
      size: 10,
      color: COLORS.muted,
      bold: true,
    });
    this.addText("outer scope → nested block scope", 26, y + 15, {
      size: 9,
      color: 0x4f5e51,
    });
    let cursorY = y + 34;
    forest.forEach((node) => {
      const layout = this.layoutEnvironment(node, rootWidth);
      this.drawEnvironmentNode(layout, 24, cursorY, rootWidth, 0);
      cursorY += layout.height + 16;
    });
    return cursorY;
  }

  private layoutEnvironment(
    node: EnvironmentTreeNode<VisualEnvironment>,
    width: number,
  ): EnvironmentLayout {
    const variables = node.environment.variables.filter(
      (variable) => !variable.builtin,
    );
    const childWidth = Math.max(220, width - 26);
    const children = node.children.map((child) =>
      this.layoutEnvironment(child, childWidth),
    );
    const variableRows = Math.max(1, variables.length);
    const childrenHeight =
      children.length === 0
        ? 0
        : 4 +
          children.reduce((total, child) => total + child.height + 8, 0);
    const height = 36 + variableRows * 16 + 8 + childrenHeight;
    return { node, variables, children, height };
  }

  private drawEnvironmentNode(
    layout: EnvironmentLayout,
    x: number,
    y: number,
    width: number,
    depth: number,
  ): void {
    const environment = layout.node.environment;
    const active = environment.active;
    const panel = new Graphics();
    panel
      .roundRect(x, y, width, layout.height, 9)
      .fill(active ? COLORS.card : COLORS.cardInactive)
      .stroke({
        width: active ? 1.5 : 1,
        color: active ? COLORS.cardStrokeActive : COLORS.cardStroke,
        alpha: active ? 1 : 0.55,
      });
    this.content.addChild(panel);

    const title = `${depth > 0 ? "↳ " : ""}${environment.kind.toUpperCase()} · ${environment.id}`;
    this.addText(title, x + 12, y + 10, {
      size: 10,
      color: active ? COLORS.title : 0x8a9a8c,
      bold: true,
    });
    this.addText(
      layout.variables.length === 0
        ? "no bindings"
        : `${layout.variables.length} binding${layout.variables.length === 1 ? "" : "s"}`,
      x + width - 12,
      y + 11,
      {
        size: 9,
        color: active ? COLORS.muted : 0x4b5a4d,
        anchorX: 1,
      },
    );

    const separator = new Graphics();
    separator
      .moveTo(x + 10, y + 28)
      .lineTo(x + width - 10, y + 28)
      .stroke({ width: 1, color: COLORS.cardStroke, alpha: 0.35 });
    this.content.addChild(separator);

    const variableStart = y + 36;
    if (layout.variables.length === 0) {
      this.addText(
        active ? "no user bindings" : "scope context",
        x + 12,
        variableStart + 2,
        { size: 11, color: COLORS.muted },
      );
    } else {
      const maxCharacters = Math.max(
        8,
        Math.floor((width - 24) / 6.2),
      );
      layout.variables.forEach((variable, index) => {
        this.addText(
          this.truncate(`${variable.name} = ${variable.value}`, maxCharacters),
          x + 12,
          variableStart + index * 16,
          {
            size: 11,
            color: active
              ? variable.isObject
                ? COLORS.value
                : COLORS.text
              : 0x8b968c,
          },
        );
      });
    }

    if (layout.children.length === 0) return;

    const childX = x + 16;
    const childWidth = Math.max(220, width - 26);
    const childStart =
      variableStart + Math.max(1, layout.variables.length) * 16 + 4;
    const guideHeight =
      layout.children.reduce((total, child) => total + child.height + 8, 0) - 8;
    const guide = new Graphics();
    guide
      .moveTo(x + 9, y + 30)
      .lineTo(x + 9, childStart + Math.max(0, guideHeight))
      .stroke({ width: 1, color: COLORS.cardStroke, alpha: 0.55 });
    this.content.addChild(guide);

    let childY = childStart;
    layout.children.forEach((child) => {
      this.drawEnvironmentNode(child, childX, childY, childWidth, depth + 1);
      childY += child.height + 8;
    });
  }

  private drawObject(
    object: VisualObjectNode,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    if (object.type === "array")
      this.drawArray(object, x, y, width, height);
    else if (object.type === "instance") {
      const specialRenderer = this.specialRenderers.get(object.className);
      if (specialRenderer) {
        specialRenderer(
          {
            container: this.content,
            addText: (value, textX, textY, options) =>
              this.addText(value, textX, textY, options),
          },
          object,
          x,
          y,
          width,
          height,
        );
        return;
      }
      this.drawFieldsPanel(
        object.label,
        object.className,
        object.fields,
        x,
        y,
        width,
        height,
      );
    } else
      this.drawFieldsPanel(object.label, "object", object.fields, x, y, width, height);
  }

  private drawArray(
    object: VisualArray,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    this.addText(`${object.label.toUpperCase()} / ARRAY`, x, y, {
      size: 10,
      color: COLORS.title,
      bold: true,
    });
    const gap = 6;
    const available = width - 8;
    const tileWidth = Math.max(
      34,
      Math.min(
        104,
        (available - gap * Math.max(0, object.values.length - 1)) /
          Math.max(1, object.values.length),
      ),
    );
    const tileHeight = Math.min(58, height - 42);
    const totalWidth =
      object.values.length * tileWidth +
      Math.max(0, object.values.length - 1) * gap;
    const startX = x + Math.max(0, (width - totalWidth) / 2);
    object.values.forEach((value, index) => {
      const tileX = startX + index * (tileWidth + gap);
      const active = object.activeIndices.includes(index);
      const tile = new Graphics();
      tile
        .roundRect(tileX, y + 20, tileWidth, tileHeight, 5)
        .fill(active ? COLORS.tileActive : COLORS.tile)
        .stroke({
          width: active ? 2 : 1,
          color: active ? COLORS.tileActiveStroke : COLORS.tileStroke,
        });
      this.content.addChild(tile);
      this.addText(this.truncate(value, Math.max(3, Math.floor(tileWidth / 9))), tileX + tileWidth / 2, y + 20 + tileHeight / 2 - 8, {
        size: Math.min(17, Math.max(11, Math.floor(tileWidth / 4))),
        color: active ? COLORS.tileActiveText : COLORS.text,
        bold: true,
        anchorX: 0.5,
      });
      this.addText(`[${index}]`, tileX + tileWidth / 2, y + 20 + tileHeight + 5, {
        size: 9,
        color: active ? COLORS.title : COLORS.muted,
        anchorX: 0.5,
      });
    });
  }

  private drawFieldsPanel(
    label: string,
    type: string,
    fields: readonly { name: string; value: string }[],
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const panel = new Graphics();
    panel
      .roundRect(x, y, width, height, 8)
      .fill(COLORS.panel)
      .stroke({ width: 1, color: COLORS.cardStroke });
    this.content.addChild(panel);
    this.addText(`${label.toUpperCase()} / ${type.toUpperCase()}`, x + 12, y + 11, {
      size: 10,
      color: COLORS.title,
      bold: true,
    });
    if (fields.length === 0) {
      this.addText("no fields", x + 12, y + 34, {
        size: 11,
        color: COLORS.muted,
      });
      return;
    }
    fields.slice(0, 8).forEach((field, index) => {
      this.addText(this.truncate(`${field.name}: ${field.value}`, Math.floor((width - 24) / 7)), x + 12, y + 34 + index * 16, {
        size: 11,
        color: COLORS.text,
      });
    });
  }

  private addText(
    value: string,
    x: number,
    y: number,
    options: PixiTextOptions = {},
  ): Text {
    const text = new Text({
      text: value,
      style: {
        fontFamily: FONT_FAMILY,
        fontSize: options.size ?? 11,
        fill: options.color ?? COLORS.text,
        fontWeight: options.bold ? "bold" : "normal",
      },
    });
    text.x = x;
    text.y = y;
    if (options.anchorX !== undefined) text.anchor.x = options.anchorX;
    this.content.addChild(text);
    return text;
  }

  private truncate(value: string, maxCharacters: number): string {
    return value.length > maxCharacters
      ? `${value.slice(0, Math.max(1, maxCharacters - 1))}...`
      : value;
  }

  private installPointerHandlers(canvas: HTMLCanvasElement): void {
    const down = (event: PointerEvent): void => {
      this.dragging = true;
      this.lastPointer = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent): void => {
      if (!this.dragging || !this.lastPointer) return;
      this.panBy(
        event.clientX - this.lastPointer.x,
        event.clientY - this.lastPointer.y,
      );
      this.lastPointer = { x: event.clientX, y: event.clientY };
    };
    const up = (event: PointerEvent): void => {
      this.dragging = false;
      this.lastPointer = undefined;
      if (canvas.hasPointerCapture(event.pointerId))
        canvas.releasePointerCapture(event.pointerId);
    };
    const wheel = (event: WheelEvent): void => {
      event.preventDefault();
      this.panBy(-event.deltaX, -event.deltaY);
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", wheel, { passive: false });
    this.removedListeners = () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("wheel", wheel);
    };
  }
}
