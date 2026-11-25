import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";

export function Sparkline({
  data,
  positive,
}: {
  data: { date: string; rate: number }[];
  positive: boolean;
}) {
  if (!data.length) {
    return (
      <div className="flex h-20 items-center justify-center text-xs text-muted">
        No FX history
      </div>
    );
  }

  const stroke = positive ? "#3d9b78" : "#d45d5d";
  const fill = positive ? "rgba(61,155,120,0.22)" : "rgba(212,93,93,0.18)";

  return (
    <div className="h-20 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="fxFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fill} stopOpacity={1} />
              <stop offset="100%" stopColor={fill} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={["dataMin", "dataMax"]} hide />
          <Tooltip
            contentStyle={{
              background: "#151513",
              border: "1px solid rgba(245,240,230,0.09)",
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{ color: "#9a968c" }}
            formatter={(value) => [
              typeof value === "number"
                ? value.toFixed(4)
                : String(value ?? ""),
              "Rate",
            ]}
          />
          <Area
            type="monotone"
            dataKey="rate"
            stroke={stroke}
            fill="url(#fxFill)"
            strokeWidth={2}
            isAnimationActive
            animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
