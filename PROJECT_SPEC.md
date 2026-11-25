# CAMPUSBITES — PERMANENT PROJECT SPECIFICATION

## 1. Project identity
- **Project:** CampusBites
- **Institution:** Varendra University, Bangladesh.
- **Purpose:** A university canteen pre‑ordering and pickup platform.
- **Core objective:**
  - Students should be able to order food during classes, select a pickup time, pay conveniently, and collect their food without waiting in the canteen queue.
  - This is a real operational application, not a static prototype.

## 2. Technology constraints
- Preserve the existing project stack.
- Use the existing **MySQL** database (no migration to Supabase or PostgreSQL).
- Preserve existing backend architecture and API conventions.
- Inspect actual database tables, primary keys, foreign keys, views, and procedures before writing queries.
- Do **not** assume every table has an `id` column.
- Do **not** invent database records, food prices, or menu items.
- Do **not** duplicate existing database objects.
- Use secure server‑side database access.
- Never expose credentials or secrets in frontend code.
- MySQL does not provide PostgreSQL‑style RLS. Implement equivalent access control through server‑side authentication, authorization, ownership‑filtered queries, transactions and database permissions.

## 3. User roles
### Student
- Register and verify university identity.
- Browse food.
- Add items to cart.
- Select pickup time.
- Place orders.
- Pay cash or online.
- Track orders.
- Verify collection.
- Review collected food.

### Staff
- Individual employee accounts.
- Receive incoming orders.
- Accept or reject orders.
- Update preparation status.
- Mark orders ready.
- Verify QR codes or pickup codes.
- Manage permitted menu availability and stock.
- Manage permitted daily specials and offers.

### Admin
- Create and manage staff accounts.
- Manage roles and permissions.
- Full menu and category management.
- Manage prices, stock, discounts and specials.
- Manage pickup slots.
- View all orders.
- Access reports.
- Manage application settings.

*Staff accounts must be created by authorized admins. Public registration must never create staff or admin accounts.*

## 4. Student authentication
- **Registration fields:** Full name, nine‑digit student ID, department, password, confirm password.
- **Student email:** `<student_id>@vu.edu.bd` (derived automatically).
- **Verification:** Send a six‑digit OTP to the derived university email. OTP expires after 10 minutes. Store only a secure hash of the OTP. Maximum five verification attempts. Resend cooldown: 60 seconds. Invalidate previously used OTPs. Unverified accounts cannot use protected features.
- **Login:** Student ID + password (optional “Remember My ID”). Never store passwords in local or browser storage. Use secure password hashing and server‑managed sessions.

## 5. Staff authentication
- Employee ID, employee email, secure password.
- Email verification using OTP.
- Staff accounts created by admin.
- Individual staff accounts, not shared credentials.
- Staff role and permissions verified on the backend.

## 6. Order lifecycle
### Normal flow
`placed → accepted → preparing → ready → picked_up`
### Other possible terminal states
- `rejected`
- `cancelled`
- `expired`
**Rules:**
- Students can cancel until the order is accepted.
- Staff can accept or reject new orders.
- Staff can update preparation status.
- Only authorized staff can mark an order ready.
- Only successful pickup verification can mark it `picked_up`.
- Every transition must be validated on the server and recorded in order history/audit events.

## 7. Five‑hour order holding rule
- Configurable setting `HOLD_HOURS=5` (default).
- The five‑hour window starts when the order is placed.
- Orders not collected before the deadline expire according to business rules.
- Selected pickup slot must be inside the permitted holding window.
- Holding duration must be configurable, not hard‑coded.
- Show students the expiry information and warn them before expiration.
- Run expiry checks through a reliable scheduled backend process **and** check overdue orders during relevant reads/actions. Do **not** rely on a browser timer.

## 8. Cart and special instructions
- Students can add multiple foods, change quantities, remove foods, view photos, view prices & totals, and add special instructions per item.
- Max instruction length: 140 characters per item.
- Server must validate prices, availability, stock and totals at checkout.

## 9. Pickup scheduling
- Use available pickup slots.
- Default slot interval: 10 minutes (configurable).
- Apply minimum lead time.
- Each slot has a capacity; prevent overbooking using database transactions and concurrency‑safe logic.
- Display unavailable slots clearly.
- Allow students to choose another available slot if necessary.

## 10. Payment
- **Supported methods:** Cash on pickup, bKash online payment.
- Cash orders must work without bKash credentials.
- bKash integration must use an official merchant integration and verified payment callbacks; use sandbox mode before production.
- **Payment statuses:** `unpaid`, `pending`, `paid`, `refund_pending`, `refunded`, `failed`.
- Do not mark payments as successful based only on frontend redirects.
- A refund request is not a completed refund; mark `refunded` only after confirmation from the payment provider.
- Expired, rejected or unavailable paid orders should trigger appropriate refund workflow where the provider and merchant account support it.
- Never expose payment secrets.

## 11. Pickup verification
- When an order is created, generate a random six‑digit pickup code **and** a secure signed QR token.
- Display both on the student’s order details page; the pickup code must be prominently visible.
- Staff can scan the QR code **or** manually enter the six‑digit code.
- Backend verification must ensure:
  - Order exists and is eligible for pickup.
  - Code or token is valid.
  - Order has not already been collected.
  - Staff member is authorized.
- Successful verification atomically changes status to `picked_up`.
- Pickup verification must be single‑use.
- For cash orders, staff must record successful cash collection during handoff.
- Do **not** encode student passwords, email addresses or sensitive personal data in QR codes.

## 12. Menu and images
- Every menu item should support the fields in the existing schema: name, description, price, category, image, availability, stock (where supported), special offer price, offer start & end dates.
- Unavailable items remain visible with photo, an “Unavailable” label, and a disabled “Add to Cart” action.
- Do not remove unavailable foods from the menu automatically.
- Support “Today's Special” and time‑limited offers.
- Do **not** invent prices or food records; use actual canteen menu information supplied by the project owner.

## 13. Food comments and ratings
- Students can review food **only after** a successful pickup containing that item.
- One review per student per eligible item/order, according to the chosen review policy.
- Staff can hide inappropriate comments.
- Admins can moderate reviews.
- Display genuine ratings and review counts.
- Do **not** create fake reviews.

## 14. Student navigation
- Dashboard, Browse Menu, Cart, My Orders, Order Tracking, Order History, Profile, Help / FAQ.
- Merge redundant Profile and Student Information pages into one Profile page.
- Remove “fabrica”.

---
*All future work must read this `PROJECT_SPEC.md` before any task. If any instruction conflicts with this specification, stop and ask for clarification rather than silently changing the project architecture or business rules.*