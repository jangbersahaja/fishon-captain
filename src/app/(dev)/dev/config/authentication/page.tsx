"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MermaidDiagram } from "@/components/MermaidDiagram";

export default function AuthenticationPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <Link href="/dev/config" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Config
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Authentication System</h1>
        <p className="text-muted-foreground text-lg">
          NextAuth-based authentication with OAuth providers and role-based access
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="oauth">OAuth Flow</TabsTrigger>
          <TabsTrigger value="roles">Role-Based Access</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Architecture</CardTitle>
              <CardDescription>NextAuth v5 with Prisma adapter and JWT strategy</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`graph TB
    subgraph "Authentication Stack"
        A[NextAuth v5]
        B[Prisma Adapter]
        C[JWT Strategy]
    end
    
    subgraph "Providers"
        D[Google OAuth]
        E[Email/Password]
    end
    
    subgraph "Session Management"
        F[JWT Token]
        G[HTTP-Only Cookie]
        H[Session Store]
    end
    
    subgraph "Authorization"
        I[Role Claims]
        J[Middleware Gates]
        K[API Guards]
    end
    
    A --> B
    A --> C
    D --> A
    E --> A
    
    C --> F
    F --> G
    B --> H
    
    F --> I
    I --> J
    I --> K
    
    style A fill:#e3f2fd
    style D fill:#fff3e0
    style I fill:#c8e6c9`} />

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Roles</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>CAPTAIN - Charter operators</li>
                    <li>STAFF - Support team</li>
                    <li>ADMIN - Full access</li>
                  </ul>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Protected Routes</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>/captain/* - CAPTAIN+</li>
                    <li>/staff/* - STAFF+</li>
                    <li>/admin/* - ADMIN only</li>
                  </ul>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Session</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>JWT tokens</li>
                    <li>30-day expiry</li>
                    <li>HTTP-only cookies</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="oauth">
          <Card>
            <CardHeader>
              <CardTitle>OAuth Authentication Flow</CardTitle>
              <CardDescription>Google OAuth with account linking</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`sequenceDiagram
    participant User
    participant App as fishon-captain
    participant NextAuth
    participant Google
    participant DB
    
    User->>App: Click "Sign in with Google"
    App->>NextAuth: Initiate OAuth flow
    NextAuth->>Google: Redirect to consent screen
    Google->>User: Show permissions dialog
    User->>Google: Approve access
    Google->>NextAuth: Authorization code
    NextAuth->>Google: Exchange for access token
    Google-->>NextAuth: User profile data
    
    NextAuth->>DB: Check if user exists
    
    alt New User
        DB-->>NextAuth: User not found
        NextAuth->>DB: Create User + Account
        DB-->>NextAuth: User created
    else Existing User
        DB-->>NextAuth: User found
        NextAuth->>DB: Link new account
    end
    
    NextAuth->>NextAuth: Generate JWT
    NextAuth->>NextAuth: Encode role claims
    NextAuth-->>App: Set session cookie
    App-->>User: Redirect to dashboard
    
    style NextAuth fill:#e3f2fd
    style Google fill:#fff3e0
    style DB fill:#c8e6c9`} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle>Role-Based Access Control</CardTitle>
              <CardDescription>Middleware-based route protection</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidDiagram chart={`graph TB
    A[Request] --> B[Middleware]
    B --> C{Route Pattern}
    
    C -->|/captain/*| D{Has CAPTAIN Role?}
    C -->|/staff/*| E{Has STAFF Role?}
    C -->|/admin/*| F{Has ADMIN Role?}
    C -->|/public/*| G[Allow]
    
    D -->|Yes| H[Allow + Set Headers]
    D -->|No| I[Redirect to /auth/signin]
    
    E -->|Yes| H
    E -->|No| I
    
    F -->|Yes| H
    F -->|No| I
    
    H --> J[Next Handler]
    J --> K{API Route?}
    
    K -->|Yes| L[Check Role in Handler]
    K -->|No| M[Render Page]
    
    L --> N{Authorized?}
    N -->|Yes| O[Execute Logic]
    N -->|No| P[Return 403]
    
    style B fill:#e3f2fd
    style H fill:#c8e6c9
    style I fill:#ffcdd2
    style P fill:#ffcdd2`} />

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Access Matrix:</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Route</th>
                        <th className="text-center p-2">CAPTAIN</th>
                        <th className="text-center p-2">STAFF</th>
                        <th className="text-center p-2">ADMIN</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b">
                        <td className="p-2">/captain/dashboard</td>
                        <td className="text-center">✅</td>
                        <td className="text-center">✅</td>
                        <td className="text-center">✅</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2">/staff/registrations</td>
                        <td className="text-center">❌</td>
                        <td className="text-center">✅</td>
                        <td className="text-center">✅</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2">/admin/users</td>
                        <td className="text-center">❌</td>
                        <td className="text-center">❌</td>
                        <td className="text-center">✅</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8 p-6 bg-muted rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Documentation Reference</h2>
        <p className="text-muted-foreground">
          For detailed configuration and security best practices, see{" "}
          <code className="bg-background px-2 py-1 rounded">/docs/config/AUTHENTICATION_SYSTEM.md</code>
        </p>
      </div>
    </div>
  );
}
