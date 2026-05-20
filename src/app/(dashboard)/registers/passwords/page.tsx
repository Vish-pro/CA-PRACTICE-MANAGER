"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Copy, Lock } from "lucide-react";
import { useState } from "react";

export default function PasswordManagerPage() {
  const [showPwdId, setShowPwdId] = useState<number | null>(null);

  const passwords = [
    { id: 1, client: "Acme Corp", portal: "GST Portal", username: "acme_gst_23" },
    { id: 2, client: "Acme Corp", portal: "Income Tax", username: "PAN1234567" },
    { id: 3, client: "TechFlow Inc", portal: "MCA", username: "techflow_mca" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Password Vault</h2>
          <p className="text-muted-foreground">Securely store and manage client portal credentials.</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> Add Credential</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {passwords.map(pwd => (
          <Card key={pwd.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center text-primary font-semibold">
                  <Lock className="w-5 h-5 mr-2" />
                  {pwd.portal}
                </div>
                <span className="bg-muted px-2 py-0.5 rounded text-xs">{pwd.client}</span>
              </div>

              <div className="space-y-3 mt-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase font-bold">Username / ID</label>
                  <div className="flex justify-between items-center bg-muted/30 p-2 rounded mt-1 border">
                    <span className="text-sm font-medium">{pwd.username}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6"><Copy className="w-3 h-3" /></Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase font-bold">Password</label>
                  <div className="flex justify-between items-center bg-muted/30 p-2 rounded mt-1 border">
                    <span className="text-sm font-mono tracking-widest">{showPwdId === pwd.id ? "StrongPwd123!" : "••••••••••••"}</span>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowPwdId(showPwdId === pwd.id ? null : pwd.id)}>
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6"><Copy className="w-3 h-3" /></Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}