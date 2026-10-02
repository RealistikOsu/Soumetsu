export interface ChartPoint {
  // Position inside the svg, in pixels.
  x: number;
  y: number;
  value: string;
  label: string;
  marker: boolean;
}
