"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MermaidDiagram } from "@/components/MermaidDiagram";

export default function EmailNotificationPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <Link href="/dev/config" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Config
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Email & Notification System</h1>
        <p className="text-muted-foreground text-lg">
          Dual-channel communication with flow-aware messaging and real-time notifications
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="flows">Notification Flows</TabsTrigger>
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
          <TabsTrigger value="channels">Communication Channels</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Communication Stack Architecture</CardTitle>
              <CardDescription>Dual-channel system with email and real-time notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`graph TB
    subgraph "Communication Stack"
        A[@fishon/email Package]
        B[Pusher Real-time]
        C[Email Service Wrapper]
        D[Notification Service]
    end
    
    subgraph "API Layer"
        E[Booking Endpoints]
        F[Webhook System]
    end
    
    subgraph "Delivery Channels"
        G[SMTP - Zoho]
        H[WebSocket - Pusher]
        I[In-app Notifications]
    end
    
    A --> C
    B --> D
    C --> E
    D --> E
    E --> F
    
    C --> G
    D --> H
    D --> I
    
    F --> |Cross-app| J[fishon-captain]
    F --> |Cross-app| K[fishon-market]
    
    style A fill:#e3f2fd
    style B fill:#f3e5f5
    style G fill:#c8e6c9
    style H fill:#fff3e0`} />

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Key Components:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li><strong>@fishon/email Package:</strong> Shared React Email templates</li>
                  <li><strong>Email Service:</strong> Nodemailer + Zoho SMTP transport</li>
                  <li><strong>Notification Service:</strong> PostgreSQL storage + Pusher delivery</li>
                  <li><strong>Webhook System:</strong> Cross-app event propagation</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flows">
          <Card>
            <CardHeader>
              <CardTitle>Booking Notification Flow</CardTitle>
              <CardDescription>Flow-aware messaging for MANUAL and AUTO booking types</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`sequenceDiagram
    participant Angler
    participant Market as fishon-market
    participant Email as Email Service
    participant Pusher
    participant Captain as fishon-captain
    
    Note over Market: Booking Created
    Market->>Email: Send booking.created email
    Market->>Pusher: Publish booking.created event
    Email-->>Angler: "Booking request sent"
    Email-->>Captain: "New booking request"
    Pusher-->>Angler: Real-time notification
    Pusher-->>Captain: Real-time notification
    
    alt MANUAL Flow - Captain Approves
        Captain->>Market: Approve booking
        Market->>Email: Send booking.approved email
        Market->>Pusher: Publish booking.approved event
        Email-->>Angler: "Approved! Pay within 48h"
        Pusher-->>Angler: Real-time update
        
        Angler->>Market: Complete payment
        Market->>Email: Send booking.paid email
        Market->>Pusher: Publish booking.paid event
        Email-->>Angler: "Booking confirmed"
        Email-->>Captain: "Payment received"
        Pusher-->>Both: Real-time confirmation
    else AUTO Flow - Captain Acknowledges
        Captain->>Market: Acknowledge booking
        Market->>Email: Send booking.acknowledged email
        Market->>Pusher: Publish event
        Email-->>Angler: "Booking confirmed"
        Email-->>Captain: "Payment captured"
        Pusher-->>Both: Real-time confirmation
    end
    
    style Market fill:#e3f2fd
    style Email fill:#c8e6c9
    style Pusher fill:#fff3e0
    style Captain fill:#f3e5f5`} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Email Template System</CardTitle>
              <CardDescription>React Email templates with flow-aware content</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`graph TB
    A[Booking Event] --> B{Flow Type}
    
    B -->|MANUAL| C[MANUAL Templates]
    B -->|AUTO| D[AUTO Templates]
    
    C --> E[booking-request-captain]
    C --> F[booking-request-angler]
    C --> G[booking-approved-angler]
    C --> H[booking-paid-captain]
    C --> I[booking-paid-angler]
    
    D --> J[booking-payment-auth-angler]
    D --> K[booking-payment-auth-captain]
    D --> L[booking-acknowledged-angler]
    D --> M[booking-acknowledged-captain]
    
    subgraph "Common Templates"
        N[booking-rejected]
        O[booking-cancelled]
        P[booking-reminder]
    end
    
    E --> Q[@fishon/email Package]
    F --> Q
    G --> Q
    H --> Q
    I --> Q
    J --> Q
    K --> Q
    L --> Q
    M --> Q
    N --> Q
    O --> Q
    P --> Q
    
    Q --> R[React Email Renderer]
    R --> S[HTML + Plain Text]
    S --> T[SMTP Delivery]
    
    style C fill:#e3f2fd
    style D fill:#fff3e0
    style Q fill:#c8e6c9`} />

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">MANUAL Flow Templates:</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li><code className="bg-background px-2 py-1 rounded">booking-request</code> - Initial request notification</li>
                    <li><code className="bg-background px-2 py-1 rounded">booking-approved</code> - Captain approved, pay within 48h</li>
                    <li><code className="bg-background px-2 py-1 rounded">booking-paid</code> - Payment completed confirmation</li>
                  </ul>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">AUTO Flow Templates:</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li><code className="bg-background px-2 py-1 rounded">booking-payment-auth</code> - Payment authorized</li>
                    <li><code className="bg-background px-2 py-1 rounded">booking-acknowledged</code> - Captain confirmed</li>
                    <li><code className="bg-background px-2 py-1 rounded">booking-rejected</code> - With refund details</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels">
          <Card>
            <CardHeader>
              <CardTitle>Communication Channels</CardTitle>
              <CardDescription>Multi-channel delivery with user preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`graph TB
    A[Notification Event] --> B{User Preferences}
    
    B -->|Email Enabled| C[Email Channel]
    B -->|Push Enabled| D[Push Channel]
    B -->|In-app Enabled| E[In-app Channel]
    
    C --> F[Build Email Template]
    F --> G[SMTP Transport]
    G --> H[Zoho Mail Server]
    H --> I[Recipient Inbox]
    
    D --> J[Pusher API]
    J --> K[WebSocket Connection]
    K --> L[Browser Push]
    
    E --> M[Create Notification Record]
    M --> N[PostgreSQL Storage]
    N --> O[Dashboard Badge]
    
    subgraph "Delivery Status"
        P[Queued]
        Q[Sent]
        R[Delivered]
        S[Failed]
    end
    
    I --> R
    L --> R
    O --> R
    
    style C fill:#e3f2fd
    style D fill:#fff3e0
    style E fill:#f3e5f5
    style R fill:#c8e6c9
    style S fill:#ffcdd2`} />

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Channel Priorities:</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div><strong>Critical:</strong> Email + Push + In-app (booking confirmations, cancellations)</div>
                  <div><strong>Important:</strong> Push + In-app (booking requests, status changes)</div>
                  <div><strong>Informational:</strong> In-app only (reminders, updates)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8 p-6 bg-muted rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Documentation Reference</h2>
        <p className="text-muted-foreground">
          For detailed API specifications, template examples, and configuration, see{" "}
          <code className="bg-background px-2 py-1 rounded">/docs/config/EMAIL_NOTIFICATION_SYSTEM.md</code>
        </p>
      </div>
    </div>
  );
}
