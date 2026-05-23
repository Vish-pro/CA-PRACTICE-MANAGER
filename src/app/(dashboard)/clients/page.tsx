"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SearchInput } from "@/components/ui/search-input";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { Avatar } from "@/components/ui/avatar";
import { SlideOver } from "@/components/ui/slide-over";
import { Users, UserPlus, UserCheck, UserSearch, MoreVertical, Plus } from "lucide-react";
import Papa from "papaparse";
import toast from "react-hot-toast";

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
    fetchClients();
  }, [search]);

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(d => setStaff(d.data || []));
    fetch('/api/groups').then(r => r.json()).then(d => setGroups(d.data || []));
  }, []);

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

  const handleExportCSV = () => {
    const csvData = clients.map(c => ({
      "Business Name": c.companyName || "",
      "Legal Name": c.legalName || "",
      "Business Entity": c.businessEntity || "",
      "Contact Person": c.contactName || "",
      "Contact Email": c.contactEmail || "",
      "Mobile": c.mobile || "",
      "GST Number": c.gstNumber || "",
      "PAN Number": c.panNumber || "",
      "Address": c.address || "",
      "Labels": c.labels || ""
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "clients_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        if (rows.length === 0) {
          toast.error("CSV file is empty");
          return;
        }

        const loadingToast = toast.loading(`Importing ${rows.length} clients...`);
        let successCount = 0;
        let errorCount = 0;

        for (const row of rows) {
          try {
            const body = {
              businessName: row["Business Name"] || row["companyName"] || "",
              legalName: row["Legal Name"] || row["legalName"] || "",
              businessEntity: row["Business Entity"] || row["businessEntity"] || "",
              contactName: row["Contact Person"] || row["contactName"] || "",
              contactEmail: row["Contact Email"] || row["contactEmail"] || "",
              mobile: row["Mobile"] || row["mobile"] || "",
              gstNumber: row["GST Number"] || row["gstNumber"] || "",
              panNumber: row["PAN Number"] || row["panNumber"] || "",
              address: row["Address"] || row["address"] || "",
              labels: row["Labels"] || row["labels"] || "",
            };

            if (!body.businessName) {
              errorCount++;
              continue;
            }

            const res = await fetch("/api/clients", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });

            if (res.ok) successCount++;
            else errorCount++;
          } catch (err) {
            errorCount++;
          }
        }

        toast.dismiss(loadingToast);
        if (successCount > 0) {
          toast.success(`Successfully imported ${successCount} clients.`);
        }
        if (errorCount > 0) {
          toast.error(`Failed to import ${errorCount} rows.`);
        }
        fetchClients();
      },
      error: (error) => {
        toast.error(`Error parsing CSV: ${error.message}`);
      }
    });

    e.target.value = ''; // Reset input
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
      header: "Contact Person",
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
      cell: (row: any) => {
        const services: { id: string; name: string }[] = row.rateCards?.map((rc: { service: { id: string; name: string } | null }) => rc.service).filter(Boolean) || [];
        if (services.length === 0) return "-";

        const displayServices = services.slice(0, 3);
        const remaining = services.length - 3;
        const zClasses = ["z-10", "z-20", "z-30"];

        return (
          <div className="flex -space-x-2">
            {displayServices.map((srv, i: number) => (
              <Avatar
                key={srv.id}
                name={srv.name}
                size="sm"
                className={`border-2 border-background ${zClasses[i] || 'z-0'}`}
                title={srv.name}
              />
            ))}
            {remaining > 0 && (
              <div className="w-6 h-6 rounded-full bg-muted border-2 border-background z-40 flex items-center justify-center text-[10px] font-medium" title={`${remaining} more`}>
                +{remaining}
              </div>
            )}
          </div>
        );
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
              <label className="w-full text-left px-3 py-2 text-sm hover:bg-muted cursor-pointer block">
                Import CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
              </label>
              <button onClick={handleExportCSV} className="w-full text-left px-3 py-2 text-sm hover:bg-muted">Export CSV</button>
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
            <label className="block text-sm font-medium mb-1">Assigned Employee</label>
            <select name="assignedEmployeeId" className="w-full p-2 border rounded-md text-sm">
              <option value="">Select...</option>
              {staff.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Auditor</label>
            <select name="auditorId" className="w-full p-2 border rounded-md text-sm">
              <option value="">Select...</option>
              {staff.filter(u => u.role === 'ADMIN' || u.role === 'SENIOR_STAFF').map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Group</label>
            <select name="groupId" className="w-full p-2 border rounded-md text-sm">
              <option value="">None</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Labels <span className="text-xs text-muted-foreground">(comma-separated, e.g. VIP,Tech)</span></label>
            <input name="labels" placeholder="VIP, Tech, Priority" className="w-full p-2 border rounded-md text-sm" />
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
