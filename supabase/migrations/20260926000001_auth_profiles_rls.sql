-- ====================================================================
-- ResolveX — Smart Customer Complaint & Resolution Management Platform
-- Phase 2.2 Security & RLS Migration Script
-- Supabase Authentication, Profile Integration & Row Level Security
-- ====================================================================

-- 1. AUTHENTICATION <-> PROFILES RELATIONSHIP
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_profiles_auth_users'
        ) THEN
            ALTER TABLE public.profiles
            ADD CONSTRAINT fk_profiles_auth_users
            FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- 2. AUTOMATIC PROFILE CREATION TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email,
        CASE 
            WHEN NEW.raw_user_meta_data->>'role' IN ('customer', 'agent', 'admin') 
            THEN NEW.raw_user_meta_data->>'role'
            ELSE 'customer'
        END
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        updated_at = now();

    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

-- 3. NON-RECURSIVE SECURITY DEFINER HELPER FUNCTIONS FOR ROLE CHECKS
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (public.get_user_role(user_id) = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_agent(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (public.get_user_role(user_id) = 'agent');
$$;

CREATE OR REPLACE FUNCTION public.is_customer(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (public.get_user_role(user_id) = 'customer');
$$;

-- 4. ROLE ESCALATION PROTECTION TRIGGER
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
        IF NOT public.is_admin(auth.uid()) THEN
            RAISE EXCEPTION 'Only administrators are authorized to modify user roles or account status.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- ====================================================================
-- 5. ENABLE ROW LEVEL SECURITY (RLS) ON ALL 8 CORE TABLES
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 6. STRICT ROW LEVEL SECURITY POLICIES
-- ====================================================================

-- --------------------------------------------------------------------
-- TABLE: PROFILES POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Profiles read access" ON public.profiles;
CREATE POLICY "Profiles read access" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid() OR
        public.is_agent(auth.uid()) OR
        public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Profiles update access" ON public.profiles;
CREATE POLICY "Profiles update access" ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        id = auth.uid() OR public.is_admin(auth.uid())
    )
    WITH CHECK (
        id = auth.uid() OR public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Admin insert profiles" ON public.profiles;
CREATE POLICY "Admin insert profiles" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin(auth.uid()));

-- --------------------------------------------------------------------
-- TABLE: CATEGORIES POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Categories read access" ON public.categories;
CREATE POLICY "Categories read access" ON public.categories
    FOR SELECT TO authenticated
    USING (is_active = true OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin write categories" ON public.categories;
CREATE POLICY "Admin write categories" ON public.categories
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- --------------------------------------------------------------------
-- TABLE: COMPLAINTS POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Complaints select policy" ON public.complaints;
CREATE POLICY "Complaints select policy" ON public.complaints
    FOR SELECT TO authenticated
    USING (
        (public.is_customer(auth.uid()) AND customer_id = auth.uid()) OR
        (public.is_agent(auth.uid()) AND assigned_agent_id = auth.uid()) OR
        public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Complaints insert policy" ON public.complaints;
CREATE POLICY "Complaints insert policy" ON public.complaints
    FOR INSERT TO authenticated
    WITH CHECK (
        (public.is_customer(auth.uid()) AND customer_id = auth.uid()) OR
        public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Complaints update policy" ON public.complaints;
CREATE POLICY "Complaints update policy" ON public.complaints
    FOR UPDATE TO authenticated
    USING (
        (public.is_customer(auth.uid()) AND customer_id = auth.uid()) OR
        (public.is_agent(auth.uid()) AND assigned_agent_id = auth.uid()) OR
        public.is_admin(auth.uid())
    )
    WITH CHECK (
        (public.is_customer(auth.uid()) AND customer_id = auth.uid()) OR
        (public.is_agent(auth.uid()) AND assigned_agent_id = auth.uid()) OR
        public.is_admin(auth.uid())
    );

-- --------------------------------------------------------------------
-- TABLE: COMPLAINT_ASSIGNMENTS POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Assignments select policy" ON public.complaint_assignments;
CREATE POLICY "Assignments select policy" ON public.complaint_assignments
    FOR SELECT TO authenticated
    USING (
        (public.is_agent(auth.uid()) AND agent_id = auth.uid()) OR
        public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Admin write assignments" ON public.complaint_assignments;
CREATE POLICY "Admin write assignments" ON public.complaint_assignments
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- --------------------------------------------------------------------
-- TABLE: COMPLAINT_STATUS_HISTORY POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Status history select policy" ON public.complaint_status_history;
CREATE POLICY "Status history select policy" ON public.complaint_status_history
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.complaints c
            WHERE c.id = complaint_status_history.complaint_id
              AND (
                  (public.is_customer(auth.uid()) AND c.customer_id = auth.uid()) OR
                  (public.is_agent(auth.uid()) AND c.assigned_agent_id = auth.uid()) OR
                  public.is_admin(auth.uid())
              )
        )
    );

DROP POLICY IF EXISTS "Status history insert policy" ON public.complaint_status_history;
CREATE POLICY "Status history insert policy" ON public.complaint_status_history
    FOR INSERT TO authenticated
    WITH CHECK (
        changed_by = auth.uid() AND (
            public.is_admin(auth.uid()) OR
            EXISTS (
                SELECT 1 FROM public.complaints c
                WHERE c.id = complaint_status_history.complaint_id
                  AND c.assigned_agent_id = auth.uid()
            )
        )
    );

-- --------------------------------------------------------------------
-- TABLE: RESOLUTIONS POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Resolutions select policy" ON public.resolutions;
CREATE POLICY "Resolutions select policy" ON public.resolutions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.complaints c
            WHERE c.id = resolutions.complaint_id
              AND (
                  (public.is_customer(auth.uid()) AND c.customer_id = auth.uid()) OR
                  (public.is_agent(auth.uid()) AND c.assigned_agent_id = auth.uid()) OR
                  public.is_admin(auth.uid())
              )
        )
    );

DROP POLICY IF EXISTS "Resolutions insert/update policy" ON public.resolutions;
CREATE POLICY "Resolutions insert/update policy" ON public.resolutions
    FOR ALL TO authenticated
    USING (
        public.is_admin(auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.complaints c
            WHERE c.id = resolutions.complaint_id
              AND (
                  (public.is_agent(auth.uid()) AND c.assigned_agent_id = auth.uid() AND resolutions.resolved_by = auth.uid()) OR
                  (public.is_customer(auth.uid()) AND c.customer_id = auth.uid())
              )
        )
    )
    WITH CHECK (
        public.is_admin(auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.complaints c
            WHERE c.id = resolutions.complaint_id
              AND (
                  (public.is_agent(auth.uid()) AND c.assigned_agent_id = auth.uid() AND resolutions.resolved_by = auth.uid()) OR
                  (public.is_customer(auth.uid()) AND c.customer_id = auth.uid())
              )
        )
    );

-- --------------------------------------------------------------------
-- TABLE: COMPLAINT_COMMENTS POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Comments select policy" ON public.complaint_comments;
CREATE POLICY "Comments select policy" ON public.complaint_comments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.complaints c
            WHERE c.id = complaint_comments.complaint_id
              AND (
                  (public.is_customer(auth.uid()) AND c.customer_id = auth.uid()) OR
                  (public.is_agent(auth.uid()) AND c.assigned_agent_id = auth.uid()) OR
                  public.is_admin(auth.uid())
              )
        )
    );

DROP POLICY IF EXISTS "Comments insert policy" ON public.complaint_comments;
CREATE POLICY "Comments insert policy" ON public.complaint_comments
    FOR INSERT TO authenticated
    WITH CHECK (
        author_id = auth.uid() AND (
            public.is_admin(auth.uid()) OR
            EXISTS (
                SELECT 1 FROM public.complaints c
                WHERE c.id = complaint_comments.complaint_id
                  AND (
                      (public.is_customer(auth.uid()) AND c.customer_id = auth.uid()) OR
                      (public.is_agent(auth.uid()) AND c.assigned_agent_id = auth.uid())
                  )
            )
        )
    );

-- --------------------------------------------------------------------
-- TABLE: NOTIFICATIONS POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Notifications select policy" ON public.notifications;
CREATE POLICY "Notifications select policy" ON public.notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Notifications update policy" ON public.notifications;
CREATE POLICY "Notifications update policy" ON public.notifications
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
    WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Notifications insert policy" ON public.notifications;
CREATE POLICY "Notifications insert policy" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin(auth.uid()));
