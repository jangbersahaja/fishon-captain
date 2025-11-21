"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MermaidDiagram } from "@/components/MermaidDiagram";

export default function AdminToolsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <Link href="/dev/config" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Config
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Admin Tools System</h1>
        <p className="text-muted-foreground text-lg">
          Staff and admin tools for content moderation and system management
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="video">Video Moderation</TabsTrigger>
          <TabsTrigger value="storage">Storage Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Admin Tools Architecture</CardTitle>
              <CardDescription>Staff and admin interfaces for platform management</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`graph TB
    subgraph "Admin Tools"
        A[Staff Dashboard]
        B[Charter Review]
        C[Video Moderation]
        D[Storage Inventory]
        E[User Management]
    end
    
    subgraph "Key Features"
        F[Charter Approval]
        G[Video Review]
        H[Orphaned Media Cleanup]
        I[User Role Management]
    end
    
    A --> B
    A --> C
    A --> D
    A --> E
    
    B --> F
    C --> G
    D --> H
    E --> I
    
    F --> J[(Database)]
    G --> J
    H --> K[Vercel Blob]
    I --> J
    
    style A fill:#e3f2fd
    style C fill:#fff3e0
    style D fill:#f3e5f5
    style J fill:#c8e6c9`} />

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Staff Tools (STAFF+):</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Charter registration review</li>
                    <li>Video content moderation</li>
                    <li>Customer support interface</li>
                    <li>Booking management</li>
                  </ul>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Admin Tools (ADMIN only):</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>User role management</li>
                    <li>Storage inventory & cleanup</li>
                    <li>System configuration</li>
                    <li>Analytics & reports</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="video">
          <Card>
            <CardHeader>
              <CardTitle>Video Moderation System</CardTitle>
              <CardDescription>Staff review and approval of captain videos</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`sequenceDiagram
    participant Captain
    participant System
    participant Video as Video Queue
    participant Staff
    participant Storage as Vercel Blob
    
    Captain->>System: Upload video
    System->>Video: Add to moderation queue
    Video->>Video: Status: PENDING_REVIEW
    
    Staff->>Video: Open moderation interface
    Video-->>Staff: List pending videos
    Staff->>Staff: Watch video
    
    alt Approve Video
        Staff->>Video: Approve
        Video->>Video: Status: APPROVED
        Video->>System: Notify captain
        System-->>Captain: Video approved
    else Reject Video
        Staff->>Video: Reject + Reason
        Video->>Video: Status: REJECTED
        Video->>Storage: Mark for deletion
        Video->>System: Notify captain
        System-->>Captain: Video rejected + reason
    else Flag for Review
        Staff->>Video: Flag + Notes
        Video->>Video: Status: FLAGGED
        Video->>System: Alert admin
    end
    
    style Video fill:#e3f2fd
    style Staff fill:#fff3e0
    style Storage fill:#f3e5f5`} />

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Moderation Criteria:</h3>
                <div className="grid gap-2 text-sm text-muted-foreground">
                  <div>✅ <strong>Approve if:</strong> Relevant fishing content, good quality, follows guidelines</div>
                  <div>❌ <strong>Reject if:</strong> Inappropriate content, misleading, poor quality</div>
                  <div>🚩 <strong>Flag if:</strong> Uncertain, needs admin review, potential policy violation</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage">
          <Card>
            <CardHeader>
              <CardTitle>Storage Inventory System</CardTitle>
              <CardDescription>Orphaned media detection and cleanup</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`graph TB
    A[Inventory Scan] --> B[Query Vercel Blob]
    B --> C[List All Media Files]
    
    C --> D{Check Database}
    
    D -->|Has Reference| E[Active Media]
    D -->|No Reference| F[Orphaned Media]
    
    F --> G{Age > 7 Days?}
    
    G -->|Yes| H[Mark for Deletion]
    G -->|No| I[Keep - Recent Upload]
    
    H --> J[Admin Review Queue]
    J --> K{Admin Decision}
    
    K -->|Confirm Delete| L[Delete from Blob]
    K -->|Keep| M[Add Exception]
    
    L --> N[Log Deletion]
    N --> O[Update Storage Report]
    
    E --> P[Active Files Report]
    I --> P
    M --> P
    
    style F fill:#fff3e0
    style H fill:#ffcdd2
    style L fill:#ffcdd2
    style P fill:#c8e6c9`} />

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Orphaned Media Causes:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Draft deleted before finalization</li>
                    <li>Upload interrupted mid-process</li>
                    <li>Video rejected after upload</li>
                    <li>Failed database transaction</li>
                  </ul>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Cleanup Policy:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Scan storage weekly</li>
                    <li>7-day grace period for orphans</li>
                    <li>Admin approval required</li>
                    <li>Keep deletion logs for audit</li>
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
          For detailed admin workflows and API documentation, see{" "}
          <code className="bg-background px-2 py-1 rounded">/docs/config/ADMIN_TOOLS_SYSTEM.md</code>
        </p>
      </div>
    </div>
  );
}
