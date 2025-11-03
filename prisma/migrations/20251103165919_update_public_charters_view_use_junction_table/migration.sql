-- Update v_public_charters view to use CharterVideo junction table instead of CaptainVideo direct FK
-- This migration ensures the view uses the proper many-to-many relationship with ordering

DROP VIEW IF EXISTS "public"."v_public_charters";
CREATE VIEW "public"."v_public_charters" AS
SELECT 
    c.id,
    -- Wrap all columns in a charter jsonb object
    jsonb_build_object(
        'id', c.id,
        'name', c."name",
        'charterType', c."charterType",
        'state', c.state,
        'district', c.city,
        'startingPoint', c."startingPoint",
        'postcode', c.postcode,
        'latitude', c.latitude,
        'longitude', c.longitude,
        'description', c.description,
        'pricingPlan', c."pricingPlan",
        'isActive', c."isActive",
        'createdAt', c."createdAt",
        'updatedAt', c."updatedAt",
    
    -- Captain profile data
        'captain', jsonb_build_object(
            'id', cp.id,
            'firstName', cp."firstName",
            'lastName', cp."lastName",
            'displayName', cp."displayName",
            'phone', cp.phone,
            'bio', cp.bio,
            'experienceYrs', cp."experienceYrs",
            'avatarUrl', cp."avatarUrl"
        ),
    
    -- Boat data
        'boat', CASE 
            WHEN b.id IS NOT NULL THEN
                jsonb_build_object(
                    'id', b.id,
                    'name', b."name",
                    'type', b.type,
                    'lengthFt', b."lengthFt",
                    'capacity', b.capacity
                )
            ELSE NULL
        END,
    
    -- Trips array
        'trips', COALESCE(
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
        ),
    
    -- Amenities array
        'amenities', COALESCE(
            (
                SELECT jsonb_agg(jsonb_build_object('label', ca.label))
                FROM "CharterAmenity" ca
                WHERE ca."charterId" = c.id
            ),
            '[]'::jsonb
        ),
    
    -- Features array
        'features', COALESCE(
            (
                SELECT jsonb_agg(jsonb_build_object('label', cf.label))
                FROM "CharterFeature" cf
                WHERE cf."charterId" = c.id
            ),
            '[]'::jsonb
        ),
    
    -- Media array (only charter-associated media)
        'media', COALESCE(
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
        ),

    -- Videos array (from CharterVideo junction table - uses proper many-to-many with ordering)
        'videos', COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'url', COALESCE(cv."ready720pUrl", cv."originalUrl"),
                        'name', COALESCE(cv."normalizedBlobKey", cv."blobKey"),
                        'thumbnailUrl', cv."thumbnailUrl",
                        'kind', 'CHARTER_VIDEO',
                        'sortOrder', cvj."order"
                    )
                    ORDER BY cvj."order"
                )
                FROM "CharterVideo" cvj
                INNER JOIN "CaptainVideo" cv ON cvj."videoId" = cv.id
                WHERE cvj."charterId" = c.id
            ),
            '[]'::jsonb
        ),
    
    -- Pickup data
        'pickup', CASE 
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
        END,
    
    -- Policies data
        'policies', CASE 
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
        END,
    
    -- Schedule data (operational days)
        'schedule', CASE 
            WHEN cs.id IS NOT NULL THEN
                jsonb_build_object(
                    'type', cs."scheduleType",
                    'operationalDays', cs."operationalDays"
                )
            ELSE NULL
        END,
    
    -- Unavailability periods
        'unavailability', COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'startDate', cu."startDate",
                        'endDate', cu."endDate",
                        'reason', cu.reason
                    )
                    ORDER BY cu."startDate"
                )
                FROM "charter_unavailability" cu
                WHERE cu."charterId" = c.id
            ),
            '[]'::jsonb
        )
    ) AS charter

FROM "Charter" c
INNER JOIN "CaptainProfile" cp ON c."captainId" = cp.id
LEFT JOIN "Boat" b ON c."boatId" = b.id
LEFT JOIN "Pickup" p ON c.id = p."charterId"
LEFT JOIN "Policies" pol ON c.id = pol."charterId"
LEFT JOIN "charter_schedules" cs ON c.id = cs."charterId"
WHERE c."isActive" = true;

-- Ensure indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_charter_active ON "Charter"("isActive") WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS idx_charter_video_charter_order ON "CharterVideo"("charterId", "order");
CREATE INDEX IF NOT EXISTS idx_captain_video_status ON "CaptainVideo"("processStatus", "originalDeletedAt") WHERE "processStatus" = 'ready' AND "originalDeletedAt" IS NULL;
