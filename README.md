# SESA Event Tracker

**Department Of Software Engineering**  
**MIT Academy of Engineering (MITAOE), Alandi (D.), Pune**  
*Official Event Lifecycle, Student Membership Verification & Venue Attendance Platform*

---

## 1. Overview & Vision

**SESA Event Tracker** is an academic event management system designed for the Software Engineering Student Association (SESA) at MITAOE.

The application manages the complete event lifecycle:
1. **Departmental Membership Verification**: Server-side validation of College PRN against paid student records before registration.
2. **Event Lifecycle Management**: Draft, Published, Registration Closed, Completed, and Archived states with automated concurrency and capacity limits.
3. **High-Speed Venue Attendance Desk**: Zero QR scanning or paper tickets. Pure PRN-based lookup optimized for rapid check-in under event door pressure.
4. **On-Spot Walk-in Handling**: Instantaneous single-step registration and check-in for paid members arriving directly at the venue.
5. **Role-Based Control**: Dedicated workspaces for Super Admins, Event Organizers, Desk Volunteers, and Students.
6. **Audit & Reporting**: Formula-sanitized CSV exports for registrations and attendance turnout, plus immutable audit trails.

---

## 2. Visual Identity & Design System

The platform reflects the official SESA academic identity:
- **Deep Navy** (`#09172B`): Primary headers, hero background, primary buttons.
- **Navigation Slate** (`#263346`): Secondary panels, active states, and sub-navbars.
- **Warm Ivory** (`#F8F1E6`): Background canvas for high-contrast reading.
- **Muted Gold** (`#E4BC70`): Accent crest highlights, active underlines, and status badges.
- **Editorial Typography**: Headings in `DM Serif Display` / `Playfair Display`; body in `Inter`.

---

## 3. Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components & Route Handlers)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with custom academic design tokens
- **Icons**: Lucide React
- **CSV Engine**: PapaParse with formula injection sanitization (CWE-1236 protection)
- **Database**: Dual architecture:
  - Local Persistent Engine (out of the box zero-setup persistence in `.data/sesa_store.json`)
  - Supabase PostgreSQL (complete schema and RLS policies in `supabase/schema.sql`)
- **Testing**: Automated test suite (`scripts/test-workflows.ts`) executed with `tsx`

---

## 4. Quickstart & Local Setup

### Prerequisites
- Node.js 18+ or Node.js 20+
- npm 9+

### 1. Clone & Enter Directory
```bash
git clone https://github.com/GaikwadAtharva/SESA_Event_Attendance.git
cd sesa-event-tracker
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### 4. Run Automated Workflow Tests
Verify all 19 core business rules (PRN normalization, safe upsert, atomic capacity, duplicate check-in prevention, and formula sanitization):
```bash
npx tsx scripts/test-workflows.ts
```

### 5. Launch Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Default Demonstration Credentials

For instant evaluation, the application comes seeded with the following role accounts:

| Role | Username | Password | Default Redirect | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `sesa_admin` | `sesa2026` | `/dashboard` | Full control: events, memberships, user roles, audit trail |
| **Organizer** | `organizer_lead` | `sesa2026` | `/dashboard` | Events, CSV import/export, attendees, reporting |
| **Desk Volunteer** | `volunteer_desk` | `sesa2026` | `/desk` | Fast PRN lookup, mark present, walk-in register+present |

*One-click instant login buttons are also available on the `/login` page.*

---

## 6. Seeded Test Data

The application includes verified student data from MITAOE Department Of Software Engineering:

### Sample Student PRNs for Testing
- `MIT2024001`: Aarav Sharma (**Paid Member**, Pre-registered for Hackathon)
- `MIT2024002`: Riya Patil (**Paid Member**, Pre-registered for Hackathon)
- `MIT2024003`: Aditya Kulkarni (**Paid Member**, Pre-registered for Hackathon)
- `MIT2024004`: Sneha Joshi (**Paid Member**, Not yet registered — ideal for testing online registration or walk-in!)
- `MIT2024005`: Rahul Deshmukh (**Pending Payment** — registration blocked with instructions to pay treasurer)
- `MIT2024007`: Tanmay Shinde (**Unpaid** — registration blocked)
- `MIT2024008`: Pooja Hegde (**Paid Member**, Registered via Walk-in)

---

## 7. Key Workflows & Operations

### 7.1. Student Registration Flow (`/events/[slug]`)
1. Student navigates to active event and enters College PRN.
2. System checks membership database on the server:
   - If **Paid**: Displays student name & branch snapshot, unlocks registration form.
   - If **Pending/Unpaid/Unknown**: Explains that membership fee verification is required.
3. Concurrency check ensures duplicate registrations cannot be submitted and capacity cannot be exceeded.
4. Student receives a confirmed Registration ID.

### 7.2. Venue Entrance Desk (`/desk`)
- **Fast PRN Lookup**: Volunteer types student PRN and presses `Enter`.
- **Pre-registered Check-in**: Displays student name, event registration status, and prominent **Mark Present** button.
- **Duplicate Prevention**: If already checked in, displays exact timestamp and volunteer name who authorized entry.
- **Walk-in Registration Action**:
  - Checks if student has paid membership.
  - If paid: atomically creates registration and marks attendance in a single operation.
  - If unpaid: displays clear notice directing student to SESA treasurer desk.

### 7.3. Membership Roster & CSV Import (`/dashboard/memberships`)
- Upload CSV with student fee records (use `sample_members_import.csv` to test).
- **Validation Preview**: Displays total rows, valid rows, invalid rows, and duplicate PRNs.
- **Safe Upsert Engine**: Existing paid members are *never* demoted or erased by subsequent CSV imports.
- **Formula Injection Sanitization**: All CSV exports sanitize `=`, `+`, `-`, `@` characters to protect against CVE-1236.

---

## 8. Supabase & Production PostgreSQL Deployment

To deploy to Supabase:
1. Create a project in [Supabase](https://supabase.com).
2. Go to **SQL Editor** in your Supabase dashboard.
3. Paste and run the complete SQL script located in `supabase/schema.sql`.
4. Copy your project URL, Anon Key, and Service Role Key into your production environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

---

## 9. Developer Extensibility Guide

### Adding a New Page
1. Create a new folder inside `src/app/` (e.g. `src/app/certificates/page.tsx`).
2. Import the SESA `Navbar` and `Footer` components:
   ```tsx
   import { Navbar } from "@/components/layout/Navbar";
   import { Footer } from "@/components/layout/Footer";
   ```
3. Wrap your page content in standard layout tokens (`bg-[#F8F1E6]`, `font-serif` headings).

### Adding a New API Endpoint
1. Create a `route.ts` inside `src/app/api/your-feature/route.ts`.
2. Secure the endpoint using `getCurrentUser()` or `requireAuth(["super_admin", "organizer"])` from `@/lib/auth`.
3. Use methods in `db` (`@/lib/db`) and log an audit record via `db.logAudit()`.

### Adding a Database Entity / Migration
1. Update TypeScript models in `src/lib/types.ts`.
2. Add helper query/mutation methods in `src/lib/db.ts`.
3. Append table DDL and RLS policies to `supabase/schema.sql`.

---

## 10. License & Departmental Credits

Developed for the **Software Engineering Student Association (SESA)**  
**Department Of Software Engineering**  
**MIT Academy of Engineering (MITAOE), Alandi, Pune**
