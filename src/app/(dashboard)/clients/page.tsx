"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SearchInput } from "@/components/ui/search-input";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { Avatar } from "@/components/ui/avatar";
import { SlideOver } from "@/components/ui/slide-over";
import { Users, UserPlus, UserCheck, UserSearch, MoreVertical, Plus } from "lucide-react";

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(d => setStaff(d.data || []));
    fetch('/api/groups').then(r => r.json()).then(d => setGroups(d.data || []));
  }, []);

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

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const labels = (data.get("labels") as string || "").trim();

    await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: data.get("businessName"),
        legalName: data.get("legalName"),
        businessEntity: data.get("businessEntity"),
        contactName: data.get("contactName"),
        contactEmail: data.get("contactEmail"),
        mobile: data.get("mobile"),
        gstNumber: data.get("gstNumber"),
        panNumber: data.get("panNumber"),
        address: data.get("address"),
        auditorId: data.get("auditorId") || null,
        groupId: data.get("groupId") || null,
        labels: labels || null,
      }),
    });
    setIsAddOpen(false);
    fetchClients();
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
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                onClick={() => setIsAddOpen(true)}
              >
                <Plus className="w-4 h-4" /> Add Client
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

      <SlideOver open={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Client">
        <form id="add-client-form" onSubmit={handleAddClient} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Business Name <span className="text-red-500">*</span></label>
            <input name="businessName" required className="w-full p-2 border rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Legal Name</label>
            <input name="legalName" className="w-full p-2 border rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Business Entity <span className="text-red-500">*</span></label>
            <select name="businessEntity" required className="w-full p-2 border rounded-md text-sm">
              <option value="">Select...</option>
              <option value="Public Limited">Public Limited</option>
              <option value="Private Limited">Private Limited</option>
              <option value="Partnership">Partnership Firm</option>
              <option value="LLP">LLP</option>
              <option value="Proprietorship">Proprietorship</option>
              <option value="Trust">Trust</option>
              <option value="HUF">HUF</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Contact Name</label>
              <input name="contactName" className="w-full p-2 border rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mobile</label>
              <input type="tel" name="mobile" className="w-full p-2 border rounded-md text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contact Email</label>
            <input type="email" name="contactEmail" className="w-full p-2 border rounded-md text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">GST Number</label>
              <input
                name="gstNumber"
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
                pattern="^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
                title="Enter valid GST number (e.g. 22AAAAA0000A1Z5)"
                className="w-full p-2 border rounded-md text-sm uppercase"
                onChange={(e) => { e.target.value = e.target.value.toUpperCase(); }}
              />
              <p className="text-xs text-muted-foreground mt-0.5">15 characters — e.g. 22AAAAA0000A1Z5</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">PAN Number</label>
              <input
                name="panNumber"
                placeholder="AAAAA9999A"
                maxLength={10}
                pattern="^[A-Z]{5}[0-9]{4}[A-Z]{1}$"
                title="Enter valid PAN number (e.g. ABCDE1234F)"
                className="w-full p-2 border rounded-md text-sm uppercase"
                onChange={(e) => { e.target.value = e.target.value.toUpperCase(); }}
              />
              <p className="text-xs text-muted-foreground mt-0.5">10 characters — e.g. ABCDE1234F</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <textarea name="address" rows={2} className="w-full p-2 border rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Auditor</label>
            <select name="auditorId" className="w-full p-2 border rounded-md text-sm">
              <option value="">None</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Group</label>
            <select name="groupId" className="w-full p-2 border rounded-md text-sm">
              <option value="">None</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Labels</label>
            <input name="labels" placeholder="e.g. VIP, Retail" className="w-full p-2 border rounded-md text-sm" />
          </div>
        </form>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 border rounded-md text-sm font-medium">Cancel</button>
          <button form="add-client-form" type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">Add Client</button>
        </div>
      </SlideOver>
    </div>
  );
}
