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
    content: "Which assets have been in storage more than 12 months and what should we do with them?",
    timestamp: new Date(Date.now() - 300000),
  },
  {
    role: "assistant",
    content: `Based on analysis of your inventory data, I've identified **847 assets** that have been in storage for over 12 months across all AAA locations. Here's my breakdown and recommendations:

**Storage Duration Distribution:**
- 12-18 months: 412 assets ($185K estimated value)
- 18-24 months: 268 assets ($92K estimated value)
- 24+ months: 167 assets ($34K estimated value)

**Top Categories in Long-term Storage:**
1. **Panels & Workstations** (340 items) — Most are Steelcase Answer series. Recommend liquidation via auction — these have strong secondary market demand. Estimated recovery: $45K.
2. **Task Chairs** (215 items) — Mix of Herman Miller Aeron and Steelcase Leap. Good condition items should be redeployed to branches needing refreshes. Estimated savings vs. new: $128K.
3. **Filing Cabinets** (180 items) — Low resale value. Recommend donation to local nonprofits for tax benefit. Estimated deduction: $12K.
4. **Conference Tables** (72 items) — High-value items. Cross-reference with upcoming projects — the LA HQ Floor 5 Refresh could use 8 of these.
5. **Miscellaneous** (40 items) — Assess individually.

**Recommended Actions:**
- ✅ **Redeploy 215 chairs** to Costa Mesa and Coppell branches (saves $128K vs. procurement)
- 💰 **Liquidate 340 panels** via Corovan marketplace ($45K recovery)
- 🎁 **Donate 180 filing cabinets** to Habitat for Humanity ($12K tax benefit)
- 📋 **Hold 72 conference tables** for PRJ-2026-002 (LA HQ Floor 5 Refresh)
- 📊 **Monthly storage cost being saved:** $21,175/month

**Net Impact:** $206K in value recovered/saved, 87.3% waste diversion rate maintained.

Want me to generate work orders for any of these actions?`,
    timestamp: new Date(Date.now() - 240000),
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
