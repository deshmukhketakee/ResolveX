-- ====================================================================
-- ResolveX — Smart Customer Complaint & Resolution Management Platform
-- Phase 2.1 Schema Migration Script
-- PostgreSQL / Supabase Schema Definition
-- ====================================================================

-- 1. PROFILES TABLE
-- Stores application-level user profile details across Customer, Agent, and Admin roles.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CONSTRAINT chk_profiles_role CHECK (role IN ('customer', 'agent', 'admin')),
    phone TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. CATEGORIES TABLE
-- Stores complaint taxonomy and default SLA baseline configurations.
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. COMPLAINTS TABLE
-- Main complaint registry tracking life cycle status, priorities, and assignments.
CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL CONSTRAINT chk_complaints_priority CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    status TEXT NOT NULL CONSTRAINT chk_complaints_status CHECK (status IN ('New', 'Assigned', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed')),
    assigned_agent_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ NULL,
    closed_at TIMESTAMPTZ NULL
);

-- 4. COMPLAINT_ASSIGNMENTS TABLE
-- Audit log preserving historical agent assignments and re-assignments.
CREATE TABLE IF NOT EXISTS public.complaint_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    assigned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    unassigned_at TIMESTAMPTZ NULL,
    notes TEXT NULL
);

-- 5. COMPLAINT_STATUS_HISTORY TABLE
-- Audit trail tracking every complaint status transition across required status values.
CREATE TABLE IF NOT EXISTS public.complaint_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    old_status TEXT NULL,
    new_status TEXT NOT NULL CONSTRAINT chk_status_history_new_status CHECK (new_status IN ('New', 'Assigned', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed')),
    changed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    comment TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. RESOLUTIONS TABLE
-- Stores resolution notes provided by support agents and customer review verification.
CREATE TABLE IF NOT EXISTS public.resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    resolved_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    resolution_text TEXT NOT NULL,
    resolved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    customer_reviewed BOOLEAN NOT NULL DEFAULT false,
    customer_review_comment TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. COMPLAINT_COMMENTS TABLE
-- Conversation thread and investigation remarks linked to a complaint.
CREATE TABLE IF NOT EXISTS public.complaint_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. NOTIFICATIONS TABLE
-- Stores system alerts and event notifications for users.
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    complaint_id UUID NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ====================================================================
-- INDEXES FOR HIGH PERFORMANCE QUERYING
-- ====================================================================

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Complaints table indexes
CREATE INDEX IF NOT EXISTS idx_complaints_ticket_number ON public.complaints(ticket_number);
CREATE INDEX IF NOT EXISTS idx_complaints_customer_id ON public.complaints(customer_id);
CREATE INDEX IF NOT EXISTS idx_complaints_category_id ON public.complaints(category_id);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_agent_id ON public.complaints(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON public.complaints(priority);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON public.complaints(created_at DESC);

-- Assignments & Status History indexes
CREATE INDEX IF NOT EXISTS idx_complaint_assignments_complaint_id ON public.complaint_assignments(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_assignments_agent_id ON public.complaint_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_complaint_status_history_complaint_id ON public.complaint_status_history(complaint_id);

-- Resolutions, Comments & Notifications indexes
CREATE INDEX IF NOT EXISTS idx_resolutions_complaint_id ON public.resolutions(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_comments_complaint_id ON public.complaint_comments(complaint_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(user_id, is_read);
