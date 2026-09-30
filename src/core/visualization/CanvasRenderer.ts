import {
  VisualArray,
  VisualEnvironment,
  VisualInstance,
  VisualObject,
  VisualObjectNode,
  VisualStack,
  VisualizationState,
} from "./VisualizationState";

export type SpecialInstanceRenderer = (
  context: CanvasRenderingContext2D,
  object: VisualInstance,
  x: number,
  y: number,
  width: number,
  height: number,
) => void;

export class CanvasRenderer {
  private offsetX = 0;
  private offsetY = 0;
  private readonly specialRenderers = new Map<
    string,
    SpecialInstanceRenderer
  >();

  public registerClassRenderer(
    className: string,
    renderer: SpecialInstanceRenderer,
  ): void {
    this.specialRenderers.set(className, renderer);
  }
  public panBy(deltaX: number, deltaY: number): void {
    this.offsetX += deltaX;
    this.offsetY += deltaY;
  }
  public resetView(): void {
    this.offsetX = 0;
    this.offsetY = 0;
  }

  public render(
    context: CanvasRenderingContext2D,
    state: VisualizationState,
    width: number,
    height: number,
  ): void {
    context.clearRect(0, 0, width, height);
    this.drawBackdrop(context, width, height);
    context.save();
    context.translate(this.offsetX, this.offsetY);
    const environmentHeight = this.drawEnvironments(
      context,
      state.environments,
      width,
      24,
    );
    const objectY = 36 + environmentHeight;
    if (state.objects.length === 0 && state.environments.length === 0)
      this.drawEmptyState(context, width, height);
    else
      state.objects.forEach((object, index) =>
        this.drawObject(
          context,
          object,
          28,
          objectY + index * 174,
          width - 56,
          150,
        ),
      );
    context.restore();
    this.drawFooter(context, state, width, height);
  }

  private drawEnvironments(
    context: CanvasRenderingContext2D,
    environments: readonly VisualEnvironment[],
    width: number,
    y: number,
  ): number {
    if (environments.length === 0) return 0;
    const columns = Math.max(1, Math.floor(Math.max(1, width - 56) / 260));
    const cardWidth = Math.max(
      190,
      Math.min(260, (width - 56 - (columns - 1) * 12) / columns),
    );
    const cardHeight = 92;
    environments.forEach((environment, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = 28 + column * (cardWidth + 12);
      const cardY = y + row * (cardHeight + 12);
      context.fillStyle = environment.active ? "#1c2c20" : "#172019";
      context.strokeStyle = environment.active ? "#829b58" : "#334238";
      context.lineWidth = environment.active ? 2 : 1;
      context.fillRect(x, cardY, cardWidth, cardHeight);
      context.strokeRect(x, cardY, cardWidth, cardHeight);
      context.fillStyle = "#d7f56b";
      context.font = "600 11px 'IBM Plex Mono', monospace";
      context.fillText(
        `${environment.kind.toUpperCase()} / ${environment.id}`,
        x + 10,
        cardY + 17,
      );
      context.fillStyle = "#b6c2b7";
      context.font = "11px 'IBM Plex Mono', monospace";
      environment.variables
        .slice(0, 5)
        .forEach((variable, variableIndex) =>
          context.fillText(
            `${variable.name} = ${this.fitText(variable.value, cardWidth - 20)}`,
            x + 10,
            cardY + 36 + variableIndex * 11,
          ),
        );
      if (environment.variables.length > 5)
        context.fillText(
          `+${environment.variables.length - 5} more`,
          x + 10,
          cardY + 82,
        );
    });
    return Math.ceil(environments.length / columns) * (cardHeight + 12) - 12;
  }

  private drawObject(
    context: CanvasRenderingContext2D,
    object: VisualObjectNode,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    if (object.type === "array")
      this.drawArray(context, object, x, y, width, height);
    else if (object.type === "stack")
      this.drawStack(context, object, x, y, width, height);
    else if (object.type === "instance")
      this.drawInstance(context, object, x, y, width, height);
    else this.drawObjectFields(context, object, x, y, width, height);
  }

  private drawArray(
    context: CanvasRenderingContext2D,
    object: VisualArray,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    this.drawLabel(context, object.label.toUpperCase(), x, y);
    const gap = 8;
    const tileWidth = Math.max(
      48,
      Math.min(
        110,
        (width - gap * Math.max(0, object.values.length - 1)) /
          Math.max(1, object.values.length),
      ),
    );
    const totalWidth =
      object.values.length * tileWidth +
      Math.max(0, object.values.length - 1) * gap;
    const startX = x + Math.max(0, (width - totalWidth) / 2);
    object.values.forEach((value, index) => {
      const tileX = startX + index * (tileWidth + gap);
      const active = object.activeIndices.includes(index);
      context.fillStyle = active ? "#d7f56b" : "#253229";
      context.strokeStyle = active ? "#eaff9b" : "#526456";
      context.lineWidth = active ? 2 : 1;
      context.fillRect(tileX, y + 28, tileWidth, Math.min(72, height - 54));
      context.strokeRect(tileX, y + 28, tileWidth, Math.min(72, height - 54));
      context.fillStyle = active ? "#172014" : "#e1e9df";
      context.font = "600 18px 'IBM Plex Mono', monospace";
      context.textAlign = "center";
      context.fillText(value, tileX + tileWidth / 2, y + 70);
      context.fillStyle = active ? "#52643a" : "#7d8e80";
      context.font = "10px 'IBM Plex Mono', monospace";
      context.fillText(`[${index}]`, tileX + tileWidth / 2, y + 120);
      context.textAlign = "left";
    });
  }

