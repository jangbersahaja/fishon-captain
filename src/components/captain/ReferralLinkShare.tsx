"use client";

import {
  REFERRAL_CONSTANTS,
  getReferralShareUrl,
} from "@/lib/constants/referral";
import {
  Check,
  Copy,
  Facebook,
  Link as LinkIcon,
  MessageCircle,
  Share2,
} from "lucide-react";
import { useCallback, useState } from "react";

/**
 * Props for ReferralLinkShare
 */
interface ReferralLinkShareProps {
  /** The referral code */
  code: string;
  /** Optional custom share URL (defaults to generated URL) */
  shareUrl?: string;
}

/**
 * ReferralLinkShare - Share referral link via copy or social media
 *
 * Features:
 * - Copy to clipboard with visual feedback
 * - Quick share buttons for WhatsApp, Facebook
 * - Native share API support on mobile
 *
 * @example
 * ```tsx
 * <ReferralLinkShare code="AHMAD7K2X" />
 * ```
 */
export function ReferralLinkShare({ code, shareUrl }: ReferralLinkShareProps) {
  const [copied, setCopied] = useState(false);
  const finalShareUrl = shareUrl || getReferralShareUrl(code);

  const commissionRatePercent = Math.round(
    REFERRAL_CONSTANTS.COMMISSION_RATE * 100
  );

  const shareMessage = `Daftar sebagai kapten Fishon menggunakan link saya dan mulakan perjalanan anda dalam industri charter memancing! 🎣`;

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(finalShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [finalShareUrl]);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [code]);

  const handleWhatsAppShare = useCallback(() => {
    const text = encodeURIComponent(`${shareMessage}\n\n${finalShareUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }, [shareMessage, finalShareUrl]);

  const handleFacebookShare = useCallback(() => {
    const url = encodeURIComponent(finalShareUrl);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      "_blank"
    );
  }, [finalShareUrl]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Jadi Kapten Fishon!",
          text: shareMessage,
          url: finalShareUrl,
        });
      } catch (err) {
        // User cancelled or error
        console.log("Share cancelled:", err);
      }
    }
  }, [shareMessage, finalShareUrl]);

  const supportsNativeShare =
    typeof navigator !== "undefined" && "share" in navigator;

  return (
    <div className="space-y-4">
      {/* Referral Code Display */}
      <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">
              Your Referral Code
            </p>
            <p className="text-3xl font-bold font-mono text-slate-900 tracking-widest">
              {code}
            </p>
          </div>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-700 bg-white rounded-lg border border-purple-200 hover:bg-purple-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            aria-label={copied ? "Copied!" : "Copy referral code"}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Share Link */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Share Link
        </label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={finalShareUrl}
              readOnly
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent"
            />
          </div>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#ec2227] rounded-lg hover:bg-[#d41f24] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:ring-offset-2"
            aria-label={copied ? "Copied!" : "Copy share link"}
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Share Buttons */}
      <div>
        <p className="text-sm font-medium text-slate-700 mb-3">Quick Share</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleWhatsAppShare}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#20BD5A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </button>
          <button
            onClick={handleFacebookShare}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#1877F2] rounded-lg hover:bg-[#166FE5] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:ring-offset-2"
          >
            <Facebook className="w-4 h-4" />
            Facebook
          </button>
          {supportsNativeShare && (
            <button
              onClick={handleNativeShare}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              <Share2 className="w-4 h-4" />
              More
            </button>
          )}
        </div>
      </div>

      {/* Commission Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-sm text-amber-800">
          <strong>💰 Earn {commissionRatePercent}%</strong> (up to RM
          {REFERRAL_CONSTANTS.COMMISSION_CAP}) of your referral&apos;s first
          completed trip earnings when they register using your code!
        </p>
      </div>
    </div>
  );
}
