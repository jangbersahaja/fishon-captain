-- CreateEnum
-- This migration creates the v_public_charters view for exposing charter data to fishon-market

-- Create the v_public_charters view that aggregates charter data with all related entities
CREATE OR REPLACE VIEW "public"."v_public_charters" AS
SELECT 
    c.id,
    c."name",
    c."charterType",
    c.state,
    c.city AS district,
    c."startingPoint",
    c.postcode,
    c.latitude,
    c.longitude,
    c.description,
    c."pricingPlan",
    c."isActive",
    c."createdAt",
    c."updatedAt",
    
    -- Captain profile data
    jsonb_build_object(
        'id', cp.id,
        'firstName', cp."firstName",
        'lastName', cp."lastName",
        'displayName', cp."displayName",
        'phone', cp.phone,
        'bio', cp.bio,
        'experienceYrs', cp."experienceYrs",
        'avatarUrl', cp."avatarUrl"
    ) AS captain,
    
    -- Boat data
    CASE 
        WHEN b.id IS NOT NULL THEN
            jsonb_build_object(
                'id', b.id,
                'name', b."name",
                'type', b.type,
                'lengthFt', b."lengthFt",
                'capacity', b.capacity
            )
        ELSE NULL
    END AS boat,
    
    -- Trips array
    COALESCE(
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', t.id,
                    'name', t."name",
                    'tripType', t."tripType",
                    'price', t.price,
                    'durationHours', t."durationHours",
                    'maxAnglers', t."maxAnglers",
                    'style', t.style,
                    'description', t.description,
                    'promoPrice', t."promoPrice",
                    'startTimes', (
                        SELECT jsonb_agg(jsonb_build_object('value', tst.value))
                        FROM "TripStartTime" tst
                        WHERE tst."tripId" = t.id
                    ),
                    'species', (
                        SELECT jsonb_agg(jsonb_build_object('value', ts.value))
                        FROM "TripSpecies" ts
                        WHERE ts."tripId" = t.id
                    ),
                    'techniques', (
                        SELECT jsonb_agg(jsonb_build_object('value', tt.value))
                        FROM "TripTechnique" tt
                        WHERE tt."tripId" = t.id
                    )
                )
            )
            FROM "Trip" t
            WHERE t."charterId" = c.id
        ),
        '[]'::jsonb
    ) AS trips,
    
    -- Amenities array
    COALESCE(
        (
            SELECT jsonb_agg(jsonb_build_object('label', ca.label))
            FROM "CharterAmenity" ca
            WHERE ca."charterId" = c.id
        ),
        '[]'::jsonb
    ) AS amenities,
    
    -- Features array
    COALESCE(
        (
            SELECT jsonb_agg(jsonb_build_object('label', cf.label))
            FROM "CharterFeature" cf
            WHERE cf."charterId" = c.id
        ),
        '[]'::jsonb
    ) AS features,
    
    -- Media array (only charter-associated media)
    COALESCE(
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'url', cm.url,
                    'storageKey', cm."storageKey",
                    'sortOrder', cm."sortOrder",
                    'mimeType', cm."mimeType",
                    'kind', 'CHARTER_PHOTO'
                )
                ORDER BY cm."sortOrder"
            )
            FROM "CharterMedia" cm
            WHERE cm."charterId" = c.id
        ),
        '[]'::jsonb
    ) AS media,
    
    -- Pickup data
    CASE 
        WHEN p.id IS NOT NULL THEN
            jsonb_build_object(
                'available', p.available,
                'fee', p.fee,
                'notes', p.notes,
                'areas', COALESCE(
                    (
                        SELECT jsonb_agg(jsonb_build_object('label', pa.label))
                        FROM "PickupArea" pa
                        WHERE pa."pickupId" = p.id
                    ),
                    '[]'::jsonb
                )
            )
        ELSE NULL
    END AS pickup,
    
    -- Policies data
    CASE 
        WHEN pol.id IS NOT NULL THEN
            jsonb_build_object(
                'licenseProvided', pol."licenseProvided",
                'catchAndKeep', pol."catchAndKeep",
                'catchAndRelease', pol."catchAndRelease",
                'childFriendly', pol."childFriendly",
                'liveBaitProvided', pol."liveBaitProvided",
                'alcoholAllowed', NOT pol."alcoholNotAllowed",
                'smokingAllowed', NOT pol."smokingNotAllowed"
            )
        ELSE NULL
    END AS policies

FROM "Charter" c
INNER JOIN "CaptainProfile" cp ON c."captainId" = cp.id
LEFT JOIN "Boat" b ON c."boatId" = b.id
LEFT JOIN "Pickup" p ON c.id = p."charterId"
LEFT JOIN "Policies" pol ON c.id = pol."charterId"
WHERE c."isActive" = true;

-- Create index on charter ID for faster lookups
CREATE INDEX IF NOT EXISTS idx_charter_active ON "Charter"("isActive") WHERE "isActive" = true;