  private drawStack(
    context: CanvasRenderingContext2D,
    object: VisualStack,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    this.drawLabel(context, `${object.label.toUpperCase()} / STACK`, x, y);
    const tileWidth = Math.min(150, width * 0.4);
    const tileHeight = Math.min(
      42,
      Math.max(28, (height - 28) / Math.max(1, object.values.length)),
    );
    const startX = x + (width - tileWidth) / 2;
    [...object.values].reverse().forEach((value, index) => {
      const tileY = y + 18 + index * tileHeight;
      context.fillStyle = index === 0 ? "#d7f56b" : "#253229";
      context.strokeStyle = index === 0 ? "#eaff9b" : "#526456";
      context.fillRect(startX, tileY, tileWidth, tileHeight - 5);
      context.strokeRect(startX, tileY, tileWidth, tileHeight - 5);
      context.fillStyle = index === 0 ? "#172014" : "#e1e9df";
      context.textAlign = "center";
      context.font = "600 15px 'IBM Plex Mono', monospace";
      context.fillText(
        value,
        startX + tileWidth / 2,
        tileY + tileHeight / 2 + 5,
      );
      context.textAlign = "left";
    });
    context.fillStyle = "#7d8e80";
    context.font = "10px 'IBM Plex Mono', monospace";
    context.fillText("TOP", startX + tileWidth + 10, y + 32);
  }

  private drawInstance(
    context: CanvasRenderingContext2D,
    object: VisualInstance,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const specialRenderer = this.specialRenderers.get(object.className);
    if (specialRenderer) {
      specialRenderer(context, object, x, y, width, height);
      return;
    }
    this.drawFieldsPanel(
      context,
      object.label,
      object.className,
      object.fields,
      x,
      y,
      width,
      height,
    );
  }

  private drawObjectFields(
    context: CanvasRenderingContext2D,
    object: VisualObject,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    this.drawFieldsPanel(
      context,
      object.label,
      "Object",
      object.fields,
      x,
      y,
      width,
      height,
    );
  }
  private drawFieldsPanel(
    context: CanvasRenderingContext2D,
    label: string,
    type: string,
    fields: readonly { name: string; value: string }[],
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    context.fillStyle = "#18241c";
    context.strokeStyle = "#526456";
    context.fillRect(x, y + 8, width, Math.min(height, 132));
    context.strokeRect(x, y + 8, width, Math.min(height, 132));
    this.drawLabel(
      context,
      `${label.toUpperCase()} / ${type.toUpperCase()}`,
      x + 12,
      y + 26,
    );
    context.font = "12px 'IBM Plex Mono', monospace";
    context.fillStyle = "#dfe9df";
    fields
      .slice(0, 7)
      .forEach((field, index) =>
        context.fillText(
          `${field.name}: ${this.fitText(field.value, width - 30)}`,
          x + 12,
          y + 48 + index * 14,
        ),
      );
  }

  private drawLabel(
    context: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
  ): void {
    context.fillStyle = "#a9baaa";
    context.font = "11px 'IBM Plex Mono', monospace";
    context.fillText(text, x, y + 2);
  }
  private fitText(value: string, maxWidth: number): string {
    const maxCharacters = Math.max(4, Math.floor(maxWidth / 7));
    return value.length > maxCharacters
      ? `${value.slice(0, maxCharacters - 1)}...`
      : value;
  }
  private drawBackdrop(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    context.fillStyle = "#121714";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "#1d2921";
    context.lineWidth = 1;
    for (let x = 0; x < width; x += 32) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    for (let y = 0; y < height; y += 32) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
  }
  private drawFooter(
    context: CanvasRenderingContext2D,
    state: VisualizationState,
    width: number,
    height: number,
  ): void {
    context.fillStyle = "#7f9182";
    context.font = "11px 'IBM Plex Sans', sans-serif";
    context.fillText(`STEP ${state.stepIndex}`, 28, height - 18);
    context.textAlign = "right";
    context.fillText(state.activeOperation ?? "READY", width - 28, height - 18);
    context.textAlign = "left";
  }
  private drawEmptyState(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    context.fillStyle = "#8d9c90";
    context.font = "14px 'IBM Plex Sans', sans-serif";
    context.textAlign = "center";
    context.fillText(
      "Run or step the program to materialize runtime objects",
      width / 2,
      height / 2,
    );
    context.textAlign = "left";
  }
}
