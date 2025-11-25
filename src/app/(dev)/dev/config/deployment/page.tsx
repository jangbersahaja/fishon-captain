"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MermaidDiagram } from "@/components/MermaidDiagram";

export default function DeploymentPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <Link href="/dev/config" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Config
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Deployment Guide</h1>
        <p className="text-muted-foreground text-lg">
          Production deployment setup, environment configuration, and monitoring
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Deployment Overview</TabsTrigger>
          <TabsTrigger value="setup">Environment Setup</TabsTrigger>
          <TabsTrigger value="cicd">CI/CD Pipeline</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Deployment Architecture</CardTitle>
              <CardDescription>Vercel hosting with Neon PostgreSQL and external services</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`graph TB
    subgraph "Source Control"
        A[GitHub Repository]
        B[Main Branch]
        C[Development Branch]
    end
    
    subgraph "CI/CD"
        D[GitHub Actions]
        E[Vercel Build]
    end
    
    subgraph "Hosting"
        F[Vercel Edge Network]
        G[Next.js App]
    end
    
    subgraph "Data Layer"
        H[(Neon PostgreSQL)]
        I[Vercel Blob Storage]
    end
    
    subgraph "External Services"
        J[Pusher - Real-time]
        K[Zoho - Email SMTP]
        L[QStash - Video Queue]
    end
    
    A --> D
    B --> E
    C --> E
    
    D --> E
    E --> F
    F --> G
    
    G --> H
    G --> I
    G --> J
    G --> K
    G --> L
    
    style F fill:#e3f2fd
    style H fill:#c8e6c9
    style G fill:#fff3e0`} />

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Hosting</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>Vercel Pro plan</li>
                    <li>Edge network CDN</li>
                    <li>Automatic HTTPS</li>
                    <li>Custom domain</li>
                  </ul>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Database</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>Neon PostgreSQL</li>
                    <li>Serverless driver</li>
                    <li>Auto-scaling</li>
                    <li>Point-in-time restore</li>
                  </ul>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Storage</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>Vercel Blob</li>
                    <li>Global CDN</li>
                    <li>Signed URLs</li>
                    <li>Auto-optimization</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup">
          <Card>
            <CardHeader>
              <CardTitle>Environment Configuration</CardTitle>
              <CardDescription>Required environment variables and secrets</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`graph TB
    A[Environment Variables] --> B{Category}
    
    B -->|Database| C[DATABASE_URL]
    B -->|Auth| D[NextAuth Config]
    B -->|Storage| E[Blob Config]
    B -->|External| F[API Keys]
    
    C --> G[Neon Connection String]
    
    D --> H[NEXTAUTH_SECRET]
    D --> I[NEXTAUTH_URL]
    D --> J[GOOGLE_CLIENT_ID]
    D --> K[GOOGLE_CLIENT_SECRET]
    
    E --> L[BLOB_READ_WRITE_TOKEN]
    
    F --> M[PUSHER_* Keys]
    F --> N[ZOHO_* Credentials]
    F --> O[QSTASH_* Config]
    F --> P[GOOGLE_MAPS_API_KEY]
    
    G --> Q[Vercel Env]
    H --> Q
    I --> Q
    J --> Q
    K --> Q
    L --> Q
    M --> Q
    N --> Q
    O --> Q
    P --> Q
    
    Q --> R[Deployment]
    
    style A fill:#e3f2fd
    style Q fill:#c8e6c9
    style R fill:#fff3e0`} />

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Essential Environment Variables:</h3>
                <div className="space-y-2 text-sm font-mono bg-background p-3 rounded">
                  <div><strong>Database:</strong></div>
                  <div className="text-muted-foreground">DATABASE_URL=postgresql://...</div>
                  
                  <div className="mt-3"><strong>Authentication:</strong></div>
                  <div className="text-muted-foreground">NEXTAUTH_SECRET=...</div>
                  <div className="text-muted-foreground">NEXTAUTH_URL=https://...</div>
                  <div className="text-muted-foreground">GOOGLE_CLIENT_ID=...</div>
                  <div className="text-muted-foreground">GOOGLE_CLIENT_SECRET=...</div>
                  
                  <div className="mt-3"><strong>Storage:</strong></div>
                  <div className="text-muted-foreground">BLOB_READ_WRITE_TOKEN=...</div>
                  
                  <div className="mt-3"><strong>External Services:</strong></div>
                  <div className="text-muted-foreground">PUSHER_APP_ID=...</div>
                  <div className="text-muted-foreground">ZOHO_SMTP_USER=...</div>
                  <div className="text-muted-foreground">QSTASH_URL=...</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cicd">
          <Card>
            <CardHeader>
              <CardTitle>CI/CD Pipeline</CardTitle>
              <CardDescription>Automated testing, building, and deployment</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`sequenceDiagram
    participant Dev as Developer
    participant GH as GitHub
    participant Actions as GitHub Actions
    participant Vercel
    participant Neon as Neon DB
    
    Dev->>GH: Push to branch
    GH->>Actions: Trigger workflow
    
    Actions->>Actions: Install dependencies
    Actions->>Actions: Run type check
    Actions->>Actions: Run linter
    Actions->>Actions: Run tests
    
    alt Tests Pass
        Actions->>Vercel: Trigger deployment
        Vercel->>Vercel: Build Next.js app
        
        alt Production Branch
            Vercel->>Neon: Run migrations
            Neon-->>Vercel: Migration complete
            Vercel->>Vercel: Deploy to production
            Vercel-->>GH: Deployment URL
        else Preview Branch
            Vercel->>Vercel: Deploy preview
            Vercel-->>GH: Preview URL
        end
        
        GH-->>Dev: Build successful ✅
    else Tests Fail
        Actions-->>GH: Build failed ❌
        GH-->>Dev: Fix required
    end
    
    style Actions fill:#e3f2fd
    style Vercel fill:#fff3e0
    style Neon fill:#c8e6c9`} />

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Deployment Flow:</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div><strong>Step 1:</strong> Code pushed to GitHub triggers CI pipeline</div>
                  <div><strong>Step 2:</strong> GitHub Actions runs tests and linting</div>
                  <div><strong>Step 3:</strong> Vercel builds Next.js application</div>
                  <div><strong>Step 4:</strong> Database migrations run (production only)</div>
                  <div><strong>Step 5:</strong> Deploy to Vercel edge network</div>
                  <div><strong>Step 6:</strong> Health checks and smoke tests</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring">
          <Card>
            <CardHeader>
              <CardTitle>Monitoring & Observability</CardTitle>
              <CardDescription>Application health, performance, and error tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`graph TB
    A[Application] --> B[Monitoring Stack]
    
    B --> C[Vercel Analytics]
    B --> D[Neon Monitoring]
    B --> E[Application Logs]
    
    C --> F[Web Vitals]
    C --> G[Core Web Vitals]
    C --> H[User Experience]
    
    D --> I[Query Performance]
    D --> J[Connection Pool]
    D --> K[Database Size]
    
    E --> L[Error Logs]
    E --> M[Request Logs]
    E --> N[Audit Logs]
    
    F --> O[Alerts]
    G --> O
    I --> O
    L --> O
    
    O --> P{Threshold Exceeded?}
    
    P -->|Yes| Q[Send Alert]
    P -->|No| R[Continue Monitoring]
    
    Q --> S[Email to Team]
    Q --> T[Dashboard Notification]
    
    style B fill:#e3f2fd
    style O fill:#fff3e0
    style Q fill:#ffcdd2
    style R fill:#c8e6c9`} />

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Key Metrics:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Response time & latency</li>
                    <li>Error rate & 5xx responses</li>
                    <li>Database query performance</li>
                    <li>API endpoint health</li>
                    <li>User session analytics</li>
                  </ul>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Alert Conditions:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Error rate {'>'}5%</li>
                    <li>Response time {'>'}3s</li>
                    <li>Database CPU {'>'}80%</li>
                    <li>Failed deployments</li>
                    <li>Certificate expiry warnings</li>
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
          For detailed deployment steps, troubleshooting, and maintenance procedures, see{" "}
          <code className="bg-background px-2 py-1 rounded">/docs/config/DEPLOYMENT_GUIDE.md</code>
        </p>
      </div>
    </div>
  );
}
