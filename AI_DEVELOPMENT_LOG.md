# AI Development Log — ResolveX Platform

This log documents key AI-assisted engineering decisions, architectural choices, and progress milestones across development phases for **ResolveX — Smart Customer Complaint & Resolution Management Platform**.

---

## 📌 Phase 1: Foundation, Architecture & Scaffolding Setup
**Date**: September 26, 2026  
**Status**: Completed  
**Objective**: Establish project foundation, clean folder structure, layout scaffolding, role preview routing, and environment configuration without implementing database schemas or auth logic.

### Key Engineering Decisions & Rationale

1. **Development-Only Role Preview Switcher**:
   - **Decision**: Added a dedicated `[DEV PREVIEW]` Role Switcher in the top header (`src/components/common/DevRoleSwitcher.tsx`).
   - **Rationale**: Allows instant switching between Customer, Support Agent, and Admin UI views without mocking auth sessions or hardcoding user state before the database phase.

2. **Clean SaaS Design System**:
   - **Decision**: Used neutral color palettes (`slate`), distinct color tags for complaint status lifecycle (`New`, `Assigned`, `In Progress`, `Waiting for Customer`, `Resolved`, `Closed`), and subtle borders (`border-slate-200`).
   - **Rationale**: Ensures accessible, professional SaaS presentation without visually noisy glassmorphism or unnecessary dependencies.

3. **Pure Type Definitions in `src/types/`**:
   - **Decision**: Separated `roles.ts`, `status.ts`, and `complaint.ts` into pure TypeScript interfaces.
   - **Rationale**: Prevents mixing business logic with type contracts, ensuring strong type inference across the application.

4. **Safe Supabase Configuration (`src/config/supabase.ts`)**:
   - **Decision**: Implemented non-crashing fallback initialization for `createClient` when environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are missing.
   - **Rationale**: Ensures `npm run dev` and `npm run build` execute cleanly out-of-the-box before Supabase credentials are configured in `.env`.

5. **Future Service Abstraction (`src/services/`)**:
   - **Decision**: Created `src/services/README.md` as a architectural placeholder.
   - **Rationale**: Prepares the codebase for clean separation between UI components and backend database triggers in Phase 2.

---

## 📌 Phase 2.1: PostgreSQL Database Schema Definition
**Date**: September 26, 2026  
**Status**: Completed  
**Objective**: Create the complete PostgreSQL database schema definition for Supabase featuring all 8 approved core tables, foreign-key relationships, validation constraints, and optimized indexes.

### Key Database Engineering Decisions

1. **UUID Primary Keys & `gen_random_uuid()`**:
   - Every table uses native UUID primary keys with default random UUID generation.

2. **Database Level CHECK Constraints**:
   - Enforced allowed roles (`customer`, `agent`, `admin`), required complaint statuses (`New`, `Assigned`, `In Progress`, `Waiting for Customer`, `Resolved`, `Closed`), and priority values (`Low`, `Medium`, `High`, `Critical`) directly in SQL constraints to prevent data corruption.

3. **Dependency-Ordered Schema & Foreign Keys**:
   - Strict creation sequence: `profiles` & `categories` ➔ `complaints` ➔ `complaint_assignments`, `complaint_status_history`, `resolutions`, `complaint_comments`, `notifications`.

4. **Performance Indexes**:
   - B-tree indexes added for ticket numbers, user roles, complaint statuses, priorities, timestamps, and foreign key query lookup paths.

---

## 📌 Phase 2.2: Supabase Auth Integration & Row Level Security (RLS)
**Date**: September 26, 2026  
**Status**: Completed  
**Objective**: Integrate `profiles` with `auth.users`, configure automatic profile creation triggers, prevent role escalation attacks, and apply strict RLS policies for Customer, Support Agent, and Admin roles.

### Key Security Decisions & Rationale

1. **`auth.users` <-> `profiles` Relationship**:
   - `public.profiles.id` is linked to `auth.users(id)` via Foreign Key (`ON DELETE CASCADE`).

2. **Automatic Profile Creation Trigger (`handle_new_user`)**:
   - Executes `SECURITY DEFINER` function on `AFTER INSERT ON auth.users`.
   - Automatically populates `full_name`, `email`, and sanitized `role` (defaults to `'customer'`).

3. **Role Escalation Protection (`prevent_role_escalation`)**:
   - Database trigger blocks non-administrators from attempting to alter `role` or `is_active` status on profiles.

4. **Non-Recursive Helper Functions**:
   - Created `SECURITY DEFINER` functions: `get_user_role(user_id)`, `is_admin(user_id)`, `is_agent(user_id)`, `is_customer(user_id)` with `SET search_path = public`.
   - Prevents RLS recursion loops during policy evaluation.

5. **Strict Role-Scoped RLS Policies**:
   - **Customer**: Can access/update only their own profile, complaints, comments, resolutions, and notifications.
   - **Support Agent**: Can access only complaints assigned to them, update status/resolutions for assigned complaints, add comments to assigned complaints, and view their own notifications.
   - **Admin**: Full administrative management across profiles, categories, complaints, assignments, status logs, and notifications.

---

## 📌 Phase 2.2: Security Hardening & Privilege Protection
**Date**: September 26, 2026  
**Status**: Completed  
**Objective**: Harden public registration against self-assigned admin/agent privilege escalation and enforce database-level trigger restrictions on administrative fields in `complaints`.

### Key Hardening Measures Implemented

1. **Public Signup Hardening (`handle_new_user`)**:
   - Updated `handle_new_user()` to **always** insert new user profiles with `role = 'customer'`.
   - `raw_user_meta_data->>'role'` supplied during public `supabase.auth.signUp()` is ignored, preventing unauthorized self-promotion to `'agent'` or `'admin'`.

2. **Database-Level Protection Trigger (`trg_protect_complaint_fields`)**:
   - Attached `BEFORE UPDATE ON public.complaints` trigger running as `SECURITY DEFINER SET search_path = public`.
   - **Customer Restrictions**: Blocks customers from modifying `customer_id`, `assigned_agent_id`, `category_id`, `priority`, or `status`.
   - **Agent Restrictions**: Blocks support agents from modifying `customer_id`, `category_id`, or reassigning `assigned_agent_id`.
   - **Admin Privileges**: Preserves full administrative authority for users with `admin` role.

---

## 📋 Future Log Entries

- **Phase 3 (Frontend Auth & Complaint Workflow UI)**: *Pending explicit user instruction.*
- **Phase 4 (Pending Complaints & SLA Monitoring)**: *Pending explicit user instruction.*
