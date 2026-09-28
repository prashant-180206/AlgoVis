import { VisualArray, VisualizationState } from "./VisualizationState";

export class CanvasRenderer {
  public render(context: CanvasRenderingContext2D, state: VisualizationState, width: number, height: number): void {
    context.clearRect(0, 0, width, height);
    this.drawBackdrop(context, width, height);
    if (state.objects.length === 0) {
      this.drawEmptyState(context, width, height);
      return;
    }

    const rowHeight = Math.max(150, Math.min(210, (height - 48) / state.objects.length));
    state.objects.forEach((object, row) => this.drawArray(context, object, 28, 24 + row * rowHeight, width - 56, rowHeight - 24));
    this.drawFooter(context, state, width, height);
  }

  private drawBackdrop(context: CanvasRenderingContext2D, width: number, height: number): void {
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

  private drawArray(context: CanvasRenderingContext2D, object: VisualArray, x: number, y: number, width: number, height: number): void {
    context.fillStyle = "#a9baaa";
    context.font = "11px 'IBM Plex Mono', monospace";
    context.fillText(object.label.toUpperCase(), x, y + 2);

    const gap = 8;
    const tileWidth = Math.max(48, Math.min(110, (width - gap * Math.max(0, object.values.length - 1)) / Math.max(1, object.values.length)));
    const totalWidth = object.values.length * tileWidth + Math.max(0, object.values.length - 1) * gap;
    const startX = x + Math.max(0, (width - totalWidth) / 2);
    const tileY = y + 28;
    object.values.forEach((value, index) => {
      const tileX = startX + index * (tileWidth + gap);
      const active = object.activeIndices.includes(index);
      context.fillStyle = active ? "#d7f56b" : "#253229";
      context.strokeStyle = active ? "#eaff9b" : "#526456";
      context.lineWidth = active ? 2 : 1;
      context.fillRect(tileX, tileY, tileWidth, Math.min(72, height - 54));
      context.strokeRect(tileX, tileY, tileWidth, Math.min(72, height - 54));
      context.fillStyle = active ? "#172014" : "#e1e9df";
      context.font = "600 18px 'IBM Plex Mono', monospace";
      context.textAlign = "center";
      context.fillText(value, tileX + tileWidth / 2, tileY + 42);
      context.fillStyle = active ? "#52643a" : "#7d8e80";
      context.font = "10px 'IBM Plex Mono', monospace";
      context.fillText(`[${index}]`, tileX + tileWidth / 2, tileY + 92);
      context.textAlign = "left";
    });
  }

  private drawFooter(context: CanvasRenderingContext2D, state: VisualizationState, width: number, height: number): void {
    context.fillStyle = "#7f9182";
    context.font = "11px 'IBM Plex Sans', sans-serif";
    context.fillText(`STEP ${state.stepIndex}`, 28, height - 18);
    context.textAlign = "right";
    context.fillText(state.activeOperation ?? "READY", width - 28, height - 18);
    context.textAlign = "left";
  }

  private drawEmptyState(context: CanvasRenderingContext2D, width: number, height: number): void {
    context.fillStyle = "#8d9c90";
    context.font = "14px 'IBM Plex Sans', sans-serif";
    context.textAlign = "center";
    context.fillText("Run or step the program to materialize runtime objects", width / 2, height / 2);
    context.textAlign = "left";
  }
}
