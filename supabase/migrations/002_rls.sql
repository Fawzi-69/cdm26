ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read matches" ON matches FOR SELECT TO authenticated USING (true);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read groups" ON groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "create groups" ON groups FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read members" ON group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "join group" ON group_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read group bets" ON bets FOR SELECT TO authenticated USING (true);
CREATE POLICY "create own bet" ON bets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

ALTER TABLE tournament_winner_bets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read winner bets" ON tournament_winner_bets FOR SELECT TO authenticated USING (true);
CREATE POLICY "create winner bet" ON tournament_winner_bets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
