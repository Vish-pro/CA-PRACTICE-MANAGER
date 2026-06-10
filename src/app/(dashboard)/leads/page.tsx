"use client";

import { useState, useEffect } from "react";
import { SearchInput } from "@/components/ui/search-input";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { SlideOver } from "@/components/ui/slide-over";
import { Modal } from "@/components/ui/modal";
import { ConfirmByTyping } from "@/components/ui/confirm-by-typing";
import { useSession } from "next-auth/react";
import {
  Clock, CheckCircle, UserX, Users, Percent,
  MoreVertical, Filter, AlignJustify, Plus, LayoutGrid, List
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function LeadsPage() {
  const { data: session } = useSession();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [activeStatCard, setActiveStatCard] = useState<string>("OPEN");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  const [leads, setLeads] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterStages, setFilterStages] = useState<string[]>([]);
  const [filterSources, setFilterSources] = useState<string[]>([]);

  // Slide Over state
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);

  // Edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  // References for Convert Modal dropdowns
  const [staff, setStaff] = useState<any[]>([]);

  // Pipeline Config Drawer States
  const [isPipelineConfigOpen, setIsPipelineConfigOpen] = useState(false);
  const [customSources, setCustomSources] = useState<string[]>([]);
  const [customStages, setCustomStages] = useState<string[]>([]);
  const [newCustomSource, setNewCustomSource] = useState("");
  const [newCustomStage, setNewCustomStage] = useState("");

  useEffect(() => {
    // Load custom pipeline configurations
    const storedSources = localStorage.getItem("leads_custom_sources");
    const storedStages = localStorage.getItem("leads_custom_stages");
    if (storedSources) {
      setCustomSources(JSON.parse(storedSources));
    } else {
      const defaultSources = ["Website", "Referral", "Walk-in", "Social Media", "Cold Call", "Other"];
      setCustomSources(defaultSources);
      localStorage.setItem("leads_custom_sources", JSON.stringify(defaultSources));
    }

    if (storedStages) {
      setCustomStages(JSON.parse(storedStages));
    } else {
      const defaultStages = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"];
      setCustomStages(defaultStages);
      localStorage.setItem("leads_custom_stages", JSON.stringify(defaultStages));
    }
  }, []);


  useEffect(() => {
    fetchLeads();
  }, [stageFilter, search, activeStatCard, filterStages, filterSources]);

  useEffect(() => {
    fetch("/api/users")
      .then(res => res.json())
      .then(json => {
        if (json.data) setStaff(json.data);
      })
      .catch(err => console.error("Failed to fetch staff", err));
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/leads", window.location.origin);
      if (activeStatCard === "OPEN") {
        url.searchParams.set("stages", "NEW,CONTACTED,QUALIFIED");
      } else if (activeStatCard === "CONVERTED") {
        url.searchParams.set("stages", "CONVERTED");
      } else if (activeStatCard === "LOST") {
        url.searchParams.set("stages", "LOST");
      } else if (stageFilter !== "ALL") {
        url.searchParams.set("stages", stageFilter);
      }

      if (filterStages.length > 0) {
        url.searchParams.set("stages", filterStages.join(","));
      }
      if (filterSources.length > 0) {
        url.searchParams.set("sources", filterSources.join(","));
      }
      if (search) url.searchParams.append("search", search);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.data) {
        setLeads(json.data);
        setSelectedIds(new Set());
        setStats(json.stats || {});
      }
    } catch (error) {
      console.error("Failed to fetch leads", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChange = (id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) next.add(id); else next.delete(id);
      return next;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) setSelectedIds(new Set(leads.map(l => l.id)));
    else setSelectedIds(new Set());
  };

  const handleRowClick = async (row: any) => {
    try {
      const res = await fetch(`/api/leads/${row.id}`);
      const json = await res.json();
      if (json.data) {
        setSelectedLead(json.data);
        setIsDetailOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch lead details", error);
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const payload = {
      businessName: formData.get("businessName"),
      legalName: formData.get("legalName"),
      businessEntity: formData.get("businessEntity"),
      contactName: formData.get("contactName"),
      contactEmail: formData.get("contactEmail"),
      contactPhone: formData.get("contactPhone"),
      source: formData.get("source"),
      stage: formData.get("stage"),
      dealValue: formData.get("dealValue"),
      dealType: formData.get("dealType"),
      assignedToId: formData.get("assignedToId") || null,
      notes: formData.get("notes"),
    };

    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsAddOpen(false);
    fetchLeads();
  };

  const handleUpdateStage = async (stage: string) => {
    if (!selectedLead) return;
    await fetch(`/api/leads/${selectedLead.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    handleRowClick(selectedLead);
    fetchLeads();
  };

  const handleDeleteLead = async () => {
    if (!selectedLead) return;
    await fetch(`/api/leads/${selectedLead.id}`, { method: "DELETE" });
    setIsDetailOpen(false);
    setIsDeleteConfirmOpen(false);
    fetchLeads();
  };

  const handleEditSave = async () => {
    if (!selectedLead) return;
    await fetch(`/api/leads/${selectedLead.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const res = await fetch(`/api/leads/${selectedLead.id}`);
    const json = await res.json();
    if (json.data) setSelectedLead(json.data);
    setIsEditMode(false);
    fetchLeads();
  };



  const handleConvertClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const payload = {
      businessName: formData.get("businessName"),
      legalName: formData.get("legalName"),
      businessEntity: formData.get("businessEntity"),
      contactName: formData.get("contactName"),
      contactEmail: selectedLead.contactEmail,
      mobile: formData.get("mobile"),
      gstNumber: formData.get("gstNumber"),
      panNumber: formData.get("panNumber"),
      address: formData.get("address"),
      auditorId: formData.get("auditorId"),
    };

    const res = await fetch(`/api/leads/${selectedLead.id}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (json.data) {
      setIsConvertOpen(false);
      setIsDetailOpen(false);
      fetchLeads();
      window.location.href = `/clients/${json.data.id}`;
    }
  };


  const columns: ColumnDef<any>[] = [
    {
      header: "Created On",
      cell: (row) => format(new Date(row.createdAt), "MMM dd, yyyy"),
      className: "whitespace-nowrap"
    },
    {
      header: "Business Name",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.businessName} size="sm" />
          <span className="font-bold">{row.businessName}</span>
        </div>
      )
    },
    {
      header: "Business Entity",
      accessorKey: "businessEntity",
      cell: (row) => row.businessEntity || "-"
    },
    {
      header: "Contact Person",
      cell: (row) => row.contactName ? (
        <div className="flex items-center gap-2">
          <Avatar name={row.contactName} size="sm" />
          <span>{row.contactName}</span>
        </div>
      ) : "-"
    },
    {
      header: "Contact No",
      accessorKey: "contactPhone",
      cell: (row) => row.contactPhone || "-"
    },
    {
      header: "Stage",
      accessorKey: "stage",
      cell: (row) => <StatusBadge status={row.stage} />
    },
    {
      header: "Deal Value",
      cell: (row) => row.dealValue ? `₹${row.dealValue.toLocaleString()}` : "-"
    },
    {
      header: "Deal Type",
      accessorKey: "dealType",
      cell: (row) => row.dealType || "-"
    },
    {
      header: "User (Assigned)",
      cell: (row) => row.assignedTo ? <Avatar name={row.assignedTo.name} size="sm" title={row.assignedTo.name} /> : "-"
    }
  ];

  const conversionRate = stats.total > 0 ? Math.round((stats.converted / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div
            onClick={() => setActiveStatCard("OPEN")}
            className={cn("bg-white border rounded-xl p-4 flex items-center justify-between cursor-pointer", activeStatCard === "OPEN" ? "ring-2 ring-offset-1 ring-primary" : "")}
          >
            <div>
              <div className="text-3xl font-bold">{stats.open || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Open</div>
            </div>
            <Clock className="w-10 h-10 text-gray-300" />
          </div>
          <div
            onClick={() => setActiveStatCard("CONVERTED")}
            className={cn("bg-green-50 border border-green-100 rounded-xl p-4 flex items-center justify-between cursor-pointer", activeStatCard === "CONVERTED" ? "ring-2 ring-offset-1 ring-green-500" : "")}
          >
            <div>
              <div className="text-3xl font-bold text-green-700">{stats.converted || 0}</div>
              <div className="text-xs text-green-600/80 mt-1">Converted</div>
            </div>
            <CheckCircle className="w-10 h-10 text-green-200" />
          </div>
          <div
            onClick={() => setActiveStatCard("LOST")}
            className={cn("bg-red-50 border border-red-100 rounded-xl p-4 flex items-center justify-between cursor-pointer", activeStatCard === "LOST" ? "ring-2 ring-offset-1 ring-red-500" : "")}
          >
            <div>
              <div className="text-3xl font-bold text-red-700">{stats.lost || 0}</div>
              <div className="text-xs text-red-600/80 mt-1">Lost</div>
            </div>
            <UserX className="w-10 h-10 text-red-200" />
          </div>
          <div
            onClick={() => setActiveStatCard("ALL")}
            className={cn("bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between cursor-pointer", activeStatCard === "ALL" ? "ring-2 ring-offset-1 ring-blue-500" : "")}
          >
            <div>
              <div className="text-3xl font-bold text-blue-700">{stats.total || 0}</div>
              <div className="text-xs text-blue-600/80 mt-1">Total Leads</div>
            </div>
            <Users className="w-10 h-10 text-blue-200" />
          </div>
          <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-cyan-700">{conversionRate}%</div>
              <div className="text-xs text-cyan-600/80 mt-1">Conversion Rate</div>
            </div>
            <Percent className="w-10 h-10 text-cyan-200" />
          </div>
        </div>
        {activeStatCard !== "ALL" && (
          <button
            onClick={() => setActiveStatCard("ALL")}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1b4d3e]">Leads & Sales CRM</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Track potential professional client mandates, lead scoring, and pipeline conversion stages.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsPipelineConfigOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 border rounded-md text-xs font-semibold text-[#1b4d3e] hover:bg-muted transition-colors"
          >
            ⚡ Lead Pipeline Config
          </button>
          <SearchInput
            placeholder="Search..."
            value={search}
            onChange={setSearch}
            className="w-48 sm:w-64"
          />
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(f => !f)}
              className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-muted text-sm font-medium transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
              {(filterStages.length + filterSources.length) > 0 && (
                <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 ml-1">
                  {filterStages.length + filterSources.length}
                </span>
              )}
              <span className="text-xs">▼</span>
            </button>

            {isFilterOpen && (
              <>
                {/* Backdrop to close menu when clicking outside */}
                <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                <div className="absolute right-0 mt-2 w-72 bg-popover border shadow-xl rounded-xl z-50 p-4 space-y-4">
                  {/* Stage filter */}
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Stage</div>
                    <div className="space-y-1">
                      {customStages.map(s => (
                        <label key={s} className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground">
                          <input
                            type="checkbox"
                            checked={filterStages.includes(s)}
                            onChange={(e) => {
                              if (e.target.checked) setFilterStages(prev => [...prev, s]);
                              else setFilterStages(prev => prev.filter(x => x !== s));
                            }}
                            className="rounded"
                          />
                          {s.charAt(0) + s.slice(1).toLowerCase()}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Source filter */}
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Source</div>
                    <div className="space-y-1">
                      {customSources.map(s => (
                        <label key={s} className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground">
                          <input
                            type="checkbox"
                            checked={filterSources.includes(s)}
                            onChange={(e) => {
                              if (e.target.checked) setFilterSources(prev => [...prev, s]);
                              else setFilterSources(prev => prev.filter(x => x !== s));
                            }}
                            className="rounded"
                          />
                          {s}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t">
                    <button
                      onClick={() => { setFilterStages([]); setFilterSources([]); setIsFilterOpen(false); }}
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={() => setIsFilterOpen(false)}
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => setViewMode(v => v === "table" ? "kanban" : "table")}
            title={viewMode === "table" ? "Switch to Pipeline Grid View" : "Switch to Table View"}
            className="p-2 border rounded-md hover:bg-muted transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            {viewMode === "table" ? (
              <LayoutGrid className="w-5 h-5" />
            ) : (
              <List className="w-5 h-5" />
            )}
          </button>
          <div className="relative">
            <button
              className="p-2 border rounded-md hover:bg-muted transition-colors"
              onClick={() => setIsMenuOpen(v => !v)}
              data-testid="leads-menu-button"
            >
              <MoreVertical className="w-5 h-5 text-muted-foreground" />
            </button>
            {isMenuOpen && (
              <>
                {/* Invisible overlay to close menu when clicking outside */}
                <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                <div className="absolute right-0 mt-1 w-40 bg-popover border shadow-lg rounded-md z-50">
                  <button
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 text-foreground"
                    onClick={() => { setIsAddOpen(true); setIsMenuOpen(false); }}
                    data-testid="add-lead-button"
                  >
                    <Plus className="w-4 h-4" /> Add Lead
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {viewMode === "table" ? (
        <DataTable
          columns={columns}
          data={leads}
          keyExtractor={(row) => row.id}
          selectable
          selectedIds={selectedIds}
          onSelectChange={handleSelectChange}
          onSelectAll={handleSelectAll}
          onRowClick={handleRowClick}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"].map(stage => {
            const stageLeads = leads.filter(l => l.stage === stage);
            return (
              <div key={stage} className="bg-muted/30 border border-border/50 rounded-xl p-3 flex flex-col min-w-[220px] min-h-[450px]">
                <div className="flex items-center justify-between mb-3 pb-2 border-b">
                  <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    {stage}
                  </span>
                  <span className="bg-white border text-xs px-2 py-0.5 rounded-full font-bold">
                    {stageLeads.length}
                  </span>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] scrollbar-hide">
                  {stageLeads.map(lead => (
                    <div
                      key={lead.id}
                      onClick={() => handleRowClick(lead)}
                      className="bg-card border rounded-lg p-3 hover:border-primary hover:shadow-sm transition-all cursor-pointer space-y-3 relative overflow-hidden group"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar name={lead.businessName} size="sm" />
                        <span className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">{lead.businessName}</span>
                      </div>
                      
                      {lead.contactName && (
                        <div className="text-xs text-muted-foreground truncate">
                          👤 {lead.contactName}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                        <span className="font-bold text-foreground">
                          {lead.dealValue ? `₹${lead.dealValue.toLocaleString()}` : "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="h-24 border border-dashed rounded-lg flex items-center justify-center text-muted-foreground/30 text-xs italic">
                      No leads here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Lead Modal */}
      <SlideOver
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Lead"
      >
        <form id="lead-form" onSubmit={handleAddLead} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Business Name <span className="text-red-500">*</span></label>
            <input name="businessName" required className="w-full p-2 border rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Legal Name</label>
            <input name="legalName" className="w-full p-2 border rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Business Entity</label>
            <select name="businessEntity" className="w-full p-2 border rounded-md text-sm">
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
              <label className="block text-sm font-medium mb-1">Contact Person</label>
              <input name="contactName" className="w-full p-2 border rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input type="tel" name="contactPhone" className="w-full p-2 border rounded-md text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" name="contactEmail" className="w-full p-2 border rounded-md text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Source</label>
              <select name="source" className="w-full p-2 border rounded-md text-sm">
                <option value="Website">Website</option>
                <option value="Referral">Referral</option>
                <option value="Walk-in">Walk-in</option>
                <option value="Social Media">Social Media</option>
                <option value="Cold Call">Cold Call</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stage</label>
              <select name="stage" defaultValue="NEW" className="w-full p-2 border rounded-md text-sm">
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="QUALIFIED">Qualified</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Deal Value (₹)</label>
              <input type="number" name="dealValue" className="w-full p-2 border rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Deal Type</label>
              <select name="dealType" className="w-full p-2 border rounded-md text-sm">
                <option value="">Select...</option>
                <option value="One-time">One-time</option>
                <option value="Recurring">Recurring</option>
                <option value="Retainer">Retainer</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Assigned / Attended Person</label>
            <select name="assignedToId" className="w-full p-2 border rounded-md text-sm bg-background text-foreground">
              <option value="">Select Staff...</option>
              {staff.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea name="notes" rows={3} className="w-full p-2 border rounded-md text-sm" />
          </div>
        </form>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 border rounded-md text-sm font-medium">Cancel</button>
          <button form="lead-form" type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">Add Lead</button>
        </div>
      </SlideOver>

      {/* Lead Detail Drawer */}
      <SlideOver
        open={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setIsEditMode(false); }}
        title=""
      >
        {selectedLead && (
          <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  {isEditMode ? (
                    <input
                      className="text-2xl font-bold border-b border-primary bg-transparent outline-none w-full"
                      value={editForm.businessName ?? selectedLead.businessName}
                      onChange={e => setEditForm((f: any) => ({ ...f, businessName: e.target.value }))}
                    />
                  ) : selectedLead.businessName}
                </h2>
                <StatusBadge status={selectedLead.stage} />
              </div>
              {!isEditMode ? (
                <button
                  onClick={() => { setIsEditMode(true); setEditForm({}); }}
                  className="shrink-0 px-3 py-1.5 border rounded-md text-sm font-medium hover:bg-muted transition-colors"
                >
                  Edit Lead
                </button>
              ) : (
                <button
                  onClick={() => setIsEditMode(false)}
                  className="shrink-0 px-3 py-1.5 border rounded-md text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Lead Info */}
            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg border border-border/50">
              <div>
                <div className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Created On</div>
                <div className="font-medium">{format(new Date(selectedLead.createdAt), "MMM dd, yyyy")}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Source</div>
                {isEditMode ? (
                  <select
                    className="w-full p-1.5 border rounded text-sm bg-background"
                    value={editForm.source ?? selectedLead.source ?? ""}
                    onChange={e => setEditForm((f: any) => ({ ...f, source: e.target.value }))}
                  >
                    {customSources.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <div className="font-medium">{selectedLead.source || "-"}</div>
                )}
              </div>
              <div>
                <div className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Legal Name</div>
                {isEditMode ? (
                  <input
                    className="w-full p-1.5 border rounded text-sm bg-background"
                    value={editForm.legalName ?? selectedLead.legalName ?? ""}
                    onChange={e => setEditForm((f: any) => ({ ...f, legalName: e.target.value }))}
                  />
                ) : (
                  <div className="font-medium">{selectedLead.legalName || "-"}</div>
                )}
              </div>
              <div>
                <div className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Entity Type</div>
                {isEditMode ? (
                  <select
                    className="w-full p-1.5 border rounded text-sm bg-background"
                    value={editForm.businessEntity ?? selectedLead.businessEntity ?? ""}
                    onChange={e => setEditForm((f: any) => ({ ...f, businessEntity: e.target.value }))}
                  >
                    {["Proprietorship","Partnership","LLP","Private Limited","Public Limited","Trust","HUF","Other"].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                ) : (
                  <div className="font-medium">{selectedLead.businessEntity || "-"}</div>
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-3">
              <h3 className="font-semibold border-b pb-2">Contact Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">Person</div>
                  {isEditMode ? (
                    <input
                      className="w-full p-1.5 border rounded text-sm bg-background"
                      value={editForm.contactName ?? selectedLead.contactName ?? ""}
                      onChange={e => setEditForm((f: any) => ({ ...f, contactName: e.target.value }))}
                    />
                  ) : (
                    <div className="font-medium">{selectedLead.contactName || "-"}</div>
                  )}
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Phone</div>
                  {isEditMode ? (
                    <input
                      className="w-full p-1.5 border rounded text-sm bg-background"
                      value={editForm.contactPhone ?? selectedLead.contactPhone ?? ""}
                      onChange={e => setEditForm((f: any) => ({ ...f, contactPhone: e.target.value }))}
                    />
                  ) : (
                    <div className="font-medium">{selectedLead.contactPhone || "-"}</div>
                  )}
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground mb-1">Email</div>
                  {isEditMode ? (
                    <input
                      type="email"
                      className="w-full p-1.5 border rounded text-sm bg-background"
                      value={editForm.contactEmail ?? selectedLead.contactEmail ?? ""}
                      onChange={e => setEditForm((f: any) => ({ ...f, contactEmail: e.target.value }))}
                    />
                  ) : (
                    <div className="font-medium">{selectedLead.contactEmail || "-"}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Deal Info */}
            <div className="space-y-3">
              <h3 className="font-semibold border-b pb-2">Deal Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">Deal Value</div>
                  {isEditMode ? (
                    <input
                      type="number"
                      className="w-full p-1.5 border rounded text-sm bg-background"
                      value={editForm.dealValue ?? selectedLead.dealValue ?? ""}
                      onChange={e => setEditForm((f: any) => ({ ...f, dealValue: e.target.value ? Number(e.target.value) : null }))}
                    />
                  ) : (
                    <div className="font-medium">{selectedLead.dealValue ? `₹${selectedLead.dealValue.toLocaleString()}` : "-"}</div>
                  )}
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Deal Type</div>
                  {isEditMode ? (
                    <select
                      className="w-full p-1.5 border rounded text-sm bg-background"
                      value={editForm.dealType ?? selectedLead.dealType ?? ""}
                      onChange={e => setEditForm((f: any) => ({ ...f, dealType: e.target.value }))}
                    >
                      <option value="">Select...</option>
                      <option value="One-time">One-time</option>
                      <option value="Recurring">Recurring</option>
                      <option value="Retainer">Retainer</option>
                    </select>
                  ) : (
                    <div className="font-medium">{selectedLead.dealType || "-"}</div>
                  )}
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground mb-1">Stage</div>
                  <select
                    className="w-full p-2 border rounded-md text-sm mt-1 bg-background"
                    value={selectedLead.stage}
                    onChange={(e) => handleUpdateStage(e.target.value)}
                    disabled={selectedLead.stage === 'CONVERTED' || selectedLead.stage === 'LOST'}
                  >
                    {customStages.filter(s => !["CONVERTED","LOST"].includes(s)).map(s => (
                      <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                    ))}
                    {selectedLead.stage === 'CONVERTED' && <option value="CONVERTED" disabled>Converted (via Convert button)</option>}
                    {selectedLead.stage === 'LOST' && <option value="LOST" disabled>Lost (use Mark as Lost button)</option>}
                  </select>
                </div>
              </div>
            </div>

            {/* Assignment Info */}
            <div className="space-y-3">
              <h3 className="font-semibold border-b pb-2">Assignment</h3>
              <div className="text-sm space-y-2">
                <div className="text-muted-foreground text-xs uppercase tracking-wider">Assigned To</div>
                {isEditMode ? (
                  <select
                    className="w-full p-1.5 border rounded text-sm bg-background"
                    value={editForm.assignedToId ?? selectedLead.assignedToId ?? ""}
                    onChange={e => setEditForm((f: any) => ({ ...f, assignedToId: e.target.value || null }))}
                  >
                    <option value="">Unassigned</option>
                    {staff.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role.replace('_', ' ')})</option>
                    ))}
                  </select>
                ) : (
                  <select
                    className="w-full p-2 border rounded-md text-sm bg-background text-foreground"
                    value={selectedLead.assignedToId || ""}
                    onChange={async (e) => {
                      const val = e.target.value || null;
                      await fetch(`/api/leads/${selectedLead.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ assignedToId: val }),
                      });
                      const res = await fetch(`/api/leads/${selectedLead.id}`);
                      const json = await res.json();
                      if (json.data) setSelectedLead(json.data);
                      fetchLeads();
                    }}
                  >
                    <option value="">Unassigned</option>
                    {staff.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role.replace('_', ' ')})</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <h3 className="font-semibold border-b pb-2">Notes</h3>
              {isEditMode ? (
                <textarea
                  rows={4}
                  className="w-full p-2 border rounded-md text-sm bg-background"
                  value={editForm.notes ?? selectedLead.notes ?? ""}
                  onChange={e => setEditForm((f: any) => ({ ...f, notes: e.target.value }))}
                />
              ) : selectedLead.notes ? (
                <div className="p-3 bg-muted/30 border rounded-md text-sm whitespace-pre-wrap">
                  {selectedLead.notes}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic">No notes added.</div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-6 mt-6 border-t flex flex-col gap-3">
              {isEditMode ? (
                <button
                  onClick={handleEditSave}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-colors"
                >
                  Save Changes
                </button>
              ) : (
                <>
                  {selectedLead.stage !== "CONVERTED" && (
                    <button
                      onClick={() => setIsConvertOpen(true)}
                      className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
                    >
                      Convert to Client
                    </button>
                  )}
                  {selectedLead.stage !== "LOST" && selectedLead.stage !== "CONVERTED" && (
                    <button
                      onClick={() => handleUpdateStage("LOST")}
                      className="w-full py-2.5 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-md text-sm font-medium transition-colors"
                    >
                      Mark as Lost
                    </button>
                  )}
                  <button
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="w-full py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-md text-sm font-medium transition-colors mt-4"
                  >
                    Delete Lead
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </SlideOver>

      {/* Convert to Client Modal */}
      <Modal
        open={isConvertOpen}
        onClose={() => setIsConvertOpen(false)}
        title="Convert to Client"
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <button type="button" onClick={() => setIsConvertOpen(false)} className="px-4 py-2 border rounded-md text-sm font-medium">Cancel</button>
            <button form="convert-form" type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium">Convert & Create Client</button>
          </div>
        }
      >
        {selectedLead && (
          <form id="convert-form" onSubmit={handleConvertClient} className="space-y-4">
            <div className="bg-muted/30 p-4 rounded-lg mb-6 border">
              <p className="text-sm text-muted-foreground mb-1">Converting Lead:</p>
              <p className="font-semibold">{selectedLead.businessName}</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Business Name <span className="text-red-500">*</span></label>
              <input name="businessName" defaultValue={selectedLead.businessName} required className="w-full p-2 border rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Legal Name</label>
              <input name="legalName" defaultValue={selectedLead.legalName} className="w-full p-2 border rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Business Entity <span className="text-red-500">*</span></label>
              <select name="businessEntity" defaultValue={selectedLead.businessEntity} required className="w-full p-2 border rounded-md text-sm">
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
                <input name="contactName" defaultValue={selectedLead.contactName} className="w-full p-2 border rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mobile</label>
                <input type="tel" name="mobile" defaultValue={selectedLead.contactPhone} className="w-full p-2 border rounded-md text-sm" />
              </div>
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
          </form>
        )}
      </Modal>

      <ConfirmByTyping
        open={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteLead}
        title="Delete Lead"
        description={`Permanently delete "${selectedLead?.businessName}"? All lead data will be lost.`}
        confirmName={session?.user?.name || "Admin"}
        actionLabel="Yes, Delete Lead"
      />

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#1b4d3e] text-white py-3 px-6 rounded-full shadow-2xl z-50 flex items-center gap-6 border border-emerald-800 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="text-sm font-semibold">
            {selectedIds.size} {selectedIds.size === 1 ? "lead" : "leads"} selected
          </span>
          <div className="h-4 w-px bg-emerald-700/60" />
          <div className="flex items-center gap-4">
            {/* Bulk Assign */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-300 font-medium">Assign:</span>
              <select
                className="bg-emerald-900 border border-emerald-700 text-xs rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white"
                onChange={async (e) => {
                  const val = e.target.value;
                  if (!val) return;
                  const res = await fetch("/api/leads/bulk", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      ids: Array.from(selectedIds),
                      data: { assignedToId: val === "unassigned" ? null : val }
                    })
                  });
                  if (res.ok) {
                    setSelectedIds(new Set());
                    fetchLeads();
                  }
                  e.target.value = ""; // reset
                }}
              >
                <option value="">Choose Staff...</option>
                <option value="unassigned">Unassigned</option>
                {staff.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Bulk Stage */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-300 font-medium">Stage:</span>
              <select
                className="bg-emerald-900 border border-emerald-700 text-xs rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white"
                onChange={async (e) => {
                  const val = e.target.value;
                  if (!val) return;
                  const res = await fetch("/api/leads/bulk", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      ids: Array.from(selectedIds),
                      data: { stage: val }
                    })
                  });
                  if (res.ok) {
                    setSelectedIds(new Set());
                    fetchLeads();
                  }
                  e.target.value = ""; // reset
                }}
              >
                <option value="">Move to...</option>
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="CONVERTED">Converted</option>
                <option value="LOST">Lost</option>
              </select>
            </div>

            <div className="h-4 w-px bg-emerald-700/60" />

            {/* Bulk Delete */}
            <button
              className="text-xs font-bold text-red-300 hover:text-red-200 transition-colors py-1 px-2 hover:bg-red-950/40 rounded-md"
              onClick={async () => {
                if (confirm(`Are you sure you want to delete ${selectedIds.size} selected leads?`)) {
                  const res = await fetch("/api/leads/bulk", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: Array.from(selectedIds) })
                  });
                  if (res.ok) {
                    setSelectedIds(new Set());
                    fetchLeads();
                  }
                }
              }}
            >
              Delete
            </button>
             <button
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              onClick={() => setSelectedIds(new Set())}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Lead Pipeline Config SlideOver */}
      <SlideOver
        open={isPipelineConfigOpen}
        onClose={() => setIsPipelineConfigOpen(false)}
        title="Lead Pipeline Configuration"
      >
        <div className="space-y-6 pt-4">
          <div className="text-xs text-muted-foreground">
            Configure custom operational lead source metrics and pipeline status stages. Settings are persisted in your local vault space.
          </div>

          {/* Sources Section */}
          <div className="space-y-3 bg-muted/20 p-4 border rounded-xl">
            <div className="text-xs font-bold text-[#1b4d3e] uppercase tracking-wider">Custom Lead Sources</div>
            
            <div className="flex gap-2">
              <input
                value={newCustomSource}
                onChange={(e) => setNewCustomSource(e.target.value)}
                placeholder="e.g. Partner Reference"
                className="flex-1 p-2 border rounded text-xs bg-background"
              />
              <button
                onClick={() => {
                  if (!newCustomSource.trim()) return;
                  const updated = [...customSources, newCustomSource.trim()];
                  setCustomSources(updated);
                  localStorage.setItem("leads_custom_sources", JSON.stringify(updated));
                  setNewCustomSource("");
                }}
                className="px-3 py-2 bg-[#1b4d3e] text-white text-xs font-semibold rounded hover:bg-emerald-950 transition-colors"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-2">
              {customSources.map((src, i) => (
                <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-background border rounded-full text-xs font-medium text-[#1b4d3e]">
                  {src}
                  <button
                    onClick={() => {
                      const updated = customSources.filter((_, idx) => idx !== i);
                      setCustomSources(updated);
                      localStorage.setItem("leads_custom_sources", JSON.stringify(updated));
                    }}
                    className="text-red-500 font-bold hover:text-red-700 text-[10px]"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Stages Section */}
          <div className="space-y-3 bg-muted/20 p-4 border rounded-xl">
            <div className="text-xs font-bold text-[#1b4d3e] uppercase tracking-wider">Custom Pipeline Stages</div>
            
            <div className="flex gap-2">
              <input
                value={newCustomStage}
                onChange={(e) => setNewCustomStage(e.target.value.toUpperCase())}
                placeholder="e.g. DRAFTING"
                className="flex-1 p-2 border rounded text-xs bg-background uppercase font-mono"
              />
              <button
                onClick={() => {
                  if (!newCustomStage.trim()) return;
                  const updated = [...customStages, newCustomStage.trim().toUpperCase()];
                  setCustomStages(updated);
                  localStorage.setItem("leads_custom_stages", JSON.stringify(updated));
                  setNewCustomStage("");
                }}
                className="px-3 py-2 bg-[#1b4d3e] text-white text-xs font-semibold rounded hover:bg-emerald-950 transition-colors"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-2">
              {customStages.map((stage, i) => (
                <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-background border rounded-full text-xs font-mono font-bold text-[#1b4d3e]">
                  {stage}
                  <button
                    onClick={() => {
                      const updated = customStages.filter((_, idx) => idx !== i);
                      setCustomStages(updated);
                      localStorage.setItem("leads_custom_stages", JSON.stringify(updated));
                    }}
                    className="text-red-500 font-bold hover:text-red-700 text-[10px]"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </SlideOver>

    </div>
  );
}

