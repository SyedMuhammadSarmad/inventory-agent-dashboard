"use client";
import ReactMarkdown from "react-markdown"
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const API_URL = process.env.NEXT_PUBLIC_API_URL

type InventoryItem = { 
  id: number; 
  name: string; 
  sku: string; 
  quantity: number;
  reorder_level:number;
};
type Reorder = { 
  id:number;
  item_id: number; 
  quantity_requested: number;
  status:string;
  requested_by:string;
  approved_by:string

};
type Payment = {
  id: number;
  amount: number;
  paid_at: string;  
  status: string; 
};
type Budget = { 
  id: number; 
  category:string; 
  allocated_amount: number; 
  spent_amount: number;
};

type AgentEvent =
  | { type: "agent_updated"; new_agent: string }
  | { type: "message_output"; message: string }
  | { type: "tool_output"; output:any }
  | { type: "final_output"; output: string }
  | { type: "tool_call"; input: string }
  ;

export default function Home() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [reorders, setReorders] = useState<Reorder[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [agentMessages, setAgentMessages] = useState<AgentEvent[]>([]);
  const agentEndRef = useRef<HTMLDivElement>(null);

  // Ref to hold EventSource instance
  const eventSourceRef = useRef<EventSource | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    agentEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agentMessages]);

  // Fetch DB routes
  const fetchAllData = () => {
    fetch(`${API_URL}/inventory`)
      .then((r) => r.json())
      .then(setInventory);
    fetch(`${API_URL}/reorders`)
      .then((r) => r.json())
      .then(setReorders);
    fetch(`${API_URL}/payments`)
      .then((r) => r.json())
      .then(setPayments);
    fetch(`${API_URL}/budgets`)
      .then((r) => r.json())
      .then(setBudgets);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Run Agent instruction
  const runAgentInstruction = (instruction: string) => {
    // Close any existing EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setAgentMessages([]); // Clear previous messages
    const msg = encodeURIComponent(instruction);

    const eventSource = new EventSource(
      `http://127.0.0.1:8000/agent/chat/stream?msg=${msg}`
    );
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (e) => {
      try {
        const parsed: AgentEvent = JSON.parse(e.data);

        // Deduplicate messages
        setAgentMessages((prev) => {
          const exists = prev.find((m) => JSON.stringify(m) === JSON.stringify(parsed));
          if (exists) return prev;
          return [...prev, parsed];
        });

        // Close EventSource on final output
        if (parsed.type === "final_output") {
          eventSource.close();
          eventSourceRef.current = null;
          fetchAllData(); // refresh DB
        }
      } catch (err) {
        console.error("SSE parse error:", e.data, err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE connection error:", err);
      eventSource.close();
      eventSourceRef.current = null;
    };
  };
  const { setTheme } = useTheme()
  return (
    <>
      <header className="bg-gray-900 text-white p-4 shadow-md dark:bg-gray-800">

        <div className="max-w-7xl mx-auto flex justify-between items-center">

          <h1 className="text-2xl font-bold">Inventory Dashboard</h1>

          

          {/* Theme Toggle Dropdown Menu MOVED HERE */}

          <DropdownMenu>

            <DropdownMenuTrigger asChild>

              <Button variant="outline" size="icon">

                <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />

                <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />

                <span className="sr-only">Toggle theme</span>

              </Button>

            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">

              <DropdownMenuItem onClick={() => setTheme("light")}>

                Light

              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => setTheme("dark")}>

                Dark

              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => setTheme("system")}>

                System

              </DropdownMenuItem>

            </DropdownMenuContent>

          </DropdownMenu>

        </div>

      </header>
      <div className="max-w-7xl mx-auto p-4">

{/* Tagline and Run Agent Button Section */}
    <div className="flex justify-between items-start mb-6">
 
      {/* Tagline (Left-aligned) */}
      <div className="max-w-3xl text-lg font-medium text-gray-700 dark:text-gray-300">
      Streamline your inventory management with real-time stock monitoring, automated reorders, 
      and efficient payment processing—all from one intuitive dashboard.
      </div>

      {/* Run Agent Button (Right-aligned) */}
      <Button onClick={() => runAgentInstruction("Check inventory, create reorders, approve them, and process payment.")}>
      Run Agent
      </Button>
      </div>
    
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ">


    {/* Inventory */}
    <Card>
      <CardHeader>
        <CardTitle>Inventory</CardTitle>
      </CardHeader>
      <CardContent>
        {/* HEADER ROW - Using CSS Grid for consistent column alignment */}
        <div className="grid grid-cols-3 gap-4 px-4 py-2 border-b font-semibold text-gray-400">
          <span>Name</span>
          <span className="text-right">Quantity</span>
          <span className="text-right">Reorder_level</span>
        </div>

        {/* DATA ROWS */}
        {inventory.map((item: InventoryItem) => (
          // Using CSS Grid here too, with a slight change in border style (border-t) for separation
          <div key={item.id} className="grid grid-cols-3 gap-4 px-4 py-2 border-t border-gray-100 ">
            <span className="text-sm">{item.name}</span>
            <span className="text-sm text-right">{item.quantity}</span>
            <span className="text-sm text-right">{item.reorder_level}</span>
          </div>
        ))}
      </CardContent>
    </Card>

    {/* Reorders */}
    <Card>
      <CardHeader>
        <CardTitle>Reorders</CardTitle>
      </CardHeader>
      <CardContent>
        {/* HEADER ROW - Using CSS Grid for consistent column alignment */}
        <div className="grid grid-cols-2 gap-4 px-4 py-2 border-b font-semibold text-gray-400">
          <span>Item Name</span>
          <span className="text-right">Quantity</span>
        </div>

        {/* DATA ROWS */}
        {reorders.map((r:Reorder) => (
          // Using a 2-column CSS Grid with improved spacing and hover effect
          <div key={r.id} className="grid grid-cols-2 gap-4 px-4 py-2 border-t border-gray-100 ">
            <span className="text-sm font-medium">{r.item_id}</span>
            {/* Right-aligning the numerical data (Quantity) */}
            <span className="text-sm text-right font-medium text-blue-600">
              {r.quantity_requested}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>

      {/* Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {/* HEADER ROW - Using CSS Grid for consistent column alignment */}
          <div className="grid grid-cols-3 gap-4 px-4 py-2 border-b font-semibold text-gray-400">
            <span>Amount</span>
            <span className="text-center">Paid At</span>
            <span className="text-right">Status</span>
          </div>

          {/* DATA ROWS */}
          {payments.map((p: Payment) => (
            // Using CSS Grid with improved spacing and hover effect
            <div key={p.id} className="grid grid-cols-3 gap-4 px-4 py-2 border-t border-gray-100 ">
              {/* Amount is left-aligned, standard for currency */}
              <span className="text-sm font-medium">
                ${p.amount}
              </span>
              
              {/* Date is centered for balance */}
              <span className="text-sm text-center">
                {p.paid_at
                  ? new Date(p.paid_at.replace(" ", "T")).toLocaleDateString()
                  : "—"}
              </span>
              
              {/* Status is right-aligned for balance and emphasis */}
              <span className={`text-sm text-right ${p.status === 'Completed' ? 'text-green-600' : p.status === 'Pending' ? 'text-yellow-600' : 'text-red-600'}`}>
                {p.status}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Budgets */}
      <Card>
      <CardHeader>
        <CardTitle>Budgets</CardTitle>
      </CardHeader>
      <CardContent>
        {/* HEADER ROW - Using a 4-column CSS Grid */}
        <div className="grid grid-cols-4 gap-4 px-4 py-2 border-b font-semibold text-gray-400">
          <span className="col-span-2">Category / Item</span>
          <span className="text-right">Total Budget</span>
          <span className="text-right">Used / Remaining</span>
        </div>

        {/* DATA ROWS */}
        {budgets.map((b:Budget) => {
          const spentAmount = b.spent_amount || 0
          const remaining = b.allocated_amount - b.spent_amount;
          const isOverBudget = remaining < 0;

          return (
            // Using CSS Grid with improved spacing and hover effect
            <div key={b.id} className="grid grid-cols-4 gap-4 px-4 py-2 border-t border-gray-100 ">
              
              {/* Assuming 'b' has a 'name' or 'category' field for context */}
              <span className="col-span-2 text-sm font-medium">
                {b.category || `Budget ${b.id}`} {/* Use a name field if available */}
              </span>

              {/* Total Budget is right-aligned */}
              <span className="text-sm text-right font-medium">
                ${b.allocated_amount}
              </span>
              
              {/* Used / Remaining is right-aligned and conditionally styled */}
              <span className={`text-sm text-right font-semibold ${isOverBudget ? 'text-red-600' : remaining < (b.allocated_amount * 0.25) ? 'text-yellow-600' : 'text-green-600'}`}>
                {isOverBudget 
                  ? `OVER: $${Math.abs(remaining)}` // Show how much over
                  : `Used: $${spentAmount}`}
              </span>
            </div>
          );
        })}
      </CardContent>
      </Card>

      {/* Agent Stream */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Agents output</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-80 overflow-y-auto">
          {agentMessages.map((msg, idx) => (
            <div key={idx} className="p-2 rounded wrap-break-word">
              {msg.type === "tool_call" && (
                <span className="text-sm italic">{msg.input.replace("_tool"," agent")}:</span>
                )}
              {msg.type === "tool_output" && (
                <ReactMarkdown>{JSON.stringify(msg.output.summary)}</ReactMarkdown>
                )}
              {msg.type === "agent_updated" && (
                <span className="text-lg italic"> 
                {msg.new_agent} 
                </span>
                )}
              {msg.type === "final_output" && (
                <>
                <span className="text-lg italic">
                </span>                
                <div className="font-bold prose prose-neutral">
                  <ReactMarkdown>{msg.output}</ReactMarkdown>
                  </div>
                </>
                )}
            </div>
          ))}
          <div ref={agentEndRef} />
        </CardContent>
      </Card>
    </div>
    </div>
    </>
  );
}
