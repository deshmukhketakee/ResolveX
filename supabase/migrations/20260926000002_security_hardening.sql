-- ====================================================================
-- ResolveX — Smart Customer Complaint & Resolution Management Platform
-- Phase 2.2 Security Hardening Migration Script
-- Fix 1: Public Registration Role Hardening
-- Fix 2: Column-Level Protection Trigger on Complaints Table
-- ====================================================================

-- --------------------------------------------------------------------
-- FIX 1: FORCE PUBLIC SIGNUPS TO ALWAYS DEFAULT TO 'customer' ROLE
-- --------------------------------------------------------------------
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
        'customer' -- FORCE DEFAULT 'customer' FOR PUBLIC REGISTRATION (PREVENTS PRIVILEGE ESCALATION)
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        updated_at = now();

    RETURN NEW;
END;
$$;

-- Re-apply trigger to ensure handle_new_user() is up-to-date
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


-- --------------------------------------------------------------------
-- FIX 2: COLUMN-LEVEL PROTECTION TRIGGER FOR COMPLAINTS TABLE
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_complaint_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_role TEXT;
BEGIN
    caller_role := public.get_user_role(auth.uid());

    -- Admin bypass: Administrators are authorized to update all fields
    IF caller_role = 'admin' THEN
        RETURN NEW;
    END IF;

    -- CUSTOMER FIELD RESTRICTIONS
    IF caller_role = 'customer' THEN
        IF OLD.customer_id IS DISTINCT FROM NEW.customer_id THEN
            RAISE EXCEPTION 'Security Policy Error: Customers are not authorized to modify customer_id.';
        END IF;

        IF OLD.assigned_agent_id IS DISTINCT FROM NEW.assigned_agent_id THEN
            RAISE EXCEPTION 'Security Policy Error: Customers are not authorized to assign or alter assigned agents.';
        END IF;

        IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN
            RAISE EXCEPTION 'Security Policy Error: Customers are not authorized to modify complaint category.';
        END IF;

        IF OLD.priority IS DISTINCT FROM NEW.priority THEN
            RAISE EXCEPTION 'Security Policy Error: Customers are not authorized to modify complaint priority.';
        END IF;

        IF OLD.status IS DISTINCT FROM NEW.status THEN
            RAISE EXCEPTION 'Security Policy Error: Customers are not authorized to modify complaint status directly.';
        END IF;
    END IF;

    -- SUPPORT AGENT FIELD RESTRICTIONS
    IF caller_role = 'agent' THEN
        IF OLD.customer_id IS DISTINCT FROM NEW.customer_id THEN
            RAISE EXCEPTION 'Security Policy Error: Support agents are not authorized to modify customer_id.';
        END IF;

        IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN
            RAISE EXCEPTION 'Security Policy Error: Support agents are not authorized to modify complaint category.';
        END IF;

        IF OLD.assigned_agent_id IS DISTINCT FROM NEW.assigned_agent_id THEN
            RAISE EXCEPTION 'Security Policy Error: Support agents are not authorized to assign or reassign complaints. Assignment changes must be performed by an Administrator.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_complaint_fields ON public.complaints;
CREATE TRIGGER trg_protect_complaint_fields
BEFORE UPDATE ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.protect_complaint_fields();
