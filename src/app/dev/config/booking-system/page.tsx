"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";

export default function BookingSystemPage() {
  useEffect(() => {
    // Dynamically import mermaid
    import("mermaid").then((mermaid) => {
      mermaid.default.initialize({ startOnLoad: true, theme: "default" });
      mermaid.default.contentLoaded();
    });
  }, []);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <Link href="/dev/config" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Config
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Booking System</h1>
        <p className="text-muted-foreground text-lg">
          Visual documentation for the dual-flow booking system with payment integration
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="manual">MANUAL Flow</TabsTrigger>
          <TabsTrigger value="auto">AUTO Flow</TabsTrigger>
          <TabsTrigger value="payment">Payment Flows</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>System Architecture</CardTitle>
              <CardDescription>Cross-app integration between fishon-market and fishon-captain</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mermaid">
                {`graph TB
    subgraph "fishon-market (Angler)"
        A[Angler Creates Booking]
        B[Payment Processing]
        C[Status Updates]
    end
    
    subgraph "Communication Layer"
        W[Webhook System]
        P[Pusher Real-time]
        E[Email Service]
    end
    
    subgraph "fishon-captain (Captain)"
        D[Captain Dashboard]
        F[Approve/Reject]
        G[Acknowledge]
    end
    
    A -->|POST /api/bookings/create| B
    B -->|Webhook| W
    W -->|booking.created| D
    D -->|Review| F
    D -->|Review| G
    F -->|Status Update| W
    G -->|Status Update| W
    W -->|booking.approved| C
    W -->|booking.acknowledged| C
    P -->|Real-time Notifications| A
    P -->|Real-time Notifications| D
    E -->|Email Notifications| A
    E -->|Email Notifications| D
    
    style A fill:#e3f2fd
    style D fill:#fff3e0
    style W fill:#f3e5f5
    style P fill:#e8f5e9
    style E fill:#fce4ec`}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>MANUAL Flow (Approve-Then-Pay)</CardTitle>
              <CardDescription>Captain approves booking before angler pays</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mermaid">
                {`sequenceDiagram
    participant Angler
    participant Market as fishon-market
    participant Webhook
    participant Captain as fishon-captain
    participant Payment as Payment Gateway
    
    Angler->>Market: Submit Booking Request
    Market->>Market: Create Booking (PENDING)
    Market->>Webhook: Send booking.created event
    Webhook->>Captain: Notify Captain
    Market->>Angler: "Request sent, awaiting approval"
    
    Note over Captain: Captain Reviews Request
    
    alt Captain Approves
        Captain->>Market: POST /api/bookings/:id/approve
        Market->>Market: Update Status (AWAITING_PAYMENT)
        Market->>Angler: Email "Approved! Pay within 48h"
        Market->>Angler: Pusher notification
        
        Note over Angler: Angler Completes Payment
        
        Angler->>Payment: Submit Payment
        Payment->>Market: Payment callback
        Market->>Market: Update Status (PAID)
        Market->>Webhook: Send booking.paid event
        Webhook->>Captain: Notify Captain
        Market->>Angler: Email "Booking Confirmed"
        Market->>Captain: Email "Booking Confirmed"
    else Captain Rejects
        Captain->>Market: POST /api/bookings/:id/reject
        Market->>Market: Update Status (REJECTED)
        Market->>Angler: Email "Booking Rejected"
        Note over Angler: No payment, no refund needed
    end
    
    style Market fill:#e3f2fd
    style Captain fill:#fff3e0
    style Payment fill:#f3e5f5`}
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Key Points:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Lower risk for angler (no upfront payment)</li>
                  <li>Captain decides before money is involved</li>
                  <li>48-hour payment deadline after approval</li>
                  <li>Auto-cancels if payment not received</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auto">
          <Card>
            <CardHeader>
              <CardTitle>AUTO Flow (Pay-Then-Acknowledge)</CardTitle>
              <CardDescription>Angler pays upfront, captain acknowledges</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mermaid">
                {`sequenceDiagram
    participant Angler
    participant Market as fishon-market
    participant Payment as Payment Gateway
    participant Webhook
    participant Captain as fishon-captain
    
    Angler->>Market: Submit Booking + Payment
    Market->>Payment: Process Payment
    Payment->>Market: Payment Authorized
    Market->>Market: Create Booking (PAYMENT_AUTHORIZED)
    Market->>Webhook: Send booking.created event
    Webhook->>Captain: Notify Captain
    Market->>Angler: "Payment secured, awaiting captain"
    
    Note over Captain: Captain Reviews Payment
    
    alt Captain Acknowledges
        Captain->>Market: POST /api/bookings/:id/acknowledge
        Market->>Payment: Capture Payment
        Market->>Market: Update Status (PAID)
        Market->>Angler: Email "Booking Confirmed"
        Market->>Captain: Email "Booking Confirmed"
        Market->>Webhook: Send booking.acknowledged event
    else Captain Rejects
        Captain->>Market: POST /api/bookings/:id/reject
        alt Payment Type: TOKENIZED (Card)
            Market->>Payment: Release Token
            Market->>Market: Update Status (REJECTED)
            Market->>Angler: Email "Rejected - No charge"
            Note over Angler: Card never charged
        else Payment Type: DIRECT (FPX/E-wallet)
            Market->>Payment: Initiate Refund
            Market->>Market: Update Status (REJECTED)
            Market->>Angler: Email "Rejected - Refund in 3-5 days"
            Note over Angler: Refund processed
        end
    end
    
    style Market fill:#e3f2fd
    style Captain fill:#fff3e0
    style Payment fill:#f3e5f5`}
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Key Points:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Higher risk for angler (payment upfront)</li>
                  <li>Faster booking confirmation</li>
                  <li>Captain must acknowledge or reject quickly</li>
                  <li>Refund required if captain rejects (DIRECT flow)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Payment Flows</CardTitle>
              <CardDescription>TOKENIZED (card) vs DIRECT (FPX/e-wallet) payment processing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mermaid">
                {`graph TB
    A[Angler Selects Payment Method]
    
    A -->|Credit/Debit Card| B[TOKENIZED Flow]
    A -->|FPX/E-wallet| C[DIRECT Flow]
    
    subgraph "TOKENIZED Flow (Card)"
        B --> D[Card Tokenization]
        D --> E[Token Stored]
        E --> F{Captain Decision}
        F -->|Approve| G[Capture Token - Charge Card]
        F -->|Reject| H[Release Token - No Charge]
        G --> I[PAID Status]
        H --> J[REJECTED Status]
    end
    
    subgraph "DIRECT Flow (FPX/E-wallet)"
        C --> K[Immediate Payment]
        K --> L[Money Captured]
        L --> M{Captain Decision}
        M -->|Acknowledge| N[Confirm Payment]
        M -->|Reject| O[Initiate Refund]
        N --> P[PAID Status]
        O --> Q[REJECTED Status + Refund]
    end
    
    style B fill:#e3f2fd
    style C fill:#fff3e0
    style G fill:#c8e6c9
    style H fill:#ffcdd2
    style N fill:#c8e6c9
    style O fill:#ffcdd2`}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">TOKENIZED Flow</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
                    <li>Card tokenized, not charged</li>
                    <li>Lower angler risk</li>
                    <li>Token released if rejected</li>
                    <li>Message: &quot;Card will only be charged if approved&quot;</li>
                  </ul>
                </div>

                <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <h3 className="font-semibold mb-2 text-orange-900 dark:text-orange-100">DIRECT Flow</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-orange-800 dark:text-orange-200">
                    <li>Payment completed immediately</li>
                    <li>Higher angler risk</li>
                    <li>Refund required if rejected</li>
                    <li>Message: &quot;Refund in 3-5 business days if declined&quot;</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Integration</CardTitle>
              <CardDescription>Cross-app event propagation with retry logic</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mermaid">
                {`graph TB
    A[Booking Event in fishon-market]
    
    A --> B{Webhook Enabled?}
    B -->|Yes| C[Prepare Payload]
    B -->|No| D[Skip]
    
    C --> E[Send POST Request]
    E --> F[Add x-captain-secret Header]
    F --> G{Response Status}
    
    G -->|200 OK| H[Success - Log Event]
    G -->|4xx/5xx| I{Retry Attempts < 3?}
    
    I -->|Yes| J[Wait with Exponential Backoff]
    J --> K[Retry: 300ms, 600ms, 1200ms]
    K --> E
    
    I -->|No| L[Failed - Log Error]
    L --> M[Alert Admin]
    
    H --> N[fishon-captain Receives]
    N --> O[Validate Secret]
    O --> P{Secret Valid?}
    
    P -->|Yes| Q[Process Event]
    P -->|No| R[401 Unauthorized]
    
    Q --> S[Create/Update Booking]
    S --> T[Send Captain Notification]
    T --> U[Revalidate Dashboard Pages]
    
    style A fill:#e3f2fd
    style H fill:#c8e6c9
    style L fill:#ffcdd2
    style R fill:#ffcdd2
    style Q fill:#fff3e0`}
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Webhook Events:</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div><code className="bg-background px-2 py-1 rounded">booking.created</code> - New booking request</div>
                  <div><code className="bg-background px-2 py-1 rounded">booking.approved</code> - Captain approved (MANUAL)</div>
                  <div><code className="bg-background px-2 py-1 rounded">booking.acknowledged</code> - Captain acknowledged (AUTO)</div>
                  <div><code className="bg-background px-2 py-1 rounded">booking.paid</code> - Payment completed</div>
                  <div><code className="bg-background px-2 py-1 rounded">booking.rejected</code> - Captain rejected</div>
                  <div><code className="bg-background px-2 py-1 rounded">booking.cancelled</code> - Angler cancelled</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8 p-6 bg-muted rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Documentation Reference</h2>
        <p className="text-muted-foreground">
          For detailed API specifications, configuration, and troubleshooting, see{" "}
          <code className="bg-background px-2 py-1 rounded">/docs/config/BOOKING_SYSTEM.md</code>
        </p>
      </div>
    </div>
  );
}
