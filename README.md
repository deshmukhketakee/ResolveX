# ResolveX — Smart Customer Complaint & Resolution Management Platform

A production-grade, scalable web platform designed for campus hiring assessment to fulfill core business requirements:

> **"Capture complaints, categorise them, assign responsibility, track resolution and monitor pending complaints."**

---

## 🏛️ Project Architecture & Design Decisions

Before initiating implementation, key architectural decisions were established to ensure high maintainability, type safety, and seamless multi-role user experience:

1. **Role-Aware SaaS Navigation Shell**:
   - Built around a unified responsive `AppLayout` wrapper featuring a persistent collapsible `Sidebar`, header `TopNav`, and main outlet container.
   - Includes a **`[DEV PREVIEW]` Role Switcher** badge in the top navigation. This allows evaluators to seamlessly toggle between **Customer**, **Support Agent**, and **Admin** perspectives without requiring database setup or auth mocking.

2. **Clean Type Contracts (`src/types/`)**:
   - `src/types/` is strictly reserved for TypeScript interfaces and data contracts (`Complaint`, `ComplaintStatus`, `UserRole`, `ComplaintCategory`, `ComplaintResolution`, etc.).
   - No business logic or state mutations are included in the type layer.

3. **Safe Environment Variable Abstraction (`src/config/supabase.ts`)**:
   - Supabase client initialization checks `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY`.
   - If unconfigured (e.g., prior to database setup), the app logs a gentle developer warning and uses a safe fallback client structure so the application runs out-of-the-box without crashing.

4. **Service Abstraction Blueprint (`src/services/`)**:
   - Future API calls, database triggers, and business logic pipelines will be cleanly isolated inside `src/services/` to keep UI components decoupled from data providers.

---

## 👥 User Roles & Responsibilities

| User Role | Core Capabilities & Views |
| :--- | :--- |
| **Customer** | Submit complaints, select category/severity, view ticket status lifecycle, accept resolutions, provide feedback. |
| **Support Agent** | View assigned ticket queue, investigate complaints, request customer clarifications, post resolution notes. |
| **Admin** | Command center analytics, user role administration, complaint categorisation & SLA rules, pending complaints bottleneck monitoring. |

---

## 🔄 Core Business Workflow & Status Lifecycle

Complaints transition strictly through six required status values:

```
[ New ] ➔ [ Assigned ] ➔ [ In Progress ] ➔ [ Waiting for Customer ] ➔ [ Resolved ] ➔ [ Closed ]
```

1. **New**: Customer submits ticket; logged into category queue.
2. **Assigned**: Admin/System assigns complaint to a support agent.
3. **In Progress**: Agent investigates the issue and works on resolution.
4. **Waiting for Customer**: Agent requests additional information from the customer.
5. **Resolved**: Agent provides resolution notes and root cause explanation.
6. **Closed**: Customer accepts resolution or ticket auto-closes post SLA.

---

## 📁 Scalable Directory Layout

```
Thinqloud/
├── .env.example                # Supabase environment variables template
├── .gitignore                  # Git exclusions
├── README.md                   # System Architecture & Development Guide
├── AI_DEVELOPMENT_LOG.md       # AI Development Decision Audit Trail
├── index.html                  # HTML entry point
├── package.json                # Project dependencies & scripts
├── tsconfig.json               # TypeScript config
├── tsconfig.app.json           # Application tsconfig with @/ path aliases
├── vite.config.ts              # Vite configuration with Tailwind CSS & path alias
└── src/
    ├── main.tsx                # React entry point
    ├── App.tsx                 # Root router provider
    ├── index.css               # Design system tokens & Tailwind v4 imports
    ├── config/
    │   └── supabase.ts         # Safe Supabase client configuration
    ├── types/
    │   ├── roles.ts            # UserRole union type & role contracts
    │   ├── status.ts           # Required ComplaintStatus types
    │   ├── complaint.ts        # Complaint, Category, Assignment & Resolution contracts
    │   └── index.ts            # Type barrel export
    ├── services/
    │   └── README.md           # Service layer architecture blueprint
    ├── components/
    │   ├── ui/                 # Reusable UI primitives (Button, Card, Badge, StatCard)
    │   ├── layout/             # Master SaaS frame (AppLayout, Sidebar, TopNav)
    │   └── common/             # DevRoleSwitcher, StatusBadge
    ├── pages/
    │   ├── auth/               # LoginPage, RegisterPage placeholders
    │   ├── customer/           # CustomerDashboard, SubmitComplaint, MyComplaints
    │   ├── agent/              # AgentDashboard, AssignedComplaints, InvestigationView
    │   ├── admin/              # AdminDashboard, UserManagement, CategoryManagement, PendingMonitoring
    │   └── NotFound.tsx        # 404 page placeholder
    ├── routes/
    │   └── AppRouter.tsx       # Centralized role-aware view router
    └── utils/
        └── cn.ts               # Tailwind class merge helper
```

---

## 🛠️ Technology Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (v4)
- **Icons**: Lucide React
- **Routing**: React Router DOM (v7)
- **Backend / Auth Integration**: Supabase JS SDK (configured safely for future DB phase)

---

## 🚀 Running the Project Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Verify TypeScript & Build
```bash
npm run build
```

---

## 📝 Future Phases

- **Phase 2 (Database & Auth)**: PostgreSQL schema design, Row-Level Security (RLS) policies, Supabase Auth integration.
- **Phase 3 (Business Logic)**: Active complaint workflow transitions, SLA breach timer, and customer review actions.
