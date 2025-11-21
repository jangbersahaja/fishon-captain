"use client";

import {
  Calendar,
  DollarSign,
  FileText,
  HelpCircle,
  MessageSquare,
  Settings,
} from "lucide-react";
import Link from "next/link";

/**
 * Props for QuickLinksSection
 *
 * @property adminUserId - Optional admin user ID to maintain query parameter across navigation
 */
interface QuickLinksSectionProps {
  adminUserId?: string;
}

interface QuickLinkItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

/**
 * QuickLinksSection - Row of quick-access navigation buttons
 *
 * Provides quick navigation to key dashboard sections and features.
 * Useful for captains to quickly jump to common tasks.
 *
 * Links:
 * - Bookings: View and manage all bookings
 * - Earnings: Financial overview and payout details
 * - Documents: Manage important documents and certifications
 * - Settings: Account and profile settings
 * - Messages: Angler communication
 * - Support: Help and support resources
 *
 * Admin Impersonation:
 * - If adminUserId provided, appends as query parameter to maintain admin context
 *
 * Styling:
 * - Horizontal flex layout
 * - Responsive: Scrollable on mobile, full grid on desktop
 * - Icon + label format
 * - Hover state with subtle shadow
 *
 * @example
 * ```tsx
 * <QuickLinksSection adminUserId={params?.adminUserId} />
 * ```
 */
export function QuickLinksSection({ adminUserId }: QuickLinksSectionProps) {
  const buildHref = (path: string): string => {
    if (adminUserId) {
      return `${path}?adminUserId=${adminUserId}`;
    }
    return path;
  };

  const quickLinks: QuickLinkItem[] = [
    {
      href: buildHref("/captain/bookings"),
      label: "Bookings",
      icon: <Calendar className="w-5 h-5" />,
      description: "Manage your bookings",
    },
    {
      href: buildHref("/captain/earnings"),
      label: "Earnings",
      icon: <DollarSign className="w-5 h-5" />,
      description: "View earnings & payouts",
    },
    {
      href: buildHref("/captain/documents"),
      label: "Documents",
      icon: <FileText className="w-5 h-5" />,
      description: "Manage documents",
    },
    {
      href: buildHref("/captain/settings"),
      label: "Settings",
      icon: <Settings className="w-5 h-5" />,
      description: "Account settings",
    },
    {
      href: buildHref("/captain/messages"),
      label: "Messages",
      icon: <MessageSquare className="w-5 h-5" />,
      description: "View messages",
    },
    {
      href: buildHref("/captain/support"),
      label: "Support",
      icon: <HelpCircle className="w-5 h-5" />,
      description: "Get help",
    },
  ];

  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl p-6"
      role="navigation"
      aria-label="Quick access navigation"
    >
      <h3 className="text-base font-semibold text-slate-900 mb-4">
        Quick Access
      </h3>

      {/* Links Grid - Responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {quickLinks.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:ring-offset-2"
            aria-label={link.description}
          >
            <div
              className="text-slate-600 group-hover:text-[#ec2227] transition-colors duration-200"
              aria-hidden="true"
            >
              {link.icon}
            </div>
            <span className="text-xs font-semibold text-slate-700 text-center group-hover:text-slate-900 transition-colors duration-200">
              {link.label}
            </span>
            <span className="text-xs text-slate-500 text-center hidden group-hover:block transition-opacity duration-200">
              {link.description}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
