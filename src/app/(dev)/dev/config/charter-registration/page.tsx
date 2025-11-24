"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MermaidDiagram } from "@/components/MermaidDiagram";

export default function CharterRegistrationPage() {

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <Link href="/dev/config" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Config
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Charter Registration System</h1>
        <p className="text-muted-foreground text-lg">
          Multi-step wizard with draft management and media upload
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Registration Flow</TabsTrigger>
          <TabsTrigger value="draft">Draft Management</TabsTrigger>
          <TabsTrigger value="media">Media Upload</TabsTrigger>
          <TabsTrigger value="video">Video Processing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Registration Flow (8 Steps)</CardTitle>
              <CardDescription>Multi-step wizard with validation and live preview</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`graph TD
    A[Start Registration] --> B[Step 1: Basic Info]
    B --> C[Step 2: Boat Details]
    C --> D[Step 3: Trip Details]
    D --> E[Step 4: Availability]
    E --> F[Step 5: Policies]
    F --> G[Step 6: Media Upload]
    G --> H[Step 7: Contact & Verification]
    H --> I[Step 8: Review & Submit]
    
    B -.->|Auto-save| J[Draft Storage]
    C -.->|Auto-save| J
    D -.->|Auto-save| J
    E -.->|Auto-save| J
    F -.->|Auto-save| J
    G -.->|Auto-save| J
    H -.->|Auto-save| J
    
    I -->|Finalize| K{Validation}
    K -->|Pass| L[Create Charter]
    K -->|Fail| M[Show Errors]
    M --> I
    
    L --> N[Link Media]
    N --> O[Create Captain Profile]
    O --> P[Mark Draft SUBMITTED]
    P --> Q[Charter Created!]
    
    J -.->|Resume| R[Load Draft]
    R --> B
    
    style A fill:#e3f2fd
    style L fill:#c8e6c9
    style Q fill:#c8e6c9
    style M fill:#ffcdd2
    style J fill:#fff3e0`} />

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Step Details:</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li><strong>Step 1:</strong> Charter name, type, description, location</li>
                    <li><strong>Step 2:</strong> Boat name, type, capacity, amenities</li>
                    <li><strong>Step 3:</strong> Trip types, duration, pricing, species</li>
                    <li><strong>Step 4:</strong> Operating days, hours, seasonal availability</li>
                    <li><strong>Step 5:</strong> Cancellation, weather policies, rules</li>
                    <li><strong>Step 6:</strong> Photos (min 3) and videos (max 5)</li>
                    <li><strong>Step 7:</strong> Phone, email, captain license</li>
                    <li><strong>Step 8:</strong> Live preview and final validation</li>
                  </ul>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Key Features:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Auto-save on every step change</li>
                    <li>Optimistic locking prevents conflicts</li>
                    <li>Step-specific Zod validation</li>
                    <li>Resume from any step</li>
                    <li>Live charter preview</li>
                    <li>Edit mode support</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="draft">
          <Card>
            <CardHeader>
              <CardTitle>Draft Management</CardTitle>
              <CardDescription>Auto-save with optimistic locking and conflict resolution</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`sequenceDiagram
    participant User
    participant Form
    participant LocalStorage
    participant API
    participant DB
    
    User->>Form: Start Registration
    Form->>API: POST /api/charter-drafts
    API->>DB: Create Draft (version: 1)
    DB-->>API: draftId
    API-->>Form: draftId, version: 1
    
    loop Every Step Change
        User->>Form: Fill Step Data
        Form->>LocalStorage: Save Snapshot
        Form->>API: PATCH /api/charter-drafts/:id
        Note over Form,API: x-draft-version: 1
        
        alt Version Match
            API->>DB: Update Draft (version: 2)
            DB-->>API: Success
            API-->>Form: version: 2
            Form->>Form: Update Local Version
        else Version Conflict
            API-->>Form: 409 Conflict + Server Data
            Form->>User: Show Conflict Dialog
            User->>Form: Choose: Keep Local or Use Server
            alt Keep Local
                Form->>API: Force Update with Current Version
            else Use Server
                Form->>Form: Load Server Data
                Form->>LocalStorage: Clear Local
            end
        end
    end
    
    User->>Form: Submit Final Step
    Form->>API: POST /api/charter-drafts/:id/finalize
    API->>API: Validate All Fields
    API->>DB: Create Charter + CaptainProfile
    API->>DB: Associate Media
    API->>DB: Mark Draft SUBMITTED
    DB-->>API: charterId
    API-->>Form: Success
    Form->>User: Redirect to Charter Dashboard
    
    style API fill:#e3f2fd
    style DB fill:#fff3e0`} />

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Conflict Resolution:</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  When the same draft is edited in multiple tabs or devices, version conflicts are detected and resolved:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li><strong>Client sends:</strong> x-draft-version header with current version</li>
                  <li><strong>Server validates:</strong> Checks if clientVersion matches serverVersion</li>
                  <li><strong>On conflict:</strong> Returns 409 with server data and version</li>
                  <li><strong>User chooses:</strong> Keep local changes or use server version</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media">
          <Card>
            <CardHeader>
              <CardTitle>Media Upload Flow</CardTitle>
              <CardDescription>Direct Vercel Blob uploads with validation</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`graph TD
    A[User Selects Media] --> B{Media Type}
    
    B -->|Photos| C[Photo Validation]
    B -->|Videos| D[Video Validation]
    
    C --> E{Valid?}
    E -->|Yes| F[Upload to Vercel Blob]
    E -->|No| G[Show Error]
    
    D --> H{Duration & Size}
    H -->|>30s| I[Show Trim Modal]
    H -->|≤30s & ≤100MB| F
    H -->|Too Large| G
    
    I --> J[User Trims Video]
    J --> F
    
    F --> K[Store Blob URL]
    K --> L[Add to Form State]
    
    L --> M[Continue Registration]
    M --> N[Step 8: Finalize]
    
    N --> O[POST /api/charter-drafts/:id/finalize]
    O --> P[Link Media to Charter]
    P --> Q[Create CharterMedia Records]
    Q --> R[For Videos: Create CaptainVideo]
    R --> S[Enqueue Video Processing]
    
    style F fill:#e3f2fd
    style Q fill:#c8e6c9
    style G fill:#ffcdd2`} />

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">Photo Constraints</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
                    <li>Minimum: 3 photos required</li>
                    <li>Maximum: 20 photos allowed</li>
                    <li>Max size: 5MB per photo</li>
                    <li>Formats: JPG, PNG, WEBP</li>
                    <li>Min dimensions: 800x600</li>
                  </ul>
                </div>

                <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <h3 className="font-semibold mb-2 text-orange-900 dark:text-orange-100">Video Constraints</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-orange-800 dark:text-orange-200">
                    <li>Maximum: 5 videos allowed</li>
                    <li>Max duration: 30 seconds</li>
                    <li>Max size: 100MB per video</li>
                    <li>Formats: MP4, MOV, WEBM</li>
                    <li>Output: 720p H.264 MP4</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="video">
          <Card>
            <CardHeader>
              <CardTitle>Video Processing Pipeline</CardTitle>
              <CardDescription>External worker integration with queue and status tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`graph TB
    A[Video Upload Complete] --> B[POST /api/blob/finish]
    
    B --> C[Probe with ffprobe]
    C --> D{Needs Normalization?}
    
    D -->|Yes: >720p or non-H264| E[Create CaptainVideo]
    D -->|No: ≤720p & H264| F[Bypass - Use Original]
    
    E --> G[Status: queued]
    G --> H[Add to IndexedDB Queue]
    H --> I[POST /api/videos/queue]
    
    I --> J{Worker Available?}
    J -->|Yes| K[Send to External Worker]
    J -->|No| L[Queue for Retry]
    
    K --> M[Worker: Normalize to 720p]
    M --> N[Worker: Generate Thumbnail]
    N --> O[Worker: Upload to Blob]
    O --> P[POST /api/videos/normalize-callback]
    
    P --> Q[Update CaptainVideo]
    Q --> R[Status: ready]
    R --> S[Set ready720pBlobKey]
    
    L --> T{Retry Attempts < 3?}
    T -->|Yes| U[Exponential Backoff]
    U --> I
    T -->|No| V[Status: failed]
    
    F --> W[Status: ready]
    W --> X[Use originalBlobKey]
    
    style E fill:#e3f2fd
    style R fill:#c8e6c9
    style V fill:#ffcdd2
    style W fill:#c8e6c9`} />

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Video Status Flow:</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div><code className="bg-background px-2 py-1 rounded">queued</code> → Initial state after upload</div>
                  <div><code className="bg-background px-2 py-1 rounded">processing</code> → Worker is normalizing</div>
                  <div><code className="bg-background px-2 py-1 rounded">ready</code> → Video is ready to use</div>
                  <div><code className="bg-background px-2 py-1 rounded">failed</code> → Processing failed (retryable)</div>
                  <div><code className="bg-background px-2 py-1 rounded">cancelled</code> → User deleted during processing</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8 p-6 bg-muted rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Documentation Reference</h2>
        <p className="text-muted-foreground">
          For detailed implementation, see{" "}
          <code className="bg-background px-2 py-1 rounded">/docs/config/CHARTER_REGISTRATION_SYSTEM.md</code>
        </p>
      </div>
    </div>
  );
}
