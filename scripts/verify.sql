SELECT
  (SELECT array_agg(proname ORDER BY proname) FROM pg_proc
     WHERE proname IN ('create_group','join_group','is_group_member','gen_group_code')) AS functions,
  (SELECT array_agg(tablename ORDER BY tablename) FROM pg_tables
     WHERE schemaname='public'
       AND tablename IN ('groups','group_members','matches','bets','tournament_winner_bets')) AS tables;
