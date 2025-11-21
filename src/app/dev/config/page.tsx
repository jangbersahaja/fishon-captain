import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Settings, Users, Video, Calendar, DollarSign, Shield, Briefcase, Mail, Rocket } from "lucide-react";

export const metadata = {
  title: "System Configuration Documentation",
  description: "Visual documentation for all Fishon Captain features",
};

const features = [
  {
    title: "Charter Registration System",
    description: "Multi-step wizard, draft management, media upload pipeline",
    href: "/dev/config/charter-registration",
    icon: BookOpen,
    color: "text-blue-600",
  },
  {
    title: "Booking System",
    description: "Dual flows (MANUAL/AUTO), payment integration, webhook orchestration",
    href: "/dev/config/booking-system",
    icon: Calendar,
    color: "text-green-600",
  },
  {
    title: "Email & Notification System",
    description: "Flow-aware messaging, email templates, push notifications",
    href: "/dev/config/email-notification",
    icon: Mail,
    color: "text-purple-600",
  },
  {
    title: "Dashboard & Analytics",
    description: "Real-time metrics, KPIs, priority alerts",
    href: "/dev/config/dashboard-analytics",
    icon: Settings,
    color: "text-orange-600",
  },
  {
    title: "Video Upload System",
    description: "Queue-based upload, trimming, normalization worker",
    href: "/dev/config/video-upload",
    icon: Video,
    color: "text-red-600",
  },
  {
    title: "Operational Calendar",
    description: "Availability management, scheduling",
    href: "/dev/config/operational-calendar",
    icon: Calendar,
    color: "text-teal-600",
  },
  {
    title: "Captain Payout System",
    description: "Earnings calculation, payout schedules",
    href: "/dev/config/captain-payout",
    icon: DollarSign,
    color: "text-yellow-600",
  },
  {
    title: "Authentication System",
    description: "OAuth, MFA, password flows",
    href: "/dev/config/authentication",
    icon: Shield,
    color: "text-indigo-600",
  },
  {
    title: "Admin Tools",
    description: "Video moderation, storage inventory",
    href: "/dev/config/admin-tools",
    icon: Briefcase,
    color: "text-pink-600",
  },
  {
    title: "Deployment Guide",
    description: "Setup, migrations, monitoring",
    href: "/dev/config/deployment",
    icon: Rocket,
    color: "text-cyan-600",
  },
];

export default function ConfigPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">System Configuration Documentation</h1>
        <p className="text-muted-foreground text-lg">
          Visual flowcharts and diagrams for all Fishon Captain features
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link key={feature.href} href={feature.href}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Icon className={`w-6 h-6 ${feature.color}`} />
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </div>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-12 p-6 bg-muted rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">About This Documentation</h2>
        <p className="text-muted-foreground mb-4">
          This section provides visual flowcharts and diagrams for all major systems in the Fishon Captain application.
          Each page includes:
        </p>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li>System architecture diagrams</li>
          <li>Process flow charts using Mermaid</li>
          <li>Data flow visualizations</li>
          <li>Integration points between systems</li>
        </ul>
        <p className="text-muted-foreground mt-4">
          <strong>Note:</strong> This is a development tool. The detailed markdown documentation is available in{" "}
          <code className="bg-background px-2 py-1 rounded">/docs/config/</code>
        </p>
      </div>
    </div>
  );
}
