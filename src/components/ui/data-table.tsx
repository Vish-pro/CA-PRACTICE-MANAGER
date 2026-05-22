"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronUp } from "lucide-react"

export interface ColumnDef<T> {
  header: string
  accessorKey?: keyof T | string
  cell?: (row: T) => React.ReactNode
  sortable?: boolean
  className?: string
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  keyExtractor: (row: T) => string
  className?: string
  selectable?: boolean
  selectedIds?: Set<string>
  onSelectChange?: (id: string, selected: boolean) => void
  onSelectAll?: (selected: boolean) => void
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  keyExtractor,
  className,
  selectable = false,
  selectedIds = new Set(),
  onSelectChange,
  onSelectAll
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = React.useState<{ key: string, direction: "asc" | "desc" } | null>(null)

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc"
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }
    setSortConfig({ key, direction })
  }

  const sortedData = React.useMemo(() => {
    if (!sortConfig) return data

    return [...data].sort((a: any, b: any) => {
      const aVal = a[sortConfig.key]
      const bVal = b[sortConfig.key]

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1
      return 0
    })
  }, [data, sortConfig])

  const allSelected = data.length > 0 && selectedIds.size === data.length

  return (
    <div className={cn("w-full overflow-x-auto border rounded-xl bg-card", className)}>
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-muted-foreground bg-muted/40 uppercase sticky top-0 z-10 border-b">
          <tr>
            {selectable && (
              <th className="px-4 py-3 w-12 text-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  checked={allSelected}
                  onChange={(e) => onSelectAll?.(e.target.checked)}
                />
              </th>
            )}
            {columns.map((col, i) => (
              <th
                key={i}
                className={cn(
                  "px-4 py-3 font-medium whitespace-nowrap",
                  col.sortable && "cursor-pointer select-none hover:bg-muted/60 transition-colors",
                  col.className
                )}
                onClick={() => col.sortable && col.accessorKey && handleSort(col.accessorKey as string)}
              >
                <div className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortConfig?.key === col.accessorKey && (
                    sortConfig?.direction === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-8 text-center text-muted-foreground">
                No data available
              </td>
            </tr>
          ) : (
            sortedData.map((row, i) => {
              const id = keyExtractor(row)
              const isSelected = selectedIds.has(id)

              return (
                <tr
                  key={id}
                  className={cn(
                    "hover:bg-muted/40 transition-colors",
                    onRowClick && "cursor-pointer",
                    isSelected && "bg-muted/60"
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className="px-4 py-3 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={isSelected}
                        onChange={(e) => onSelectChange?.(id, e.target.checked)}
                      />
                    </td>
                  )}
                  {columns.map((col, j) => (
                    <td key={j} className={cn("px-4 py-3 align-middle", col.className)}>
                      {col.cell
                        ? col.cell(row)
                        : col.accessorKey
                          ? (row as any)[col.accessorKey]
                          : null}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
