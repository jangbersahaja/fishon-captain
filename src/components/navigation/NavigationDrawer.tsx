"use client";

import {
  BarChart3,
  Bell,
  Calendar,
  IdCard,
  Image as ImageIcon,
  LayoutDashboard,
  LifeBuoy,
  MessageCircle,
  Settings as SettingsIcon,
  Ship,
  Star,
  User,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

type NavLink = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
};

type NavSection = {
  label: string;
  links: NavLink[];
};

const navSections: NavSection[] = [
  {
    label: "Dashboard",
    links: [{ href: "/captain", label: "Overview", Icon: LayoutDashboard }],
  },
  {
    label: "Business",
    links: [
      { href: "/captain/charters", label: "Charters", Icon: Ship },
      { href: "/captain/boats", label: "Boats", Icon: Ship },
      { href: "/captain/trips", label: "Trips", Icon: Calendar },
      { href: "/captain/bookings", label: "Bookings", Icon: Calendar },
      { href: "/captain/bookings/calendar", label: "Calendar", Icon: Calendar },
      { href: "/captain/reviews", label: "Reviews", Icon: Star },
    ],
  },
  {
    label: "Communication",
    links: [
      { href: "/captain/messages", label: "Messages", Icon: MessageCircle },
      { href: "/captain/notifications", label: "Notifications", Icon: Bell },
    ],
  },
  {
    label: "Analytics",
    links: [
      { href: "/captain/analytics", label: "Analytics", Icon: BarChart3 },
    ],
  },
  {
    label: "Resources",
    links: [
      { href: "/captain/media", label: "Media", Icon: ImageIcon },
      { href: "/captain/documents", label: "Documents", Icon: IdCard },
    ],
  },
  {
    label: "Team",
    links: [
      { href: "/captain/profile", label: "Profile", Icon: User },
      { href: "/captain/crew", label: "Crew", Icon: Users },
    ],
  },
  {
    label: "Account",
    links: [
      { href: "/captain/settings", label: "Settings", Icon: SettingsIcon },
      { href: "/captain/support", label: "Support", Icon: LifeBuoy },
    ],
  },
];

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  captainName?: string;
  captainEmail?: string;
  captainImage?: string;
}
export function NavigationDrawer(props: NavigationDrawerProps) {
  const {
    isOpen,
    onClose,
    captainName = "Captain",
    captainEmail,
    captainImage,
  } = props;
  const pathname = usePathname();
  const active = pathname?.replace(/\/$/, "") || "";

  // Close drawer on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const isActive = (href: string) => {
    if (href === "/captain") {
      return active === "/captain";
    }
    return active.startsWith(href);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 bottom-0 z-50 w-80 bg-white transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 transition-colors rounded-lg hover:bg-slate-100"
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Profile Section */}
          <div className="px-4 py-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              {captainImage ? (
                <img
                  src={captainImage}
                  alt={captainName}
                  className="w-12 h-12 rounded-full object-cover bg-slate-200"
                />
              ) : (
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-200">
                  <User className="w-6 h-6 text-slate-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">
                  {captainName}
                </p>
                {captainEmail && (
                  <p className="text-sm text-slate-600 truncate">
                    {captainEmail}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Sections */}
          <div className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
            {navSections.map((section) => (
              <div key={section.label}>
                <p className="px-3 mb-2 text-xs font-semibold tracking-wider uppercase text-slate-400">
                  {section.label}
                </p>
                <div className="space-y-1">
                  {section.links.map(({ href, label, Icon }) => {
                    const active = isActive(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          active
                            ? "bg-[#ec2227] text-white"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
