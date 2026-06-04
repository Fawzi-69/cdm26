SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname IN (
    'read matches','read groups','create groups','read members','join group',
    'read group bets','create own bet','read winner bets','create winner bet'
  )
ORDER BY tablename, policyname;
