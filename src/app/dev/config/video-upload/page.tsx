"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";

export default function VideoUploadPage() {
  useEffect(() => {
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
        <h1 className="text-4xl font-bold mb-2">Video Upload System</h1>
        <p className="text-muted-foreground text-lg">
          Queue-based upload with trimming, normalization, and external worker integration
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Upload Flow</TabsTrigger>
          <TabsTrigger value="queue">Queue System</TabsTrigger>
          <TabsTrigger value="trim">Video Trimming</TabsTrigger>
          <TabsTrigger value="worker">External Worker</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Complete Upload Flow</CardTitle>
              <CardDescription>From selection to normalization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mermaid">
                {`graph TD
    A[User Selects Video] --> B{Check Duration & Size}
    
    B -->|>30s| C[Open Trim Modal]
    B -->|≤30s & ≤100MB| D[Add to Queue]
    B -->|>100MB| E[Show Error]
    
    C --> F[User Trims to ≤30s]
    F --> D
    
    D --> G[IndexedDB Storage]
    G --> H[Upload to Vercel Blob]
    
    H --> I{Upload Success?}
    I -->|No| J[Retry with Backoff]
    I -->|Yes| K[POST /api/blob/finish]
    
    J --> L{Retries < 3?}
    L -->|Yes| H
    L -->|No| M[Mark Failed]
    
    K --> N[Probe with ffprobe]
    N --> O{Needs Processing?}
    
    O -->|Yes| P[Create CaptainVideo]
    O -->|No| Q[Bypass - Use Original]
    
    P --> R[Status: queued]
    R --> S[POST /api/videos/queue]
    S --> T[Send to External Worker]
    
    T --> U[Worker Normalizes]
    U --> V[Worker Generates Thumbnail]
    V --> W[POST /api/videos/normalize-callback]
    W --> X[Status: ready]
    
    Q --> Y[Status: ready]
    Y --> Z[didFallback: false]
    
    style A fill:#e3f2fd
    style X fill:#c8e6c9
    style Y fill:#c8e6c9
    style E fill:#ffcdd2
    style M fill:#ffcdd2`}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <CardTitle>Queue Management</CardTitle>
              <CardDescription>IndexedDB persistence with retry logic and concurrency control</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mermaid">
                {`stateDiagram-v2
    [*] --> Pending: Add to Queue
    
    Pending --> Uploading: Start Upload (if slots available)
    Pending --> Waiting: Queue Full (max 3 concurrent)
    
    Waiting --> Uploading: Slot Available
    
    Uploading --> Processing: Upload Complete
    Uploading --> Failed: Upload Error
    
    Failed --> Uploading: Retry (attempts < 3)
    Failed --> [*]: Max Retries Reached
    
    Processing --> Completed: Finish Success
    Processing --> Failed: Finish Error
    
    Completed --> [*]: Remove from Queue
    
    note right of Pending
        IndexedDB Storage
        Survives page refresh
    end note
    
    note right of Uploading
        3-phase: create → 
        multipart chunks → 
        finish
    end note
    
    note right of Failed
        Exponential backoff:
        1s → 2s → 4s → 8s
    end note`}
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Queue Features:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li><strong>Persistence:</strong> IndexedDB stores queue state across page refreshes</li>
                  <li><strong>Concurrency:</strong> Max 3 simultaneous uploads to prevent overload</li>
                  <li><strong>Retry Policy:</strong> Up to 3 attempts with exponential backoff</li>
                  <li><strong>Resumption:</strong> Incomplete uploads resume automatically</li>
                  <li><strong>Atomic Updates:</strong> State changes are transaction-safe</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trim">
          <Card>
            <CardHeader>
              <CardTitle>Video Trimming UI</CardTitle>
              <CardDescription>WhatsApp-style trim interface with real-time preview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mermaid">
                {`graph LR
    A[Video >30s Detected] --> B[Open Trim Modal]
    
    B --> C[Load Video in Player]
    C --> D[Show Timeline with Handles]
    
    D --> E[User Drags Handles]
    E --> F[Calculate Duration]
    F --> G{Duration ≤30s?}
    
    G -->|No| H[Show Warning]
    H --> E
    
    G -->|Yes| I[Estimate File Size]
    I --> J[Show Size Preview]
    J --> K[Enable Trim Button]
    
    K --> L[User Clicks Trim]
    L --> M[Client-side MP4 Slicing]
    M --> N[Create Trimmed Blob]
    N --> O[Add to Upload Queue]
    
    style B fill:#e3f2fd
    style M fill:#fff3e0
    style O fill:#c8e6c9
    style H fill:#ffcdd2`}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Trim Features:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Drag handles to select start/end</li>
                    <li>Real-time duration display</li>
                    <li>Bitrate-based size estimation</li>
                    <li>30-second maximum enforcement</li>
                    <li>Client-side processing (no upload)</li>
                  </ul>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Size Estimation:</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Formula: <code className="bg-background px-1 rounded">bitrate × duration / 8</code>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Example: 5 Mbps video trimmed to 20s = ~12.5 MB
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="worker">
          <Card>
            <CardHeader>
              <CardTitle>External Worker Integration</CardTitle>
              <CardDescription>QStash-based normalization with callback</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mermaid">
                {`sequenceDiagram
    participant Captain as fishon-captain
    participant Queue as /api/videos/queue
    participant QStash
    participant Worker as External Worker
    participant Blob as Vercel Blob
    participant Callback as /api/videos/normalize-callback
    
    Captain->>Queue: POST with videoId
    Queue->>Queue: Update status: processing
    
    alt Worker URL Configured
        Queue->>QStash: Enqueue Job
        QStash->>Worker: POST /api/worker-normalize
        
        Note over Worker: Download original video
        Worker->>Blob: GET originalBlobKey
        Blob-->>Worker: Video file
        
        Note over Worker: ffmpeg normalization
        Worker->>Worker: Convert to 720p H.264
        Worker->>Worker: Generate thumbnail
        
        Note over Worker: Upload results
        Worker->>Blob: PUT normalized video
        Worker->>Blob: PUT thumbnail
        Blob-->>Worker: New blob keys
        
        Worker->>Callback: POST with results
        Note over Worker,Callback: VIDEO_WORKER_SECRET auth
        
        Callback->>Callback: Update CaptainVideo
        Callback->>Callback: Set ready720pBlobKey
        Callback->>Callback: Set thumbnailBlobKey
        Callback->>Callback: Status: ready
        Callback-->>Worker: 200 OK
    else No Worker URL
        Queue->>Queue: Fallback to original
        Queue->>Queue: Status: ready
        Queue->>Queue: didFallback: true
    end
    
    style Worker fill:#e3f2fd
    style Callback fill:#c8e6c9`}
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Worker Configuration:</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div><code className="bg-background px-2 py-1 rounded">EXTERNAL_WORKER_URL</code> - Worker endpoint URL</div>
                  <div><code className="bg-background px-2 py-1 rounded">VIDEO_WORKER_SECRET</code> - Shared authentication secret</div>
                  <div><code className="bg-background px-2 py-1 rounded">VERCEL_BLOB_READ_WRITE_TOKEN</code> - Blob storage access</div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  <strong>Production:</strong> Uses QStash for async job processing
                  <br />
                  <strong>Development:</strong> Direct HTTP calls to worker
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8 p-6 bg-muted rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Documentation Reference</h2>
        <p className="text-muted-foreground">
          For implementation details, see{" "}
          <code className="bg-background px-2 py-1 rounded">/docs/config/VIDEO_UPLOAD_SYSTEM.md</code>
        </p>
      </div>
    </div>
  );
}
