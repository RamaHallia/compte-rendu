/*
  # Système d'abonnement utilisateur

  1. Nouvelle table
    - `user_subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `plan_type` (text) - 'starter' (29€) ou 'unlimited' (39€)
      - `minutes_quota` (integer) - 600 pour starter, null pour unlimited
      - `minutes_used_this_month` (integer) - minutes utilisées ce mois
      - `billing_cycle_start` (timestamptz) - début du cycle de facturation
      - `billing_cycle_end` (timestamptz) - fin du cycle de facturation
      - `is_active` (boolean) - statut de l'abonnement
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Sécurité
    - Enable RLS sur `user_subscriptions`
    - Politique permettant aux utilisateurs de voir leur propre abonnement
    - Politique permettant aux utilisateurs de créer leur abonnement

  3. Notes importantes
    - Les utilisateurs sans abonnement auront accès limité
    - Le quota se réinitialise chaque mois
    - L'abonnement unlimited n'a pas de limite de minutes (mais blocage à 4h par réunion)
*/

-- Créer la table user_subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_type text NOT NULL CHECK (plan_type IN ('starter', 'unlimited')),
  minutes_quota integer CHECK (minutes_quota IS NULL OR minutes_quota > 0),
  minutes_used_this_month integer DEFAULT 0 NOT NULL,
  billing_cycle_start timestamptz DEFAULT now() NOT NULL,
  billing_cycle_end timestamptz DEFAULT (now() + interval '1 month') NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_active ON user_subscriptions(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir leur propre abonnement
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent créer leur abonnement
CREATE POLICY "Users can create own subscription"
  ON user_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent modifier leur abonnement
CREATE POLICY "Users can update own subscription"
  ON user_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fonction pour réinitialiser les quotas mensuels
CREATE OR REPLACE FUNCTION reset_monthly_quotas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_subscriptions
  SET 
    minutes_used_this_month = 0,
    billing_cycle_start = now(),
    billing_cycle_end = now() + interval '1 month',
    updated_at = now()
  WHERE billing_cycle_end < now() AND is_active = true;
END;
$$;

-- Créer un abonnement par défaut pour les utilisateurs existants (trial/starter)
DO $$
BEGIN
  INSERT INTO user_subscriptions (user_id, plan_type, minutes_quota, minutes_used_this_month)
  SELECT 
    id,
    'starter',
    600,
    0
  FROM auth.users
  WHERE id NOT IN (SELECT user_id FROM user_subscriptions)
  ON CONFLICT (user_id) DO NOTHING;
END $$;