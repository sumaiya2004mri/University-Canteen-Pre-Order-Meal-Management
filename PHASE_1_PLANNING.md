# Phase 1 – Specification Planning Document

## Goal
Create a concrete, actionable plan for the eight‑phase implementation of **CampusBites** that strictly follows the permanent project specification (`PROJECT_SPEC.md`) and the MySQL‑only constraint.

## Acceptance Criteria
- A single markdown file (`PHASE_1_PLANNING.md`) in the repository root that:
  - Lists the eight phases with brief descriptions.
  - Provides acceptance criteria for each phase.
  - Defines the order of execution and any dependencies between phases.
  - Shows how MySQL migrations will be applied (no `supabase db reset`).
  - Includes a high‑level schedule (estimated effort per phase).
  - References the relevant sections of `PROJECT_SPEC.md` for each requirement.
- All references are clickable links to the appropriate files/lines.
- The document is reviewed and approved by the user before any code changes are made.

## Deliverables
- `PHASE_1_PLANNING.md` (markdown) placed at the repository root.
- A short **summary** of the plan sent to the user (the file itself will contain the full details).

## Outline of the Planning Document
### 1️⃣ Phase 0 – Project Specification
- **Task:** Ensure `PROJECT_SPEC.md` exists (already done) and is the source of truth.
- **Acceptance:** File present, complete, and referenced throughout the plan.

### 2️⃣ Phase 1 – Read‑Only Audit (already completed)
- **Task:** Summarize audit findings (link to `phase_report.md`).
- **Acceptance:** Audit report present, no code changes.

### 3️⃣ Phase 2 – Verify RLS / Security Policies
- **Task:** Confirm `12_add_rls_policies.sql` secures `orders`, `order_items`, `payments`; clean up unused `*_mysql.sql` files.
- **Acceptance:** Policies verified, INSERT policy added, Git status clean.

### 4️⃣ Phase 3 – Authentication Redesign (MySQL‑based)
- **Tasks**:
  1. design OTP storage schema (table `user_otps`).
  2. implement server‑side endpoints for registration, OTP generation/verification, login.
  3. replace Supabase client calls in `src/lib/auth.ts` with MySQL API calls.
- **Acceptance:** End‑to‑end registration & login work with MySQL, all OTPs stored hashed, no Supabase references remain.

### 5️⃣ Phase 4 – Menu, Cart & Checkout
- **Tasks**:
  - Align `MENU_SELECT` queries with actual MySQL column names.
  - Add server‑side validation for price, stock, special‑offer dates.
  - Implement stored procedures or API routes for `place_order`, `cancel_order`.
- **Acceptance:** Students can view menu, add to cart, and successfully place an order; stock is decremented atomically.

### 6️⃣ Phase 5 – Order Lifecycle & Expiry
- **Tasks**:
  - Define `order_status` enum in MySQL.
  - Implement transition endpoints (`accept`, `prepare`, `ready`, `pick_up`).
  - Add a scheduled MySQL event or Node cron (via `node-cron`) that expires orders after the configurable `HOLD_HOURS`.
- **Acceptance:** All status transitions enforce role checks; orders auto‑expire after 5 hours.

### 7️⃣ Phase 6 – Staff & Admin Console
- **Tasks**:
  - Build UI pages for staff order handling, menu management, staff account creation.
  - Secure API endpoints with role‑based checks.
  - Ensure no client can self‑assign `staff` or `admin` roles.
- **Acceptance:** Staff can manage orders and menu; admin can manage users and view reports.

### 8️⃣ Phase 7 – bKash Payment Integration
- **Tasks**:
  - Add environment variables (`BKASH_MERCHANT_ID`, `BKASH_API_KEY`, `BKASH_API_SECRET`).
  - Implement server‑side payment request, callback verification, and status updates.
  - Include sandbox mode toggling.
- **Acceptance:** Online payments succeed in sandbox; cash orders remain functional.

### 9️⃣ Phase 8 – Reviews, Profile, Polishing
- **Tasks**:
  - Create `reviews` table, endpoints for create/read/delete.
  - Merge redundant profile pages into a single UI.
  - Remove “fabrica” references.
  - Fix remaining UI bugs (dashboard counters, cart errors, etc.).
- **Acceptance:** Users can submit and view reviews; profile page is unified; UI passes manual QA.

## Dependencies & Ordering
| Phase | Depends on |
|------|------------|
| 0 | – |
| 1 | 0 |
| 2 | 0,1 |
| 3 | 0,2 |
| 4 | 3 |
| 5 | 4 |
| 6 | 5 |
| 7 | 6 |
| 8 | 6,7 |

## Migration Approach (MySQL only)
- All schema changes are applied via `.sql` files located in `database/`.
- Apply migrations with:
  ```
  mysql -u <user> -p <database> < database/<migration_name>.sql
  ```
- No `supabase db reset` commands will be used.
- Migration scripts are version‑controlled; each new script receives an incrementing prefix (e.g., `01_`, `02_`).
- After each migration, run the associated integration tests (see the testing plan in Phase 8).

## Estimated Effort (per developer)
| Phase | Estimated workdays |
|------|-------------------|
| 0 | 0.5 |
| 1 | 0.5 |
| 2 | 1 |
| 3 | 3 |
| 4 | 3 |
| 5 | 2 |
| 6 | 2 |
| 7 | 2 |
| 8 | 2 |

## Review & Approval Process
1. **Draft** – This document is created (currently).
2. **User Review** – You (the user) review and approve or request changes.
3. **Lockdown** – Once approved, the plan becomes the guiding contract; any deviation must be re‑approved.
4. **Implementation** – Each phase will be implemented only after the prior phase’s acceptance criteria are met.

---
*All future work must reference this plan and the permanent `PROJECT_SPEC.md`. If any task conflicts with either, stop and ask for clarification.*
