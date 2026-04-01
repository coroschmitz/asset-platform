"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { format, differenceInDays } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  FolderKanban,
  Plus,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  Milestone,
  Truck,
} from "lucide-react"

interface Project {
  id: string
  name: string
  projectNumber: string
  description: string | null
  projectType: string
  status: string
  startDate: string | null
  targetDate: string | null
  completedDate: string | null
  budget: number | null
  actualCost: number | null
  totalItems: number
  receivedItems: number
  installedItems: number
  generalContractor: string | null
  projectManager: string | null
  client: { name: string; fullName: string }
  location: { name: string; code: string; city: string; state: string } | null
  _count: { milestones: number; deliveries: number; workOrders: number }
  receivedPercent: number
  installedPercent: number
  budgetPercent: number
}

const MOCK_PROJECTS: Project[] = [
  {
    id: "mock-p1", name: "AAA Costa Mesa HQ Renovation", projectNumber: "PRJ-2026-001",
    description: "Complete floor 3 renovation with new furniture installation", projectType: "FF&E_INSTALLATION",
    status: "IN_PROGRESS", startDate: "2026-03-01T00:00:00Z", targetDate: "2026-05-15T00:00:00Z",
    completedDate: null, budget: 450000, actualCost: 187500, totalItems: 840, receivedItems: 520,
    installedItems: 310, generalContractor: "Turner Construction", projectManager: "Matt McKinley",
    client: { name: "AAA", fullName: "Automobile Club of Southern California" },
    location: { name: "Costa Mesa Administrative Office", code: "AOCM", city: "Costa Mesa", state: "CA" },
    _count: { milestones: 7, deliveries: 3, workOrders: 4 },
    receivedPercent: 61.9, installedPercent: 36.9, budgetPercent: 41.7,
  },
  {
    id: "mock-p2", name: "LA HQ Floor 5 Refresh", projectNumber: "PRJ-2026-002",
    description: "Open-plan conversion with sit-stand desks and collaboration zones", projectType: "RENOVATION",
    status: "PROCUREMENT", startDate: "2026-04-15T00:00:00Z", targetDate: "2026-07-30T00:00:00Z",
    completedDate: null, budget: 320000, actualCost: 24000, totalItems: 560, receivedItems: 0,
    installedItems: 0, generalContractor: "Skanska USA", projectManager: "Matt McKinley",
    client: { name: "AAA", fullName: "Automobile Club of Southern California" },
    location: { name: "Los Angeles Headquarters", code: "LAHQ", city: "Los Angeles", state: "CA" },
    _count: { milestones: 5, deliveries: 0, workOrders: 1 },
    receivedPercent: 0, installedPercent: 0, budgetPercent: 7.5,
  },
  {
    id: "mock-p3", name: "Coppell TX Office Move", projectNumber: "PRJ-2026-003",
    description: "Full office relocation from legacy building to new facility with decommission", projectType: "OFFICE_MOVE",
    status: "PLANNING", startDate: "2026-06-01T00:00:00Z", targetDate: "2026-08-15T00:00:00Z",
    completedDate: null, budget: 185000, actualCost: 0, totalItems: 420, receivedItems: 0,
    installedItems: 0, generalContractor: null, projectManager: "Matt McKinley",
    client: { name: "AAA", fullName: "Automobile Club of Southern California" },
    location: { name: "Coppell Regional Office", code: "CPTX", city: "Coppell", state: "TX" },
    _count: { milestones: 4, deliveries: 0, workOrders: 0 },
    receivedPercent: 0, installedPercent: 0, budgetPercent: 0,
  },
  {
    id: "mock-p4", name: "Phoenix Branch Furniture Replacement", projectNumber: "PRJ-2025-018",
    description: "Replace aging workstations with modern ergonomic furniture across 2 floors", projectType: "FF&E_INSTALLATION",
    status: "COMPLETE", startDate: "2025-11-01T00:00:00Z", targetDate: "2026-01-31T00:00:00Z",
    completedDate: "2026-01-28T00:00:00Z", budget: 95000, actualCost: 91200, totalItems: 180, receivedItems: 180,
    installedItems: 180, generalContractor: "Desert Moving & Storage", projectManager: "Matt McKinley",
    client: { name: "AAA", fullName: "Automobile Club of Southern California" },
    location: { name: "Phoenix Branch Office", code: "BR095", city: "Phoenix", state: "AZ" },
    _count: { milestones: 3, deliveries: 2, workOrders: 3 },
    receivedPercent: 100, installedPercent: 100, budgetPercent: 96.0,
  },
]

