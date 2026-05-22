"use client";

import { useState, useEffect } from "react";
import { SearchInput } from "@/components/ui/search-input";
import { CategoryPills } from "@/components/ui/category-pills";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { SlideOver } from "@/components/ui/slide-over";
import { Lock, MoreVertical, Plus, Trash2, Edit, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "All",
  "GST",
  "MCA",
  "TDS/TCS",
  "Income Tax",
  "Professional Tax",
  "PF",
  "ESI",
  "Advance Tax",
  "Manual"
];

const FREQUENCIES = [
  "ONE_TIME", "DAILY", "WEEKLY", "FORTNIGHTLY", "MONTHLY", "QUARTERLY", "ANNUAL"
];

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  // SlideOvers
  const [isServiceSlideOpen, setIsServiceSlideOpen] = useState(false);
  const [isSopSlideOpen, setIsSopSlideOpen] = useState(false);

  // Current active item for edit/sops
  const [currentService, setCurrentService] = useState<any | null>(null);

  // SOP State
  const [sops, setSops] = useState<any[]>([]);
  const [newSopTitle, setNewSopTitle] = useState("");
  const [newSopDesc, setNewSopDesc] = useState("");

  useEffect(() => {
    fetchServices();
  }, [category, search]);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/services", window.location.origin);
      if (category !== "All") url.searchParams.append("category", category);
      if (search) url.searchParams.append("search", search);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.data) {
        setServices(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch services", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const payload = {
      name: formData.get("name"),
      category: formData.get("category"),
      frequency: formData.get("frequency"),
      professionalFee: parseFloat(formData.get("fee") as string) || 0,
      description: formData.get("description"),
      isActive: formData.get("isActive") === "on",
      isLocked: formData.get("isLocked") === "on",
    };

    const url = currentService ? `/api/services/${currentService.id}` : "/api/services";
    const method = currentService ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsServiceSlideOpen(false);
    fetchServices();
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;
    await fetch(`/api/services/${id}`, { method: "DELETE" });
    fetchServices();
  };

  const handleToggleStatus = async (service: any) => {
    await fetch(`/api/services/${service.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !service.isActive }),
    });
    fetchServices();
  };

  // SOP Handlers
  const openSopManager = async (service: any) => {
    setCurrentService(service);
    setIsSopSlideOpen(true);
    const res = await fetch(`/api/services/${service.id}/sops`);
    const json = await res.json();
    if (json.data) setSops(json.data);
  };

  const handleAddSop = async () => {
    if (!newSopTitle) return;
    await fetch(`/api/services/${currentService.id}/sops`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newSopTitle, description: newSopDesc })
    });
    setNewSopTitle("");
    setNewSopDesc("");
    const res = await fetch(`/api/services/${currentService.id}/sops`);
    const json = await res.json();
    if (json.data) setSops(json.data);
    fetchServices(); // refresh hasSop
  };

  const handleDeleteSop = async (sopId: string) => {
    await fetch(`/api/services/${currentService.id}/sops/${sopId}`, { method: "DELETE" });
    const res = await fetch(`/api/services/${currentService.id}/sops`);
    const json = await res.json();
    if (json.data) setSops(json.data);
    fetchServices(); // refresh hasSop
  };

  const columns: ColumnDef<any>[] = [
    {
      header: "Service",
      accessorKey: "name",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.name} size="sm" />
          <span className="font-medium">{row.name}</span>
          {row.isLocked && <Lock className="w-3 h-3 text-muted-foreground" />}
        </div>
      )
    },
    { header: "Category", accessorKey: "category" },
    {
      header: "Frequency",
      accessorKey: "frequency",
      cell: (row) => row.frequency === "ONE_TIME" ? "-" : row.frequency.charAt(0) + row.frequency.slice(1).toLowerCase()
    },
    {
      header: "Professional Fee",
      accessorKey: "professionalFee",
      cell: (row) => row.professionalFee > 0 ? `₹${row.professionalFee.toLocaleString()}` : "-"
    },
    {
      header: "SOP",
      accessorKey: "hasSOP",
      cell: (row) => (
        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", row.hasSOP ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
          {row.hasSOP ? "Yes" : "No"}
        </span>
      )
    },
    {
      header: "Sub Tasks",
      accessorKey: "hasSubtasks",
      cell: (row) => (
        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", row.hasSubtasks ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
          {row.hasSubtasks ? "Yes" : "No"}
        </span>
      )
    },
    {
      header: "Status",
      accessorKey: "isActive",
      cell: (row) => <StatusBadge status={row.isActive ? "Active" : "Inactive"} />
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="relative group">
            <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
            <div className="absolute right-0 mt-1 hidden group-hover:block w-40 bg-popover border shadow-lg rounded-md z-50">
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                onClick={() => { setCurrentService(row); setIsServiceSlideOpen(true); }}
              >
                Edit
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                onClick={() => openSopManager(row)}
              >
                Manage SOPs
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                onClick={() => handleToggleStatus(row)}
              >
                Toggle Status
              </button>
              {!row.isLocked && (
                <button
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  onClick={() => handleDeleteService(row.id)}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Services ({services.length})</h1>
        <div className="flex items-center gap-2">
          <SearchInput
            placeholder="Search services..."
            value={search}
            onChange={setSearch}
            className="w-64"
          />
          <div className="relative group">
            <button className="p-2 border rounded-md hover:bg-muted text-muted-foreground transition-colors flex items-center gap-1">
              <MoreVertical className="w-5 h-5" />
            </button>
            <div className="absolute right-0 mt-1 hidden group-hover:block w-40 bg-popover border shadow-lg rounded-md z-50">
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                onClick={() => { setCurrentService(null); setIsServiceSlideOpen(true); }}
              >
                <Plus className="w-4 h-4" /> Add Service
              </button>
              <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted">Import</button>
              <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted">Export CSV</button>
            </div>
          </div>
        </div>
      </div>

      <CategoryPills
        categories={CATEGORIES}
        active={category}
        onChange={setCategory}
      />

      <DataTable
        columns={columns}
        data={services}
        keyExtractor={(row) => row.id}
        selectable
      />

      {/* Add / Edit Service Slide-over */}
      <SlideOver
        open={isServiceSlideOpen}
        onClose={() => setIsServiceSlideOpen(false)}
        title={currentService ? "Edit Service" : "Add Service"}
      >
        <form id="service-form" onSubmit={handleSaveService} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Service Name</label>
            <input
              name="name"
              required
              defaultValue={currentService?.name}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              name="category"
              defaultValue={currentService?.category || "GST"}
              className="w-full p-2 border rounded-md"
            >
              {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Frequency</label>
            <select
              name="frequency"
              defaultValue={currentService?.frequency || "ONE_TIME"}
              className="w-full p-2 border rounded-md"
            >
              {FREQUENCIES.map(f => (
                <option key={f} value={f}>
                  {f === "ONE_TIME" ? "One-time" : f.charAt(0) + f.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Professional Fee (₹)</label>
            <input
              type="number"
              name="fee"
              defaultValue={currentService?.professionalFee}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              name="description"
              defaultValue={currentService?.description}
              className="w-full p-2 border rounded-md"
              rows={3}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isActive"
              id="isActive"
              defaultChecked={currentService ? currentService.isActive : true}
              className="rounded"
            />
            <label htmlFor="isActive" className="text-sm">Active</label>
          </div>
          {/* Note: In real app, hide this if not ADMIN */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isLocked"
              id="isLocked"
              defaultChecked={currentService?.isLocked}
              className="rounded"
            />
            <label htmlFor="isLocked" className="text-sm">Mark as Locked (System Default)</label>
          </div>
        </form>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsServiceSlideOpen(false)}
            className="px-4 py-2 border rounded-md"
          >
            Cancel
          </button>
          <button
            form="service-form"
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Save Service
          </button>
        </div>
      </SlideOver>

      {/* Manage SOPs Slide-over */}
      <SlideOver
        open={isSopSlideOpen}
        onClose={() => setIsSopSlideOpen(false)}
        title={`SOP Checklist — ${currentService?.name}`}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            {sops.map((sop, idx) => (
              <div key={sop.id} className="flex items-start gap-3 p-3 border rounded-lg bg-card">
                <GripVertical className="w-5 h-5 text-muted-foreground mt-0.5 cursor-grab shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">{idx + 1}.</span>
                    <span className="font-semibold">{sop.title}</span>
                  </div>
                  {sop.description && (
                    <p className="text-sm text-muted-foreground mt-1 ml-5">{sop.description}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button className="p-1.5 text-muted-foreground hover:bg-muted rounded">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSop(sop.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {sops.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">No SOP steps found.</p>
            )}
          </div>

          <div className="pt-4 border-t mt-6">
            <h4 className="font-medium mb-3">Add New Step</h4>
            <div className="space-y-3">
              <input
                value={newSopTitle}
                onChange={(e) => setNewSopTitle(e.target.value)}
                placeholder="Step Title"
                className="w-full p-2 border rounded-md text-sm"
              />
              <textarea
                value={newSopDesc}
                onChange={(e) => setNewSopDesc(e.target.value)}
                placeholder="Step Description (optional)"
                className="w-full p-2 border rounded-md text-sm"
                rows={2}
              />
              <button
                onClick={handleAddSop}
                disabled={!newSopTitle}
                className="w-full py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50"
              >
                Add Step
              </button>
            </div>
          </div>
        </div>
      </SlideOver>
    </div>
  );
}
