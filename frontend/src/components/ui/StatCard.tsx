import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/hooks/useCountUp";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import type { ReactNode } from "react";

interface StatCardProps {
  title: ReactNode;
  value: number;
  formatter?: (n: number) => string;
  trend: number;
  icon: ReactNode;
  sparklineData?: number[];
  delay?: number;
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((value, i) => ({ value, index: i }));
  return (
    <div className="w-20 h-8 opacity-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2} 
            dot={false}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatCard({
  title,
  value,
  formatter,
  trend,
  icon,
  sparklineData,
  delay = 0,
}: StatCardProps) {
  const animatedValue = useCountUp(value);
  const isPositive = trend >= 0;
  const displayValue = formatter ? formatter(animatedValue) : animatedValue.toLocaleString("en-IN");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.1 }}
      className="bg-[var(--bg-card)] rounded-[var(--radius)] border border-[var(--border)] p-5 hover:shadow-[var(--shadow-md)] transition-shadow duration-200 ease-in-out group"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--text-muted)]">{title}</p>
          <p className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            {displayValue}
          </p>
          <div className="flex items-center gap-1">
            {isPositive ? (
              <TrendingUp className="w-3.5 h-3.5 text-[var(--success)]" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-[var(--error)]" />
            )}
            <span
              className={cn(
                "text-xs font-semibold",
                isPositive ? "text-[var(--success)]" : "text-[var(--error)]"
              )}
            >
              {isPositive ? "+" : ""}
              {trend}%
            </span>
            <span className="text-xs text-[var(--text-subtle)]">vs last month</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent-light)] flex items-center justify-center text-[var(--accent)] group-hover:bg-[var(--accent-muted)] transition-colors">
            {icon}
          </div>
          {sparklineData && (
            <MiniSparkline
              data={sparklineData}
              color={isPositive ? "var(--success)" : "var(--error)"}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}
