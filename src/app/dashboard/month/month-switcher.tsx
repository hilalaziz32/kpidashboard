"use client";
import { useRouter } from "next/navigation";
import { MONTH_NAMES } from "@/lib/kpi";

export default function MonthSwitcher({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const router = useRouter();
  const now = new Date();
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="flex items-center gap-2">
      <Select
        value={String(month)}
        onChange={(v) => router.push(`/dashboard/month?y=${year}&m=${v}`)}
        options={MONTH_NAMES.map((n, i) => ({ value: String(i + 1), label: n }))}
      />
      <Select
        value={String(year)}
        onChange={(v) => router.push(`/dashboard/month?y=${v}&m=${month}`)}
        options={years.map((y) => ({ value: String(y), label: String(y) }))}
      />
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border bg-white px-3.5 py-2 text-[13px] outline-none transition focus:border-[var(--violet)] focus:ring-4 focus:ring-[var(--violet-50)] hover:border-[var(--border-strong)]"
      style={{ borderColor: "var(--border)" }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
