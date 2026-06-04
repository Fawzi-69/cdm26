-- Reset des données de test (garde les comptes auth et les vrais matchs Odds API).
DELETE FROM bets;
DELETE FROM tournament_winner_bets;
DELETE FROM group_members;
DELETE FROM groups;
-- Supprime uniquement les matchs de démo (api_match_id 99000x).
-- Les vrais matchs Odds API ont api_match_id NULL et odds_event_id renseigné.
DELETE FROM matches WHERE api_match_id IS NOT NULL;

SELECT
  (SELECT count(*) FROM groups)                                  AS groups,
  (SELECT count(*) FROM group_members)                           AS members,
  (SELECT count(*) FROM bets)                                    AS bets,
  (SELECT count(*) FROM tournament_winner_bets)                  AS winner_bets,
  (SELECT count(*) FROM matches)                                 AS matches_total,
  (SELECT count(*) FROM matches WHERE odds_event_id IS NOT NULL) AS real_matches;
