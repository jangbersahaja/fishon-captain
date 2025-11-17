import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Archive,
  Calendar,
  CheckCircle2,
  Clock,
  Clock3,
  CreditCard,
  Inbox,
} from "lucide-react";

export default function ColorSystemPreviewPage() {
  return (
    <div className="min-h-screen p-8 bg-slate-50">
      <div className="mx-auto space-y-8 max-w-7xl">
        {/* Header */}
        <div className="p-8 bg-white border shadow-sm rounded-2xl border-slate-200">
          <h1 className="mb-2 text-3xl font-bold text-slate-900">
            Color System Preview
          </h1>
          <p className="text-slate-600">
            Visual comparison of current vs proposed color system for Fishon
            Captain
          </p>
          <div className="flex items-center gap-2 mt-4 text-sm">
            <span className="px-3 py-1 font-medium text-blue-800 bg-blue-100 rounded-full">
              Current System
            </span>
            <span className="text-slate-400">vs</span>
            <span className="px-3 py-1 font-medium text-green-800 bg-green-100 rounded-full">
              Proposed System
            </span>
          </div>
        </div>

        {/* Section 1: Booking Status Badges */}
        <div className="p-8 bg-white border shadow-sm rounded-2xl border-slate-200">
          <h2 className="mb-6 text-2xl font-bold text-slate-900">
            1. Booking Status Badges
          </h2>

          <div className="space-y-8">
            {/* PENDING */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    CURRENT
                  </span>
                  <Badge className="text-blue-800 bg-blue-100 border border-blue-200">
                    Reference
                  </Badge>
                </div>
                <div className="p-6 border-2 rounded-xl border-slate-200 bg-slate-50">
                  <p className="mb-3 text-xs font-medium text-slate-500">
                    PENDING
                  </p>
                  <Badge className="border bg-amber-50 text-amber-800 border-amber-300">
                    New Request
                  </Badge>
                  <p className="mt-3 text-xs text-slate-600">
                    ⚠️ Amber - conflicts with warnings and priority section
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    PROPOSED
                  </span>
                  <Badge className="text-green-800 bg-green-100 border border-green-200">
                    New Design
                  </Badge>
                </div>
                <div className="p-6 border-2 border-green-200 rounded-xl bg-green-50/30">
                  <p className="mb-3 text-xs font-medium text-slate-500">
                    PENDING
                  </p>
                  <Badge className="text-red-800 border border-red-300 bg-red-50">
                    New Request
                  </Badge>
                  <p className="mt-3 text-xs text-slate-600">
                    ✅ Red = Urgent action required (immediate attention)
                  </p>
                </div>
              </div>
            </div>

            {/* PAYMENT_AUTHORIZED */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    CURRENT
                  </span>
                </div>
                <div className="p-6 border-2 rounded-xl border-slate-200 bg-slate-50">
                  <p className="mb-3 text-xs font-medium text-slate-500">
                    PAYMENT_AUTHORIZED
                  </p>
                  <Badge className="text-blue-800 bg-blue-100 border border-blue-300">
                    Payment Authorized
                  </Badge>
                  <p className="mt-3 text-xs text-slate-600">
                    ❌ Blue - same as PAID status (confusing!)
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    PROPOSED
                  </span>
                </div>
                <div className="p-6 border-2 border-green-200 rounded-xl bg-green-50/30">
                  <p className="mb-3 text-xs font-medium text-slate-500">
                    PAYMENT_AUTHORIZED
                  </p>
                  <Badge className="text-indigo-800 bg-indigo-100 border border-indigo-300">
                    Payment Authorized
                  </Badge>
                  <p className="mt-3 text-xs text-slate-600">
                    ✅ Indigo = On hold (card held, not captured)
                  </p>
                </div>
              </div>
            </div>

            {/* AWAITING_PAYMENT */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    CURRENT
                  </span>
                </div>
                <div className="p-6 border-2 rounded-xl border-slate-200 bg-slate-50">
                  <p className="mb-3 text-xs font-medium text-slate-500">
                    AWAITING_PAYMENT
                  </p>
                  <Badge className="text-green-800 bg-green-100 border border-green-300">
                    Payment Pending
                  </Badge>
                  <p className="mt-3 text-xs text-slate-600">
                    ❌ Green = Success (but payment NOT complete!)
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    PROPOSED
                  </span>
                </div>
                <div className="p-6 border-2 border-green-200 rounded-xl bg-green-50/30">
                  <p className="mb-3 text-xs font-medium text-slate-500">
                    AWAITING_PAYMENT
                  </p>
                  <Badge className="text-yellow-800 bg-yellow-100 border border-yellow-300">
                    Payment Pending
                  </Badge>
                  <p className="mt-3 text-xs text-slate-600">
                    ✅ Yellow = In progress, waiting for action
                  </p>
                </div>
              </div>
            </div>

            {/* PAID */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    CURRENT
                  </span>
                </div>
                <div className="p-6 border-2 rounded-xl border-slate-200 bg-slate-50">
                  <p className="mb-3 text-xs font-medium text-slate-500">
                    PAID
                  </p>
                  <Badge className="text-blue-800 bg-blue-100 border border-blue-300">
                    Confirmed
                  </Badge>
                  <p className="mt-3 text-xs text-slate-600">
                    ❌ Blue - same as PAYMENT_AUTHORIZED (confusing!)
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    PROPOSED
                  </span>
                </div>
                <div className="p-6 border-2 border-green-200 rounded-xl bg-green-50/30">
                  <p className="mb-3 text-xs font-medium text-slate-500">
                    PAID
                  </p>
                  <Badge className="text-green-800 bg-green-100 border border-green-300">
                    Confirmed
                  </Badge>
                  <p className="mt-3 text-xs text-slate-600">
                    ✅ Green = Success, completed, confirmed
                  </p>
                </div>
              </div>
            </div>

            {/* EXPIRED */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    CURRENT
                  </span>
                </div>
                <div className="p-6 border-2 rounded-xl border-slate-200 bg-slate-50">
                  <p className="mb-3 text-xs font-medium text-slate-500">
                    EXPIRED
                  </p>
                  <Badge className="text-red-800 bg-red-100 border border-red-300">
                    Expired
                  </Badge>
                  <p className="mt-3 text-xs text-slate-600">
                    ⚠️ Red - same as REJECTED/CANCELLED
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    PROPOSED
                  </span>
                </div>
                <div className="p-6 border-2 border-green-200 rounded-xl bg-green-50/30">
                  <p className="mb-3 text-xs font-medium text-slate-500">
                    EXPIRED
                  </p>
                  <Badge className="text-orange-800 bg-orange-100 border border-orange-300">
                    Expired
                  </Badge>
                  <p className="mt-3 text-xs text-slate-600">
                    ✅ Orange = Warning (less severe than cancelled)
                  </p>
                </div>
              </div>
            </div>

            {/* Unchanged statuses */}
            <div className="p-6 border rounded-xl border-slate-200 bg-slate-50">
              <p className="mb-4 text-sm font-semibold text-slate-700">
                ✅ No Changes (Already Correct)
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge className="text-gray-800 bg-gray-100 border border-gray-300">
                  Completed
                </Badge>
                <Badge className="text-red-800 bg-red-100 border border-red-300">
                  Rejected
                </Badge>
                <Badge className="text-red-800 bg-red-100 border border-red-300">
                  Cancelled
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Payment Flow Info & Status Timeline */}
        <div className="p-8 bg-white border shadow-sm rounded-2xl border-slate-200">
          <h2 className="mb-6 text-2xl font-bold text-slate-900">
            2. Payment Flow Info & Status Timeline
          </h2>
          <p className="mb-6 text-sm text-slate-600">
            Info boxes and status indicators on booking detail page
          </p>

          <div className="space-y-8">
            {/* Payment Flow Info */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-slate-700">
                Payment Flow Info Boxes
              </h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">
                      CURRENT
                    </span>
                  </div>
                  <div className="p-6 space-y-3 border-2 rounded-xl border-slate-200 bg-slate-50">
                    <div className="p-3 text-blue-800 rounded-lg bg-blue-50">
                      <p className="text-sm font-medium">
                        Card Authorization Hold
                      </p>
                      <p className="mt-1 text-xs">
                        Payment authorized and held...
                      </p>
                    </div>
                    <div className="p-3 text-green-800 rounded-lg bg-green-50">
                      <p className="text-sm font-medium">Payment Received</p>
                      <p className="mt-1 text-xs">
                        Customer has paid via FPX...
                      </p>
                    </div>
                    <p className="text-xs text-slate-600">
                      ❌ Blue/green conflict with status badges
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">
                      PROPOSED
                    </span>
                  </div>
                  <div className="p-6 space-y-3 border-2 border-green-200 rounded-xl bg-green-50/30">
                    <div className="p-3 text-indigo-800 rounded-lg bg-indigo-50">
                      <p className="text-sm font-medium">
                        Card Authorization Hold
                      </p>
                      <p className="mt-1 text-xs">
                        Payment authorized and held...
                      </p>
                    </div>
                    <div className="p-3 text-yellow-800 rounded-lg bg-yellow-50">
                      <p className="text-sm font-medium">Payment Received</p>
                      <p className="mt-1 text-xs">
                        Customer has paid via FPX...
                      </p>
                    </div>
                    <p className="text-xs text-slate-600">
                      ✅ Indigo/yellow match related booking statuses
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Timeline Icons */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-slate-700">
                Status Timeline Icons
              </h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">
                      CURRENT
                    </span>
                  </div>
                  <div className="p-6 border-2 rounded-xl border-slate-200 bg-slate-50">
                    <div className="flex gap-3">
                      <div className="rounded-xl p-2.5 bg-amber-50">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="rounded-xl p-2.5 bg-blue-50">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="rounded-xl p-2.5 bg-green-50">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-600">
                      ❌ Colors don&apos;t match status badges
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">
                      PROPOSED
                    </span>
                  </div>
                  <div className="p-6 border-2 border-green-200 rounded-xl bg-green-50/30">
                    <div className="flex gap-3">
                      <div className="rounded-xl p-2.5 bg-red-50">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="rounded-xl p-2.5 bg-indigo-50">
                        <CreditCard className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="rounded-xl p-2.5 bg-green-50">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-600">
                      ✅ Icons match their status badge colors!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Booking Notes & Chat Components */}
        <div className="p-8 bg-white border shadow-sm rounded-2xl border-slate-200">
          <h2 className="mb-6 text-2xl font-bold text-slate-900">
            3. Booking Notes & Chat Components
          </h2>

          <div className="space-y-8">
            {/* Angler Notes */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-slate-700">
                Angler&apos;s Note
              </h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">
                      CURRENT
                    </span>
                  </div>
                  <div className="p-6 border-2 rounded-xl border-slate-200 bg-slate-50">
                    <div className="p-2.5 border border-blue-100 rounded-lg bg-blue-50">
                      <div className="mb-1 text-xs font-semibold text-blue-900">
                        Angler&apos;s Note:
                      </div>
                      <div className="text-sm text-blue-800">
                        Please provide life jackets for kids
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-600">
                      ❌ Blue conflicts with PAYMENT_AUTHORIZED status
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">
                      PROPOSED
                    </span>
                  </div>
                  <div className="p-6 border-2 border-green-200 rounded-xl bg-green-50/30">
                    <div className="p-2.5 border border-slate-200 rounded-lg bg-slate-50">
                      <div className="mb-1 text-xs font-semibold text-slate-700">
                        Angler&apos;s Note:
                      </div>
                      <div className="text-sm text-slate-700">
                        Please provide life jackets for kids
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-600">
                      ✅ Neutral slate - no status conflicts
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Legacy Chat Status Badges */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-slate-700">
                Chat Status Badges (Legacy)
              </h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">
                      CURRENT - Inline Colors
                    </span>
                  </div>
                  <div className="p-6 space-y-2 border-2 rounded-xl border-slate-200 bg-slate-50">
                    <Badge className="text-yellow-800 bg-yellow-100 border border-yellow-200">
                      PENDING
                    </Badge>
                    <Badge className="text-blue-800 bg-blue-100 border border-blue-200">
                      APPROVED
                    </Badge>
                    <Badge className="text-green-800 bg-green-100 border border-green-200">
                      PAID
                    </Badge>
                    <p className="mt-3 text-xs text-slate-600">
                      ❌ Inline colors, APPROVED deprecated, inconsistent
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">
                      PROPOSED - BookingStatusBadge
                    </span>
                  </div>
                  <div className="p-6 space-y-2 border-2 border-green-200 rounded-xl bg-green-50/30">
                    <div className="text-sm text-slate-700">
                      <code className="px-2 py-1 text-xs rounded bg-slate-100">
                        {"<BookingStatusBadge status={booking.status} />"}
                      </code>
                    </div>
                    <p className="mt-3 text-xs text-slate-600">
                      ✅ Single source of truth - use existing component!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Priority Section */}
        <div className="p-8 bg-white border shadow-sm rounded-2xl border-slate-200">
          <h2 className="mb-6 text-2xl font-bold text-slate-900">
            4. Priority Bookings Section
          </h2>

          <div className="space-y-8">
            {/* Priority Pills */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    CURRENT
                  </span>
                </div>
                <div className="p-6 space-y-3 border-2 rounded-xl border-slate-200 bg-slate-50">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 text-red-800 text-sm font-medium">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    New Request
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                    <Calendar className="h-3.5 w-3.5" />
                    Upcoming Trip
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-sm font-medium">
                    <CreditCard className="h-3.5 w-3.5" />
                    Payment Pending
                  </div>
                  <p className="mt-3 text-xs text-slate-600">
                    ❌ Blue conflicts with status badges, amber conflicts with
                    PENDING
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    PROPOSED
                  </span>
                </div>
                <div className="p-6 space-y-3 border-2 border-green-200 rounded-xl bg-green-50/30">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 text-red-800 text-sm font-medium">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                    New Request
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-100 text-teal-800 text-sm font-medium">
                    <Calendar className="h-3.5 w-3.5" />
                    Upcoming Trip
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-800 text-sm font-medium">
                    <CreditCard className="h-3.5 w-3.5" />
                    Payment Pending
                  </div>
                  <p className="mt-3 text-xs text-slate-600">
                    ✅ Teal for trips (distinct), yellow matches
                    AWAITING_PAYMENT
                  </p>
                </div>
              </div>
            </div>

            {/* Priority Icons */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    CURRENT - Priority Icons
                  </span>
                </div>
                <div className="p-6 border-2 rounded-xl border-slate-200 bg-slate-50">
                  <div className="flex gap-4">
                    <div className="flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full">
                      !
                    </div>
                    <div className="flex items-center justify-center w-6 h-6 text-white bg-blue-500 rounded-full">
                      <Calendar className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex items-center justify-center w-6 h-6 text-white rounded-full bg-amber-500">
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    PROPOSED - Priority Icons
                  </span>
                </div>
                <div className="p-6 border-2 border-green-200 rounded-xl bg-green-50/30">
                  <div className="flex gap-4">
                    <div className="flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-600 rounded-full">
                      !
                    </div>
                    <div className="flex items-center justify-center w-6 h-6 text-white bg-teal-600 rounded-full">
                      <Calendar className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex items-center justify-center w-6 h-6 text-white bg-yellow-600 rounded-full">
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Booking Tabs */}
        <div className="p-8 bg-white border shadow-sm rounded-2xl border-slate-200">
          <h2 className="mb-6 text-2xl font-bold text-slate-900">
            5. Booking Tabs Count Badges
          </h2>

          <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    CURRENT
                  </span>
                </div>
                <div className="p-6 border-2 rounded-xl border-slate-200 bg-slate-50">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Inbox className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium">Requests</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                        5
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium">Confirmed</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        12
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock3 className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium">
                        Pending Payment
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                        3
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Archive className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium">History</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                        45
                      </span>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-slate-600">
                    ❌ Orange/yellow don&apos;t match their status badges
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    PROPOSED
                  </span>
                </div>
                <div className="p-6 border-2 border-green-200 rounded-xl bg-green-50/30">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Inbox className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium">Requests</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                        5
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium">Confirmed</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        12
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock3 className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium">
                        Pending Payment
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                        3
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Archive className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium">History</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                        45
                      </span>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-slate-600">
                    ✅ Tab colors now match their content statuses!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Color Palette Reference */}
        <div className="p-8 bg-white border shadow-sm rounded-2xl border-slate-200">
          <h2 className="mb-6 text-2xl font-bold text-slate-900">
            6. Complete Color Palette
          </h2>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Semantic Colors */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-700">
                Semantic Color Meanings
              </h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 border-2 border-red-300 rounded-lg" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      Red (500-800)
                    </p>
                    <p className="text-xs text-slate-600">Urgent / Negative</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 border-2 border-orange-300 rounded-lg" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      Orange (500-800)
                    </p>
                    <p className="text-xs text-slate-600">Warning</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-100 border-2 border-yellow-300 rounded-lg" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      Yellow (500-800)
                    </p>
                    <p className="text-xs text-slate-600">In Progress</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-100 border-2 border-indigo-300 rounded-lg" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      Indigo (500-800)
                    </p>
                    <p className="text-xs text-slate-600">On Hold / Reserved</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 border-2 border-green-300 rounded-lg" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      Green (500-800)
                    </p>
                    <p className="text-xs text-slate-600">Success / Complete</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-teal-100 border-2 border-teal-300 rounded-lg" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      Teal (500-800)
                    </p>
                    <p className="text-xs text-slate-600">
                      Alternative / Special
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 border-2 border-blue-300 rounded-lg" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      Blue (500-800)
                    </p>
                    <p className="text-xs text-slate-600">Information</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 border-2 border-gray-300 rounded-lg" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      Gray (500-800)
                    </p>
                    <p className="text-xs text-slate-600">Neutral / Inactive</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Usage Summary */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-700">
                Key Benefits
              </h3>

              <div className="space-y-3">
                <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-green-900">
                        Clear Semantic Meaning
                      </p>
                      <p className="mt-1 text-xs text-green-700">
                        Each color has one consistent meaning across the entire
                        system
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-green-900">
                        Status-Tab Alignment
                      </p>
                      <p className="mt-1 text-xs text-green-700">
                        Tab colors match the booking statuses they contain
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-green-900">
                        Payment Flow Clarity
                      </p>
                      <p className="mt-1 text-xs text-green-700">
                        Payment method badges match their related status
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-green-900">
                        Cross-App Consistency
                      </p>
                      <p className="mt-1 text-xs text-green-700">
                        Same colors in fishon-captain and fishon-market
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-green-900">
                        Reduced Cognitive Load
                      </p>
                      <p className="mt-1 text-xs text-green-700">
                        Captains can instantly understand status without reading
                        labels
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 text-white bg-slate-900 rounded-2xl">
          <h2 className="mb-4 text-xl font-bold">Next Steps</h2>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-slate-400">1.</span>
              <span>
                Review this preview and gather feedback from stakeholders
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">2.</span>
              <span>
                Approve the proposed color system or request modifications
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">3.</span>
              <span>
                Implement changes in BookingStatusBadge and related components
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">4.</span>
              <span>Test thoroughly before deploying to production</span>
            </li>
          </ul>

          <div className="pt-6 mt-6 border-t border-slate-700">
            <p className="text-xs text-slate-400">
              📄 Full documentation:{" "}
              <code className="text-slate-300">docs/COLOR_AUDIT.md</code> and{" "}
              <code className="text-slate-300">
                docs/COLOR_STANDARDIZATION_PROPOSAL.md
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
