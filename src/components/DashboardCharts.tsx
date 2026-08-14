"use client";

import { Empty } from "antd";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { platformLabels } from "@/types/geo";
import type { ContentItem, Platform, PublishRecord } from "@/types/geo";

const PIE_COLORS = ["#2563eb", "#0ea5e9", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#64748b", "#ef4444", "#84cc16", "#06b6d4"];

function toDay(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 返回某天所在周的周一日期（YYYY-MM-DD） */
function getWeekStart(day: string): string {
  const d = new Date(day);
  const dayOfWeek = d.getDay() || 7; // 0=Sunday → 7
  d.setDate(d.getDate() - dayOfWeek + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 列出两个周一之间的所有完整周 */
function listWeeks(firstWeek: string, lastWeek: string): string[] {
  const weeks: string[] = [];
  const cursor = new Date(firstWeek);
  while (cursor <= new Date(lastWeek)) {
    weeks.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`);
    cursor.setDate(cursor.getDate() + 7);
  }
  return weeks;
}

export function PlatformPieChart({ records }: { records: PublishRecord[] }) {
  const counts = new Map<string, number>();
  for (const r of records) {
    const label = platformLabels[r.platform as Platform] || r.platform;
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  const data = Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (!data.length) return <Empty description="暂无发布记录" style={{ padding: "40px 0" }} />;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={56}
          outerRadius={95}
          paddingAngle={2}
          label={({ name, value }) => `${name} ${value}`}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value, name) => [`${value} 篇`, name]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ContentTrendChart({ contents }: { contents: ContentItem[] }) {
  const weekCounts = new Map<string, number>();
  for (const c of contents) {
    const day = toDay(c.createdAt);
    if (!day) continue;
    const weekStart = getWeekStart(day);
    weekCounts.set(weekStart, (weekCounts.get(weekStart) || 0) + 1);
  }
  const weeks = Array.from(weekCounts.keys()).sort();
  if (!weeks.length) return <Empty description="暂无内容数据" style={{ padding: "40px 0" }} />;
  const firstWeek = weeks[0];
  const lastWeek = weeks[weeks.length - 1];
  const todayWeek = getWeekStart(toDay(new Date().toISOString()) || "");
  const endWeek = todayWeek > lastWeek ? todayWeek : lastWeek;
  const allWeeks = listWeeks(firstWeek, endWeek);
  let total = 0;
  const data = allWeeks.map((weekStart) => {
    total += weekCounts.get(weekStart) || 0;
    return { week: weekStart.slice(5), total, added: weekCounts.get(weekStart) || 0 };
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="contentTotalFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#2563eb" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} />
        <Tooltip formatter={(value, name) => (name === "total" ? [`${value} 篇`, "累计总数"] : [`${value} 篇`, "本周新增"])} />
        <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2.5} fill="url(#contentTotalFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
