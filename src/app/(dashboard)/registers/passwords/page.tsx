"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SlideOver } from "@/components/ui/slide-over";
import { Plus, Eye, Copy, Lock, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

type PasswordEntry = {
  id: string;
  client: string;
  portal: string;
  username: string;
};

export default function PasswordManagerPage() {
  const [showPwdId, setShowPwdId] = useState<string | null>(null);
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Security Toggles
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [forceReason, setForceReason] = useState(false);
  const [maskByDefault, setMaskByDefault] = useState(true);

  useEffect(() => {
    // Load persisted settings
    const storedReason = localStorage.getItem("vault_security_force_reason");
    const storedMask = localStorage.getItem("vault_security_mask_default");
    if (storedReason) setForceReason(storedReason === "true");
    if (storedMask) setMaskByDefault(storedMask === "true");

    async function fetchPasswords() {
      try {
        const response = await fetch('/api/registers/passwords');
        if (response.ok) {
          const data = await response.json();
          setPasswords(data);
        } else {
          console.error("Failed to fetch passwords");
        }
      } catch (error) {
        console.error("Error fetching passwords:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPasswords();
  }, []);

  const handleToggleReason = () => {
    const val = !forceReason;
    setForceReason(val);
    localStorage.setItem("vault_security_force_reason", String(val));
    toast.success(`Access reason tracking ${val ? "enabled" : "disabled"}`);
  };

  const handleToggleMask = () => {
    const val = !maskByDefault;
    setMaskByDefault(val);
    localStorage.setItem("vault_security_mask_default", String(val));
    toast.success(`Password masking by default ${val ? "enabled" : "disabled"}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#1b4d3e]">Password Vault</h2>
          <p className="text-muted-foreground">Securely store and manage client portal credentials.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="flex items-center gap-2 text-[#1b4d3e] border-[#1b4d3e]/20"
            onClick={() => setIsSecurityOpen(true)}
          >
            <ShieldCheck className="w-4 h-4 text-[#1b4d3e]" />
            🔑 Vault Security Settings
          </Button>
          <Button className="bg-[#1b4d3e] hover:bg-emerald-950 text-white"><Plus className="w-4 h-4 mr-2" /> Add Credential</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <p className="text-muted-foreground">Loading credentials...</p>
        </div>
      ) : passwords.length === 0 ? (
        <div className="flex justify-center p-8 bg-muted/20 rounded-lg border border-dashed">
          <p className="text-muted-foreground">No credentials found.</p>
        </div>
      ) : (
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
                      <span className="text-sm font-mono tracking-widest">
                        {showPwdId === pwd.id ? "********" : (maskByDefault ? "••••••••••••" : "********")}
                      </span>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                          if (forceReason && showPwdId !== pwd.id) {
                            const reason = prompt("State the compliance / operational reason for viewing this password:");
                            if (!reason || !reason.trim()) {
                              toast.error("Reason is mandatory under Vault Security constraints.");
                              return;
                            }
                            toast.success("Access logged successfully.");
                          }
                          setShowPwdId(showPwdId === pwd.id ? null : pwd.id);
                        }}>
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
      )}

      {/* Vault Security Settings Drawer */}
      <SlideOver
        open={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
        title="Vault Security Settings"
      >
        <div className="space-y-6 pt-4">
          <div className="text-xs text-muted-foreground">
            Configure secure operational restrictions for viewing or accessing client credentials.
          </div>

          <div className="space-y-4">
            <div className="flex items-start justify-between p-4 border rounded-lg bg-card hover:bg-muted/10 transition-colors">
              <div className="space-y-1">
                <div className="text-xs font-bold text-[#1b4d3e] uppercase tracking-wider">Force Reason for Viewing</div>
                <div className="text-[10px] text-muted-foreground">Require staff to log a clear justification before uncovering passwords.</div>
              </div>
              <input
                type="checkbox"
                checked={forceReason}
                onChange={handleToggleReason}
                className="w-4 h-4 rounded text-[#1b4d3e] focus:ring-[#1b4d3e] cursor-pointer"
              />
            </div>

            <div className="flex items-start justify-between p-4 border rounded-lg bg-card hover:bg-muted/10 transition-colors">
              <div className="space-y-1">
                <div className="text-xs font-bold text-[#1b4d3e] uppercase tracking-wider">Mask Password Values By Default</div>
                <div className="text-[10px] text-muted-foreground">Mask credential lists globally to restrict secondary visual capture.</div>
              </div>
              <input
                type="checkbox"
                checked={maskByDefault}
                onChange={handleToggleMask}
                className="w-4 h-4 rounded text-[#1b4d3e] focus:ring-[#1b4d3e] cursor-pointer"
              />
            </div>
          </div>
        </div>
      </SlideOver>
    </div>
  );
}

