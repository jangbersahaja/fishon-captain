"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MermaidDiagram } from "@/components/MermaidDiagram";

export default function OperationalCalendarPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <Link href="/dev/config" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Config
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Operational Calendar System</h1>
        <p className="text-muted-foreground text-lg">
          Visual availability management with daily operations and unavailable dates
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="availability">Availability Flow</TabsTrigger>
          <TabsTrigger value="scheduling">Schedule Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Calendar System Architecture</CardTitle>
              <CardDescription>Interactive calendar with operating hours and unavailable dates</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`graph TB
    A[Calendar Editor] --> B[Operating Schedule]
    A --> C[Unavailable Dates]
    A --> D[Seasonal Settings]
    
    B --> E{Day of Week}
    E -->|Monday-Friday| F[Weekday Hours]
    E -->|Saturday-Sunday| G[Weekend Hours]
    
    C --> H[Date Picker]
    H --> I[Block Specific Dates]
    H --> J[Date Ranges]
    
    D --> K[Summer Schedule]
    D --> L[Winter Schedule]
    
    F --> M[Charter DB]
    G --> M
    I --> M
    J --> M
    K --> M
    L --> M
    
    M --> N[v_public_charters View]
    N --> O[fishon-market API]
    O --> P[Angler Booking UI]
    
    style A fill:#e3f2fd
    style M fill:#c8e6c9
    style N fill:#fff3e0
    style P fill:#f3e5f5`} />

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Key Features:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Visual calendar editor</li>
                    <li>Daily operation hours</li>
                    <li>Unavailable dates blocking</li>
                    <li>Recurring weekly schedules</li>
                    <li>Seasonal variations</li>
                    <li>Color-coded status indicators</li>
                  </ul>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Status Indicators:</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li><span className="inline-block w-3 h-3 bg-green-500 rounded mr-2"></span>Available</li>
                    <li><span className="inline-block w-3 h-3 bg-blue-500 rounded mr-2"></span>Booked</li>
                    <li><span className="inline-block w-3 h-3 bg-red-500 rounded mr-2"></span>Unavailable</li>
                    <li><span className="inline-block w-3 h-3 bg-gray-400 rounded mr-2"></span>Not Operating</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability">
          <Card>
            <CardHeader>
              <CardTitle>Availability Check Flow</CardTitle>
              <CardDescription>How availability data flows to angler booking interface</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`sequenceDiagram
    participant Angler
    participant Market as fishon-market
    participant View as v_public_charters
    participant Captain as fishon-captain
    
    Angler->>Market: Request charter availability
    Market->>View: Query charter data
    View->>Captain: Read operating schedule
    View->>Captain: Read unavailable dates
    View->>Captain: Read existing bookings
    
    Captain-->>View: Operating days/hours
    Captain-->>View: Blocked dates
    Captain-->>View: Booked slots
    
    View->>View: Calculate available slots
    View-->>Market: Available dates & times
    Market-->>Angler: Display calendar
    
    Note over Angler: Selects date & time
    
    Angler->>Market: Request booking
    Market->>View: Verify still available
    
    alt Slot Available
        View-->>Market: Confirmed available
        Market->>Market: Create booking
        Market-->>Angler: Booking created
    else Slot Taken
        View-->>Market: No longer available
        Market-->>Angler: Show conflict message
    end
    
    style Market fill:#e3f2fd
    style View fill:#fff3e0
    style Captain fill:#c8e6c9`} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduling">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Management</CardTitle>
              <CardDescription>Captain workflow for updating availability</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`graph TB
    A[Captain Dashboard] --> B[My Charters]
    B --> C[Select Charter]
    C --> D[Calendar Tab]
    
    D --> E[Operating Schedule Section]
    D --> F[Unavailable Dates Section]
    
    E --> G{Edit Mode}
    G -->|Days| H[Toggle Days of Week]
    G -->|Hours| I[Set Start/End Time]
    G -->|Seasonal| J[Add Seasonal Rules]
    
    H --> K[Save Changes]
    I --> K
    J --> K
    
    F --> L{Action}
    L -->|Add| M[Select Date/Range]
    L -->|Remove| N[Delete Blocked Date]
    
    M --> O[Optional: Add Reason]
    O --> P[Confirm Block]
    P --> Q[Update DB]
    
    N --> Q
    K --> Q
    
    Q --> R[Refresh Calendar View]
    Q --> S[Update v_public_charters]
    S --> T[fishon-market Sees Update]
    
    style D fill:#e3f2fd
    style K fill:#c8e6c9
    style Q fill:#fff3e0
    style T fill:#f3e5f5`} />

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">API Endpoints:</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div><code className="bg-background px-2 py-1 rounded">GET /api/charters/:id/schedule</code> - Get operating schedule</div>
                  <div><code className="bg-background px-2 py-1 rounded">PATCH /api/charters/:id/schedule</code> - Update schedule</div>
                  <div><code className="bg-background px-2 py-1 rounded">GET /api/charters/:id/unavailability</code> - Get blocked dates</div>
                  <div><code className="bg-background px-2 py-1 rounded">POST /api/charters/:id/unavailability</code> - Add blocked date</div>
                  <div><code className="bg-background px-2 py-1 rounded">DELETE /api/charters/:id/unavailability/:dateId</code> - Remove block</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8 p-6 bg-muted rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Documentation Reference</h2>
        <p className="text-muted-foreground">
          For detailed API specifications and usage examples, see{" "}
          <code className="bg-background px-2 py-1 rounded">/docs/config/OPERATIONAL_CALENDAR_SYSTEM.md</code>
        </p>
      </div>
    </div>
  );
}
