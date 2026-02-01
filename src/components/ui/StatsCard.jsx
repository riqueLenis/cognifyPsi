import React from 'react';
import { cn } from '@/lib/utils';

export default function StatsCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon, 
  trend,
  trendValue,
  variant = 'default',
  className 
}) {
  const variants = {
    default: 'bg-white border-slate-200',
    indigo: 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white border-transparent',
    emerald: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-transparent',
    amber: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white border-transparent',
    rose: 'bg-gradient-to-br from-rose-500 to-pink-600 text-white border-transparent',
  };

  const isColorful = variant !== 'default';

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:shadow-lg",
      variants[variant],
      className
    )}>
      {/* Background decoration */}
      {isColorful && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      )}
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className={cn(
            "text-sm font-medium",
            isColorful ? "text-white/80" : "text-slate-500"
          )}>
            {title}
          </p>
          <p className={cn(
            "text-3xl font-bold tracking-tight",
            isColorful ? "text-white" : "text-slate-900"
          )}>
            {value}
          </p>
          {subtitle && (
            <p className={cn(
              "text-sm",
              isColorful ? "text-white/70" : "text-slate-400"
            )}>
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full",
                trend === 'up' 
                  ? isColorful ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"
                  : isColorful ? "bg-white/20 text-white" : "bg-red-100 text-red-700"
              )}>
                {trend === 'up' ? '↑' : '↓'} {trendValue}
              </span>
            </div>
          )}
        </div>
        
        {Icon && (
          <div className={cn(
            "p-3 rounded-xl",
            isColorful ? "bg-white/20" : "bg-slate-100"
          )}>
            <Icon className={cn(
              "w-6 h-6",
              isColorful ? "text-white" : "text-slate-600"
            )} />
          </div>
        )}
      </div>
    </div>
  );
}