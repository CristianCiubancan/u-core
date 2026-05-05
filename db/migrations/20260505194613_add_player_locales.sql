-- migrate:up
-- Per-license locale storage. One row per Rockstar license; locale change
-- in any of that license's character sessions writes here so the next
-- session (or the live session, via the QBCore:Locale:Changed broadcast)
-- picks up the same value. license is the natural key — qb-core's
-- `players` table identifies players by citizenid but the user-facing
-- "this is me, regardless of which character I'm on" identity in qb is
-- the rockstar license, so locale is keyed there.
CREATE TABLE IF NOT EXISTS `player_locales` (
  `license` VARCHAR(64) NOT NULL,
  `locale` VARCHAR(10) NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`license`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- migrate:down
DROP TABLE IF EXISTS `player_locales`;
