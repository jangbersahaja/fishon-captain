/**
 * Market User Service
 *
 * Service layer for accessing fishon-market user data from fishon-captain admin dashboard.
 * Uses the read-only prismaMarket client.
 */

import { isMarketDbConfigured, prismaMarket } from "./prisma-market";

// ============================================================================
// Types
// ============================================================================

export interface MarketUserWithCounts {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  image: string | null;
  emailVerified: Date | null;
  isOAuthUser: boolean; // User has Google OAuth linked
  role: "ANGLER" | "GUEST" | "ADMIN";
  city: string | null;
  state: string | null;
  country: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    bookings: number;
    reviews: number;
    promoCodeAssignments: number;
  };
}

export interface MarketUserDetail extends MarketUserWithCounts {
  bio: string | null;
  streetAddress: string | null;
  postcode: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  emergencyRelation: string | null;
  bookings: MarketBookingSummary[];
  reviews: MarketReviewSummary[];
  promoCodeAssignments: MarketPromoCodeAssignment[];
}

export interface MarketBookingSummary {
  id: string;
  charterId: string;
  tripId: string;
  date: Date;
  days: number;
  status: string;
  bookingFlowType: string;
  finalPrice: number;
  createdAt: Date;
  paidAt: Date | null;
  paymentMethod: string | null;
}

export interface MarketReviewSummary {
  id: string;
  captainCharterId: string;
  charterName: string;
  overallRating: number;
  badges: string[];
  comment: string | null;
  approved: boolean;
  published: boolean;
  tripDate: Date;
  createdAt: Date;
}

export interface MarketPromoCodeAssignment {
  id: string;
  assignedAt: Date;
  usedAt: Date | null;
  usedInBookingId: string | null;
  promoCode: {
    id: string;
    code: string;
    name: string;
    type: string;
    percentage: number | null;
    status: string;
  };
}

export interface MarketUserFilters {
  search?: string;
  role?: "ANGLER" | "GUEST" | "ADMIN";
  emailVerified?: "verified" | "unverified";
  hasBookings?: boolean;
  hasReviews?: boolean;
}

