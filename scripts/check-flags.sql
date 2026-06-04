-- Équipes sans code drapeau (devrait être vide)
SELECT DISTINCT team FROM (
  SELECT home_team AS team, home_flag AS flag FROM matches
  UNION
  SELECT away_team, away_flag FROM matches
) t
WHERE flag IS NULL
ORDER BY team;
