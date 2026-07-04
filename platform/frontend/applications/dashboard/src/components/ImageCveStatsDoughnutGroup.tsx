import { useEffect, useMemo, useRef } from "react";
import {
  ArcElement,
  Chart,
  DoughnutController,
  Legend,
  Tooltip,
  type ChartConfiguration,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import type {
  ImageCveStatsByVexStatusDto,
  SeverityDistributionDto,
  VexStatusSeverityStatsDto,
} from "../api/generated";

Chart.register(DoughnutController, ArcElement, Tooltip, Legend, annotationPlugin);

const SEVERITY_ORDER: Array<keyof SeverityDistributionDto> = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "UNKNOWN",
];

const SEVERITY_COLORS: Record<keyof SeverityDistributionDto, string> = {
  CRITICAL: "#ff4d4f",
  HIGH: "#ff9f43",
  MEDIUM: "#ffd166",
  LOW: "#34d399",
  UNKNOWN: "#94a3b8",
};

const VEX_CHARTS: Array<{ key: keyof ImageCveStatsByVexStatusDto; label: string }> = [
  { key: "under_investigation", label: "Under investigation" },
  { key: "not_affected", label: "Not affected" },
  { key: "affected", label: "Affected" },
];

function formatSeverityLabel(severity: keyof SeverityDistributionDto): string {
  return severity.charAt(0) + severity.slice(1).toLowerCase();
}

type DoughnutCardProps = {
  title: string;
  stats: VexStatusSeverityStatsDto;
};

function DoughnutCard({ title, stats }: DoughnutCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart<"doughnut"> | null>(null);

  const chartValues = useMemo(() => SEVERITY_ORDER.map((severity) => stats.severity[severity] ?? 0), [stats]);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    chartRef.current?.destroy();

    const config: ChartConfiguration<"doughnut"> = {
      type: "doughnut",
      data: {
        labels: SEVERITY_ORDER.map(formatSeverityLabel),
        datasets: [
          {
            data: chartValues,
            backgroundColor: SEVERITY_ORDER.map((severity) => SEVERITY_COLORS[severity]),
            borderColor: "#0b0f14",
            borderWidth: 2,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "72%",
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: ${context.parsed}`,
            },
          },
          annotation: {
            annotations: {
              total: {
                type: "doughnutLabel",
                content: [String(stats.total)],
                color: ["#f8faff"],
                font: [{ size: 26, weight: "700" }],
                autoFit: true,
              } as never,
            },
          },
        },
      },
    };

    chartRef.current = new Chart(canvasRef.current, config);

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [chartValues, stats.total]);

  return (
    <article className="rounded-lg border border-[var(--border)] bg-black p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">{title}</p>
      <div className="h-44">
        <canvas ref={canvasRef} />
      </div>
    </article>
  );
}

type ImageCveStatsDoughnutGroupProps = {
  stats: ImageCveStatsByVexStatusDto | null;
  loading?: boolean;
  error?: string | null;
};

export default function ImageCveStatsDoughnutGroup({
  stats,
  loading = false,
  error = null,
}: ImageCveStatsDoughnutGroupProps) {
  if (loading) {
    return <div className="rounded-lg border border-[var(--border)] bg-black p-4 text-sm text-[var(--text-muted)]">Loading stats...</div>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-[var(--status-critical)]/40 bg-black p-4 text-sm text-[var(--status-critical)]">
        {error}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-black p-4 text-sm text-[var(--text-muted)]">
        Stats unavailable.
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-black p-3">
      <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[var(--accent-cyan)]">Decision statistics</p>
      <div className="grid gap-3 md:grid-cols-3">
        {VEX_CHARTS.map((item) => (
          <DoughnutCard key={item.key} title={item.label} stats={stats[item.key]} />
        ))}
      </div>
    </section>
  );
}
