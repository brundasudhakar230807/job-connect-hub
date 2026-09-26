# Job Portal & Recruitment System

A real, working full-stack job portal with three roles: Job Seeker, Recruiter, and Admin. Every form saves to a real hosted database, logins really authenticate, and application statuses really update.

## Note on the technology

Your brief asks for Node/Express plus a separate relational database. This platform builds React apps on a Node server runtime with a hosted PostgreSQL database built in, so the app will be:

- React + TypeScript front end, styled with Bootstrap 5 (added to the project) for the navbar, cards, tables, forms, modals and responsive grid.
- Server-side REST-style API endpoints running on Node (same role as Express routes) — real HTTP endpoints, real validation, real authorization.
- PostgreSQL with proper tables, primary keys, foreign keys and constraints.
- Built-in authentication (email + password, securely hashed by the platform, never stored by us) with role-based access.

This satisfies the academic requirements: React front end, Node back end, REST API, relational database, secure auth. If your college strictly requires a hand-written Express server folder, tell me and I'll note the mapping in the documentation.

## Database structure

- `users` — one row per account, linked to the auth account, holds role (`job_seeker`, `recruiter`, `admin`), name, phone, active flag
- `user_roles` — separate role table (security best practice, prevents privilege escalation)
- `job_seekers` — headline, bio, location, years of experience, linked to `users`
- `companies` — name, logo, industry, size, website, description, location
- `recruiters` — links a user to a company, job title
- `resumes` — uploaded file reference, file name/size, current flag, linked to `job_seekers`
- `education` — degree, institution, field, years, grade
- `experiences` — company, role, dates, description
- `skills` — master list of skills
- `job_seeker_skills` — join table (seeker ↔ skill, proficiency)
- `jobs` — title, company, location, type, salary range, experience required, description, responsibilities, qualifications, posted date, deadline, status (open/closed/removed)
- `job_skills` — join table (job ↔ skill)
- `applications` — seeker + job (unique together), cover letter, resume used, status, timestamps, recruiter notes

Statuses: Applied, Under Review, Shortlisted, Interview, Selected, Rejected.

Security: row-level rules so seekers only see their own data, recruiters only their company's jobs and those applicants, admins everything. Resume files go to a private storage bucket; only the owner and recruiters with an application from that seeker can download them.

## Pages

Public: Home (hero + search + featured jobs), Browse Jobs (search + filters: keyword, location, type, experience, salary), Job Details, Login, Register (choose seeker or recruiter), About, Contact.

Job Seeker: Dashboard (stats + recent applications), Profile, Edit Profile (education, skills, experience), Resume (upload/replace/download), Applications list, Application Details with status timeline.

Recruiter: Dashboard, Company Profile (create/edit), Post Job, Manage Jobs (edit/close/delete), Applicants per job, Applicant Details (full profile, resume download, status change).

Admin: Dashboard (counts + charts), Users, Companies, Jobs (deactivate/remove inappropriate postings), Applications.

## Design

Professional, modern recruitment look — deep navy and a confident accent, clean cards, generous whitespace, sticky responsive navbar, status badges with distinct colors, skeleton loading, toasts for every action, modals for confirmations. Fully responsive on mobile, tablet, laptop and desktop.

## Build order

1. Enable the hosted database and authentication; create all tables, foreign keys, constraints and access rules; seed a skills list and a few demo jobs.
2. Add Bootstrap 5 and the design system; build the shared layout, navbar and footer.
3. Public pages: Home, Browse Jobs with live filters, Job Details, About, Contact.
4. Auth: register (role choice), login, logout, protected routes per role.
5. Job seeker area: profile, education, skills, experience, resume upload, apply, applications tracking.
6. Recruiter area: company profile, post/edit/delete jobs, applicants, status updates.
7. Admin area: dashboard and management tables.
8. Test end-to-end in the browser as each role, fix issues.

## Technical details

- API layer: typed server functions + REST routes under `src/routes/api` for the public job search; validation with Zod on both client and server.
- Authorization enforced server-side on every write, not just hidden in the UI.
- File upload validation: PDF/DOC/DOCX only, max 5 MB, checked server-side.
- Admin role assigned via the roles table; a first admin is seeded.
