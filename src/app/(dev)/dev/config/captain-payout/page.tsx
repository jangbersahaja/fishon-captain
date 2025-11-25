"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MermaidDiagram } from "@/components/MermaidDiagram";

export default function CaptainPayoutPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <Link href="/dev/config" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Config
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Captain Payout System</h1>
        <p className="text-muted-foreground text-lg">
          Earnings distribution with commission tiers and payout scheduling
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="calculation">Earnings Calculation</TabsTrigger>
          <TabsTrigger value="schedule">Payout Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Payout System Architecture</CardTitle>
              <CardDescription>Commission-based earnings with tiered rates</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`graph TB
    A[Booking Completed] --> B[Calculate Earnings]
    B --> C{Commission Tier}
    
    C -->|Starter| D[10% Platform Fee]
    C -->|Standard| E[8% Platform Fee]
    C -->|Premium| F[5% Platform Fee]
    
    D --> G[Captain Earnings = 90%]
    E --> H[Captain Earnings = 92%]
    F --> I[Captain Earnings = 95%]
    
    G --> J[Pending Earnings Pool]
    H --> J
    I --> J
    
    J --> K{Payout Schedule}
    
    K -->|Bi-weekly| L[Every 2 weeks]
    K -->|Monthly| M[End of month]
    
    L --> N[Generate Payout]
    M --> N
    
    N --> O[Status: PENDING]
    O --> P[Admin Review]
    P --> Q[Status: PROCESSING]
    Q --> R[Bank Transfer]
    R --> S[Status: COMPLETED]
    
    style C fill:#e3f2fd
    style J fill:#fff3e0
    style N fill:#c8e6c9
    style S fill:#c8e6c9`} />

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Starter Tier</h3>
                  <div className="text-2xl font-bold text-blue-600">10%</div>
                  <p className="text-sm text-muted-foreground mt-2">New captains, 0+ bookings/month</p>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Standard Tier</h3>
                  <div className="text-2xl font-bold text-green-600">8%</div>
                  <p className="text-sm text-muted-foreground mt-2">5+ consistent bookings/month</p>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Premium Tier</h3>
                  <div className="text-2xl font-bold text-purple-600">5%</div>
                  <p className="text-sm text-muted-foreground mt-2">15+ bookings/month, 4.5+ rating</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculation">
          <Card>
            <CardHeader>
              <CardTitle>Earnings Calculation Flow</CardTitle>
              <CardDescription>How captain earnings are computed from bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`sequenceDiagram
    participant Booking
    participant System
    participant Payout
    participant Captain
    
    Booking->>System: Payment Completed
    System->>System: Get booking amount
    System->>System: Get captain commission rate
    
    Note over System: Example: RM 500 booking
    Note over System: Standard tier: 8% platform fee
    
    System->>System: Platform fee = RM 500 × 0.08 = RM 40
    System->>System: Captain earnings = RM 500 - RM 40 = RM 460
    
    System->>Payout: Add to pending earnings
    Payout->>Payout: Update total pending
    
    Note over Payout: Accumulate until payout date
    
    Payout->>Captain: Show in dashboard
    Captain->>Captain: View pending earnings
    
    Note over System: Payout date arrives
    
    System->>Payout: Generate payout batch
    Payout->>Payout: Group all pending bookings
    Payout->>Payout: Status: PENDING → PROCESSING
    
    Note over Payout: Admin reviews and approves
    
    Payout->>Bank: Transfer funds
    Bank-->>Payout: Transfer confirmed
    Payout->>Payout: Status: COMPLETED
    Payout->>Captain: Notification: Payment sent
    
    style System fill:#e3f2fd
    style Payout fill:#fff3e0
    style Bank fill:#c8e6c9`} />

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Calculation Formula:</h3>
                <div className="space-y-2 text-sm font-mono bg-background p-3 rounded">
                  <div>grossEarnings = bookingAmount</div>
                  <div>platformFee = grossEarnings × commissionRate</div>
                  <div>captainEarnings = grossEarnings - platformFee</div>
                  <div className="pt-2 border-t">Example: RM 500 @ 8% = RM 460 captain</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Payout Schedule System</CardTitle>
              <CardDescription>Automated payout generation and processing</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`graph TB
    A[Cron Job - Daily] --> B{Check Date}
    
    B -->|Bi-weekly Date| C[Scan Bi-weekly Captains]
    B -->|Month End| D[Scan Monthly Captains]
    B -->|Not Payout Date| E[Skip]
    
    C --> F[Get Pending Bookings]
    D --> F
    
    F --> G{Has Pending?}
    
    G -->|Yes| H[Calculate Total]
    G -->|No| I[Skip Captain]
    
    H --> J[Create Payout Record]
    J --> K[Status: PENDING]
    
    K --> L[Add to Admin Queue]
    L --> M[Email Notification to Captain]
    M --> N[Email to Admin]
    
    N --> O[Admin Dashboard]
    O --> P{Admin Action}
    
    P -->|Approve| Q[Status: PROCESSING]
    P -->|Reject| R[Status: FAILED]
    P -->|Hold| S[Status: PENDING]
    
    Q --> T[Initiate Bank Transfer]
    T --> U[Record Transfer Reference]
    U --> V[Status: COMPLETED]
    V --> W[Update Captain Balance]
    
    R --> X[Notify Captain]
    
    style F fill:#e3f2fd
    style K fill:#fff3e0
    style V fill:#c8e6c9
    style R fill:#ffcdd2`} />

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Bi-weekly Schedule:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Payout every 1st and 15th of month</li>
                    <li>Includes bookings from previous period</li>
                    <li>Faster access to earnings</li>
                    <li>Good for high-volume captains</li>
                  </ul>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Monthly Schedule:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Payout on last day of month</li>
                    <li>Includes all bookings from month</li>
                    <li>Simpler accounting</li>
                    <li>Good for lower-volume captains</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8 p-6 bg-muted rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Documentation Reference</h2>
        <p className="text-muted-foreground">
          For detailed calculation formulas and admin tools, see{" "}
          <code className="bg-background px-2 py-1 rounded">/docs/config/CAPTAIN_PAYOUT_SYSTEM.md</code>
        </p>
      </div>
    </div>
  );
}
