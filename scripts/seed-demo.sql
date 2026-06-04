-- Matchs de démo CDM26 (api_match_id 99000x réservés à la démo).
-- Dates calées dans le futur via now()+interval pour garder les paris ouverts.
-- Réexécutable : ON CONFLICT met à jour.
INSERT INTO matches
  (api_match_id, home_team, away_team, home_flag, away_flag, match_date, stage, status, home_odds, draw_odds, away_odds)
VALUES
  (990001, 'France',        'Argentine',    'fr',     'ar', now() + interval '3 hours',  'Phase de groupes - J1', 'scheduled', 2.10, 3.30, 3.40),
  (990002, 'Brésil',        'Espagne',      'br',     'es', now() + interval '5 hours',  'Phase de groupes - J1', 'scheduled', 2.45, 3.20, 2.90),
  (990003, 'Angleterre',    'Allemagne',    'gb-eng', 'de', now() + interval '7 hours',  'Phase de groupes - J1', 'scheduled', 2.60, 3.10, 2.75),
  (990004, 'Portugal',      'Pays-Bas',     'pt',     'nl', now() + interval '1 day 2 hours', 'Phase de groupes - J1', 'scheduled', 2.30, 3.25, 3.05),
  (990005, 'Belgique',      'Croatie',      'be',     'hr', now() + interval '1 day 5 hours', 'Phase de groupes - J1', 'scheduled', 2.20, 3.15, 3.40),
  (990006, 'Maroc',         'Japon',        'ma',     'jp', now() + interval '1 day 8 hours', 'Phase de groupes - J1', 'scheduled', 2.55, 3.00, 2.85),
  (990007, 'États-Unis',    'Mexique',      'us',     'mx', now() + interval '2 days 3 hours', 'Phase de groupes - J2', 'scheduled', 2.70, 3.10, 2.65),
  (990008, 'Canada',        'Sénégal',      'ca',     'sn', now() + interval '2 days 6 hours', 'Phase de groupes - J2', 'scheduled', 2.90, 3.05, 2.45)
ON CONFLICT (api_match_id) DO UPDATE SET
  home_team = EXCLUDED.home_team,
  away_team = EXCLUDED.away_team,
  home_flag = EXCLUDED.home_flag,
  away_flag = EXCLUDED.away_flag,
  match_date = EXCLUDED.match_date,
  stage = EXCLUDED.stage,
  status = EXCLUDED.status,
  home_odds = EXCLUDED.home_odds,
  draw_odds = EXCLUDED.draw_odds,
  away_odds = EXCLUDED.away_odds,
  updated_at = now();

SELECT count(*) AS demo_matches FROM matches WHERE api_match_id BETWEEN 990001 AND 990008;