export interface PaginatedMarketUsers {
  users: MarketUserWithCounts[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface MarketUserStats {
  totalUsers: number;
  totalAnglers: number;
  totalGuests: number;
  verifiedUsers: number;
  usersWithBookings: number;
  usersWithReviews: number;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get paginated list of market users with counts
 */
export async function getMarketUsers(
  filters: MarketUserFilters = {},
  page: number = 1,
  limit: number = 20
): Promise<PaginatedMarketUsers> {
  if (!isMarketDbConfigured()) {
    return {
      users: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalCount: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }

  const skip = (page - 1) * limit;

  // Build where clause
  const where: Record<string, unknown> = {};

  if (filters.search) {
    where.OR = [
      { email: { contains: filters.search, mode: "insensitive" } },
      { name: { contains: filters.search, mode: "insensitive" } },
      { firstName: { contains: filters.search, mode: "insensitive" } },
      { lastName: { contains: filters.search, mode: "insensitive" } },
      { phone: { contains: filters.search, mode: "insensitive" } },
      { id: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.role) {
    where.role = filters.role;
  }

  // Email verification filter - OAuth users (Google) are considered verified
  if (filters.emailVerified === "verified") {
    where.OR = [
      { emailVerified: { not: null } },
      { accounts: { some: { provider: "google" } } },
    ];
  } else if (filters.emailVerified === "unverified") {
    where.AND = [
      { emailVerified: null },
      { accounts: { none: { provider: "google" } } },
    ];
  }

  if (filters.hasBookings === true) {
    where.bookings = { some: {} };
  } else if (filters.hasBookings === false) {
    where.bookings = { none: {} };
  }

  if (filters.hasReviews === true) {
    where.reviews = { some: {} };
  } else if (filters.hasReviews === false) {
    where.reviews = { none: {} };
  }

  const [users, totalCount] = await Promise.all([
    prismaMarket.marketUser.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        phone: true,
        image: true,
        emailVerified: true,
        role: true,
        city: true,
        state: true,
        country: true,
        createdAt: true,
        updatedAt: true,
        accounts: {
          select: {
            provider: true,
          },
        },
        _count: {
          select: {
            bookings: true,
            reviews: true,
            promoCodeAssignments: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prismaMarket.marketUser.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  // Transform users to include isOAuthUser flag
  type UserSelectType = {
    id: string;
    email: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    image: string | null;
    emailVerified: Date | null;
    role: "ANGLER" | "GUEST" | "ADMIN";
    city: string | null;
    state: string | null;
    country: string | null;
    createdAt: Date;
    updatedAt: Date;
    accounts?: { provider: string }[];
    _count: {
      bookings: number;
      reviews: number;
      promoCodeAssignments: number;
    };
  };

  const transformedUsers: MarketUserWithCounts[] = users.map((user: UserSelectType) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    image: user.image,
    emailVerified: user.emailVerified,
    isOAuthUser:
      user.accounts?.some(
        (acc: { provider: string }) => acc.provider === "google"
      ) ?? false,
    role: user.role,
    city: user.city,
    state: user.state,
    country: user.country,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    _count: user._count,
  }));

  return {
    users: transformedUsers,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Get market user stats for dashboard
 */
export async function getMarketUserStats(): Promise<MarketUserStats> {
  if (!isMarketDbConfigured()) {
    return {
      totalUsers: 0,
      totalAnglers: 0,
      totalGuests: 0,
      verifiedUsers: 0,
      usersWithBookings: 0,
      usersWithReviews: 0,
    };
  }

  const [
    totalUsers,
    totalAnglers,
    totalGuests,
    verifiedUsers,
    oauthUsers,
    usersWithBookings,
    usersWithReviews,
  ] = await Promise.all([
    prismaMarket.marketUser.count(),
    prismaMarket.marketUser.count({ where: { role: "ANGLER" } }),
    prismaMarket.marketUser.count({ where: { role: "GUEST" } }),
    prismaMarket.marketUser.count({ where: { emailVerified: { not: null } } }),
    // Count users with Google OAuth accounts (they are considered verified even without emailVerified)
    prismaMarket.marketUser.count({
      where: {
        emailVerified: null, // Only count OAuth users without emailVerified to avoid double counting
        accounts: { some: { provider: "google" } },
      },
    }),
    prismaMarket.marketUser.count({ where: { bookings: { some: {} } } }),
    prismaMarket.marketUser.count({ where: { reviews: { some: {} } } }),
  ]);

  return {
    totalUsers,
    totalAnglers,
    totalGuests,
    verifiedUsers: verifiedUsers + oauthUsers, // Include OAuth users in verified count
    usersWithBookings,
    usersWithReviews,
  };
}

/**
 * Get detailed market user by ID with all related data
 */
export async function getMarketUserById(
  userId: string
): Promise<MarketUserDetail | null> {
  if (!isMarketDbConfigured()) {
    return null;
  }

  const user = await prismaMarket.marketUser.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      phone: true,
      bio: true,
      image: true,
      emailVerified: true,
      role: true,
      streetAddress: true,
      city: true,
      state: true,
      postcode: true,
      country: true,
      emergencyName: true,
      emergencyPhone: true,
      emergencyRelation: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          bookings: true,
          reviews: true,
          promoCodeAssignments: true,
        },
      },
      bookings: {
        select: {
          id: true,
          charterId: true,
          tripId: true,
          date: true,
          days: true,
          status: true,
          bookingFlowType: true,
          finalPrice: true,
          createdAt: true,
          paidAt: true,
          paymentMethod: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50, // Limit to recent 50 bookings
      },
      reviews: {
        select: {
          id: true,
          captainCharterId: true,
          charterName: true,
          overallRating: true,
          badges: true,
          comment: true,
          approved: true,
          published: true,
          tripDate: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      promoCodeAssignments: {
        select: {
          id: true,
          assignedAt: true,
          usedAt: true,
          usedInBookingId: true,
          promoCode: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
              percentage: true,
              status: true,
            },
          },
        },
        orderBy: { assignedAt: "desc" },
      },
    },
  });

  if (!user) {
    return null;
  }

  // Transform bookings to include numeric finalPrice
  const transformedBookings: MarketBookingSummary[] = user.bookings.map(
    (b: Record<string, unknown>) => ({
      id: b.id as string,
      charterId: b.charterId as string,
      tripId: b.tripId as string,
      date: b.date as Date,
      days: b.days as number,
      status: b.status as string,
      bookingFlowType: b.bookingFlowType as string,
      finalPrice: Number(b.finalPrice),
      createdAt: b.createdAt as Date,
      paidAt: b.paidAt as Date | null,
      paymentMethod: b.paymentMethod as string | null,
    })
  );

  return {
    ...user,
    bookings: transformedBookings,
    reviews: user.reviews as MarketReviewSummary[],
    promoCodeAssignments:
      user.promoCodeAssignments as MarketPromoCodeAssignment[],
  } as MarketUserDetail;
}

/**
 * Get user's bookings with charter details (requires fetching from captain DB)
 */
export async function getMarketUserBookings(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  bookings: MarketBookingSummary[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}> {
  if (!isMarketDbConfigured()) {
    return {
      bookings: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalCount: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }

  const skip = (page - 1) * limit;

  const [bookings, totalCount] = await Promise.all([
    prismaMarket.booking.findMany({
      where: { userId },
      select: {
        id: true,
        charterId: true,
        tripId: true,
        date: true,
        days: true,
        status: true,
        bookingFlowType: true,
        finalPrice: true,
        createdAt: true,
        paidAt: true,
        paymentMethod: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prismaMarket.booking.count({ where: { userId } }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return {
    bookings: bookings.map((b: Record<string, unknown>) => ({
      id: b.id as string,
      charterId: b.charterId as string,
      tripId: b.tripId as string,
      date: b.date as Date,
      days: b.days as number,
      status: b.status as string,
      bookingFlowType: b.bookingFlowType as string,
      finalPrice: Number(b.finalPrice),
      createdAt: b.createdAt as Date,
      paidAt: b.paidAt as Date | null,
      paymentMethod: b.paymentMethod as string | null,
    })),
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Search market users by email for quick lookup
 */
export async function searchMarketUsersByEmail(
  email: string,
  limit: number = 10
): Promise<
  Array<{
    id: string;
    email: string;
    name: string | null;
    role: string;
  }>
> {
  if (!isMarketDbConfigured()) {
    return [];
  }

  const users = await prismaMarket.marketUser.findMany({
    where: {
      email: { contains: email, mode: "insensitive" },
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
    take: limit,
  });

  return users as Array<{
    id: string;
    email: string;
    name: string | null;
    role: string;
  }>;
}
