interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: number;
  icon?: string;
  alert?: boolean;
}

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  icon,
  alert,
}: MetricCardProps) {
  return (
    <div
      className={`p-4 border rounded-lg ${
        alert ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-600">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      {change !== undefined && (
        <div className="mt-2">
          <span
            className={`text-xs font-medium ${
              change >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {change >= 0 ? "↑" : "↓"} {Math.abs(change).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
