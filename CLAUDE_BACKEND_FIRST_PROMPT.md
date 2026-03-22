# Claude Code Prompt — Backend First Build

Gunakan prompt ini kalau kamu mau Claude Code fokus backend dulu, baru frontend nyusul.

---

## Prompt

```text
I am building Absenin.com, a multi-tenant HRM and attendance SaaS platform.

I want to build this project backend-first.
Please do not generate the entire full-stack app at once.
I want a clean, modular, maintainable architecture.

Core MVP domains:
- companies
- auth
- company settings
- employees
- divisions
- positions
- attendance
- office locations / geofence
- selfie upload
- analytics
- reports

Requirements for MVP:
- company registration
- company admin login
- secure tenant scoping
- employee CRUD
- division CRUD
- position CRUD
- company office location / radius setup
- attendance check-in/check-out
- GPS validation against office radius
- selfie upload and linking to attendance
- dashboard summary endpoints
- basic daily attendance reporting

Constraints:
- use consistent English naming across codebase
- keep modules isolated by domain
- use a service/repository/controller structure
- design queries safely for multi-tenant access
- add request validation
- add auth guards / role checks
- do not add advanced phase-2 or phase-3 features yet
- when designing future WhatsApp integration, prepare a provider abstraction for Official Meta, Wablas, and Fonnte instead of coupling business logic to one gateway

Please work in this order:
1. Recommend backend stack
2. Propose backend folder/module structure
3. Design the MVP database schema
4. Define API routes for MVP
5. Generate implementation plan
6. Wait for approval
7. After approval, scaffold the backend project
8. Implement modules incrementally in this order:
   - auth
   - companies/settings
   - divisions
   - positions
   - employees
   - office locations
   - attendance
   - selfies
   - analytics
   - reports
9. Add environment example and local setup instructions
10. Add migration and seed strategy

Important:
- keep business logic out of route files
- create reusable auth and tenant middleware
- centralize error handling
- make attendance validation rules explicit and easy to extend

Before writing code, show me:
- backend architecture
- schema plan
- route plan
- implementation order
and ask for approval first.
```

---

## Good Follow-up Prompts

### Approve plan and scaffold
```text
Approved. Now scaffold the backend project exactly based on the proposed architecture.
```

### Implement first modules
```text
Now implement auth, company registration, company settings, and tenant-safe middleware first.
```

### Continue domain modules
```text
Now continue with divisions, positions, employees, and office locations.
```

### Continue attendance
```text
Now implement attendance check-in/check-out, geofence validation, selfie upload support, analytics summary, and daily reports.
```

### Add quality pass
```text
Now review the backend code structure and refactor any weak boundaries or duplicated logic before we start frontend work.
```
