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
  MoreVertical, Filter, AlignJustify, Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function LeadsPage() {
  const { data: session } = useSession();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [leads, setLeads] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [activeStatCard, setActiveStatCard] = useState<string>("ALL");

  // Slide Over state
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // References for Convert Modal dropdowns
  const [staff, setStaff] = useState<any[]>([]);

  useEffect(() => {
    fetchLeads();
  }, [stageFilter, search, activeStatCard]);

  useEffect(() => {
    // Note: To fetch staff users
    // For now we will mock it or leave it as text fields if api doesn't exist
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/leads", window.location.origin);
      if (activeStatCard === "OPEN") {
        url.searchParams.set("stages", "NEW,CONTACTED,QUALIFIED");
      } else if (activeStatCard === "CONVERTED") {
        url.searchParams.set("stage", "CONVERTED");
      } else if (activeStatCard === "LOST") {
        url.searchParams.set("stage", "LOST");
      } else if (stageFilter !== "ALL") {
        url.searchParams.append("stage", stageFilter);
      }
      if (search) url.searchParams.append("search", search);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.data) {
        setLeads(json.data);
        setStats(json.stats || {});
        setSelectedIds(new Set());
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

  const calculateScoreColor = (score: number) => {
    if (score < 30) return "bg-red-100 text-red-700";
    if (score < 70) return "bg-orange-100 text-orange-700";
    return "bg-green-100 text-green-700";
  };

  const calculateScoreProgressColor = (score: number) => {
    if (score < 30) return "bg-red-500";
    if (score < 70) return "bg-orange-500";
    return "bg-green-500";
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
      header: "Lead Score",
      cell: (row) => (
        <div className="w-16" title="Lead Score: 0–100 qualification score. Red = cold, Orange = warm, Green = hot.">
          <div className={cn("inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-bold mb-1", calculateScoreColor(row.leadScore))}>
            {row.leadScore}
          </div>
          <div className="w-full bg-muted rounded-full h-1">
            <div
              className={cn("h-1 rounded-full", calculateScoreProgressColor(row.leadScore))}
              style={{ width: `${row.leadScore}%` }}
            />
          </div>
        </div>
      )
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
            className={cn("bg-gray-50 border rounded-xl p-4 flex items-center justify-between cursor-pointer", activeStatCard === "OPEN" ? "ring-2 ring-offset-1 ring-gray-900" : "")}
          >
            <div>
              <div className="text-3xl font-bold">{stats.open || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Open</div>
            </div>
            <Clock className="w-10 h-10 text-gray-300" />
          </div>
          <div
            onClick={() => setActiveStatCard("CONVERTED")}
            className={cn("bg-green-50 border border-green-100 rounded-xl p-4 flex items-center justify-between cursor-pointer", activeStatCard === "CONVERTED" ? "ring-2 ring-offset-1 ring-green-600" : "")}
          >
            <div>
              <div className="text-3xl font-bold text-green-700">{stats.converted || 0}</div>
              <div className="text-xs text-green-600/80 mt-1">Converted</div>
            </div>
            <CheckCircle className="w-10 h-10 text-green-200" />
          </div>
          <div
            onClick={() => setActiveStatCard("LOST")}
            className={cn("bg-red-50 border border-red-100 rounded-xl p-4 flex items-center justify-between cursor-pointer", activeStatCard === "LOST" ? "ring-2 ring-offset-1 ring-red-600" : "")}
          >
            <div>
              <div className="text-3xl font-bold text-red-700">{stats.lost || 0}</div>
              <div className="text-xs text-red-600/80 mt-1">Lost</div>
            </div>
            <UserX className="w-10 h-10 text-red-200" />
          </div>
          <div
            onClick={() => setActiveStatCard("ALL")}
            className={cn("bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between cursor-pointer", activeStatCard === "ALL" ? "ring-2 ring-offset-1 ring-blue-600" : "")}
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-lg font-bold">Leads ({leads.length})</h1>
        <div className="flex items-center gap-2">
          <SearchInput
            placeholder="Search..."
            value={search}
            onChange={setSearch}
            className="w-48 sm:w-64"
          />
          <button className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-muted text-sm font-medium transition-colors">
            <Filter className="w-4 h-4" /> Filters <span className="text-xs">▼</span>
          </button>
          <button className="p-2 border rounded-md hover:bg-muted transition-colors">
            <AlignJustify className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="relative">
            <button
              className="p-2 border rounded-md hover:bg-muted transition-colors"
              onClick={() => setIsMenuOpen(v => !v)}
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
                  >
                    <Plus className="w-4 h-4" /> Add Lead
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

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
        onClose={() => setIsDetailOpen(false)}
        title=""
      >
        {selectedLead && (
          <div className="space-y-6 pb-10">
            {/* Header */}
            <div>
              <h2 className="text-2xl font-bold mb-2">{selectedLead.businessName}</h2>
              <StatusBadge status={selectedLead.stage} />
            </div>

            {/* Lead Info */}
            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg border border-border/50">
              <div>
                <div className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Created On</div>
                <div className="font-medium">{format(new Date(selectedLead.createdAt), "MMM dd, yyyy")}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Source</div>
                <div className="font-medium">{selectedLead.source || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Entity Type</div>
                <div className="font-medium">{selectedLead.businessEntity || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Lead Score</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={selectedLead.leadScore}
                    className="w-20 p-1.5 border rounded-md text-sm text-center font-bold"
                    onBlur={async (e) => {
                      const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                      await fetch(`/api/leads/${selectedLead.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ leadScore: val }),
                      });
                      handleRowClick(selectedLead);
                      fetchLeads();
                    }}
                  />
                  <span className="text-xs text-muted-foreground">/ 100 — qualification score (0 = cold, 100 = hot)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                  <div
                    className={cn("h-1.5 rounded-full", calculateScoreProgressColor(selectedLead.leadScore))}
                    style={{ width: `${selectedLead.leadScore}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-3">
              <h3 className="font-semibold border-b pb-2">Contact Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">Person</div>
                  <div className="font-medium">{selectedLead.contactName || "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Phone</div>
                  <div className="font-medium">{selectedLead.contactPhone || "-"}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground mb-1">Email</div>
                  <div className="font-medium">{selectedLead.contactEmail || "-"}</div>
                </div>
              </div>
            </div>

            {/* Deal Info */}
            <div className="space-y-3">
              <h3 className="font-semibold border-b pb-2">Deal Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">Deal Value</div>
                  <div className="font-medium">{selectedLead.dealValue ? `₹${selectedLead.dealValue.toLocaleString()}` : "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Deal Type</div>
                  <div className="font-medium">{selectedLead.dealType || "-"}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground mb-1">Stage</div>
                  <select
                    className="w-full p-2 border rounded-md text-sm mt-1 bg-background"
                    value={selectedLead.stage}
                    onChange={(e) => handleUpdateStage(e.target.value)}
                    disabled={selectedLead.stage === 'CONVERTED' || selectedLead.stage === 'LOST'}
                  >
                    <option value="NEW">New</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="QUALIFIED">Qualified</option>
                    {/* Show current stage as read-only label if already terminal */}
                    {selectedLead.stage === 'CONVERTED' && <option value="CONVERTED" disabled>Converted (via Convert button)</option>}
                    {selectedLead.stage === 'LOST' && <option value="LOST" disabled>Lost (use Mark as Lost button)</option>}
                  </select>
                </div>
              </div>
            </div>

            {/* Assignment Info */}
            <div className="space-y-3">
              <h3 className="font-semibold border-b pb-2">Assignment</h3>
              <div className="text-sm">
                <div className="text-muted-foreground mb-1">Assigned To</div>
                <div className="font-medium flex items-center gap-2">
                  {selectedLead.assignedTo ? (
                    <>
                      <Avatar name={selectedLead.assignedTo.name} size="sm" />
                      {selectedLead.assignedTo.name}
                    </>
                  ) : "-"}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <h3 className="font-semibold border-b pb-2">Notes</h3>
              {selectedLead.notes ? (
                <div className="p-3 bg-muted/30 border rounded-md text-sm whitespace-pre-wrap">
                  {selectedLead.notes}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic">No notes added.</div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-6 mt-6 border-t flex flex-col gap-3">
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
    </div>
  );
}
