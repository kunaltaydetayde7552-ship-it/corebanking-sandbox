import React from 'react';

export default function MetricCard({
  icon: Icon,
  title,
  value,
  accentColor = '#1e3a5f',
  bgColor = 'bg-blue-50',
  textColor = 'text-[#1e3a5f]',
  subtext,
  trend,
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-2 tracking-tight">{value}</h3>
          {subtext && (
            <p className="text-xs text-slate-400 mt-1 font-medium">{subtext}</p>
          )}
          {trend && (
            <div className="mt-2 text-xs font-medium flex items-center gap-1">
              <span className={trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                {trend.isPositive ? '+' : ''}{trend.text}
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgColor} ${textColor} flex-shrink-0`}
            style={accentColor ? { color: accentColor } : undefined}
          >
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
}
