"use client";

/**
 * Promo Code Form Component
 * Reusable form for creating and editing promo codes
 */

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const promoCodeSchema = z
  .object({
    code: z
      .string()
      .min(3, "Code must be at least 3 characters")
      .max(50, "Code must be at most 50 characters")
      .regex(
        /^[A-Z0-9]+$/,
        "Code must contain only uppercase letters and numbers"
      ),
    name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name must be at most 100 characters"),
    description: z.string().optional(),
    type: z.enum(["PERCENTAGE", "FIXED"]),
    percentage: z.coerce.number().min(1).max(100).optional(),
    fixedAmount: z.coerce.number().positive().optional(),
    scope: z.enum(["UNIVERSAL", "REGISTRATION"]),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    maxUses: z.coerce.number().int().positive().optional().nullable(),
    maxUsesPerUser: z.coerce.number().int().positive().default(1),
    minPurchase: z.coerce.number().positive().optional().nullable(),
    maxDiscount: z.coerce.number().positive().optional().nullable(),
    newUsersOnly: z.boolean().default(false),
    status: z.enum(["ACTIVE", "INACTIVE", "EXPIRED"]).default("ACTIVE"),
  })
  .refine(
    (data) => {
      if (data.type === "PERCENTAGE") return data.percentage !== undefined;
      if (data.type === "FIXED") return data.fixedAmount !== undefined;
      return true;
    },
    {
      message:
        "Percentage value required for PERCENTAGE type, Fixed amount required for FIXED type",
      path: ["percentage"],
    }
  )
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

type PromoCodeFormData = z.infer<typeof promoCodeSchema>;

interface PromoCodeFormProps {
  mode: "create" | "edit";
  initialData?: Partial<PromoCodeFormData>;
  promoId?: string;
}

export function PromoCodeForm({
  mode,
  initialData,
  promoId,
}: PromoCodeFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(promoCodeSchema) as any,
    defaultValues: {
      code: initialData?.code || "",
      name: initialData?.name || "",
      description: initialData?.description || "",
      type: initialData?.type || "PERCENTAGE",
      percentage: initialData?.percentage || undefined,
      fixedAmount: initialData?.fixedAmount || undefined,
      scope: initialData?.scope || "UNIVERSAL",
      startDate:
        initialData?.startDate ||
        new Date().toISOString().split("T")[0] + "T00:00",
      endDate:
        initialData?.endDate ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0] + "T23:59",
      maxUses: initialData?.maxUses || null,
      maxUsesPerUser: initialData?.maxUsesPerUser || 1,
      minPurchase: initialData?.minPurchase || null,
      maxDiscount: initialData?.maxDiscount || null,
      newUsersOnly: initialData?.newUsersOnly || false,
      status: initialData?.status || "ACTIVE",
    },
  });

  const discountType = form.watch("type");

  async function onSubmit(data: PromoCodeFormData) {
    setIsSubmitting(true);
    setError(null);

    try {
      const url =
        mode === "create"
          ? "/api/admin/promo-codes"
          : `/api/admin/promo-codes/${promoId}`;

      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save promo code");
      }

      router.push("/staff/promo-codes");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Basic Information */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Basic Information
          </h2>

          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Promo Code *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="SUMMER2025"
                    className="uppercase font-mono"
                    onChange={(e) =>
                      field.onChange(e.target.value.toUpperCase())
                    }
                    disabled={mode === "edit"}
                  />
                </FormControl>
                <FormDescription>
                  Unique code that users will enter (uppercase, no spaces)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Summer Sale 2025" />
                </FormControl>
                <FormDescription>Friendly name shown to users</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value || ""}
                    onChange={(e) =>
                      field.onChange(e.target.value || undefined)
                    }
                    placeholder="Get 20% off all fishing trips this summer!"
                    rows={3}
                  />
                </FormControl>
                <FormDescription>
                  Optional description for internal reference
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Discount Configuration */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Discount Configuration
          </h2>

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount Type *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">
                      Percentage (e.g., 10% off)
                    </SelectItem>
                    <SelectItem value="FIXED">
                      Fixed Amount (e.g., RM50 off)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {discountType === "PERCENTAGE" && (
            <FormField
              control={form.control}
              name="percentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Percentage *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        max="100"
                        placeholder="10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                        %
                      </span>
                    </div>
                  </FormControl>
                  <FormDescription>Discount percentage (1-100)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {discountType === "FIXED" && (
            <FormField
              control={form.control}
              name="fixedAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fixed Amount *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                        RM
                      </span>
                      <Input
                        {...field}
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="50.00"
                        className="pl-12"
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Fixed discount amount in MYR
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="maxDiscount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum Discount Cap</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                      RM
                    </span>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="100.00"
                      className="pl-12"
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Maximum discount amount (optional, for percentage discounts)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Eligibility & Scope */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Eligibility & Scope
          </h2>

          <FormField
            control={form.control}
            name="scope"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scope *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="UNIVERSAL">
                      Universal (Anyone can use)
                    </SelectItem>
                    <SelectItem value="REGISTRATION">
                      Registration (Assigned to specific users)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Universal codes are public. Registration codes are assigned to
                  specific users.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="minPurchase"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum Purchase</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                      RM
                    </span>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="No minimum"
                      className="pl-12"
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Minimum booking amount required (optional)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="newUsersOnly"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>New Users Only</FormLabel>
                  <FormDescription>
                    Only users with no completed bookings can use this code
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        {/* Validity & Usage Limits */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Validity & Usage Limits
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date *</FormLabel>
                  <FormControl>
                    <Input {...field} type="datetime-local" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date *</FormLabel>
                  <FormControl>
                    <Input {...field} type="datetime-local" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="maxUses"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum Total Uses</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                  />
                </FormControl>
                <FormDescription>
                  Total number of times this code can be used (leave empty for
                  unlimited)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxUsesPerUser"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum Uses Per User *</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min="1" />
                </FormControl>
                <FormDescription>
                  Number of times each user can use this code
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#ec2227] hover:bg-[#d41f23]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {mode === "create" ? "Create" : "Update"} Promo Code
              </>
            )}
          </Button>
          <Link href="/staff/promo-codes">
            <Button type="button" variant="outline">
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </Form>
  );
}
