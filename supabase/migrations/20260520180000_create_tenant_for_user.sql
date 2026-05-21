-- Joga Fácil: função de onboarding (opcional se usar service role no servidor)
CREATE OR REPLACE FUNCTION public.create_tenant_for_user(
  p_user_id uuid,
  p_user_email text,
  p_full_name text,
  p_slug text,
  p_name text,
  p_type text DEFAULT 'society',
  p_settings jsonb DEFAULT '{}'::jsonb,
  p_plan text DEFAULT 'trial',
  p_trial_ends_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant tenants%ROWTYPE;
  v_existing_tenant_id uuid;
BEGIN
  SELECT tu.tenant_id INTO v_existing_tenant_id
  FROM tenant_users tu
  WHERE tu.user_id = p_user_id
  LIMIT 1;

  IF v_existing_tenant_id IS NOT NULL THEN
    RAISE EXCEPTION 'USER_HAS_TENANT';
  END IF;

  IF EXISTS (SELECT 1 FROM tenants WHERE slug = p_slug) THEN
    RAISE EXCEPTION 'SLUG_TAKEN';
  END IF;

  INSERT INTO users (id, email, full_name)
  VALUES (p_user_id, p_user_email, p_full_name)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name);

  INSERT INTO tenants (slug, name, type, settings, plan, trial_ends_at)
  VALUES (p_slug, p_name, p_type, p_settings, p_plan::tenant_plan, p_trial_ends_at)
  RETURNING * INTO v_tenant;

  INSERT INTO tenant_users (tenant_id, user_id, role)
  VALUES (v_tenant.id, p_user_id, 'owner');

  RETURN to_jsonb(v_tenant);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_tenant_for_user(
  uuid, text, text, text, text, text, jsonb, text, timestamptz
) TO authenticated, anon;
