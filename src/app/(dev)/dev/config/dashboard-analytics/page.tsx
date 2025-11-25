"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MermaidDiagram } from "@/components/MermaidDiagram";

export default function DashboardAnalyticsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <Link href="/dev/config" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Config
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Dashboard & Analytics System</h1>
        <p className="text-muted-foreground text-lg">
          Real-time insights into charter business performance with priority alerts and KPIs
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="data">Data Pipeline</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="alerts">Priority Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Architecture</CardTitle>
              <CardDescription>Server-side rendering with real-time data aggregation</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`graph TB
    subgraph "Frontend Layer"
        A[Dashboard Page]
        B[Metrics Components]
        C[Charts & Graphs]
        D[Alert Cards]
    end
    
    subgraph "Data Services"
        E[getDashboardData]
        F[getBookingStats]
        G[getEarningsSummary]
        H[getPriorityAlerts]
    end
    
    subgraph "Data Sources"
        I[(Captain DB)]
        J[(Market DB)]
        K[Webhook Events]
    end
    
    A --> B
    A --> C
    A --> D
    
    B --> E
    C --> F
    D --> H
    
    E --> I
    F --> I
    F --> J
    G --> I
    G --> J
    H --> I
    H --> K
    
    style A fill:#e3f2fd
    style E fill:#fff3e0
    style I fill:#c8e6c9
    style J fill:#c8e6c9`} />

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Key Metrics:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Total bookings (7d/30d/90d)</li>
                    <li>Booking conversion rate</li>
                    <li>Revenue and earnings</li>
                    <li>Charter performance scores</li>
                    <li>Pending actions count</li>
                  </ul>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Features:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Period selector (7/30/90 days)</li>
                    <li>Admin impersonation support</li>
                    <li>Responsive mobile design</li>
                    <li>Server-side caching</li>
                    <li>Real-time updates via webhooks</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Data Aggregation Pipeline</CardTitle>
              <CardDescription>Multi-source data collection and processing</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`sequenceDiagram
    participant Page as Dashboard Page
    participant Service as Dashboard Service
    participant CaptainDB as Captain DB
    participant MarketDB as Market DB
    participant Cache
    
    Page->>Service: Request dashboard data
    Service->>Cache: Check cache
    
    alt Cache Hit
        Cache-->>Service: Return cached data
    else Cache Miss
        Service->>CaptainDB: Query charter data
        CaptainDB-->>Service: Charters + Captain profile
        
        Service->>MarketDB: Query booking data
        MarketDB-->>Service: Bookings + Revenue
        
        Service->>Service: Aggregate & calculate metrics
        Service->>Cache: Store for 5 minutes
        Cache-->>Service: Cached
    end
    
    Service-->>Page: Dashboard data
    Page->>Page: Render components
    
    Note over Page: User interacts
    
    Page->>Service: Change period (30d → 90d)
    Service->>CaptainDB: Query with new period
    Service->>MarketDB: Query with new period
    Service->>Service: Re-calculate metrics
    Service-->>Page: Updated data
    
    style Service fill:#e3f2fd
    style CaptainDB fill:#c8e6c9
    style MarketDB fill:#c8e6c9
    style Cache fill:#fff3e0`} />

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Data Flow:</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div><strong>Step 1:</strong> Page load triggers getDashboardData()</div>
                  <div><strong>Step 2:</strong> Service checks cache (5-minute TTL)</div>
                  <div><strong>Step 3:</strong> Query both databases in parallel</div>
                  <div><strong>Step 4:</strong> Aggregate metrics and calculate KPIs</div>
                  <div><strong>Step 5:</strong> Cache results and return to page</div>
                  <div><strong>Step 6:</strong> Render components with data</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Components</CardTitle>
              <CardDescription>Modular component architecture for metrics display</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`graph TB
    A[Dashboard Page] --> B[Header Section]
    A --> C[Metrics Grid]
    A --> D[Priority Alerts]
    A --> E[Charter Performance]
    A --> F[Recent Bookings]
    
    B --> G[Period Selector]
    B --> H[Refresh Button]
    
    C --> I[BookingStatsCard]
    C --> J[EarningsCard]
    C --> K[ConversionRateCard]
    C --> L[PendingActionsCard]
    
    D --> M[AlertCard 1]
    D --> N[AlertCard 2]
    D --> O[AlertCard 3]
    
    E --> P[CharterPerformanceCard]
    P --> Q[Fleet Health Score]
    P --> R[Top Performers]
    P --> S[Needs Attention]
    
    F --> T[BookingList]
    T --> U[BookingCard]
    
    style A fill:#e3f2fd
    style C fill:#fff3e0
    style D fill:#ffcdd2
    style E fill:#c8e6c9`} />

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">Metrics Components</h3>
                  <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                    <li>BookingStatsCard</li>
                    <li>EarningsCard</li>
                    <li>ConversionRateCard</li>
                    <li>PendingActionsCard</li>
                  </ul>
                </div>

                <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <h3 className="font-semibold mb-2 text-orange-900 dark:text-orange-100">Alert Components</h3>
                  <ul className="space-y-1 text-sm text-orange-800 dark:text-orange-200">
                    <li>PriorityAlertCard</li>
                    <li>ActionRequiredBadge</li>
                    <li>UrgencyIndicator</li>
                  </ul>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <h3 className="font-semibold mb-2 text-green-900 dark:text-green-100">Performance Components</h3>
                  <ul className="space-y-1 text-sm text-green-800 dark:text-green-200">
                    <li>CharterPerformanceCard</li>
                    <li>FleetHealthScore</li>
                    <li>PerformanceChart</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Priority Alert System</CardTitle>
              <CardDescription>Actionable items requiring captain attention</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`graph TB
    A[System Events] --> B{Alert Rules}
    
    B -->|New Booking| C[URGENT - New Request]
    B -->|Payment Authorized| D[HIGH - Acknowledge Payment]
    B -->|Draft Incomplete| E[MEDIUM - Complete Draft]
    B -->|Low Availability| F[LOW - Update Calendar]
    
    C --> G[Priority Score: 100]
    D --> H[Priority Score: 80]
    E --> I[Priority Score: 50]
    F --> J[Priority Score: 20]
    
    G --> K[Sort & Display]
    H --> K
    I --> K
    J --> K
    
    K --> L{Alert Type}
    
    L -->|Action Required| M[Show Action Button]
    L -->|Informational| N[Show Info Icon]
    L -->|Warning| O[Show Warning Icon]
    
    M --> P[Dashboard Display]
    N --> P
    O --> P
    
    P --> Q[Click Action]
    Q --> R[Navigate to Relevant Page]
    R --> S[Mark Alert as Handled]
    
    style C fill:#ffcdd2
    style D fill:#fff3e0
    style E fill:#e3f2fd
    style F fill:#c8e6c9
    style K fill:#f3e5f5`} />

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Alert Priorities:</h3>
                <div className="grid gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-20 font-mono font-bold text-red-600">URGENT</span>
                    <span className="text-muted-foreground">New booking request, payment deadline approaching</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-20 font-mono font-bold text-orange-600">HIGH</span>
                    <span className="text-muted-foreground">Payment authorized, customer message, booking modification</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-20 font-mono font-bold text-blue-600">MEDIUM</span>
                    <span className="text-muted-foreground">Incomplete draft, missing photos, profile needs update</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-20 font-mono font-bold text-green-600">LOW</span>
                    <span className="text-muted-foreground">Calendar updates, seasonal availability, tips and suggestions</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8 p-6 bg-muted rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Documentation Reference</h2>
        <p className="text-muted-foreground">
          For detailed implementation, component API, and testing, see{" "}
          <code className="bg-background px-2 py-1 rounded">/docs/config/DASHBOARD_ANALYTICS_SYSTEM.md</code>
        </p>
      </div>
    </div>
  );
}
