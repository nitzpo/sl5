import type { ComponentType } from "react";
import { OcLadderSlide, OwnModel, SecurityLevels, Sources, Start, WhyItGetsWorse } from "./act1";
import { AttackPaths, AttackVectors, Blocks, Budget, Ready, Stacking, Timeline, YourLevel } from "./act2";

export interface Slide {
  /** URL fragment for this slide — `/intro/#the-oc-ladder`. Must be unique. */
  slug: string;
  /** Shown in the progress rail and used as the document title. */
  title: string;
  /** Act I: what you're up against. Act II: how to use the instrument. */
  act: 1 | 2;
  Component: ComponentType;
  /** Older slugs that should still land here (links shared from v1's intro). */
  aliases?: string[];
}

// The running order lives here rather than in the act files, so those files
// export components only and Vite's fast refresh keeps working on them.
export const SLIDES: Slide[] = [
  {
    slug: "start",
    title: "Why the weights are a target",
    act: 1,
    Component: Start,
    aliases: ["the-asset", "why-steal-them"],
  },
  { slug: "why-it-gets-worse", title: "Why AI makes it worse", act: 1, Component: WhyItGetsWorse },
  { slug: "the-oc-ladder", title: "Who might come", act: 1, Component: OcLadderSlide },
  { slug: "security-levels", title: "What “secure” means here", act: 1, Component: SecurityLevels },
  { slug: "own-model", title: "Your own model, as an insider", act: 1, Component: OwnModel },
  { slug: "sources", title: "Where this comes from", act: 1, Component: Sources },
  { slug: "blocks", title: "The catalogue of defenses", act: 2, Component: Blocks, aliases: ["lifecycle"] },
  { slug: "attack-vectors", title: "Attack vectors and three stages", act: 2, Component: AttackVectors },
  { slug: "attack-paths", title: "Approaches and the easiest attack path", act: 2, Component: AttackPaths },
  { slug: "stacking", title: "Why weak defenses don't add up", act: 2, Component: Stacking },
  { slug: "your-level", title: "Your security level", act: 2, Component: YourLevel },
  { slug: "timeline", title: "Time: lead times against the threat front", act: 2, Component: Timeline },
  { slug: "budget", title: "Budget", act: 2, Component: Budget, aliases: ["constraints"] },
  { slug: "ready", title: "Ready: open the instrument", act: 2, Component: Ready, aliases: ["the-rest"] },
];

export const ACT_LABELS: Record<1 | 2, string> = {
  1: "What you're up against",
  2: "How to use the instrument",
};

/** The slide a slug (or an older alias) names, or -1. */
export function slideIndex(slug: string): number {
  return SLIDES.findIndex((s) => s.slug === slug || s.aliases?.includes(slug));
}
