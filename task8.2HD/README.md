# Student Accommodation Management System — Sprint 1 & Sprint 2

A Node.js + Express + MongoDB application for the SIT725 Student Accommodation Management System. The project includes Authentication & Access Control, Admin Review & Approval, Complaint Management, Reporting & Dashboard, Application Management, and Room Management. Sprint 2 extends the working MVP with complaint status management, admin complaint integration, search/filtering, testing, and final integration improvements.

This is a cleaned-up version of the Sprint 1 codebase — a handful of bugs
found during integration testing (a server-crashing require path, a
hardcoded login bypass, a scoping bug in the admin dashboard script, a
mismatched sort parameter, and some duplicate/dead files) have been fixed,
and a registration page was added so the app is fully usable from the
browser with no manual API calls required.

## Prerequisites

- **Node.js** (v18 or newer) — check with `node -v`
- **MongoDB** running locally on `127.0.0.1:27017`, OR a free
  [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   A working `.env` file is already included, pointing at a local MongoDB
   instance:
   ```
   PORT=3000
   MONGO_URI=mongodb://127.0.0.1:27017/student_accommodation
   JWT_SECRET=dev-secret-change-me
   ```
   - If you're using **MongoDB Compass / a local install**, just make sure
     the MongoDB service is running — the included `.env` will work as-is.
   - If you're using **MongoDB Atlas**, replace the `MONGO_URI` line with
     your Atlas connection string.
   - Change `JWT_SECRET` to anything you like before sharing this beyond
     your own machine.

3. **(Optional) Seed sample room data**
   ```bash
   npm run seed
   ```
   Clears the `rooms` collection and inserts 10 sample rooms so the room
   directory isn't empty on first load (development databases only).

4. **Start the server**
   ```bash
   npm start
   ```
   or, for auto-restart on file changes during development:
   ```bash
   npm run dev
   ```
   You should see:
   ```
   MongoDB connected successfully
   Server running on http://localhost:3000
   ```

5. **Open the app**
   Go to `http://localhost:3000` in your browser.

## Using the app

- **Register** a new account at `/register.html` (choose "Student" or
  "Admin" as the account type), or use the link on the login page.
- **Log in** at `/login.html` — students are redirected to
  `/student/dashboard.html`, admins to `/admin/dashboard.html`.
- **Browse rooms** at `/index.html` — search, filter by type/status/price, sort, save favourites, and compare up to 3 rooms.
- **Manage rooms as an admin** at `/admin/rooms.html` — add, edit, archive, restore and permanently delete rooms.
- **Apply for a room / track status** at `/application.html`.
- **File or view complaints** at `/complaints.html`. Students can submit complaints and view their latest stored status.
- **Manage complaints as an admin** at `/admin/complaints.html`. Admins can search/filter complaints and update individual complaint statuses to Pending, In Progress, or Resolved.
- **Admin dashboard** (`/admin/dashboard.html`) shows live room, application, and complaint statistics, plus submitted applications with Approve/Reject actions.

## Module → API reference

| Module | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login` |
| Rooms | `GET /api/rooms` (supports `search`, `type`, `status`, `minPrice`, `maxPrice`, `sort`, `page`, `limit`), `GET /api/rooms/:id`, `GET /api/rooms/archived` (admin), `POST /api/rooms` (admin), `PUT /api/rooms/:id` (admin), `PATCH /api/rooms/:id/restore` (admin), `DELETE /api/rooms/:id` (admin, archives), `DELETE /api/rooms/:id/permanent` (admin) |
| Applications | `POST /api/applications`, `GET /api/applications/:studentId`, `GET /api/applications`, `PATCH /api/applications/:id` |
| Complaints | `POST /api/complaints`, `GET /api/complaints`, `GET /api/complaints/student/:studentId`, `GET /api/complaints/:id`, `PATCH /api/complaints/:id/status`, `PATCH /api/complaints/student/:studentId/status` |
| Dashboard | `GET /api/dashboard/stats`, `GET /api/dashboard/trends` (admin-only), `GET /api/dashboard/student` (student-only). All require a Bearer token. |

## Notes for teammates

- The `.env` file is included here for convenience so this runs immediately
  on a fresh clone — in a real production setting you'd keep `.env` out of
  version control (see `.gitignore`) and share secrets separately.
- `src/config/db.js` exists as an alternative Mongo connection helper with
  retry logic but isn't currently wired into `server.js` — feel free to use
  it in Sprint 2 if you want reconnect behaviour.

# Room Management Module - Sanika

This is my part of the group project — the Room Management module of the student accommodation system. It started in Sprint 1 as basic room CRUD and was extended in Sprint 2 with admin-only access control, soft delete (archive/restore), pagination, server-side validation, application-driven occupancy sync, a student wishlist and a room comparison tool. This document covers what the module does, how it works, how it connects to the other modules, and how it is tested.

## Overview

Rooms are stored in MongoDB (`Room` model). Students browse a public room directory; admins manage rooms from an admin page. Each room has:

| Field | Type / rule |
|---|---|
| `roomNumber` | String, required, **unique**, max 20 chars |
| `building` | String, required, max 100 chars |
| `floor` | Whole number, required, between -5 and 100 |
| `type` | `single`, `double`, `triple`, `dorm` or `suite` |
| `capacity` | Whole number, required, 1–20 |
| `occupied` | Whole number, default 0, cannot exceed `capacity` |
| `pricePerMonth` | Number, required, 0–100000 |
| `currency` | 3-letter code, default `USD` |
| `status` | `available` (default), `occupied`, `reserved` or `maintenance` |
| `amenities` | List of up to 20 short text items |
| `images` | Up to 10 items — `http(s)` URLs or `/images/rooms/<file>` paths |
| `description` | Text, max 1000 chars |
| `isArchived` / `archivedAt` | Soft-delete flag and timestamp (see below) |
| `createdAt` / `updatedAt` | Added automatically by Mongoose timestamps |

Validation happens in two places: the Mongoose schema (enums, min values, uniqueness) and a dedicated server-side validator (`src/validators/roomValidator.js`) that returns a readable list of errors for every field. `PUT` requests validate only the fields that were actually sent.

**Automatic status.** A `pre('save')` hook on the model keeps `status` consistent with occupancy: when `occupied >= capacity` the room becomes `occupied`, and an `occupied` room that has free space goes back to `available`. Rooms marked `maintenance` are never changed by this hook. (Note: the hook runs on `save()`, which is what the application-approval sync uses. A direct admin edit through `PUT` uses `findByIdAndUpdate`, so an admin who changes `occupied` by hand should also set `status` if needed.)

## Features

**Student side (`/index.html`)**
* Room directory with search (room number, building, amenity), type/status/price filters, and sorting.
* Room details pop-up with a photo gallery, amenities, price and occupancy, and an **Apply** button that pre-fills the application form.
* **Saved rooms (wishlist)** — heart button on each card, stored in the browser's `localStorage`, with a "Saved" filter.
* **Compare rooms** — pick up to 3 rooms and see them side by side (price, beds free, capacity, status, amenities), with the best value highlighted. Selection is kept in `sessionStorage`.
* Archived rooms are never shown to students.

**Admin side (`/admin/rooms.html`)**
* Add and edit rooms in a form pop-up, with client-side checks that mirror the server rules.
* Search, filters and sorting, with **pagination** (9 rooms per page).
* **Archive** a room (soft delete), view the **archived list**, **restore** a room, or **permanently delete** a room that is already archived.
* Only logged-in admins can use the page; students are redirected and an expired session logs the admin out.

**Business rules**
* Only admins can create, update, archive, restore or permanently delete rooms. Anyone can read the catalogue.
* A room cannot be archived or deleted while it has occupants or Pending/Approved applications (returns 409 with a clear message).
* Permanent delete is only allowed for rooms that were archived first.
* Approving an application adds 1 to the room's `occupied` count; rejecting or resetting a previously approved application (or deleting it) subtracts 1. The count is clamped between 0 and `capacity`, and if the linked room no longer exists the application update still succeeds.
* The admin dashboard's room statistics (total rooms, capacity, occupied beds, available beds, occupancy rate) exclude archived rooms.

## Endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/rooms` | Public | List active rooms (archived rooms are excluded) |
| `GET` | `/api/rooms/archived` | Admin | List archived rooms, newest archived first |
| `GET` | `/api/rooms/:id` | Public | Get one room (404 if missing or archived) |
| `POST` | `/api/rooms` | Admin | Create a room (201) |
| `PUT` | `/api/rooms/:id` | Admin | Partial update |
| `DELETE` | `/api/rooms/:id` | Admin | Archive (soft delete) |
| `PATCH` | `/api/rooms/:id/restore` | Admin | Restore an archived room |
| `DELETE` | `/api/rooms/:id/permanent` | Admin | Permanently delete an archived room |

**`GET /api/rooms` query parameters**

* `search` — case-insensitive match on room number, building or amenities (special characters are escaped so searches like `(` don't break the query).
* `type`, `status` — exact filters.
* `minPrice`, `maxPrice` — price range. Non-numeric values, or `minPrice` greater than `maxPrice`, return 400.
* `sort` — `price_asc`, `price_desc`, `oldest`; the default is newest first.
* `page`, `limit` — pagination (default 12 per page, maximum 50). **If neither is supplied the API returns a plain array** (the student page relies on this); if either is supplied it returns `{ rooms, pagination: { page, limit, total, totalPages } }`.

**Authentication.** Admin routes need `Authorization: Bearer <token>` from `POST /api/auth/login`. A missing or invalid token returns 401; a student token returns 403.

**Error responses** use one shape everywhere, handled by the shared `middleware/errorhandler.js`:

| Status | When |
|---|---|
| 400 | Validation failed (`{ success:false, message:'Validation failed', errors:[…] }`), invalid ID format, bad price filters, `occupied` greater than `capacity`, or an update with no recognised fields |
| 401 / 403 | No or invalid token / not an admin |
| 404 | Room not found (or archived, for public reads) |
| 409 | Duplicate `roomNumber`, or archive/delete blocked by occupants, active applications, or the room not being archived yet |

## Integration with the rest of the project

* **Applications** — the student apply flow passes `roomId` (the room's `_id`) and `roomTitle` in the URL; the `Application` record stores them as strings. When an admin approves or reverses an application, `routes/applications.js` calls `adjustRoomOccupancy()` from the room controller to keep the room's occupancy and status in sync.
* **Dashboard** — `controllers/dashboardcontroller.js` reads the `Room` model to produce live room statistics (archived rooms excluded) and shows the approved room on a student's dashboard.
* **Auth** — write routes reuse `middleware/auth.js` (JWT) and `middleware/role.js` (`admin` role).
* **Errors** — all module errors go through the shared `errorHandler`, so they look the same as errors from other modules.

## Database design and diagrams

The updated diagrams live in `docs/`:

* `docs/ER_Diagram_Room_Management.mmd` — ER diagram 
* `docs/Use_Case_Room_Management.puml` — use case diagram 

The room reference in `Application` is stored as a plain string (`roomId`, falling back to the room number), not a Mongoose `ObjectId` reference, which is why the archive/delete checks look for both the `_id` and the room number.

## Seed data

`npm run seed` connects using `MONGO_URI` (from `.env`), **deletes all existing rooms**, and inserts 10 sample rooms (A-101 to D-101) across four buildings, covering every type and status, with photos from `public/images/rooms/`. Only run it on a development database.

## Testing

Room tests use Jest and Supertest against a mocked `Room` model (and a mocked `Application` model for the archive checks), so they are fast and don't need MongoDB.

* `tests/room.test.js` — **37 tests** covering the room API
* `tests/applicationRoomSync.test.js` — **9 tests** covering occupancy sync when applications change status

Together that is 46 tests. Run them with:

```bash
npm install
npm test
```

What is covered:

* listing with no filters, combined type/status/price filters, multi-field search, sorting
* pagination shape, page-size cap, fallback to page 1 for bad input, non-numeric and reversed price filters, regex characters in search
* 404 for missing rooms and for archived rooms on public reads
* create: missing fields, invalid status, negative capacity/price, duplicate room number (409), defaults applied, `occupied` above `capacity`
* update: no recognised fields, `occupied` above `capacity`, lowering `capacity` below stored occupancy, invalid field values, partial update, missing room
* archive: success, blocked by occupants, blocked by Pending/Approved applications, missing or already-archived room
* restore and the archived list (admin only)
* route protection: 401 with no token, 403 for a student token, public catalogue stays open
* application sync: approve adds 1, reject/reset subtracts 1, no change when status is unchanged, never below 0 or above capacity, missing room, missing application, invalid status

I wrote the Room and Application mocks by hand, defining each method as a `jest.fn()`, rather than relying on Jest automocking. Automocking doesn't reliably pick up Mongoose model methods like `find` or `create`, which leads to confusing failures unrelated to the logic under test.

These tests run in the terminal only — they don't appear in the browser. To see the module working end to end, run `npm start` and open `http://localhost:3000/index.html` (students) or `/admin/rooms.html` (admins, after logging in).

## Key Files

```text
src/
├── models/Room.js                 # schema, pre-save status hook, indexes
├── routes/rooms.js                # route table + admin-only protection
├── controllers/roomController.js  # list/get/create/update/archive/restore/delete + adjustRoomOccupancy
└── validators/roomValidator.js    # server-side field validation

middleware/
├── auth.js                        # JWT check
├── role.js                        # admin role check
└── errorhandler.js                # shared error responses

public/
├── index.html + app.js            # student room directory, details modal, wishlist
├── compare.js                     # compare up to 3 rooms
├── styles.css
├── admin/rooms.html               # admin room management page
├── js/adminRooms.js               # admin add/edit/archive/restore/pagination
└── images/rooms/                  # sample room photos

seed/seedRooms.js                  # 10 sample rooms

tests/
├── room.test.js
├── applicationRoomSync.test.js
└── testApp.js

docs/
├── ER_Diagram_Room_Management.mmd
└── Use_Case_Room_Management.puml
```

# Complaint Module - Clive

## Overview

The Complaint Module is Clive's contribution to the Student Accommodation Management System. It supports the complete complaint workflow between students and administrators.

Students can submit accommodation-related complaints and view their complaint history. Administrators can view all submitted complaints, search and filter complaint records, and update the status of an individual complaint.

The module uses HTML, CSS and JavaScript on the frontend, Node.js and Express on the backend, and MongoDB with Mongoose for persistent storage.

## Main Features

### Student Complaint Submission

Students can submit a complaint using:

- Student ID
- Student Name
- Complaint Description

New complaints are stored in MongoDB and automatically receive the status `Pending`.

### Student Complaint History

Students can enter their Student ID to retrieve previously submitted complaints. Each complaint shows:

- Complaint description
- Student ID and student name
- Submission date/time
- Current complaint status

### Admin Complaint Management

Administrators can open:

```text
/admin/complaints.html
```

The admin complaint page displays all complaints and allows the administrator to update the exact complaint selected using its MongoDB `_id`.

Supported statuses are:

- `Pending`
- `In Progress`
- `Resolved`

The status update is persisted to MongoDB, so the updated value is also visible when the student reloads their complaint history.

### Complaint Search and Filtering

The admin complaint page supports client-side filtering by:

- Student ID
- Student name
- Complaint description text
- Status (`Pending`, `In Progress`, or `Resolved`)

The search field and status dropdown can be used together, and the **Clear** button resets all filters.

## Validation

Validation is implemented on both the frontend and backend.

Rules include:

- Student ID is required
- Student Name is required
- Complaint Description is required
- Complaint description must contain at least 5 characters
- Complaint description cannot exceed 500 characters
- Status must be one of `Pending`, `In Progress`, or `Resolved`
- Invalid MongoDB complaint IDs return an appropriate client error instead of crashing the server

## Complaint Data Model

The Mongoose Complaint model contains:

```text
studentId
studentName
description
status
createdAt
updatedAt
```

The status field is restricted to:

```text
Pending
In Progress
Resolved
```

and defaults to `Pending` when a new complaint is created.

## Complaint API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/complaints` | Submit a new complaint |
| `GET` | `/api/complaints` | Retrieve all complaints for the admin interface |
| `GET` | `/api/complaints/student/:studentId` | Retrieve complaints belonging to one student |
| `GET` | `/api/complaints/:id` | Retrieve one complaint using its MongoDB `_id` |
| `PATCH` | `/api/complaints/:id/status` | Update the status of one specific complaint |
| `PATCH` | `/api/complaints/student/:studentId/status` | Update the latest complaint for a student ID (mainly useful for testing/manual API use) |

### Example Status Update

```bash
curl -X PATCH \
http://localhost:3000/api/complaints/COMPLAINT_MONGODB_ID/status \
-H "Content-Type: application/json" \
-d '{"status":"In Progress"}'
```

For the admin UI, the MongoDB complaint `_id` endpoint is preferred because one student can submit multiple complaints and the administrator must update the exact complaint selected.

## Complaint Module Testing

The complaint module can be tested with Jest and Supertest. The automated suite should cover the main success and validation cases, including:

- Successful complaint submission
- Missing Student ID
- Missing Student Name
- Complaint description below the minimum length
- Complaint description above the maximum length
- Retrieving all complaints
- Retrieving complaints for a specific student
- Retrieving one complaint by ID
- Complaint-not-found responses
- Updating status to `In Progress`
- Updating status to `Resolved`
- Rejecting an invalid status
- Rejecting a missing status

Run the complaint tests with:

```bash
npx jest tests/complaint.test.js --runInBand
```

The complete end-to-end browser workflow should also be checked manually:

```text
Student submits complaint
        ↓
Complaint stored as Pending
        ↓
Admin views complaint
        ↓
Admin changes status to In Progress
        ↓
Admin changes status to Resolved
        ↓
Student reloads complaint history
        ↓
Updated status is displayed
```

## Key Complaint Files

```text
controllers/
└── complaintController.js

models/
└── Complaint.js

routes/
└── complaintRoutes.js

public/
├── complaints.html
├── admin/
│   └── complaints.html
└── js/
    ├── complaints.js
    └── adminComplaints.js

tests/
├── complaint.test.js
└── complaintTestApp.js
```

## Sprint 2 Tasks - Clive

Clive's Sprint 2 complaint work includes:

| Task | Estimated Time | Status |
|---|---:|---|
| PATCH complaint status API | 5 hours | Completed |
| Complaint - admin integration | 5 hours | Completed |
| Complaint filtering/search | 4 hours | Completed |
| Complaint module testing | 5 hours | Testing / evidence |

These tasks extend the Sprint 1 complaint functionality into a complete student-to-admin complaint-management workflow.

# Application Module - Purva

This is my part of the group project: the student side of the Application Module. A student applies for a room, the admin approves or rejects it, and the student sees the result. I built the database model, the API routes and the student page, following the MVC pattern:

| Part | File | Job |
|---|---|---|
| Model | `models/Application.js` | What an application looks like and which values are allowed |
| Controller | `routes/applications.js` | Handles requests, checks the rules, talks to MongoDB |
| View | `public/application.html` | The page where students apply and track their status |

## Sprint 1 - Building the base

| Task | Status |
|---|---|
| Define Application schema | Completed |
| Application form UI | Completed |
| POST application API | Completed |
| Track status UI | Completed |
| GET status API | Completed |

**What I built in Sprint 1**
- **Application model** with student ID, student name, room ID, room title, status and dates. Status can only be `Pending`, `Approved` or `Rejected`, and starts as `Pending`.
- **4 API endpoints:** submit an application, check a student's status, list all applications for the admin, and approve or reject.
- **Apply form and Check Status section** on `application.html`, connected to the API with `fetch()`.
- **Duplicate check in the API:** a student who already has a Pending or Approved application gets a 409 message.
- **Setup:** connected my routes in `server.js`, and added `.env.example` and `.gitignore` so the database link is not uploaded to GitHub.
- Merged into `main` through **Pull Request #1**.

## Sprint 2 - Improving and connecting

| Task | Status |
|---|---|
| Status sync with admin | Completed |
| Frontend-backend integration | Completed |
| Status indicators | Completed |
| Duplicate handling | Completed |
| Module testing | Completed |

**What I added in Sprint 2**
- **Live status updates:** the page checks the status every 15 seconds. When the admin approves or rejects, the status changes and flashes without refreshing. Students can turn live updates on or off.
- **Status colours:** yellow for Pending, green for Approved (with a green border), red for Rejected.
- **Copy Application ID button:** one click copies the ID, so the student can use it as a reference when contacting the admin.
- **Clearer messages:** clear error messages, and when a student tries to apply twice, a link to "View my existing application status".
- **Database duplicate rule:** a partial unique index on `studentId` (see below).
- **Student Portal sidebar** (`public/js/studentNav.js`): the same menu on every student page (Dashboard, Rooms, Apply, Track Application, Complaints).
- **Docker:** added `Dockerfile`, `.dockerignore` and `docker-compose.yml` so the project runs the same way on any computer.

## How duplicate applications are stopped

A student can only have **one active application** (Pending or Approved). This is checked in two places:

1. **In the API (Sprint 1):** before saving, the POST route looks for an existing Pending or Approved application and returns **409** "You already have an active application."
2. **In the database (Sprint 2):** a **partial unique index** on `studentId`. If a student double-clicks Submit, two requests can pass the API check at the same time. The index stops the second one from being saved.

The index is **partial** on purpose. It only counts Pending and Approved applications, so a **rejected student can still apply again**.

## API Endpoints

| Method | Endpoint | Used by | Purpose | Responses |
|---|---|---|---|---|
| `POST` | `/api/applications` | Student | Submit an application | 201 saved, 400 missing fields, 409 already has an active application |
| `GET` | `/api/applications/:studentId` | Student | Get the student's latest application | 200 found, 404 no application |
| `GET` | `/api/applications` | Admin | List all applications | 200 |
| `PATCH` | `/api/applications/:id` | Admin | Approve or reject an application | 200 updated, 400 invalid status, 404 not found |

## How it connects to other modules

- **Rooms:** the Apply button on a room fills in the room details on my form.
- **Admin dashboard:** uses my `GET /api/applications` to list applications and my `PATCH` route to approve or reject.
- **Student dashboard and Complaints:** linked through the shared Student Portal sidebar.

## Testing

I tested the module by running the app as a student and as an admin, and by using the browser DevTools (Network and Console tabs).

| Test | Expected result | Result |
|---|---|---|
| Submit a new application | 201, saved as Pending | Passed |
| Apply again with the same student | 409 "You already have an active application." | Passed |
| Submit with empty fields | 400 "All fields are required." | Passed |
| Admin sends an invalid status ("Maybe") | 400 "Invalid status value.", status unchanged | Passed |
| Check a student with no application | 404 | Passed |
| Admin approves while the student page is open | Status changes to Approved within 15 seconds, no refresh | Passed |

## Running with Docker

1. Copy `.env.example` to `.env`.
2. In `.env`, change `127.0.0.1` in `MONGO_URI` to `host.docker.internal`, so the container can reach MongoDB on your computer.
3. Run:
```bash
docker compose up --build
```
4. Open `http://localhost:3000`.

## Key Files

```text
models/Application.js       # schema, status rules, partial unique index
routes/applications.js      # POST, GET by student, GET all, PATCH
public/application.html     # apply form, status check, live updates, Copy ID
public/js/studentNav.js     # Student Portal sidebar
Dockerfile                  # builds the app image
.dockerignore               # keeps node_modules and .env out of the image
docker-compose.yml          # runs the app with one command
```

# Application Management Module — Sprint 2

This module handles student accommodation application flows, admin application review workflows, dynamic status updates, and cascading room availability sync.

## Overview & Sprint 2 Features
- **Student Email Integration:** Added `studentEmail` to the Mongoose `Application` model, ensuring student email credentials are saved to MongoDB upon submission and displayed in administrative details modals.
- **Student-Scoped Status Views:** Configured `GET /api/applications/:studentId` to fetch student-specific metric counts (Total, Pending, Approved, Rejected) and room status indicators directly.
- **Admin Review Pipeline & Modals:** Built real-time status management (`PATCH /api/applications/:id`) with support for interactive details modals (`showDetails`) displaying complete student profiles.
- **Application Deletion & Cascading Occupancy:** Enabled permanent deletion (`DELETE /api/applications/:id`) from both the dashboard and applications table (`applications.html`), integrated with `adjustRoomOccupancy` to automatically decrement room occupancy counts when an approved application is removed.

## API Endpoints
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/applications` | Student | Submit a new accommodation application (includes `studentEmail`) |
| `GET` | `/api/applications/:studentId` | Student | Retrieve applications and metrics scoped to a specific student |
| `GET` | `/api/applications` | Admin | Retrieve all submitted applications |
| `PATCH` | `/api/applications/:id` | Admin | Update application status (`Pending`, `Approved`, `Rejected`) |
| `DELETE` | `/api/applications/:id` | Admin | Delete application and automatically adjust room capacity |

## Key Files
```text
models/
└── Application.js          # Mongoose schema (includes studentEmail field)

routes/
└── applications.js         # API endpoints and parameter route order isolation

controllers/
└── applicationController.js # Status transition handlers and room occupancy sync

public/
├── application.html        # Student application form and payload construct
├── js/adminDashboard.js    # Admin application review grid, details modal, and live stats
└── admin/applications.html # Applications table with action controls and deletion trash bin
```



## Reporting & Dashboard Module - Sprint 2

## Overview

Turns Room, Application and Complaint data into summaries for admins and
students. MongoDB aggregation pipelines do the counting, so the server sends
back small summaries instead of full records. The admin dashboard shows summary
cards and charts, and each student has a personal dashboard.

## Main Features

- **Summary statistics:** room occupancy, and application and complaint counts by status.
- **Trends and breakdowns:** applications and complaints per day by status, zero-filled so charts have no gaps.
- **Charts:** two Chart.js line charts (trends) and a doughnut chart (complaint breakdown).
- **Filtering:** date range (From / To) and category (all, rooms, applications, complaints).
- **Refresh handling:** auto-refreshes every 30 seconds without a page reload, with a loading state and a "Last updated" time. This uses polling, not WebSockets.
- **Student dashboard:** a student's own application counts, complaint counts and assigned room.

## API Endpoints

All endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint | Access | Query parameters |
|--------|----------|--------|------------------|
| GET | `/api/dashboard/stats` | Admin | `startDate`, `endDate` (YYYY-MM-DD), `category` (`all`, `rooms`, `applications`, `complaints`) |
| GET | `/api/dashboard/trends` | Admin | `days` (default 30), `startDate`, `endDate` |
| GET | `/api/dashboard/student` | Student | none |


Errors are passed to the shared error handler (`middleware/errorhandler.js`),
so failures return a consistent JSON format.

## Testing

Automated Jest tests with mocked models, so no MongoDB connection is needed:

```bash
npm test                          # all tests
npx jest tests/dashboard.test.js  # dashboard tests only
```

They cover the date filter, zero-filled trend labels, summary totals and
occupancy rate, the category filter, error handling, and the student dashboard.

## Key Files

| File | Purpose |
|------|---------|
| `controllers/dashboardcontroller.js` | Aggregation pipelines, trends, student summary |
| `routes/dashboardroutes.js` | Dashboard routes with auth and role middleware |
| `public/admin/dashboard.html` | Admin dashboard page |
| `public/dashboard.js` | Admin dashboard: charts, filters, auto-refresh |
| `public/student/dashboard.html` | Student dashboard page |
| `public/student/studentDashboard.js` | Student dashboard script |
| `tests/dashboard.test.js` | Automated dashboard tests |


