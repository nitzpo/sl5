import { useSimulationStore } from "../../store/simulation";
import { useSimulationResults } from "../../store/derived";
import { getAiCapability } from "../../engine/ai-curve";
import { formatSl, formatProbability, formatPercent, formatYear } from "../../utils/format";
import { CATEGORY_LABELS } from "../../utils/geometry";
import { breachLevel } from "../../utils/colors";
import type { Category } from "../../engine/types";

export function ObserverView() {
  const year = useSimulationStore((s) => s.year);
  const adversaryOc = useSimulationStore((s) => s.adversaryOc);
  const aiTimeline = useSimulationStore((s) => s.sliders.ai_timeline);
  const blockStates = useSimulationStore((s) => s.blockStates);
  const blocks = useSimulationStore((s) => s.blocks);
  const modelServed = useSimulationStore((s) => s.modelServedExternally);

  const {
    categoryScores,
    overallSl,
    breachByOc,
    breachProbabilities,
    extractionProgress,
    activeLayers,
  } = useSimulationResults();

  const aiCap = getAiCapability(year, aiTimeline);

  // Block state distribution
  const stateCounts = { not_started: 0, investing: 0, implementing: 0, deployed: 0, mature: 0 };
  for (const b of blocks) {
    const s = blockStates[b.id] ?? "not_started";
    if (s in stateCounts) stateCounts[s as keyof typeof stateCounts]++;
  }

  // Hard stop vs probabilistic deployment rate
  const hardStops = blocks.filter((b) => b.defense_type === "hard_stop");
  const probabilistic = blocks.filter((b) => b.defense_type === "probabilistic");
  const hardStopDeployed = hardStops.filter(
    (b) => blockStates[b.id] === "deployed" || blockStates[b.id] === "mature"
  ).length;
  const probDeployed = probabilistic.filter(
    (b) => blockStates[b.id] === "deployed" || blockStates[b.id] === "mature"
  ).length;

  return (
    <div className="space-y-3 text-xs">
      {/* World state */}
      <Section title="World State">
        <Row label="Year" value={formatYear(year)} />
        <Row label="AI Capability" value={`${Math.round(aiCap * 100)}%`} />
        <Row label="Adversary OC" value={`OC${adversaryOc}`} />
        <Row label="Model" value={modelServed ? "Served externally" : "Air-gapped"} />
      </Section>

      {/* Overall score */}
      <Section title="Security Posture">
        <Row label="Overall SL" value={formatSl(overallSl)} highlight />
        {(Object.entries(categoryScores) as [Category, number][]).map(
          ([cat, score]) => (
            <Row key={cat} label={CATEGORY_LABELS[cat]} value={formatSl(score)} />
          )
        )}
      </Section>

      {/* Breach */}
      <Section title="Breach Probability">
        {[3, 4, 5].map((oc) => (
          <Row
            key={oc}
            label={`vs OC${oc}`}
            value={formatProbability(breachByOc[oc] ?? 0)}
            danger={breachLevel(breachByOc[oc] ?? 0) === "bad"}
          />
        ))}
      </Section>

      {/* Distillation */}
      <Section title="Distillation">
        <Row
          label="Extraction progress"
          value={formatPercent(extractionProgress)}
          danger={extractionProgress > 0.6}
        />
        <Row label="Compromised" value={extractionProgress >= 0.8 ? "YES" : "No"} danger={extractionProgress >= 0.8} />
      </Section>

      {/* Defense depth */}
      <Section title="Defense Depth">
        <Row label="Active layers" value={`${activeLayers} / 8`} />
        <Row label="Hard stops deployed" value={`${hardStopDeployed} / ${hardStops.length}`} />
        <Row label="Probabilistic deployed" value={`${probDeployed} / ${probabilistic.length}`} />
      </Section>

      {/* Block distribution */}
      <Section title="Block States">
        <Row label="Not started" value={stateCounts.not_started.toString()} />
        <Row label="Investing" value={stateCounts.investing.toString()} />
        <Row label="Implementing" value={stateCounts.implementing.toString()} />
        <Row label="Deployed" value={stateCounts.deployed.toString()} />
        <Row label="Mature" value={stateCounts.mature.toString()} />
      </Section>

      {/* Top chains */}
      <Section title="Top Attack Chains">
        {Object.entries(breachProbabilities)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 4)
          .map(([id, prob]) => (
            <Row key={id} label={id} value={formatProbability(prob)} danger={breachLevel(prob) === "bad"} />
          ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 rounded p-2.5">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 font-semibold">
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
  danger,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span
        className={`font-mono ${
          danger
            ? "text-red-400"
            : highlight
              ? "text-emerald-400 font-bold"
              : "text-gray-200"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
