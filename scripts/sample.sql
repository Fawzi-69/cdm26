SELECT home_team, away_team, to_char(match_date,'YYYY-MM-DD HH24:MI') AS utc,
       home_odds, draw_odds, away_odds, status
FROM matches
ORDER BY match_date
LIMIT 6;
