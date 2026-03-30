"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

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
                  ].map((u, i) => (
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
