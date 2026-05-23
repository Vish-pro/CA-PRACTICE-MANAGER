"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, AlertTriangle, Key, Loader2 } from "lucide-react";

type DSCData = {
  id: string;
  client: string;
  holder: string;
  expiry: string;
  location: string;
  status: string;
};

export default function DSCRegisterPage() {
  const [dscs, setDscs] = useState<DSCData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDSCs() {
      try {
        const response = await fetch('/api/registers/dsc');
        if (!response.ok) {
          throw new Error('Failed to fetch DSC register');
        }
        const data = await response.json();
        setDscs(data);
      } catch (error) {
        console.error('Error fetching DSCs:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDSCs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">DSC Register</h2>
          <p className="text-muted-foreground">Manage client Digital Signature Certificates and expiry alerts.</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> Add DSC</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-6 py-4 font-medium">Client</th>
                <th className="px-6 py-4 font-medium">Holder Name</th>
                <th className="px-6 py-4 font-medium">Expiry Date</th>
                <th className="px-6 py-4 font-medium">Physical Location</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading DSC register...
                  </td>
                </tr>
              ) : dscs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No DSCs found.
                  </td>
                </tr>
              ) : (
                dscs.map((dsc) => (
                <tr key={dsc.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-6 py-4 font-medium text-foreground">{dsc.client}</td>
                  <td className="px-6 py-4 flex items-center"><Key className="w-4 h-4 mr-2 text-muted-foreground" />{dsc.holder}</td>
                  <td className="px-6 py-4">{dsc.expiry}</td>
                  <td className="px-6 py-4">{dsc.location}</td>
                  <td className="px-6 py-4">
                    {dsc.status === 'ACTIVE' && <span className="bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full text-xs font-medium">Active</span>}
                    {dsc.status === 'EXPIRING_SOON' && <span className="bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center w-max"><AlertTriangle className="w-3 h-3 mr-1" /> Expiring Soon</span>}
                    {dsc.status === 'EXPIRED' && <span className="bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center w-max"><AlertTriangle className="w-3 h-3 mr-1" /> Expired</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="outline" size="sm">Renew</Button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}