import * as React from "react"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

export interface StatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon
  value: string | number
  label: string
  color?: "blue" | "green" | "red" | "orange" | "amber" | "yellow" | "indigo" | "cyan" | "purple" | "slate" | "gray" | string
}

export function StatsCard({ icon: Icon, value, label, color = "blue", className, ...props }: StatsCardProps) {
  // Map our simple color names to Tailwind utility classes
  const colorMap: Record<string, { bg: string, text: string, icon: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-700", icon: "text-blue-500" },
    green: { bg: "bg-green-50", text: "text-green-700", icon: "text-green-500" },
    red: { bg: "bg-red-50", text: "text-red-700", icon: "text-red-500" },
    orange: { bg: "bg-orange-50", text: "text-orange-700", icon: "text-orange-500" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", icon: "text-amber-500" },
    yellow: { bg: "bg-yellow-50", text: "text-yellow-700", icon: "text-yellow-500" },
    indigo: { bg: "bg-indigo-50", text: "text-indigo-700", icon: "text-indigo-500" },
    cyan: { bg: "bg-cyan-50", text: "text-cyan-700", icon: "text-cyan-500" },
    purple: { bg: "bg-purple-50", text: "text-purple-700", icon: "text-purple-500" },
    slate: { bg: "bg-slate-50", text: "text-slate-700", icon: "text-slate-500" },
    gray: { bg: "bg-gray-50", text: "text-gray-700", icon: "text-gray-500" },
  }

  const mappedColors = colorMap[color] || colorMap.gray

  return (
    <div
      className={cn(
        "bg-card border rounded-xl p-4 flex flex-col items-start hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden",
        className
      )}
      {...props}
    >
      <div className={cn("p-2 rounded-lg mb-3", mappedColors.bg)}>
        <Icon className={cn("w-5 h-5", mappedColors.icon)} />
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-xs text-muted-foreground font-medium">{label}</div>
    </div>
  )
}
