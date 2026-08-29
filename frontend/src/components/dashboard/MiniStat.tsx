import { Card } from "./Card";

export default function MiniStat({
  label,
  value,
  accent = "var(--d-ink)",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <Card className="px-4 py-3">
      <p className="d-label">{label}</p>
      <p className="d-num mt-1 text-lg font-semibold leading-none" style={{ color: accent }}>
        {value}
      </p>
    </Card>
  );
}
