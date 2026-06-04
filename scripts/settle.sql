-- Fonction admin : clôture un match, score les pronos (3/1/0) et recalcule les totaux.
CREATE OR REPLACE FUNCTION settle_match(p_api_id INT, p_home INT, p_away INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_id UUID;
  v_result TEXT;
BEGIN
  UPDATE matches
     SET home_score = p_home, away_score = p_away, status = 'finished', updated_at = now()
   WHERE api_match_id = p_api_id
   RETURNING id INTO v_match_id;
  IF v_match_id IS NULL THEN RAISE EXCEPTION 'match % introuvable', p_api_id; END IF;

  v_result := CASE WHEN p_home > p_away THEN 'home'
                   WHEN p_home < p_away THEN 'away'
                   ELSE 'draw' END;

  UPDATE bets b SET points_earned = CASE
       WHEN b.predicted_home_score = p_home AND b.predicted_away_score = p_away THEN 3
       WHEN b.prediction = v_result THEN 1
       ELSE 0 END
   WHERE b.match_id = v_match_id;

  -- Recalcule total_points pour tous les membres (pronos + bonus vainqueur)
  UPDATE group_members gm SET total_points =
      COALESCE((SELECT sum(points_earned) FROM bets
                 WHERE group_id = gm.group_id AND user_id = gm.user_id
                   AND points_earned IS NOT NULL), 0)
    + COALESCE((SELECT sum(points_earned) FROM tournament_winner_bets
                 WHERE group_id = gm.group_id AND user_id = gm.user_id
                   AND points_earned IS NOT NULL), 0);
END;
$$;

-- Clôture France 2 - 1 Argentine
SELECT settle_match(990001, 2, 1);

-- Vérif : pronos notés + classement
SELECT gm.username, m.home_team, m.away_team, b.prediction,
       b.predicted_home_score || '-' || b.predicted_away_score AS score_predit,
       b.points_earned
FROM bets b
JOIN matches m ON m.id = b.match_id
JOIN group_members gm ON gm.group_id = b.group_id AND gm.user_id = b.user_id
WHERE m.api_match_id = 990001
ORDER BY b.points_earned DESC;

SELECT username, total_points FROM group_members ORDER BY total_points DESC;
