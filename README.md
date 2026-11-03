# Attendly AI - Multi-Portal Academic Platform

Attendly AI is structured into three independent portals for Administration, Faculty, and Students, powered by Google Cloud Firebase Authentication, Cloud Firestore, and Firebase Storage.

## Local Development & Portal URLs

After starting the development server (`npm run dev`), you can access each portal via its dedicated HTML entry point:

1. **Portal Gateway Landing**: [http://localhost:3000/](http://localhost:3000/)
   - Central landing page providing overview cards and direct links to all three portals.
2. **Admin Portal**: [http://localhost:3000/admin.html](http://localhost:3000/admin.html)
   - *Theme*: Purple accent ("Academic Administration Portal").
   - *Access*: Dean & Controller role exclusive. Manages CSV data imports/exports, ID provisioning, and academic hierarchy.
3. **Faculty Portal**: [http://localhost:3000/faculty.html](http://localhost:3000/faculty.html)
   - *Theme*: Blue accent ("Faculty Portal").
   - *Access*: Course faculty and instructors. Manages live attendance sessions, assignment grading, quiz attempts, and participation marks.
4. **Student Portal**: [http://localhost:3000/student.html](http://localhost:3000/student.html)
   - *Theme*: Emerald accent ("Student Portal").
   - *Access*: Enrolled students. Scans rotating QR attendance with face verification, submits assignments, and views engagement analytics.

---

## Production Deployment TODO

> **TODO Note**: Once Cloud Firestore is fully validated as the single source of truth across all sessions, each portal HTML entry point (`admin.html`, `faculty.html`, `student.html`) can be deployed to its own independent subdomain or dedicated production URL (e.g. `admin.attendly.edu`, `faculty.attendly.edu`, `student.attendly.edu`).
