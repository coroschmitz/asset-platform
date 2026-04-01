"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Sparkles,
  Send,
  BarChart3,
  Package,
  Truck,
  DollarSign,
  Leaf,
  Brain,
  Clock,
  TrendingUp,
} from "lucide-react"

interface Suggestion {
  icon: React.ReactNode
  label: string
  query: string
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const SUGGESTIONS: Suggestion[] = [
  { icon: <Package className="h-4 w-4" />, label: "Inventory summary", query: "Give me a summary of our current inventory across all locations" },
  { icon: <TrendingUp className="h-4 w-4" />, label: "Dormant assets", query: "Which assets have been in storage more than 12 months and what should we do with them?" },
  { icon: <Truck className="h-4 w-4" />, label: "Partner performance", query: "Compare partner performance across all regions for Q1 2026" },
  { icon: <DollarSign className="h-4 w-4" />, label: "Cost optimization", query: "Identify our top cost optimization opportunities across storage and moves" },
  { icon: <Leaf className="h-4 w-4" />, label: "Sustainability report", query: "Generate a sustainability summary for Q1 2026 including diversion rate and carbon impact" },
  { icon: <BarChart3 className="h-4 w-4" />, label: "Work order trends", query: "What are the trends in work order volume and types over the last 6 months?" },
]

const MOCK_CONVERSATIONS: ChatMessage[] = [
  {
    role: "user",
    content: "Give me a summary of the OCA63814-1 CoroTrak move and flag any issues.",
    timestamp: new Date(Date.now() - 600000),
  },
  {
    role: "assistant",
    content: `Here's my analysis of **Work Order OCA63814-1** — the AAA LAX campus move:

**Overview:**
- **336 person moves** across LAX2105 and LAX2126 buildings
- **3,360 total work items** (avg 10 items per person)
- Imported March 15, 2026 — status: COMPLETED

**Move Breakdown:**
- **Inter-building (LAX2105 → LAX2126):** 203 moves (60.4%) — This is the bulk of the project. Floor 03 consolidation from the old building into the new tower.
- **Intra-building (LAX2126 reshuffles):** 87 moves (25.9%) — Internal floor reassignments within LAX2126.
- **To Storage:** 46 moves (13.7%) — Excess furniture going to warehouse. Higher than typical (10% benchmark).

**Flagged Issues:**
1. **Storage ratio above benchmark.** 13.7% vs. 10% target. 46 moves to storage means ~460 work items warehoused. At $25/item/month, that's **$11,500/month in ongoing storage costs.** Recommend scheduling a disposition review within 30 days.
2. **Floor 05.A has a net loss of 12 people** — origin count (36) significantly exceeds destination count (48 arrivals vs. 36 departures + 18 to storage). Verify space planning assumptions.
3. **RFID verification incomplete.** Only 198 of 336 moves (58.9%) were RFID-verified. Floors 02.D and 05.C have the lowest verification rates. Recommend a post-move scan sweep.
4. **5 employees show duplicate records** — employees 695463, 751011, 704912 each appear in both inter- and intra-building datasets. Cross-reference with HR to confirm these are legitimate sequential moves vs. data entry errors.

**Completion Status:**
- Completed: 203 (60.4%)
- In Progress: 48 (14.3%)
- Pending: 85 (25.3%)

Want me to generate a disposition review work order for the 46 storage moves, or schedule an RFID verification sweep?`,
    timestamp: new Date(Date.now() - 540000),
  },
  {
    role: "user",
    content: "Compare partner performance across all regions for Q1 2026",
    timestamp: new Date(Date.now() - 420000),
  },
  {
    role: "assistant",
    content: `**Q1 2026 Partner Performance Scorecard:**

| Partner | Region | Orders | On-Time % | Avg Response | Quality | Overall |
|---------|--------|--------|-----------|-------------|---------|---------|
| **Corovan** | CA | 8 | 99.2% | 1.2h | 4.8/5 | **4.9/5** |
| **Rocky Mountain** | CO | 2 | 98.5% | 1.8h | 4.6/5 | **4.5/5** |
| **Dodge Moving** | MO | 1 | 98.1% | 2.1h | 4.4/5 | **4.3/5** |
| **Armstrong** | TX | 1 | 97.5% | 2.5h | 4.2/5 | **4.1/5** |
| **Silver State** | NV | 0 | 97.2% | 2.8h | 4.0/5 | **3.9/5** |
| **Desert Moving** | AZ | 1 | 96.8% | 3.1h | 3.9/5 | **3.8/5** |

**Key Findings:**
- **Corovan (CA)** continues to lead across all metrics — sub-2-hour response, near-perfect on-time delivery. Handling 62% of total volume.
- **Desert Moving (AZ)** shows the lowest scores. The Phoenix Branch Relocation (WO-2026-0010) had a cost overrun of $625 above NTE. Recommend a performance review meeting.
- **Armstrong (TX)** response times have improved from 3.4h → 2.5h quarter-over-quarter after the new dispatch system rollout.
- **Silver State (NV)** and **Dodge (MO)** have low volume making statistical comparison difficult.

**Recommendation:** Consider expanding Corovan's coverage to border AZ markets (they already serve Riverside/San Bernardino) to improve Phoenix-area SLAs.`,
    timestamp: new Date(Date.now() - 360000),
  },
]

const RECENT_INSIGHTS = [
  {
    icon: <TrendingUp className="h-4 w-4 text-green-600" />,
    title: "Storage costs trending down",
    desc: "Monthly storage costs decreased 12% this quarter due to proactive disposition actions.",
    time: "2 hours ago",
  },
  {
    icon: <Package className="h-4 w-4 text-orange-600" />,
    title: "Redeployment opportunity detected",
    desc: "34 task chairs at AOCM match open requests at 3 branch locations. Potential savings: $24K.",
    time: "4 hours ago",
  },
  {
    icon: <Brain className="h-4 w-4 text-purple-600" />,
    title: "Disposition recommendation",
    desc: "142 assets flagged for disposition review — 68% recommended for liquidation based on condition and market value.",
    time: "Yesterday",
  },
  {
    icon: <Leaf className="h-4 w-4 text-green-600" />,
    title: "Sustainability milestone",
    desc: "Circular material utilization rate (CMUR) hit 42.1% — on track for 50% annual target.",
    time: "Yesterday",
  },
]

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_CONVERSATIONS)
  const [input, setInput] = useState("")
  const [thinking, setThinking] = useState(false)

  const handleSend = async () => {
    if (!input.trim()) return
    const userMsg: ChatMessage = { role: "user", content: input, timestamp: new Date() }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setThinking(true)

    // Simulate AI response
    setTimeout(() => {
      const response: ChatMessage = {
        role: "assistant",
        content: `I'd be happy to help with that. Based on the current data in the Corovan Asset Platform:\n\n*This is a demo response.* In production, this would connect to the AI engine for real-time analysis of your ${input.toLowerCase().includes("inventory") ? "4,214 tracked assets" : input.toLowerCase().includes("partner") ? "6 regional partners" : "platform data"}.\n\nWould you like me to dive deeper into any specific area?`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, response])
      setThinking(false)
    }, 1500)
  }

  const handleSuggestion = (query: string) => {
    setInput(query)
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[#ea580c]" />
            AI Assistant
          </h1>
          <p className="text-sm text-muted-foreground">
            Ask questions about your assets, get recommendations, and generate reports
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-[#ea580c] opacity-40" />
              <h3 className="font-medium text-lg mb-2">How can I help you today?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Ask about inventory, work orders, sustainability, costs, or anything else in the platform.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-w-2xl mx-auto">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestion(s.query)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-[#ea580c]">{s.icon}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] rounded-lg px-4 py-3",
                  msg.role === "user"
                    ? "bg-[#ea580c] text-white"
                    : "bg-gray-100 text-foreground"
                )}>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.content.split("**").map((part, j) =>
                      j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>
                    )}
                  </div>
                  <p className={cn(
                    "text-[10px] mt-1",
                    msg.role === "user" ? "text-white/60" : "text-muted-foreground"
                  )}>
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))
          )}
          {thinking && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#ea580c] animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-[#ea580c] animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-[#ea580c] animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span>Analyzing platform data…</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Suggestions (shown when there are messages) */}
        {messages.length > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {SUGGESTIONS.slice(0, 4).map((s, i) => (
              <button
                key={i}
                onClick={() => handleSuggestion(s.query)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs hover:bg-gray-50 transition-colors"
              >
                <span className="text-[#ea580c]">{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Ask about inventory, costs, sustainability, partners…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            className="flex-1"
            disabled={thinking}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || thinking}
            className="bg-[#ea580c] hover:bg-[#c2410c]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Right Sidebar - Insights */}
      <div className="w-80 shrink-0 hidden lg:block space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-600" />
              Recent Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {RECENT_INSIGHTS.map((insight, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-start gap-2">
                  {insight.icon}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium">{insight.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">{insight.desc}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {insight.time}
                    </p>
                  </div>
                </div>
                {i < RECENT_INSIGHTS.length - 1 && <div className="border-b" />}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Platform Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-2 rounded bg-gray-50">
                <p className="text-lg font-bold">4,214</p>
                <p className="text-[10px] text-muted-foreground">Total Assets</p>
              </div>
              <div className="p-2 rounded bg-gray-50">
                <p className="text-lg font-bold">184</p>
                <p className="text-[10px] text-muted-foreground">Locations</p>
              </div>
              <div className="p-2 rounded bg-gray-50">
                <p className="text-lg font-bold">12</p>
                <p className="text-[10px] text-muted-foreground">Work Orders</p>
              </div>
              <div className="p-2 rounded bg-gray-50">
                <p className="text-lg font-bold">87.3%</p>
                <p className="text-[10px] text-muted-foreground">Diversion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">AI Capabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] px-1.5">Analysis</Badge>
                Inventory trends & anomaly detection
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] px-1.5">Optimize</Badge>
                Cost reduction & space optimization
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] px-1.5">Report</Badge>
                Auto-generate sustainability reports
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] px-1.5">Predict</Badge>
                Forecast storage needs & asset lifecycle
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] px-1.5">Action</Badge>
                Draft work orders & disposition plans
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