const STATUS_COLORS: Record<string, string> = {
  PLANNING: "bg-gray-100 text-gray-700",
  PROCUREMENT: "bg-blue-100 text-blue-700",
  RECEIVING: "bg-indigo-100 text-indigo-700",
  STAGING: "bg-purple-100 text-purple-700",
  IN_PROGRESS: "bg-orange-100 text-orange-700",
  PUNCH_LIST: "bg-yellow-100 text-yellow-700",
  COMPLETE: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-200 text-gray-600",
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch("/api/v1/projects")
        const json = await res.json()
        if (json.success && json.data.length > 0) {
          setProjects(json.data)
        } else {
          setProjects(MOCK_PROJECTS)
        }
      } catch {
        setProjects(MOCK_PROJECTS)
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Project Management</h1>
          <p className="text-sm text-muted-foreground">FF&E installations, renovations, and move projects</p>
        </div>
        <Button className="bg-[#ea580c] hover:bg-[#c2410c]" disabled>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FolderKanban className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No projects yet</p>
            <p className="text-sm">Create your first project to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projects.map((project) => {
            const now = new Date()
            const target = project.targetDate ? new Date(project.targetDate) : null
            const daysRemaining = target ? differenceInDays(target, now) : null

            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="pt-4 pb-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{project.name}</h3>
                        <p className="text-xs text-muted-foreground font-mono">{project.projectNumber}</p>
                      </div>
                      <Badge className={cn("text-xs", STATUS_COLORS[project.status] || "bg-gray-100 text-gray-700")}>
                        {project.status.replace(/_/g, " ")}
                      </Badge>
                    </div>

                    {/* Progress Bars */}
                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-0.5">
                          <span className="text-muted-foreground">Received</span>
                          <span className="font-medium">{project.receivedItems}/{project.totalItems} ({project.receivedPercent}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${project.receivedPercent}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs mb-0.5">
                          <span className="text-muted-foreground">Installed</span>
                          <span className="font-medium">{project.installedItems}/{project.totalItems} ({project.installedPercent}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${project.installedPercent}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {project.startDate && format(new Date(project.startDate), "MMM d")}
                        {project.startDate && target && " → "}
                        {target && format(target, "MMM d, yyyy")}
                      </div>
                      {daysRemaining !== null && (
                        <span className={cn(
                          "font-medium",
                          daysRemaining > 0 ? "text-green-600" : daysRemaining === 0 ? "text-yellow-600" : "text-red-600"
                        )}>
                          {daysRemaining > 0
                            ? `${daysRemaining} days remaining`
                            : daysRemaining === 0
                            ? "Due today"
                            : `${Math.abs(daysRemaining)} days overdue`}
                        </span>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t">
                      <span>{project.client.name}</span>
                      {project.location && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" />
                          {project.location.code}
                        </span>
                      )}
                      {project.generalContractor && <span>GC: {project.generalContractor}</span>}
                      {project.budget != null && (
                        <span className={cn(
                          "flex items-center gap-0.5 font-medium",
                          project.budgetPercent > 100 ? "text-red-600" : "text-muted-foreground"
                        )}>
                          <DollarSign className="h-3 w-3" />
                          {((project.actualCost || 0) / 1000).toFixed(0)}K / {(project.budget / 1000).toFixed(0)}K
                        </span>
                      )}
                    </div>

                    {/* Counts */}
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Milestone className="h-3 w-3" /> {project._count.milestones} milestones</span>
                      <span className="flex items-center gap-0.5"><Truck className="h-3 w-3" /> {project._count.deliveries} deliveries</span>
                      <span className="flex items-center gap-0.5"><Package className="h-3 w-3" /> {project._count.workOrders} work orders</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
