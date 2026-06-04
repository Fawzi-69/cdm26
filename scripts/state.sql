SELECT
  (SELECT count(*) FROM groups) AS groups,
  (SELECT count(*) FROM group_members) AS members,
  (SELECT count(*) FROM bets) AS bets,
  (SELECT count(*) FROM tournament_winner_bets) AS winner_bets;

SELECT b.id, gm.username, m.home_team, m.away_team, b.prediction,
       b.predicted_home_score, b.predicted_away_score, b.points_earned, m.api_match_id
FROM bets b
JOIN matches m ON m.id = b.match_id
LEFT JOIN group_members gm ON gm.group_id = b.group_id AND gm.user_id = b.user_id
ORDER BY b.created_at;
