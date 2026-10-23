import { Application, Container, Graphics, Text } from "pixi.js";
import type {
  VisualArray,
  VisualEnvironment,
  VisualInstance,
  VisualObjectNode,
  VisualStack,
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
    const environments = this.state.environments.filter(
      (environment) => environment.active,
    );
    let y = 22;
    y = this.drawEnvironments(environments, width, y);
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
    if (environments.length === 0 && this.state.objects.length === 0) {
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

  private drawEnvironments(
    environments: readonly VisualEnvironment[],
    width: number,
    y: number,
  ): number {
    if (environments.length === 0) return y;
    const gap = 14;
    const columns = Math.max(1, Math.floor((width - 48) / 300));
    const cardWidth = (width - 48 - (columns - 1) * gap) / columns;
    const cardHeight = 134;
    environments.forEach((environment, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = 24 + column * (cardWidth + gap);
      const cardY = y + row * (cardHeight + gap);
      const card = new Graphics();
      card
        .roundRect(x, cardY, cardWidth, cardHeight, 10)
        .fill(environment.active ? COLORS.card : COLORS.cardInactive)
        .stroke({
          width: environment.active ? 1.5 : 1,
          color: environment.active
            ? COLORS.cardStrokeActive
            : COLORS.cardStroke,
        });
      this.content.addChild(card);
      this.addText(`${environment.kind.toUpperCase()} / ${environment.id}`, x + 12, cardY + 11, {
        size: 11,
        color: COLORS.title,
        bold: true,
      });
      this.addText(
        environment.parentId ? `parent ${environment.parentId}` : "root scope",
        x + 12,
        cardY + 28,
        { size: 9, color: COLORS.muted },
      );
      if (environment.variables.length === 0) {
        this.addText("no bindings", x + 12, cardY + 50, {
          size: 11,
          color: COLORS.muted,
        });
        return;
      }
      const variables = environment.variables.filter(
        (variable) => !variable.builtin,
      );
      if (variables.length === 0) {
        this.addText("no user bindings", x + 12, cardY + 50, {
          size: 11,
          color: COLORS.muted,
        });
        return;
      }
      variables.slice(0, 5).forEach((variable, variableIndex) => {
        const rowY = cardY + 48 + variableIndex * 16;
        this.addText(this.truncate(`${variable.name} = ${variable.value}`, Math.floor(cardWidth / 7)), x + 12, rowY, {
          size: 11,
          color: variable.isObject ? COLORS.value : COLORS.text,
        });
      });
      if (variables.length > 5) {
        this.addText(`+${variables.length - 5} more bindings`, x + 12, cardY + 48 + 5 * 16, {
          size: 9,
          color: COLORS.muted,
        });
      }
    });
    return y + Math.ceil(environments.length / columns) * (cardHeight + gap);
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
    else if (object.type === "stack")
      this.drawStack(object, x, y, width, height);
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

  private drawStack(
    object: VisualStack,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    this.addText(`${object.label.toUpperCase()} / STACK`, x, y, {
      size: 10,
      color: COLORS.title,
      bold: true,
    });
    const tileWidth = Math.min(160, width * 0.55);
    const startX = x + (width - tileWidth) / 2;
    const tileHeight = Math.min(
      30,
      Math.max(20, (height - 24) / Math.max(1, object.values.length)),
    );
    [...object.values].reverse().forEach((value, index) => {
      const tileY = y + 20 + index * tileHeight;
      const active = index === 0;
      const tile = new Graphics();
      tile
        .roundRect(startX, tileY, tileWidth, tileHeight - 4, 4)
        .fill(active ? COLORS.tileActive : COLORS.tile)
        .stroke({
          width: active ? 2 : 1,
          color: active ? COLORS.tileActiveStroke : COLORS.tileStroke,
        });
      this.content.addChild(tile);
      this.addText(value, startX + tileWidth / 2, tileY + (tileHeight - 4) / 2 - 7, {
        size: 13,
        color: active ? COLORS.tileActiveText : COLORS.text,
        bold: true,
        anchorX: 0.5,
      });
    });
    this.addText("TOP", startX + tileWidth + 8, y + 24, {
      size: 9,
      color: COLORS.muted,
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
