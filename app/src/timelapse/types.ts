import type { BlockState, Sliders } from "../engine/types";

export interface TimeLapseDeployment {
  blockId: string;
  startYear: number;
}

export interface TimeLapseAnnotation {
  atYear: number;
  message: string;
  highlight?: { type: "chain" | "block"; id: string };
}

export interface TimeLapseScript {
  id: string;
  name: string;
  description: string;
  type: "scripted" | "passthrough";
  startYear?: number;
  endYear?: number;
  initialBlockStates?: Record<string, BlockState>;
  sliderOverrides?: Partial<Sliders>;
  deployments?: TimeLapseDeployment[];
  annotations?: TimeLapseAnnotation[];
}

export type PlaybackSpeed = 0.5 | 1 | 2 | 4;
export type PlaybackState = "idle" | "playing" | "paused";
