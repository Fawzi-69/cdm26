SELECT DISTINCT team FROM (
  SELECT home_team AS team FROM matches
  UNION
  SELECT away_team AS team FROM matches
) t
ORDER BY team;
