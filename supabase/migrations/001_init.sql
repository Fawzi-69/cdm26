-- =====================================================================
-- CDM26 — Schéma initial (pronostics Coupe du Monde 2026)
-- =====================================================================

-- ---------- Tables --------------------------------------------------

-- Groupes amicaux
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code CHAR(6) UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Membres d'un groupe
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  username TEXT NOT NULL,
  total_points NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Matchs (alimentés par l'API football)
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_match_id INTEGER UNIQUE NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_flag TEXT,
  away_flag TEXT,
  match_date TIMESTAMPTZ NOT NULL,
  stage TEXT,
  status TEXT DEFAULT 'scheduled',
  home_score INTEGER,
  away_score INTEGER,
  home_odds NUMERIC,
  draw_odds NUMERIC,
  away_odds NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Paris sur les matchs : résultat 1/N/2 + score exact prédit
CREATE TABLE IF NOT EXISTS bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  prediction TEXT NOT NULL CHECK (prediction IN ('home', 'draw', 'away')),
  predicted_home_score INTEGER NOT NULL,
  predicted_away_score INTEGER NOT NULL,
  odds_at_bet NUMERIC,
  points_earned NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, group_id, match_id)
);

-- Pari vainqueur du tournoi (avant le 1er match) : +10 pts si correct
CREATE TABLE IF NOT EXISTS tournament_winner_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  team TEXT NOT NULL,
  points_earned NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, group_id)
);

-- ---------- Helper : appartenance à un groupe (évite récursion RLS) --

CREATE OR REPLACE FUNCTION is_group_member(gid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = gid AND user_id = auth.uid()
  );
$$;

-- ---------- Row Level Security --------------------------------------

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_winner_bets ENABLE ROW LEVEL SECURITY;

-- groups : lisible par tout utilisateur authentifié (nécessaire pour rejoindre via code)
CREATE POLICY "groups readable" ON groups
  FOR SELECT TO authenticated USING (true);

-- matches : lisibles par tous les authentifiés
CREATE POLICY "matches readable" ON matches
  FOR SELECT TO authenticated USING (true);

-- group_members : un membre voit tous les membres de SES groupes ;
-- il ne peut insérer/modifier que sa propre ligne
CREATE POLICY "members visible to group" ON group_members
  FOR SELECT TO authenticated
  USING (is_group_member(group_id));
CREATE POLICY "insert own membership" ON group_members
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own membership" ON group_members
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- bets : visibles par tous les membres du groupe (choix publics),
-- écriture limitée à soi, pas de suppression (immuabilité)
CREATE POLICY "bets visible to group" ON bets
  FOR SELECT TO authenticated
  USING (is_group_member(group_id));
CREATE POLICY "insert own bet" ON bets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_group_member(group_id));

-- tournament_winner_bets : idem
CREATE POLICY "winner bets visible to group" ON tournament_winner_bets
  FOR SELECT TO authenticated
  USING (is_group_member(group_id));
CREATE POLICY "insert own winner bet" ON tournament_winner_bets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_group_member(group_id));

-- ---------- RPC : création / adhésion de groupe ---------------------

-- Génère un code 6 lettres majuscules unique
CREATE OR REPLACE FUNCTION gen_group_code()
RETURNS CHAR(6)
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  candidate CHAR(6);
  i INT;
BEGIN
  LOOP
    candidate := '';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(alphabet, floor(random() * 26 + 1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM groups WHERE code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

-- Crée un groupe et y inscrit l'appelant comme premier membre
CREATE OR REPLACE FUNCTION create_group(p_name TEXT, p_username TEXT)
RETURNS groups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_group groups;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  INSERT INTO groups (name, code, created_by)
  VALUES (p_name, gen_group_code(), auth.uid())
  RETURNING * INTO new_group;

  INSERT INTO group_members (group_id, user_id, username)
  VALUES (new_group.id, auth.uid(), p_username);

  RETURN new_group;
END;
$$;

-- Rejoint un groupe via son code ; renvoie le groupe
CREATE OR REPLACE FUNCTION join_group(p_code TEXT, p_username TEXT)
RETURNS groups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target groups;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  SELECT * INTO target FROM groups WHERE code = upper(p_code);
  IF target.id IS NULL THEN
    RAISE EXCEPTION 'Code de groupe introuvable';
  END IF;

  INSERT INTO group_members (group_id, user_id, username)
  VALUES (target.id, auth.uid(), p_username)
  ON CONFLICT (group_id, user_id) DO NOTHING;

  RETURN target;
END;
$$;

-- ---------- Realtime -------------------------------------------------

ALTER PUBLICATION supabase_realtime ADD TABLE group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE bets;
