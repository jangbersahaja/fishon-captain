-- Update v_public_charters view to include schedule data
-- Run this manually in the database

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
        
    -- Schedule data
        'schedule', CASE 
            WHEN cs.id IS NOT NULL THEN
                jsonb_build_object(
                    'type', cs."scheduleType",
                    'operationalDays', cs."operationalDays"
                )
            ELSE NULL
        END,
        
    -- Unavailability data (captain-defined blocked dates)
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
                  AND cu."endDate" >= CURRENT_DATE
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
