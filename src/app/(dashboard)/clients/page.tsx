"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SearchInput } from "@/components/ui/search-input";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { Avatar } from "@/components/ui/avatar";
import { Users, UserPlus, UserCheck, UserSearch, MoreVertical, Plus } from "lucide-react";

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchClients();
  }, [search]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/clients", window.location.origin);
      if (search) url.searchParams.append("search", search);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.data) {
        setClients(json.data);
        setStats(json.stats || {});
      }
    } catch (error) {
      console.error("Failed to fetch clients", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (row: any) => {
    router.push(`/clients/${row.id}`);
  };

  const columns: ColumnDef<any>[] = [
    {
      header: "Business Name",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.companyName} size="sm" />
          <div>
            <div className="font-bold">{row.companyName}</div>
            <div className="text-xs text-muted-foreground">{row.clientCode}</div>
          </div>
        </div>
      ),
      className: "w-[250px]"
    },
    {
      header: "Legal Name",
      accessorKey: "legalName",
      cell: (row) => row.legalName || "-"
    },
    {
      header: "Contact Name",
      cell: (row) => row.contactName ? (
        <div className="flex items-center gap-2">
          <Avatar name={row.contactName} size="sm" />
          <div>
            <div>{row.contactName}</div>
            <div className="text-xs text-muted-foreground">{row.contactEmail || "-"}</div>
          </div>
        </div>
      ) : "-"
    },
    {
      header: "Mobile",
      accessorKey: "mobile",
      cell: (row) => row.mobile || "-"
    },
    {
      header: "Business Entity",
      accessorKey: "businessEntity",
      cell: (row) => (
        <div className="truncate max-w-[120px]" title={row.businessEntity}>
          {row.businessEntity || "-"}
        </div>
      )
    },
    {
      header: "Services",
      cell: (row) => (
        <div className="flex -space-x-2">
          {/* Mocked, in real app would map assigned services */}
          <Avatar name="GST" size="sm" className="border-2 border-background z-10 bg-orange-500" />
          <Avatar name="TDS" size="sm" className="border-2 border-background z-20 bg-blue-500" />
          <div className="w-6 h-6 rounded-full bg-muted border-2 border-background z-30 flex items-center justify-center text-[10px] font-medium">+3</div>
        </div>
      )
    },
    {
      header: "Employee",
      cell: (row) => {
        // We will just show an avatar if there's assigned user
        return <Avatar name={row.user?.name || "?"} size="sm" />;
      }
    },
    {
      header: "Groups",
      cell: (row) => row.group ? <Avatar name={row.group.name} size="sm" /> : "-"
    },
    {
      header: "Auditor",
      cell: (row) => row.auditor ? <Avatar name={row.auditor.name} size="sm" /> : "-"
    },
    {
      header: "Labels",
      cell: (row) => {
        if (!row.labels) return "-";
        const labelsList = row.labels.split(',').map((l: string) => l.trim());
        return (
          <div className="flex flex-wrap gap-1">
            {labelsList.map((label: string, i: number) => (
              <span key={i} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-bold cursor-pointer hover:bg-indigo-200">
                {label}
              </span>
            ))}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-blue-700">{stats.total || 0}</div>
            <div className="text-xs text-blue-600/80 mt-1">Total Clients</div>
          </div>
          <Users className="w-10 h-10 text-blue-200" />
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-green-700">{stats.newThisMonth || 0}</div>
            <div className="text-xs text-green-600/80 mt-1">New Clients this month</div>
          </div>
          <UserPlus className="w-10 h-10 text-green-200" />
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-green-700">{stats.active90Days || 0}</div>
            <div className="text-xs text-green-600/80 mt-1">Active Clients 90 days</div>
          </div>
          <UserCheck className="w-10 h-10 text-green-200" />
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-orange-700">{stats.noActivity90Days || 0}</div>
            <div className="text-xs text-orange-600/80 mt-1">No Activity 90 days</div>
          </div>
          <UserSearch className="w-10 h-10 text-orange-200" />
        </div>
      </div>

      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-lg font-bold">Client ({clients.length})</h1>
        <div className="flex items-center gap-2">
          <SearchInput
            placeholder="Search clients..."
            value={search}
            onChange={setSearch}
            className="w-48 sm:w-64"
          />
          <div className="relative group">
            <button className="p-2 border rounded-md hover:bg-muted transition-colors">
              <MoreVertical className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="absolute right-0 mt-1 hidden group-hover:block w-40 bg-popover border shadow-lg rounded-md z-50">
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 text-muted-foreground"
              >
                <Plus className="w-4 h-4" /> Add Client (via Lead)
              </button>
              <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted">Export CSV</button>
            </div>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={clients}
        keyExtractor={(row) => row.id}
        selectable
        onRowClick={handleRowClick}
      />
    </div>
  );
}
