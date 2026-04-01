"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

function CorrigoConfigModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [apiUrl, setApiUrl] = useState(
    "https://am-apiconnect.corrigo.com/api/v5.4.1"
  )
  const [companyId, setCompanyId] = useState("")
  const [clientIdOAuth, setClientIdOAuth] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [webhookSecret, setWebhookSecret] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle")
  const [fieldMappings, setFieldMappings] = useState<
    { corrigoField: string; platformField: string; direction: string }[]
  >([
    { corrigoField: "", platformField: "", direction: "both" },
  ])

  const handleTestConnection = async () => {
    setTestStatus("testing")
    try {
      const res = await fetch("/api/v1/integrations/corrigo/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiUrl, companyId, clientIdOAuth, clientSecret }),
      })
      if (res.ok) {
        setTestStatus("success")
      } else {
        setTestStatus("error")
      }
    } catch {
      setTestStatus("error")
    }
    setTimeout(() => setTestStatus("idle"), 3000)
  }

  const handleSave = async () => {
    try {
      await fetch("/api/v1/integrations/corrigo/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiUrl,
          companyId,
          clientIdOAuth,
          clientSecret,
          webhookSecret,
          isActive,
          fieldMappings: fieldMappings.filter(
            (m) => m.corrigoField && m.platformField
          ),
        }),
      })
      onClose()
    } catch {
      // Handle save error
    }
  }

  const addFieldMapping = () => {
    setFieldMappings([
      ...fieldMappings,
      { corrigoField: "", platformField: "", direction: "both" },
    ])
  }

  const removeFieldMapping = (index: number) => {
    setFieldMappings(fieldMappings.filter((_, i) => i !== index))
  }

  const updateFieldMapping = (
    index: number,
    field: string,
    value: string
  ) => {
    const updated = [...fieldMappings]
    updated[index] = { ...updated[index], [field]: value }
    setFieldMappings(updated)
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-2xl max-h-[85vh] overflow-y-auto"
        onClose={onClose}
      >
        <DialogHeader>
          <DialogTitle>Configure CorrigoPro Integration</DialogTitle>
          <DialogDescription>
            Connect your CorrigoPro account to sync work orders bidirectionally.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Enable / Disable */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Enable Integration</Label>
              <p className="text-xs text-muted-foreground">
                Toggle the Corrigo integration on or off
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <Separator />

          {/* Connection Settings */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Connection Settings</h4>
            <div>
              <Label className="text-xs">API URL</Label>
              <Input
                value={apiUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setApiUrl(e.target.value)
                }
                placeholder="https://am-apiconnect.corrigo.com/api/v5.4.1"
              />
            </div>
            <div>
              <Label className="text-xs">Company ID</Label>
              <Input
                value={companyId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCompanyId(e.target.value)
                }
                placeholder="Your Corrigo Company ID"
              />
            </div>
          </div>

          <Separator />

          {/* OAuth Credentials */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">OAuth Credentials</h4>
            <div>
              <Label className="text-xs">Client ID</Label>
              <Input
                value={clientIdOAuth}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setClientIdOAuth(e.target.value)
                }
                placeholder="OAuth Client ID"
              />
            </div>
            <div>
              <Label className="text-xs">Client Secret</Label>
              <Input
                type="password"
                value={clientSecret}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setClientSecret(e.target.value)
                }
                placeholder="••••••••••••"
              />
            </div>
            <div>
              <Label className="text-xs">Webhook Secret (HMAC)</Label>
              <Input
                type="password"
                value={webhookSecret}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setWebhookSecret(e.target.value)
                }
                placeholder="••••••••••••"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Used to verify inbound webhook signatures from Corrigo
              </p>
            </div>
          </div>

          <Separator />

          {/* Field Mappings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Field Mappings</h4>
              <Button size="sm" variant="outline" onClick={addFieldMapping}>
                Add Mapping
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Map Corrigo custom fields to platform fields for automatic data
              sync.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="px-2 py-1.5">Corrigo Field</th>
                  <th className="px-2 py-1.5">Platform Field</th>
                  <th className="px-2 py-1.5">Direction</th>
                  <th className="px-2 py-1.5 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {fieldMappings.map((mapping, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="px-1 py-1">
                      <Input
                        value={mapping.corrigoField}
                        onChange={(
                          e: React.ChangeEvent<HTMLInputElement>
                        ) =>
                          updateFieldMapping(
                            idx,
                            "corrigoField",
                            e.target.value
                          )
                        }
                        placeholder="e.g. CustomField1"
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <Input
                        value={mapping.platformField}
                        onChange={(
                          e: React.ChangeEvent<HTMLInputElement>
                        ) =>
                          updateFieldMapping(
                            idx,
                            "platformField",
                            e.target.value
                          )
                        }
                        placeholder="e.g. costCenter"
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <select
                        value={mapping.direction}
                        onChange={(e) =>
                          updateFieldMapping(
                            idx,
                            "direction",
                            e.target.value
                          )
                        }
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value="both">Both</option>
                        <option value="inbound">Inbound</option>
                        <option value="outbound">Outbound</option>
                      </select>
                    </td>
                    <td className="px-1 py-1">
                      <button
                        onClick={() => removeFieldMapping(idx)}
                        className="text-muted-foreground hover:text-destructive text-xs"
                      >
                        X
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Separator />

          {/* Test Connection */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={
                testStatus === "testing" || !companyId || !clientIdOAuth
              }
            >
              {testStatus === "testing"
                ? "Testing..."
                : testStatus === "success"
                  ? "Connected"
                  : testStatus === "error"
                    ? "Failed"
                    : "Test Connection"}
            </Button>
            {testStatus === "success" && (
              <span className="text-xs text-green-600">
                Connection successful
              </span>
            )}
            {testStatus === "error" && (
              <span className="text-xs text-red-600">
                Connection failed. Check credentials.
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Configuration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function IntegrationsTab() {
  const [corrigoModalOpen, setCorrigoModalOpen] = useState(false)

  // In a real implementation these would come from an API call
  const corrigoStatus = {
    connected: false,
    lastSync: null as string | null,
    isActive: false,
  }

  return (
    <>
      <div className="space-y-4">
        {/* Corrigo Integration Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-base">CorrigoPro</CardTitle>
              <p className="text-xs text-muted-foreground">
                Bidirectional work order sync with CorrigoPro CMMS
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`flex items-center gap-1.5 text-xs ${corrigoStatus.connected ? "text-green-600" : "text-muted-foreground"}`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${corrigoStatus.connected ? "bg-green-500" : "bg-gray-300"}`}
                />
                {corrigoStatus.connected ? "Connected" : "Not Connected"}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {corrigoStatus.lastSync
                  ? `Last synced: ${corrigoStatus.lastSync}`
                  : "No sync history"}
              </div>
              <Button
                size="sm"
                onClick={() => setCorrigoModalOpen(true)}
              >
                Configure
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Placeholder for future integrations */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">
              More Integrations Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              ServiceNow, CBRE Nexus, and Cushman &amp; Wakefield integrations
              are planned for future releases.
            </p>
          </CardContent>
        </Card>
      </div>

      <CorrigoConfigModal
        open={corrigoModalOpen}
        onClose={() => setCorrigoModalOpen(false)}
      />
    </>
  )
}

export default function SettingsPage() {
  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Platform configuration and management</p>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Client Config</TabsTrigger>
          <TabsTrigger value="labels">Labels</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <Card>
            <CardHeader><CardTitle className="text-base">Feature Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { id: "requests", label: "Enable Requests", desc: "Allow users to create work order requests", checked: true },
                { id: "categories", label: "Show Request Categories", desc: "Display sub-categories for request types", checked: true },
                { id: "billing", label: "Enable Billing Fields", desc: "Show billing information on work orders", checked: true },
                { id: "notifications", label: "Enable Notifications", desc: "Send email notifications on status changes", checked: true },
                { id: "budget", label: "Enable Budget Tracking", desc: "Track budgets and cost allocations", checked: false },
                { id: "approval", label: "Require Approval", desc: "Work orders require approval before processing", checked: true },
                { id: "pictures", label: "Show Pictures", desc: "Display asset photos in inventory grid", checked: true },
                { id: "tagNumbers", label: "Use Tag Numbers", desc: "Display tag numbers as primary identifier", checked: true },
                { id: "zeroQty", label: "Show Zero Quantities", desc: "Include items with zero quantity in listings", checked: true },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">{item.label}</Label>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked={item.checked} className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              ))}

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Rows Per Page</Label>
                  <Input type="number" defaultValue={100} min={10} max={500} />
                </div>
                <div>
                  <Label className="text-xs">Image Size (px)</Label>
                  <Input type="number" defaultValue={35} min={20} max={100} />
                </div>
              </div>

              <Button>Save Configuration</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labels">
          <Card>
            <CardHeader><CardTitle className="text-base">Label Customization</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                Override default field labels for this client. Leave blank to use the default.
              </p>
              {[
                { field: "poNumber", default: "PO Number" },
                { field: "costCenter", default: "Cost Center" },
                { field: "department", default: "Department" },
                { field: "glCode", default: "GL Code" },
                { field: "chargeBack", default: "Charge Back #" },
                { field: "workOrderRef", default: "Work Order #" },
                { field: "tagNumber", default: "Tag Number" },
                { field: "description", default: "Description" },
              ].map((item) => (
                <div key={item.field} className="grid grid-cols-3 gap-4 items-center">
                  <Label className="text-xs text-muted-foreground">{item.field}</Label>
                  <Input defaultValue={item.default} className="col-span-2" />
                </div>
              ))}
              <Button>Save Labels</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsTab />
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">User Management</CardTitle>
              <Button size="sm">Invite User</Button>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Status</th>
                </tr></thead>
                <tbody>
                  {[
                    { name: "Max Schmitz", email: "max@corovan.com", role: "ORG_ADMIN", active: true },
                    { name: "Winnie Pham", email: "winnie.pham@cushwake.com", role: "FM_USER", active: true },
                    { name: "Matt McKinley", email: "matt.mckinley@cushwake.com", role: "CLIENT_ADMIN", active: true },
                  ].map((u) => (
                    <tr key={u.email} className="border-b">
                      <td className="px-4 py-2 font-medium">{u.name}</td>
                      <td className="px-4 py-2">{u.email}</td>
                      <td className="px-4 py-2"><span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{u.role.replace(/_/g, " ")}</span></td>
                      <td className="px-4 py-2"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500" />Active</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about">
          <Card>
            <CardHeader><CardTitle className="text-base">About</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Platform</span><span className="font-medium">Corovan Asset Platform</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Version</span><span className="font-medium">1.0.0</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Operator</span><span className="font-medium">Corovan Moving & Storage</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Database</span><span className="font-medium">PostgreSQL 16</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Framework</span><span className="font-medium">Next.js 16 + tRPC</span></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
