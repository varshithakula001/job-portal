# Job Portal Backend API

A REST API for a job portal with three roles: **Job Seeker**, **Employer** and **Admin**.

Built with Node.js, Express, MongoDB, Mongoose, bcryptjs, JWT and httpOnly cookies.

---

## 1. How to run

```bash
npm install
npm run dev
```

The server starts on `http://localhost:4000` and connects to the local MongoDB
database `jobportaldb` (Mongo creates the database automatically on the first save).

Environment variables live in `.env`:

| Key | Meaning |
|---|---|
| PORT | port the server listens on |
| DB_URL | MongoDB connection string |
| SECRET_KEY | secret used to sign and verify the JWT |
| ADMIN_SECRET | extra key required to register an ADMIN account |

---

## 2. Folder structure

```
job-portal/
  models/            → Mongoose schemas (data structure)
    UserModel.js
    JobModel.js
    ApplicationModel.js
  middlewares/       → functions that run before the route handler
    tokenVerificationMiddleware.js   (are you logged in?)
    allowedRolesMiddleware.js        (is your role allowed here?)
  APIs/              → the routes
    userAPI.js
    jobAPI.js
    applicationAPI.js
  postman/           → Postman collection for testing
  server.js          → entry point, connects DB and mounts routes
  .env               → secrets (not committed to git)
```

---

## 3. Data design (embedded vs referenced)

| Field | Type | Why |
|---|---|---|
| `Job.requirements` | **embedded** array of strings | small, fixed size, belongs only to that job |
| `Job.postedBy` | **reference** to a user `_id` | the employer exists independently, so we store only the id and use `.populate()` |
| `Application.job` / `Application.applicant` | **references** | both documents exist on their own |
| Applications themselves | **separate collection**, not embedded inside Job | a job can get hundreds of applicants; embedding them would make the job document grow huge |

All three roles live in **one** `user` collection with a `role` field, instead of
three separate collections.

---

## 4. Authentication flow

1. On **register**, the password is hashed with bcrypt (12 salt rounds) before saving.
   The plain password is never stored.
2. On **login**, the entered password is compared with the stored hash.
   If it matches, a JWT containing `{ id, role }` is signed and sent back inside an
   **httpOnly cookie** named `accessToken`.
3. `verifyToken` reads that cookie on every protected route, verifies the signature
   and attaches `req.user = { id, role }`.
4. `allowedRoles("EMPLOYER")` then checks whether that role is permitted on the route.

**401 vs 403:** 401 means *not logged in*, 403 means *logged in but not allowed*.

**Ownership checks:** role alone is not enough. Employer A and Employer B share the
same role, so every edit/delete route also compares `job.postedBy` with `req.user.id`.

---

## 5. API endpoints

### User API — `/user-api`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/register` | public | register a seeker/employer/admin |
| POST | `/login` | public | login, sets httpOnly cookie |
| POST | `/logout` | public | clears the cookie |
| GET | `/profile` | any logged-in user | my own profile |
| PUT | `/profile` | any logged-in user | update my own profile |
| GET | `/all` | ADMIN | list all users |
| PUT | `/deactivate/:id` | ADMIN | block a user from logging in |
| PUT | `/activate/:id` | ADMIN | unblock a user |
| DELETE | `/users/:id` | ADMIN | delete a user |

### Job API — `/job-api`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/jobs` | EMPLOYER | post a new job |
| GET | `/jobs` | public | all open jobs (filters: `?location=` `?title=`) |
| GET | `/jobs/:id` | public | one job by id |
| GET | `/my-jobs` | EMPLOYER | only the jobs I posted |
| PUT | `/jobs/:id` | EMPLOYER (owner) | update my job |
| DELETE | `/jobs/:id` | EMPLOYER (owner) or ADMIN | delete job + its applications |

### Application API — `/application-api`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/applications` | JOBSEEKER | apply to a job (no duplicates, no closed jobs) |
| GET | `/my-applications` | JOBSEEKER | my applications |
| DELETE | `/applications/:id` | JOBSEEKER (owner) | withdraw my application |
| GET | `/job/:jobId` | EMPLOYER (owner) | applicants for my job |
| PUT | `/applications/:id` | EMPLOYER (owner) | set status SHORTLISTED / REJECTED |
| GET | `/all` | ADMIN | every application in the system |

---

## 6. Testing with Postman

Import `postman/JobPortal.postman_collection.json` into Postman
(**Import → File → select the json**) and run the requests from top to bottom.

Postman stores the login cookie automatically, so logging in as a different user
simply overwrites it. The collection saves `jobId` and `applicationId` into
collection variables automatically, so the later requests just work.

Make sure **Authorization** is set to *No Auth* — this API uses cookies, not Bearer tokens.
