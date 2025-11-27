"use client";

import { Button } from "@/components/ui/button";
import { Gift, X } from "lucide-react";

/**
 * Mini placement previews for the campaign form.
 * These are simplified versions of the actual banner variants
 * to give visual context for each placement type.
 */

interface MiniPreviewProps {
  variant: "card" | "bar" | "modal";
  placementKey: string;
}

/**
 * Renders a mini preview based on the placement variant
 */
export function PlacementMiniPreview({ variant, placementKey }: MiniPreviewProps) {
  switch (variant) {
    case "bar":
      return <MiniBarPreview placementKey={placementKey} />;
    case "modal":
      return <MiniModalPreview placementKey={placementKey} />;
    case "card":
    default:
      return <MiniCardPreview placementKey={placementKey} />;
  }
}

/**
 * Mini Card Preview - for sidebar placements (desktop)
 * Matches: search-sidebar, charter-detail-sidebar
 */
function MiniCardPreview({ placementKey }: { placementKey: string }) {
  const isCharterDetail = placementKey.includes("charter-detail");
  
  return (
    <div className="w-full max-w-[180px] mx-auto">
      {/* Browser mockup */}
      <div className="bg-slate-100 rounded-t-md p-1 flex items-center gap-1">
        <div className="flex gap-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-white rounded text-[6px] px-1 text-slate-400 truncate">
          fishon.my/{isCharterDetail ? "charters/..." : "search"}
        </div>
      </div>
      
      {/* Page content */}
      <div className="bg-white rounded-b-md border border-t-0 border-slate-200 p-2 flex gap-2">
        {/* Main content area */}
        <div className="flex-1 space-y-1">
          <div className="h-1.5 bg-slate-200 rounded w-full" />
          <div className="h-1.5 bg-slate-200 rounded w-3/4" />
          <div className="h-1.5 bg-slate-200 rounded w-5/6" />
          <div className="h-8 bg-slate-100 rounded mt-2" />
        </div>
        
        {/* Sidebar with banner */}
        <div className="w-14 shrink-0">
          <div className="bg-gradient-to-b from-[#ec2227]/10 to-[#ec2227]/5 border border-[#ec2227]/30 rounded p-1.5 shadow-sm">
            <div className="bg-[#ec2227] text-white text-[4px] px-1 py-0.5 rounded mb-1 text-center font-medium">
              OFFER
            </div>
            <div className="h-1 bg-slate-300 rounded mb-0.5" />
            <div className="h-1 bg-slate-200 rounded w-3/4 mb-1.5" />
            <div className="h-3 bg-[#ec2227] rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Mini Bar Preview - for mobile bottom placements
 * Matches: search-bottom-bar, charter-detail-bottom-bar, global-bottom-bar
 */
function MiniBarPreview({ placementKey }: { placementKey: string }) {
  const isGlobal = placementKey.includes("global");
  const pageLabel = isGlobal 
    ? "All Pages" 
    : placementKey.includes("search") 
      ? "Search" 
      : "Charter";
  
  return (
    <div className="w-full max-w-[120px] mx-auto">
      {/* Phone mockup */}
      <div className="bg-slate-800 rounded-xl p-1 relative">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-slate-800 rounded-b-lg" />
        
        {/* Screen */}
        <div className="bg-white rounded-lg overflow-hidden">
          {/* Status bar */}
          <div className="bg-slate-100 px-1.5 py-0.5 flex justify-between items-center">
            <span className="text-[5px] text-slate-600">9:41</span>
            <span className="text-[5px] text-slate-400">{pageLabel}</span>
          </div>
          
          {/* Page content */}
          <div className="p-1.5 space-y-1 min-h-[50px]">
            <div className="h-1 bg-slate-200 rounded w-full" />
            <div className="h-1 bg-slate-200 rounded w-3/4" />
            <div className="h-6 bg-slate-100 rounded mt-1" />
          </div>
          
          {/* Bottom bar banner */}
          <div className="bg-white border-t border-[#ec2227]/20 shadow-[0_-2px_4px_rgba(0,0,0,0.05)] p-1.5">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-[#ec2227]/10 rounded-full flex items-center justify-center shrink-0">
                <Gift className="w-2 h-2 text-[#ec2227]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="h-1 bg-slate-300 rounded w-full mb-0.5" />
                <div className="h-0.5 bg-slate-200 rounded w-3/4" />
              </div>
              <div className="h-3 w-6 bg-[#ec2227] rounded shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Mini Modal Preview - for interstitial/welcome modals
 * Matches: home-welcome-modal, pre-checkout-modal
 */
function MiniModalPreview({ placementKey }: { placementKey: string }) {
  const isHome = placementKey.includes("home");
  const isCheckout = placementKey.includes("checkout");
  
  return (
    <div className="w-full max-w-[160px] mx-auto">
      {/* Browser/Device mockup */}
      <div className="bg-slate-100 rounded-t-md p-1 flex items-center gap-1">
        <div className="flex gap-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-white rounded text-[6px] px-1 text-slate-400 truncate">
          fishon.my/{isHome ? "" : isCheckout ? "book/..." : "..."}
        </div>
      </div>
      
      {/* Page with modal overlay */}
      <div className="bg-slate-300/50 rounded-b-md border border-t-0 border-slate-200 p-2 min-h-[80px] relative flex items-center justify-center">
        {/* Dimmed background content */}
        <div className="absolute inset-2 opacity-30">
          <div className="space-y-1">
            <div className="h-1 bg-slate-400 rounded w-full" />
            <div className="h-1 bg-slate-400 rounded w-3/4" />
            <div className="h-6 bg-slate-400/50 rounded mt-1" />
          </div>
        </div>
        
        {/* Modal */}
        <div className="relative bg-gradient-to-br from-[#ec2227] via-[#d11f24] to-[#b01a1f] rounded-lg p-2 shadow-lg w-[90%] z-10 border border-white/20">
          {/* Close button */}
          <div className="absolute top-1 right-1 w-3 h-3 bg-black/20 rounded-full flex items-center justify-center">
            <X className="w-1.5 h-1.5 text-white" />
          </div>
          
          {/* Icon */}
          <div className="w-5 h-5 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-1">
            <span className="text-[8px]">🎣</span>
          </div>
          
          {/* Content */}
          <div className="text-center mb-1.5">
            <div className="h-1.5 bg-white/80 rounded w-3/4 mx-auto mb-0.5" />
            <div className="h-1 bg-white/50 rounded w-1/2 mx-auto" />
          </div>
          
          {/* CTA */}
          <div className="h-3 bg-white rounded w-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Content type for full-size previews
 */
interface PreviewContent {
  title: string;
  subtitle: string;
  cta: string;
  benefits?: string[];
  imageUrl?: string;
}

/**
 * Full-size preview card for selected placements
 * Shows a larger, more detailed preview
 */
interface PlacementPreviewCardProps {
  variant: "card" | "bar" | "modal";
  title: string;
  subtitle: string;
  cta: string;
  benefits?: string[];
  imageUrl?: string;
}

export function PlacementPreviewCard({
  variant,
  title,
  subtitle,
  cta,
  benefits,
  imageUrl,
}: PlacementPreviewCardProps) {
  const content: PreviewContent = { title, subtitle, cta, benefits, imageUrl };
  
  switch (variant) {
    case "bar":
      return <FullBarPreview content={content} />;
    case "modal":
      return <FullModalPreview content={content} />;
    case "card":
    default:
      return <FullCardPreview content={content} />;
  }
}

// Full-size preview components (same as in CampaignFormPreview.tsx)
function FullCardPreview({ content }: { content: PreviewContent }) {
  return (
    <div className="relative bg-white rounded-lg border border-[#ec2227]/20 p-6 shadow-lg max-w-[350px] mx-auto">
      <button
        type="button"
        className="absolute top-3 right-3 text-gray-400 hover:text-[#ec2227] transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="mb-4">
        <span className="inline-block mb-2 px-2 py-0.5 text-xs font-medium bg-[#ec2227] text-white rounded">
          New Member Offer
        </span>
        <h3 className="mb-2 text-xl font-semibold text-gray-900 uppercase font-oswald">
          {content.title || "Campaign Title"}
        </h3>
        <p className="text-sm text-gray-600">{content.subtitle || "Campaign subtitle"}</p>
      </div>

      {content.benefits && content.benefits.length > 0 && (
        <ul className="mb-6 space-y-2">
          {content.benefits.filter((b) => b.trim()).map((benefit, idx) => (
            <li key={idx} className="flex items-start text-sm text-gray-700">
              <span className="text-[#ec2227] mr-2 flex-shrink-0">✓</span>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      )}

      <Button className="w-full bg-[#ec2227] hover:bg-[#d11f24] text-white" size="lg">
        {content.cta || "Learn More"}
      </Button>
    </div>
  );
}

function FullBarPreview({ content }: { content: PreviewContent }) {
  return (
    <div className="bg-white border-t border-[#ec2227]/20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center flex-1 min-w-0 gap-3">
          <div className="shrink-0 w-10 h-10 bg-[#ec2227]/10 rounded-full flex items-center justify-center">
            <Gift className="h-5 w-5 text-[#ec2227]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {content.title || "Campaign Title"}
            </p>
            <p className="text-xs text-gray-600 truncate">
              {content.subtitle || "Subtitle"}
            </p>
          </div>
        </div>

        <Button size="sm" className="shrink-0 bg-[#ec2227] hover:bg-[#d11f24] text-white">
          {content.cta || "Go"}
        </Button>

        <button
          type="button"
          className="shrink-0 text-gray-400 hover:text-[#ec2227] transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function FullModalPreview({ content }: { content: PreviewContent }) {
  return (
    <div className="flex items-center justify-center p-4 min-h-[300px] bg-black/60 rounded-lg">
      <div className="bg-gradient-to-tr from-[#ec2227] via-[#d11f24] to-[#b01a1f] rounded-xl shadow-2xl max-w-md w-full p-6 relative text-white border border-white/10">
        <button
          type="button"
          className="absolute top-3 right-3 z-10 bg-black/20 hover:bg-black/40 text-white rounded-full p-1.5 transition-colors backdrop-blur-sm"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-6 text-center">
          {content.imageUrl ? (
            <div className="relative w-full h-32 mx-auto mb-4 overflow-hidden rounded-lg shadow-md bg-white/5">
              <img
                src={content.imageUrl}
                alt={content.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 rounded-full bg-white/10 backdrop-blur-sm">
              <span className="text-2xl">🎣</span>
            </div>
          )}
          <h2 className="mb-2 text-xl font-semibold text-white uppercase font-oswald drop-shadow-sm">
            {content.title || "Welcome!"}
          </h2>
          <p className="text-sm font-medium text-white/90">
            {content.subtitle || "Check out our latest offer"}
          </p>
        </div>

        {content.benefits && content.benefits.length > 0 && (
          <div className="p-3 mb-4 space-y-2 rounded-lg bg-black/10">
            {content.benefits.filter((b) => b.trim()).map((benefit, idx) => (
              <div key={idx} className="flex items-center text-sm text-white">
                <span className="bg-white text-[#ec2227] rounded-full w-4 h-4 flex items-center justify-center mr-2 text-xs font-bold flex-shrink-0">
                  ✓
                </span>
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        )}

        <Button
          className="w-full bg-white text-[#ec2227] hover:bg-gray-50 font-bold shadow-lg border-0"
          size="lg"
        >
          {content.cta || "Get Started"}
        </Button>
      </div>
    </div>
  );
}
