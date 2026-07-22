-- ════════════════════════════════════════════════════════════════
-- Migration « saisons » — à lancer dans Supabase → SQL Editor
-- (une seule fois, AVANT de déployer le nouvel index.html)
-- ════════════════════════════════════════════════════════════════

-- 1. Contrat : ajout de la saison (année scolaire), clé primaire (saison, jour)
ALTER TABLE contrat ADD COLUMN IF NOT EXISTS saison TEXT NOT NULL DEFAULT '2025-2026';
ALTER TABLE contrat DROP CONSTRAINT IF EXISTS contrat_pkey;
ALTER TABLE contrat ADD PRIMARY KEY (saison, jour);

-- 2. Table config : état partagé (mode actif/vacances + saison courante)
CREATE TABLE IF NOT EXISTS config (
  cle    TEXT PRIMARY KEY,
  valeur TEXT
);
INSERT INTO config (cle, valeur) VALUES
  ('mode',   'actif'),
  ('saison', '2025-2026'),
  ('debut_compta', '2026-06-09')  -- 1er badge : on ne comptabilise pas avant la mise en place de l'app
ON CONFLICT (cle) DO NOTHING;

ALTER TABLE config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow all" ON config;
CREATE POLICY "allow all" ON config USING (true) WITH CHECK (true);

-- 3. Table bilans : récap figé par saison, écrit à la clôture
CREATE TABLE IF NOT EXISTS bilans (
  saison            TEXT PRIMARY KEY,
  total_contrat_min INTEGER,
  total_reel_min    INTEGER,
  ecart_min         INTEGER,
  nb_jours          INTEGER,
  cloture_le        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bilans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow all" ON bilans;
CREATE POLICY "allow all" ON bilans USING (true) WITH CHECK (true);
