import type { ComponentType } from "react";
import {
  Cover,
  WhatWeightsAre,
  WhySteal,
  WhyItGetsWorse,
  OcLadderSlide,
  SecurityLevels,
  Sources,
} from "./act1-problem";
import {
  Blocks,
  Lifecycle,
  Constraints,
  AttackPath,
  Timeline,
  TheRest,
} from "./act2-instrument";

export interface Slide {
  /** URL fragment for this slide — `/sl5/intro/#the-oc-ladder`. Must be unique. */
  slug: string;
  /** Shown in the progress rail's tooltip and used as the document title. */
  title: string;
  /** Which half of the introduction: the problem, or the instrument. */
  act: 1 | 2;
  Component: ComponentType;
}

// The running order lives here rather than in the act files, so those files
// export components only and Vite's fast refresh keeps working on them.
export const SLIDES: Slide[] = [
  { slug: "start", title: "Start here", act: 1, Component: Cover },
  { slug: "the-asset", title: "The weights are the model", act: 1, Component: WhatWeightsAre },
  { slug: "why-steal-them", title: "Why a superpower wants them", act: 1, Component: WhySteal },
  { slug: "why-it-gets-worse", title: "Why it gets harder", act: 1, Component: WhyItGetsWorse },
  { slug: "the-oc-ladder", title: "Five tiers of adversary", act: 1, Component: OcLadderSlide },
  { slug: "security-levels", title: "Five security levels", act: 1, Component: SecurityLevels },
  { slug: "sources", title: "The source material", act: 1, Component: Sources },
  { slug: "blocks", title: "Everything is a block", act: 2, Component: Blocks },
  { slug: "lifecycle", title: "Building a capability", act: 2, Component: Lifecycle },
  { slug: "constraints", title: "Budget and dependencies", act: 2, Component: Constraints },
  { slug: "attack-paths", title: "Attack paths", act: 2, Component: AttackPath },
  { slug: "timeline", title: "The timeline", act: 2, Component: Timeline },
  { slug: "the-rest", title: "The rest of the controls", act: 2, Component: TheRest },
];

export const ACT_LABELS: Record<1 | 2, string> = {
  1: "The problem",
  2: "The instrument",
};
