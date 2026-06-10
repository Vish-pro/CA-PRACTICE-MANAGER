"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SearchInput } from "@/components/ui/search-input";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { Avatar } from "@/components/ui/avatar";
import { SlideOver } from "@/components/ui/slide-over";
import { Users, UserPlus, UserCheck, UserSearch, MoreVertical, Plus, Folder, Edit2, Trash2, Eye, EyeOff, Copy, Filter } from "lucide-react";
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [revealedEmails, setRevealedEmails] = useState<Set<string>>(new Set());
  const [revealedMobiles, setRevealedMobiles] = useState<Set<string>>(new Set());

  const [groupFilter, setGroupFilter] = useState<{ id: string; name: string } | null>(null);

  // Main view mode: clients table or business groups accordion
  const [viewMode, setViewMode] = useState<"clients" | "groups">("clients");

  // Groups Management Drawer States
  const [isGroupsOpen, setIsGroupsOpen] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [groupClients, setGroupClients] = useState<Record<string, any[]>>({});
  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");


  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(d => setStaff(d.data || []));
    fetch('/api/groups').then(r => r.json()).then(d => setGroups(d.data || []));
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      const json = await res.json();
      if (json.data) setGroups(json.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingGroup) {
        // Edit group
        const res = await fetch(`/api/groups?id=${editingGroup.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: groupName, description: groupDescription })
        });
        if (res.ok) {
          toast.success("Business Group updated successfully");
          setEditingGroup(null);
          setGroupName("");
          setGroupDescription("");
          fetchGroups();
        } else {
          toast.error("Failed to update group");
        }
      } else {
        // Add group
        const res = await fetch("/api/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: groupName, description: groupDescription })
        });
        if (res.ok) {
          toast.success("Business Group created successfully");
          setGroupName("");
          setGroupDescription("");
          fetchGroups();
        } else {
          toast.error("Failed to create group");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    }
  };

  const deleteGroup = async (id: string) => {
    if (!confirm("Are you sure you want to delete this business group? Clients will be unlinked.")) return;
    try {
      const res = await fetch(`/api/groups?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Group removed successfully");
        fetchGroups();
        fetchClients();
      } else {
        toast.error("Failed to delete group");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred");
    }
  };

  useEffect(() => {
    fetchClients();
    setCurrentPage(1);
  }, [search, groupFilter]);

  const handleSelectChange = (id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) next.add(id); else next.delete(id);
      return next;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) setSelectedIds(new Set(clients.map(c => c.id)));
    else setSelectedIds(new Set());
  };

  const fetchClients = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/clients", window.location.origin);
      if (search) url.searchParams.append("search", search);
      if (groupFilter) url.searchParams.append("groupId", groupFilter.id);
      url.searchParams.append("limit", "500");

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.data) {
        setClients(json.data);
        setSelectedIds(new Set());
        setStats(json.stats || {});
        setCurrentPage(1);
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



  const totalPages = Math.max(1, Math.ceil(clients.length / pageSize));
  const paginatedClients = clients.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const columns: ColumnDef<any>[] = [
    {
      header: "Legal Name",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.companyName} size="sm" />
          <div>
            <div className="font-bold">{row.legalName || row.companyName}</div>
            <div className="text-xs text-muted-foreground">{row.clientCode}</div>
          </div>
        </div>
      ),
      className: "w-[260px]"
    },
    {
      header: "Contact Person",
      cell: (row) => {
        if (!row.contactName) return "-";
        const emailRevealed = revealedEmails.has(row.id);
        return (
          <div className="flex items-center gap-2">
            <Avatar name={row.contactName} size="sm" />
            <div>
              <div>{row.contactName}</div>
              {row.contactEmail && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs text-muted-foreground font-mono">
                    {emailRevealed ? row.contactEmail : "••••••••••"}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setRevealedEmails(prev => { const n = new Set(prev); emailRevealed ? n.delete(row.id) : n.add(row.id); return n; }); }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title={emailRevealed ? "Hide email" : "Show email"}
                  >
                    {emailRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(row.contactEmail); toast.success("Email copied"); }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy email"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      }
    },
    {
      header: "Mobile",
      cell: (row) => {
        if (!row.mobile) return "-";
        const revealed = revealedMobiles.has(row.id);
        return (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sm">
              {revealed ? row.mobile : "••••••••••"}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setRevealedMobiles(prev => { const n = new Set(prev); revealed ? n.delete(row.id) : n.add(row.id); return n; }); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title={revealed ? "Hide number" : "Show number"}
            >
              {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(row.mobile); toast.success("Mobile copied"); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Copy number"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      }
    },
    {
      header: "Department",
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
      header: "Partner",
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
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">
            {viewMode === "groups"
              ? `Business Groups (${groups.length})`
              : `${groupFilter ? groupFilter.name : "Clients"} (${clients.length})`}
          </h1>
          {viewMode === "groups" && (
            <button
              onClick={() => { setViewMode("clients"); setExpandedGroupId(null); }}
              className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full hover:bg-emerald-200 transition-colors"
              title="Back to clients list"
            >
              ← Show Clients
            </button>
          )}
          {viewMode === "clients" && groupFilter && (
            <button
              onClick={() => setGroupFilter(null)}
              className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
              title="Clear group filter"
            >
              {groupFilter.name} ✕
            </button>
          )}
        </div>
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
            <div className="absolute right-0 mt-1 hidden group-hover:block w-48 bg-popover border shadow-lg rounded-md z-50">
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                onClick={() => setIsAddOpen(true)}
              >
                <Plus className="w-4 h-4" /> Add Client
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                onClick={() => { fetchGroups(); setViewMode("groups"); setGroupFilter(null); }}
              >
                <Folder className="w-4 h-4" /> Business Groups
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

      {viewMode === "clients" && (<>
      <DataTable
        columns={columns}
        data={paginatedClients}
        keyExtractor={(row) => row.id}
        selectable
        selectedIds={selectedIds}
        onSelectChange={handleSelectChange}
        onSelectAll={handleSelectAll}
        onRowClick={handleRowClick}
      />

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            className="border rounded-md px-2 py-1 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {[10, 25, 50, 100].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-2">
            {clients.length === 0 ? "0" : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, clients.length)}`} of {clients.length}
          </span>
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="px-2 py-1 border rounded-md text-xs disabled:opacity-40 hover:bg-muted transition-colors"
          >
            «
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-2 py-1 border rounded-md text-xs disabled:opacity-40 hover:bg-muted transition-colors"
          >
            ‹
          </button>
          <span className="px-3 py-1 border rounded-md text-xs bg-muted font-medium">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-2 py-1 border rounded-md text-xs disabled:opacity-40 hover:bg-muted transition-colors"
          >
            ›
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 border rounded-md text-xs disabled:opacity-40 hover:bg-muted transition-colors"
          >
            »
          </button>
        </div>
      </div>
      </>)}

      {/* Business Groups Accordion — main view */}
      {viewMode === "groups" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Corporate umbrella families — click a group to view its subsidiaries</p>
            <button
              onClick={() => { fetchGroups(); setIsGroupsOpen(true); }}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#1b4d3e] text-white rounded-md text-xs font-semibold hover:bg-emerald-950 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Manage Groups
            </button>
          </div>

          {groups.length === 0 && (
            <div className="border border-dashed rounded-xl p-12 text-center">
              <Folder className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm font-semibold">No business groups yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create one via Manage Groups to link parents and subsidiaries.</p>
            </div>
          )}

          {groups
            .filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()))
            .map((g) => {
            const isExpanded = expandedGroupId === g.id;
            const members    = groupClients[g.id] || [];
            const memberCount = g._count?.clients ?? members.length;
            return (
              <div key={g.id} className="border rounded-xl overflow-hidden bg-card shadow-sm">
                {/* Group header */}
                <button
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors text-left"
                  onClick={async () => {
                    if (isExpanded) { setExpandedGroupId(null); return; }
                    setExpandedGroupId(g.id);
                    if (!groupClients[g.id]) {
                      const res  = await fetch(`/api/clients?groupId=${g.id}&limit=100`);
                      const json = await res.json();
                      setGroupClients(prev => ({ ...prev, [g.id]: json.data || [] }));
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1b4d3e] text-white text-sm font-bold flex items-center justify-center">
                      {g.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-foreground">{g.name}</div>
                      {g.description && <div className="text-xs text-muted-foreground truncate max-w-md">{g.description}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] bg-[#1b4d3e]/10 text-[#1b4d3e] font-semibold px-2.5 py-1 rounded-full">
                      {memberCount} {memberCount === 1 ? "client" : "clients"}
                    </span>
                    <span className="text-muted-foreground text-xs">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </button>

                {/* Accordion body */}
                {isExpanded && (
                  <div className="border-t bg-background">
                    {!groupClients[g.id] ? (
                      <p className="px-5 py-4 text-xs text-muted-foreground italic">Loading clients…</p>
                    ) : members.length === 0 ? (
                      <p className="px-5 py-4 text-xs text-muted-foreground italic">No clients in this group yet.</p>
                    ) : (
                      <div className="divide-y">
                        {members.map((c: any) => (
                          <button
                            key={c.id}
                            onClick={() => router.push(`/clients/${c.id}`)}
                            className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors text-left"
                          >
                            <Avatar name={c.companyName} size="sm" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{c.legalName || c.companyName}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{c.clientCode}</div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              {c.auditor && (
                                <div className="flex items-center gap-1.5" title={`Partner: ${c.auditor.name}`}>
                                  <Avatar name={c.auditor.name} size="sm" />
                                </div>
                              )}
                              <span className="text-[10px] text-muted-foreground w-24 text-right">{c.businessEntity || ""}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="px-5 py-2.5 bg-muted/20 border-t">
                      <button
                        onClick={() => { setGroupFilter({ id: g.id, name: g.name }); setViewMode("clients"); setExpandedGroupId(null); }}
                        className="text-xs text-[#1b4d3e] font-semibold hover:underline flex items-center gap-1"
                      >
                        <Filter className="w-3 h-3" /> View all in clients table
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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

      {/* Floating Bulk Action Bar for Clients */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#1b4d3e] text-white py-3 px-6 rounded-full shadow-2xl z-50 flex items-center gap-6 border border-emerald-800 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="text-sm font-semibold">
            {selectedIds.size} {selectedIds.size === 1 ? "client" : "clients"} selected
          </span>
          <div className="h-4 w-px bg-emerald-700/60" />
          <div className="flex items-center gap-4">
            {/* Bulk Assign Auditor */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-300 font-medium">Auditor:</span>
              <select
                className="bg-emerald-900 border border-emerald-700 text-xs rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white"
                onChange={async (e) => {
                  const val = e.target.value;
                  if (!val) return;
                  const res = await fetch("/api/clients/bulk", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      ids: Array.from(selectedIds),
                      data: { auditorId: val === "unassigned" ? null : val }
                    })
                  });
                  if (res.ok) {
                    setSelectedIds(new Set());
                    fetchClients();
                  }
                  e.target.value = ""; // reset
                }}
              >
                <option value="">Assign Auditor...</option>
                <option value="unassigned">Unassigned</option>
                {staff.filter(u => u.role === 'ADMIN' || u.role === 'SENIOR_STAFF').map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Bulk Group */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-300 font-medium">Group:</span>
              <select
                className="bg-emerald-900 border border-emerald-700 text-xs rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white"
                onChange={async (e) => {
                  const val = e.target.value;
                  if (!val) return;
                  const res = await fetch("/api/clients/bulk", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      ids: Array.from(selectedIds),
                      data: { groupId: val === "none" ? null : val }
                    })
                  });
                  if (res.ok) {
                    setSelectedIds(new Set());
                    fetchClients();
                  }
                  e.target.value = ""; // reset
                }}
              >
                <option value="">Move to Group...</option>
                <option value="none">No Group</option>
                {groups.map((g: any) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            {/* Bulk Labels */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-300 font-medium">Add Labels:</span>
              <input
                type="text"
                placeholder="Press Enter..."
                className="bg-emerald-900 border border-emerald-700 text-xs rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white placeholder-emerald-600/70 w-24"
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value.trim();
                    if (!val) return;
                    const res = await fetch("/api/clients/bulk", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        ids: Array.from(selectedIds),
                        data: { labels: val }
                      })
                    });
                    if (res.ok) {
                      setSelectedIds(new Set());
                      fetchClients();
                    }
                    e.currentTarget.value = ""; // reset
                  }
                }}
              />
            </div>

            <div className="h-4 w-px bg-emerald-700/60" />

            <button
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              onClick={() => setSelectedIds(new Set())}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Client Business Groups Manager SlideOver */}
      <SlideOver
        open={isGroupsOpen}
        onClose={() => {
          setIsGroupsOpen(false);
          setEditingGroup(null);
          setGroupName("");
          setGroupDescription("");
        }}
        title="Client Business Groups Manager"
      >
        <div className="space-y-6 pt-4">
          <div className="text-xs text-muted-foreground font-medium">
            Define corporate umbrella families (Concept 1: Client Business Groups) to link parents and subsidiaries.
          </div>

          <form onSubmit={handleGroupSubmit} className="space-y-3 bg-muted/30 p-3.5 rounded-lg border">
            <div className="text-xs font-bold uppercase tracking-wider text-[#1b4d3e]">
              {editingGroup ? "✏️ Edit Business Group" : "➕ Add Corporate Umbrella Group"}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Group Name *</label>
              <input
                required
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Tata Group"
                className="w-full p-2 border rounded text-xs bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Description</label>
              <textarea
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Brief group details..."
                rows={2}
                className="w-full p-2 border rounded text-xs bg-background text-foreground resize-none"
              />
            </div>
            <div className="flex justify-end gap-1.5 pt-2">
              {editingGroup && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingGroup(null);
                    setGroupName("");
                    setGroupDescription("");
                  }}
                  className="px-2.5 py-1.5 border rounded text-[10px] font-semibold"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#1b4d3e] text-white rounded text-[10px] font-semibold hover:bg-emerald-950 transition-colors"
              >
                {editingGroup ? "Save Changes" : "Create Group"}
              </button>
            </div>
          </form>

          <div className="border rounded-lg overflow-hidden bg-background">
            <div className="px-3.5 py-2.5 bg-muted/50 border-b text-xs font-bold text-[#1b4d3e] uppercase tracking-wider">
              Active Umbrella Groups ({groups.length})
            </div>
            <div className="divide-y max-h-72 overflow-y-auto">
              {groups.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground italic">No corporate umbrella groups found</div>
              ) : (
                groups.map((g) => (
                  <div key={g.id} className="p-3 flex items-center justify-between hover:bg-muted/10 transition-colors">
                    <div>
                      <div className="text-xs font-bold text-primary">{g.name}</div>
                      {g.description && <div className="text-[10px] text-muted-foreground mt-0.5">{g.description}</div>}
                    </div>
                    <div className="flex gap-1.5 items-center">
                      <button
                        onClick={() => {
                          setGroupFilter({ id: g.id, name: g.name });
                          setViewMode("clients");
                          setIsGroupsOpen(false);
                        }}
                        className="px-2 py-1 bg-[#1b4d3e] text-white rounded text-[10px] font-semibold hover:bg-emerald-900 transition-colors flex items-center gap-1"
                        title="View clients in this group"
                      >
                        <Filter className="w-2.5 h-2.5" /> View
                      </button>
                      <button
                        onClick={() => {
                          setEditingGroup(g);
                          setGroupName(g.name);
                          setGroupDescription(g.description || "");
                        }}
                        className="p-1 hover:bg-muted rounded text-[#1b4d3e]"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteGroup(g.id)}
                        className="p-1 hover:bg-muted rounded text-red-500 hover:text-red-700"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </SlideOver>

    </div>
  );
}

