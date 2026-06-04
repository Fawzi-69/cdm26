-- The Odds API utilise des identifiants d'événement en chaîne hexadécimale,
-- incompatibles avec api_match_id (INTEGER). On ajoute une clé dédiée.
ALTER TABLE matches ADD COLUMN IF NOT EXISTS odds_event_id TEXT;
ALTER TABLE matches ALTER COLUMN api_match_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS matches_odds_event_id_key ON matches (odds_event_id);
