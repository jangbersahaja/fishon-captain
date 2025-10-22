BEGIN;

DELETE FROM "PickupArea" WHERE "pickupId" IN (SELECT id FROM "Pickup" WHERE "charterId" = 'cmh1qczxq000ajr04tatsspuz');
DELETE FROM "Pickup" WHERE "charterId" = 'cmh1qczxq000ajr04tatsspuz';
DELETE FROM "Policies" WHERE "charterId" = 'cmh1qczxq000ajr04tatsspuz';
DELETE FROM "CharterAmenity" WHERE "charterId" = 'cmh1qczxq000ajr04tatsspuz';
DELETE FROM "CharterFeature" WHERE "charterId" = 'cmh1qczxq000ajr04tatsspuz';
DELETE FROM "CharterMedia" WHERE "charterId" = 'cmh1qczxq000ajr04tatsspuz';
DELETE FROM "CaptainVideo" WHERE "charterId" = 'cmh1qczxq000ajr04tatsspuz';
DELETE FROM "TripSpecies" WHERE "tripId" IN (SELECT id FROM "Trip" WHERE "charterId" = 'cmh1qczxq000ajr04tatsspuz');
DELETE FROM "TripStartTime" WHERE "tripId" IN (SELECT id FROM "Trip" WHERE "charterId" = 'cmh1qczxq000ajr04tatsspuz');
DELETE FROM "TripTechnique" WHERE "tripId" IN (SELECT id FROM "Trip" WHERE "charterId" = 'cmh1qczxq000ajr04tatsspuz');
DELETE FROM "Trip" WHERE "charterId" = 'cmh1qczxq000ajr04tatsspuz';
DELETE FROM "Boat" WHERE id = (SELECT "boatId" FROM "Charter" WHERE id = 'cmh1qczxq000ajr04tatsspuz');
DELETE FROM "Charter" WHERE id = 'cmh1qczxq000ajr04tatsspuz';

COMMIT;