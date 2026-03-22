# Claude Code Prompt — Absenin.com

Copy prompt di bawah ini ke Claude Code.

---

## Prompt

```text
I want to build a new web application called Absenin.com.

Absenin.com is a multi-tenant HRM and attendance SaaS platform for companies in Indonesia.
The old system had many features, but I do NOT want to blindly copy the old codebase. I want a cleaner, more maintainable, more modular rebuild.

Business domains that exist in the old system:
- Multi-tenant companies
- Authentication and role-based access
- Employee management
- Divisions and positions
- Attendance check-in/check-out
- GPS geofence validation
- Selfie verification upload
- Leave management
- Overtime management
- Shift management
- QR attendance
- Payroll
- Manager notifications
- WhatsApp attendance integration with multi-provider gateway support (Official Meta, Wablas, Fonnte)
- Broadcast messaging
- Subscription plans and payments
- Superadmin dashboard
- Blog CMS

I want you to work in phases and prioritize architecture quality.

Phase 1 tasks:
1. Analyze the product and propose a clean modular architecture
2. Propose the monorepo folder structure
3. Design the database schema for MVP first
4. Define the API modules and endpoint structure for MVP
5. Define the frontend pages and dashboard navigation for MVP
6. Produce an implementation plan before writing code
7. Then begin coding the MVP only

MVP scope should include:
- Multi-tenant company registration and login
- Role-based access for admin
- Company settings
- Employee management
- Division management
- Position management
- Attendance check-in/check-out
- GPS/geofence validation
- Selfie upload
- Dashboard overview
- Basic attendance reports

Important constraints:
- Use consistent English naming across code, folders, routes, and database tables
- Avoid duplicate pages or bilingual route duplication
- Keep tenant scoping secure by design
- Use a modular architecture with clear boundaries between modules
- Prioritize maintainability over speed
- Do not implement advanced features in MVP unless needed by the architecture
- Make the codebase easy to extend later for payroll, WhatsApp, QR attendance, and billing

Please start by giving me:
1. Recommended tech stack
2. Proposed monorepo structure
3. Domain/module breakdown
4. Database schema proposal for MVP
5. API route proposal for MVP
6. Frontend route/page map for MVP
7. Step-by-step implementation plan

Only after that, begin generating the code for the MVP.
```

---

## Optional Add-on Prompt
Jika ingin Claude Code lebih tegas sebelum ngoding, tambahkan ini:

```text
Before generating code, ask me to approve the architecture, schema, and implementation plan first.
Do not skip directly to code generation.
```

---

## Suggested Follow-up Commands
Setelah Claude Code kasih hasil awal, kamu bisa lanjut dengan prompt seperti ini:

### 1. Start project scaffold
```text
Great. Now scaffold the monorepo and generate the initial project structure for the approved MVP architecture.
```

### 2. Build backend first
```text
Now implement the backend MVP modules first, starting from auth, companies, employees, divisions, positions, attendance, settings, and reports.
```

### 3. Build frontend dashboard
```text
Now implement the frontend MVP pages and wire them to the backend API.
```

### 4. Add database migrations
```text
Generate the database schema, migrations, and seed strategy for the MVP.
```

### 5. Add deployment/dev setup
```text
Now add local development setup, environment examples, and basic deployment configuration.
```

---

## Notes
- Keep Claude focused on MVP first
- Jangan langsung suruh bikin semua fitur lama sekaligus
- Review architecture dulu sebelum accept code generation
- If needed, split work into backend-first and frontend-second
