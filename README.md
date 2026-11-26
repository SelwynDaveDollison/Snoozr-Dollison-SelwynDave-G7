# Snoozr: A Web-Based Sleep Logging and Tracking System for College Students with Irregular Schedules

> **Course:** CSIT327 &ndash; Information Management 2, Section G7  
> **Prepared by:** Selwyn Dave Dollison  
> **Instructor:** Frederick Revilleza Jr.  
> **Document Date / Version:** October 7, 2026 &bull; Version 1.0  
> **Repository:** [Snoozr-Dollison-SelwynDave-G7](https://github.com/SelwynDaveDollison/Snoozr-Dollison-SelwynDave-G7.git)

---

## 📖 1. Description of the Proposed System

### 1.1 Project Title
**Snoozr: A Web-Based Sleep Logging and Tracking System for College Students with Irregular Schedules**

### 1.2 Background and Problem Statement
College students rarely sleep on a fixed schedule. Exams, group projects, part-time jobs, and gaming push bedtimes around from one night to the next, yet most students have no record of how much they actually sleep. Those who do try to keep track usually rely on memory, a notes app, or a spreadsheet, which gives them no automatic calculations, no averages, and no way to look back over several weeks. Wearable trackers solve this but cost more than many students can spend, and many free sleep apps hide basic features behind subscriptions or fill the screen with ads.

**Snoozr** replaces those ad-hoc methods with a simple database-backed web system. A student records bedtime and wake time, and the system calculates the hours slept automatically. It stores every night, lets the student tag nights with their context (for example, "exam week"), search and filter past entries, and view a dashboard and summary report with averages, trends, and progress toward a personal sleep goal. Only a web browser is needed.

### 1.3 Target Users
* **Student User (the only user role):** A college student with an irregular sleep schedule who registers an account, logs bedtime and wake time each day, tags and searches past entries, sets a personal sleep goal, and reviews the dashboard and summary report. Each student can see only their own data.

### 1.4 Frontend Design Theme: Starry Night Aesthetic
> **Note on UI Design:** While the system's core requirements, database schema, and business logic strictly follow the CSIT327 Software Design Document specifications, the frontend user interface incorporates a custom **Starry Night Aesthetic** inspired by Vincent van Gogh. This includes:
> - Three.js celestial night-sky canvas with ambient particle stars and dynamic lunar rendering.
> - Modern glassmorphism UI cards with clear typographic hierarchy and responsive layout.
> - An optional nocturnal white/pink noise soundscape toggle to provide a calming sleep-tracking environment.

---

## 🎯 2. Scope and Limitations

| In Scope | Limitations / Out of Scope |
|---|---|
| Register, Login, and Logout with session handling | No automatic or sensor/wearable-based sleep detection; all entries are manual |
| Sleep Log Entry with automatic duration calculation | No sleep quality analysis (REM cycles, movement, snoring) |
| Sleep History (browse, edit, delete; list & calendar view) | No push notifications or reminders (possible future enhancement) |
| Search and filter of entries by keyword, date range, duration, goal status, and tag | No social or sharing features between users |
| Personal tags for entries (create, rename, delete, attach) | No correlation analytics linking sleep to mood, grades, or productivity |
| Dashboard: last night's sleep, 7-day average, goal status, small trend chart | No native Android or iOS apps; responsive web only |
| Weekly Trend Chart (7 to 30 selectable days) | No offline use; an active internet connection is required |
| Sleep Summary Report for a chosen date range (7 to 90 days) | No export to PDF/Excel and no sharing of reports |
| Profile management and personal sleep goal; Sleep Goal Tracker | Assumes one student per account (no admin, group, or shared accounts), a single timezone per user, and English only |
| Optional notes per entry | |
| Responsive layout for desktop and mobile browsers | |

---

## 📋 3. Feature List

All features are used by a registered student user unless noted. A visitor who is not logged in can only reach Register and Login.

| ID | Feature | Description | Used By |
|---|---|---|---|
| **F-01** | **Register** | Creates an account with a username, email, and password. A profile and a default 8-hour sleep goal are created automatically. | Visitor |
| **F-02** | **Login** | Authenticates a returning user by username or email and password and starts a persistent session. | Visitor / User |
| **F-03** | **Logout** | Ends the session immediately and returns the user to the Login page. | User |
| **F-04** | **Sleep Log Entry** | Lets the user enter bedtime and wake time for a night. The system calculates hours slept automatically and rejects invalid times. | User |
| **F-05** | **Sleep History** | Shows a browsable list (and calendar view) of past entries, newest first. Entries can be edited or deleted. | User |
| **F-06** | **Dashboard** | Home page showing last night's sleep duration, the 7-day average, goal status, and a small trend chart. | User |
| **F-07** | **Weekly Trend Chart** | Bar or line chart of hours slept per day over a selectable 7 to 30 day range. | User |
| **F-08** | **Profile Management** | Lets the user view and edit personal information (full name, timezone) and set or change the personal sleep goal. | User |
| **F-09** | **Sleep Goal Tracker** | Compares actual sleep with the user's goal and shows how often the goal was met (for example, 5 of the last 7 days). | User |
| **F-10** | **Notes per Entry** | Optional short note on each log (for example, "stayed up studying") to give context to the numbers. | User |
| **F-11** | **Search and Filter** | Searches entries by keyword in notes and tag names, and filters Sleep History by date range, duration range, goal met or not met, and tag. | User |
| **F-12** | **Tag Management** | Creates, renames, and deletes the user's personal tags (for example, "exam week") and attaches up to 5 tags to an entry. | User |
| **F-13** | **Sleep Summary Report** | For a chosen date range, shows number of nights logged, average, shortest, and longest sleep, goal-met rate, and average sleep per tag. | User |

---

## ⚖️ 4. Business Rules

Each rule is written as a testable statement, indicating where enforcement occurs (Database constraint or Application / Django validation).

| ID | Business Rule | Enforced By |
|---|---|---|
| **BR-01** | A username must be unique (case-insensitive) and 3 to 30 characters long. | `users.username` UNIQUE + CHECK; form validation |
| **BR-02** | An email address must be unique and in valid email format; only one account may exist per email. | `users.email` UNIQUE; form validation |
| **BR-03** | A password must be at least 8 characters long and is stored only as a salted hash, never as plain text. | Form validation; Django password hasher; `users.password_hash` |
| **BR-04** | A user who is not logged in can access only the Register and Login pages; all other requests redirect to Login. | Application (login-required views) |
| **BR-05** | A user can view, create, edit, and delete only their own profile, goals, tags, and sleep entries. | Application (queries filtered by `user_id`); FK `user_id` on every table |
| **BR-06** | A login session stays active for up to 14 days after login unless the user logs out; Logout ends the session immediately. | Application (Django session settings) |
| **BR-07** | The wake time of an entry must be later than its bedtime. | `sleep_log` CHECK (`wake_time > bedtime`) |
| **BR-08** | Sleep duration is computed by the system as wake time minus bedtime in whole minutes; the user cannot enter or edit it directly. | Application (computed on save) &rarr; `sleep_log.duration_minutes` |
| **BR-09** | A single entry must last at least 1 minute and at most 24 hours (1,440 minutes). | `sleep_log` CHECK on `duration_minutes` |
| **BR-10** | Bedtime and wake time cannot be set in the future. | Application (form validation) |
| **BR-11** | A user may have at most one entry per sleep date, where the sleep date is the calendar date of the wake time. | `sleep_log` UNIQUE (`user_id`, `sleep_date`) |
| **BR-12** | The time ranges of one user's entries must not overlap. | `sleep_log` exclusion constraint on (`user_id`, time range) via `btree_gist`; form validation |
| **BR-13** | A note is optional and at most 255 characters long. | `sleep_log.note` VARCHAR(255) nullable |
| **BR-14** | A sleep goal must be between 4.0 and 12.0 hours in steps of 0.5; every new account starts with a default goal of 8.0 hours. | `sleep_goal` CHECK; Register logic |
| **BR-15** | Changing the goal creates a new goal record with an effective date; each past day is judged against the goal that was in effect on that date. | `sleep_goal` UNIQUE (`user_id`, `effective_from`) |
| **BR-16** | A day counts as "goal met" when its `duration_minutes` is greater than or equal to the goal's `target_hours * 60`. | Application (goal tracker query) |
| **BR-17** | The 7-day average is the mean duration of the user's entries whose sleep date falls in the last 7 calendar days including today; days with no entry are excluded, and with no entries the dashboard shows "No data". | Application (dashboard query) |
| **BR-18** | The trend chart shows 7 to 30 consecutive days (default 7); days without an entry appear as gaps, not as zero hours. | Application (chart view) |
| **BR-19** | Deleting an entry requires user confirmation and is permanent; editing an entry must still satisfy BR-07 to BR-12 and updates its `updated_at` timestamp. | Application; `sleep_log.updated_at` |
| **BR-20** | A tag name must be 1 to 30 characters long and unique per user (case-insensitive). | `tag` UNIQUE (`user_id`, `lower(name)`) + CHECK length |
| **BR-21** | An entry can have at most 5 tags, and the same tag cannot be attached to the same entry twice. | `sleep_log_tag` PK (`log_id`, `tag_id`); application (limit of 5) |
| **BR-22** | A user can attach only their own tags to their own entries. | Application (ownership check) |
| **BR-23** | Deleting a tag removes it from all entries but keeps the entries; deleting an entry removes its tag links. | `sleep_log_tag` FKs ON DELETE CASCADE |
| **BR-24** | Search matches the entry note and tag names, ignoring case; keyword, date range, duration range, goal status, and tag filters combine with AND, and results are sorted newest first. | Application (history query) |
| **BR-25** | In any date range filter, the start date must not be later than the end date. | Application (form validation) |
| **BR-26** | The Sleep Summary Report covers a selected range of 7 to 90 days; it shows the number of nights, average, shortest, and longest sleep, goal-met rate, and average per tag, or "No data" if the range has no entries. | Application (report query) |

---

## 🗄️ 5. Data Modelling & Architecture

### 5.1 Conceptual & Logical ERD Overview
The data model consists of **six relational entities**:
1. **`USERS`**: The central entity storing credentials and auth state.
2. **`PROFILE`**: One-to-one relationship with `USERS` (1 : 1) storing display name and timezone.
3. **`SLEEP_GOAL`**: One-to-many historical relationship (1 : 1..\*) storing versioned sleep goals with effective start dates.
4. **`SLEEP_LOG`**: One-to-many relationship (1 : 0..\*) storing individual sleep sessions.
5. **`TAG`**: One-to-many relationship (1 : 0..\*) storing custom student labels.
6. **`SLEEP_LOG_TAG`**: Many-to-many associative junction linking `SLEEP_LOG` and `TAG`.

```
    +-------------------+           +-------------------+
    |      PROFILE      |           |    SLEEP_GOAL     |
    +-------------------+           +-------------------+
    | profile_id (PK)   |  1     1  | goal_id (PK)      |
    | user_id (FK, UQ)  |<----+---->| user_id (FK)      |
    | full_name         |     |     | target_hours      |
    | timezone          |     |     | effective_from    |
    | updated_at        |     |     | created_at        |
    +-------------------+     |     +-------------------+
                              | 1..*
                      +-------+-------+
                      |     USERS     |
                      +---------------+
                      | user_id (PK)  |
                      | username (UQ) |
                      | email (UQ)    |
                      | password_hash |
                      | created_at    |
                      | last_login    |
                      +-------+-------+
                              |
                    1         |         1
             +----------------+----------------+
             | 0..*                            | 0..*
    +--------+----------+             +--------+----------+
    |     SLEEP_LOG     |             |        TAG        |
    +-------------------+             +-------------------+
    | log_id (PK)       |             | tag_id (PK)       |
    | user_id (FK)      |             | user_id (FK)      |
    | sleep_date (UQ)   |             | name              |
    | bedtime           |             | created_at        |
    | wake_time         |             +--------+----------+
    | duration_minutes  |                      |
    | note              | 1                    | 1
    | created_at        |                      |
    | updated_at        | 0..*                 | 0..*
    +--------+----------+             +--------+----------+
             |                        |
             +--------->+-------------+<-------+
                        |    SLEEP_LOG_TAG     |
                        +----------------------+
                        | log_id (PK, FK)      |
                        | tag_id (PK, FK)      |
                        +----------------------+
```

### 5.2 Data Dictionary

#### Table: `users`
| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `user_id` | BIGINT | PK, identity, NOT NULL | Unique identifier of the user account |
| `username` | VARCHAR(30) | NOT NULL, UNIQUE, CHECK length 3-30 | Login name chosen by the user (BR-01) |
| `email` | VARCHAR(254) | NOT NULL, UNIQUE | Email address used for the account (BR-02) |
| `password_hash` | VARCHAR(128) | NOT NULL | Salted hash of the password; plain text is never stored (BR-03) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | When the account was created |
| `last_login` | TIMESTAMPTZ | NULL | When the user last logged in |

#### Table: `profile`
| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `profile_id` | BIGINT | PK, identity, NOT NULL | Unique identifier of the profile |
| `user_id` | BIGINT | FK &rarr; `users.user_id`, NOT NULL, UNIQUE, ON DELETE CASCADE | Owner of the profile; UNIQUE enforces 1:1 (BR-05) |
| `full_name` | VARCHAR(100) | NULL | Display name of the user |
| `timezone` | VARCHAR(50) | NOT NULL, DEFAULT 'Asia/Manila' | Timezone used to evaluate sleep date and "last night" (BR-11, BR-17) |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | When the profile was last modified |

#### Table: `sleep_goal`
| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `goal_id` | BIGINT | PK, identity, NOT NULL | Unique identifier of the goal record |
| `user_id` | BIGINT | FK &rarr; `users.user_id`, NOT NULL, ON DELETE CASCADE | User who set the goal |
| `target_hours` | NUMERIC(3,1) | NOT NULL, CHECK (target_hours BETWEEN 4.0 AND 12.0 AND (target_hours * 2) % 1 = 0) | Target hours of sleep per night (BR-14) |
| `effective_from` | DATE | NOT NULL, UNIQUE (`user_id`, `effective_from`) | First date the goal applies; latest date on or before a given day is the active goal (BR-15) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | When the goal record was created |

#### Table: `sleep_log`
| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `log_id` | BIGINT | PK, identity, NOT NULL | Unique identifier of the sleep entry |
| `user_id` | BIGINT | FK &rarr; `users.user_id`, NOT NULL, ON DELETE CASCADE | User who owns the entry (BR-05) |
| `sleep_date` | DATE | NOT NULL, UNIQUE (`user_id`, `sleep_date`) | Calendar date of wake time; one entry per user per date (BR-11) |
| `bedtime` | TIMESTAMPTZ | NOT NULL | Date and time the user went to bed |
| `wake_time` | TIMESTAMPTZ | NOT NULL, CHECK (`wake_time > bedtime`) | Date and time the user woke up (BR-07) |
| `duration_minutes` | INTEGER | NOT NULL, CHECK (`duration_minutes` BETWEEN 1 AND 1440) | Hours slept in whole minutes, calculated automatically (BR-08, BR-09) |
| `note` | VARCHAR(255) | NULL | Optional contextual note (BR-13) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | When the entry was created |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | When the entry was last edited (BR-19) |

> *Note on Overlap Prevention (BR-12):* Overlapping entries are blocked in PostgreSQL using an exclusion constraint on `(user_id, tstzrange(bedtime, wake_time))` with the `btree_gist` extension, combined with form validation in the application layer.

#### Table: `tag`
| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `tag_id` | BIGINT | PK, identity, NOT NULL | Unique identifier of the tag |
| `user_id` | BIGINT | FK &rarr; `users.user_id`, NOT NULL, ON DELETE CASCADE | User who owns the tag (BR-22) |
| `name` | VARCHAR(30) | NOT NULL, CHECK length 1-30, UNIQUE (`user_id`, `lower(name)`) | Label shown on entries, e.g. "exam week" (BR-20) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | When the tag was created |

#### Table: `sleep_log_tag`
| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `log_id` | BIGINT | PK (part), FK &rarr; `sleep_log.log_id`, NOT NULL, ON DELETE CASCADE | The tagged sleep entry |
| `tag_id` | BIGINT | PK (part), FK &rarr; `tag.tag_id`, NOT NULL, ON DELETE CASCADE | The tag attached. Composite PK prevents duplicates on the same log (BR-21, BR-23) |

### 5.3 Traceability Matrix

| Feature | Tables Used | Business Rules Enforced |
|---|---|---|
| **F-01 Register** | `users`, `profile`, `sleep_goal` | BR-01, BR-02, BR-03, BR-14 |
| **F-02 Login** | `users` | BR-03, BR-04, BR-06 |
| **F-03 Logout** | (Django session) | BR-04, BR-06 |
| **F-04 Sleep Log Entry** | `sleep_log`, `sleep_log_tag` | BR-05, BR-07, BR-08, BR-09, BR-10, BR-11, BR-12, BR-21, BR-22 |
| **F-05 Sleep History** | `sleep_log` | BR-05, BR-11, BR-12, BR-19 |
| **F-06 Dashboard** | `sleep_log`, `sleep_goal` | BR-16, BR-17, BR-18 |
| **F-07 Weekly Trend Chart** | `sleep_log` | BR-18 |
| **F-08 Profile Management** | `users`, `profile`, `sleep_goal` | BR-05, BR-14, BR-15 |
| **F-09 Sleep Goal Tracker** | `sleep_goal`, `sleep_log` | BR-14, BR-15, BR-16 |
| **F-10 Notes per Entry** | `sleep_log` (note) | BR-13 |
| **F-11 Search and Filter** | `sleep_log`, `tag`, `sleep_log_tag` | BR-24, BR-25 |
| **F-12 Tag Management** | `tag`, `sleep_log_tag` | BR-20, BR-21, BR-22, BR-23 |
| **F-13 Sleep Summary Report** | `sleep_log`, `sleep_goal`, `tag`, `sleep_log_tag` | BR-16, BR-26 |

---

## 🛠️ 6. Technology Stack

* **Frontend:** HTML5, CSS3, JavaScript (ES6+), Chart.js for data visualization, Bootstrap 5.
  * *Theme Enhancements:* Three.js & GSAP for the Starry Night aesthetic and Web Audio API for ambient soundscapes.
* **Backend:** Python 3.10+, Django Web Framework.
* **Database:** PostgreSQL (hosted on Supabase) for production; SQLite for local development and test automation.
* **Session Management:** Django session engine (14-day persistent sessions, immediate termination on logout).

---

## 🚀 7. Installation and Setup Guide

### 7.1 Prerequisites
* Python 3.10 or higher
* Git
* Virtualenv (`python -m venv`)

### 7.2 Setup Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/SelwynDaveDollison/Snoozr-Dollison-SelwynDave-G7.git
   cd Snoozr-Dollison-SelwynDave-G7
   ```

2. **Create and activate a virtual environment:**
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install project dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables:**
   Copy `.env.example` to `.env` and configure your database and secret key:
   ```bash
   cp .env.example .env
   ```

5. **Run Database Migrations:**
   ```bash
   python manage.py migrate
   ```

6. **Start the Development Server:**
   ```bash
   python manage.py runserver
   ```
   Open your browser and navigate to: **`http://127.0.0.1:8000/`**

---

## 🧪 8. Testing Suite

Run the full automated test suite verifying all 13 features, data models, and 26 business rules:
```bash
python manage.py test accounts sleep_tracking
```

Run Playwright end-to-end integration tests (optional browser verification):
```bash
python tests/e2e_playwright.py
```

---

## 📁 9. Repository Structure

```
Snoozr/
├── snoozr_project/           # Django project root settings and URL routing
│   ├── settings.py           # Application settings, database-agnostic DB config, session rules
│   ├── urls.py               # Main URL dispatcher (/accounts/, /sleep/)
│   └── wsgi.py
├── accounts/                 # User authentication, profiles, role dashboards (F-01, F-02, F-03, F-08)
│   ├── models.py             # CustomUser model & Profile (1:1 with user, timezone default 'Asia/Manila')
│   ├── forms.py              # Registration, login, and profile update forms (with timezone selector)
│   ├── views.py              # Auth flows, profile views, member and admin dashboards
│   ├── urls.py               # Account routes
│   └── tests.py              # Unit tests for authentication and role protections
├── sleep_tracking/           # Core Vertical Slice: Sleep logging, analytics, and tags (F-04 to F-13)
│   ├── models.py             # SleepLog, SleepGoal, Tag, SleepLogTag (BR-07 to BR-23)
│   ├── forms.py              # SleepLogForm (auto validation), TagForm, SleepGoalForm
│   ├── views.py              # Log entry, history, edit, delete, tag CRUD, summary report, trend API
│   ├── urls.py               # Sleep tracking routes (/sleep/new/, /sleep/history/, etc.)
│   ├── admin.py              # Django admin registrations
│   └── tests.py              # 33+ comprehensive test cases for all business rules and CRUD flows
├── static/
│   ├── css/
│   │   ├── starry-night.css  # Starry Night aesthetic design system
│   │   └── style.css
│   └── js/
│       └── starry-night-3d.js # Three.js canvas & night sky simulation
├── templates/
│   ├── base.html             # Master layout with celestial canvas, top navbar, & Chart.js
│   ├── accounts/
│   │   ├── login.html        # Login view with demo credentials autofill
│   │   ├── register.html     # Registration with validation indicators & auto 8h goal creation
│   │   ├── member_dashboard.html # Core dashboard (F-06), 7-day average, goal tracker, Chart.js trend
│   │   ├── admin_dashboard.html  # Administrative observatory
│   │   ├── profile.html      # Student profile view with timezone and sleep target
│   │   └── profile_edit.html # Profile edit view with timezone selection
│   └── sleep_tracking/
│       ├── sleep_log_form.html   # Log sleep entry / edit form with live JS duration preview
│       ├── sleep_log_confirm_delete.html # Permanent delete confirmation modal/page (BR-19)
│       ├── sleep_history.html    # Browsable paginated list & calendar view with multi-criteria search
│       ├── tag_management.html   # Tag CRUD (create, rename, delete)
│       ├── sleep_goal.html       # Sleep goal history & effective date updater
│       └── sleep_summary_report.html # 7-to-90-day comprehensive analytics report with per-tag stats
├── tests/
│   └── e2e_playwright.py     # Playwright browser automation test suite
├── Dollison-Selwyn-SDD 2.pdf # Official Software Design Document (CSIT327)
├── requirements.txt          # Python dependencies (Django, Pillow, psycopg2-binary, etc.)
├── .env.example              # Sample environment configuration
└── README.md                 # Complete project documentation
```

---

## 📋 10. Manual Testing Checklist

| Step | Feature | Action | Expected Result |
|---|---|---|---|
| 1 | **F-01 Register** | Navigate to `/accounts/register/`, sign up a new student | Account is created, password salted/hashed, Profile & default 8.0h sleep goal created automatically (BR-14) |
| 2 | **F-02 / F-03 Login & Logout** | Sign in with valid credentials, then log out | Session cookie created with 14-day duration (BR-06); logging out immediately terminates the session |
| 3 | **F-04 Log Sleep Entry** | Go to `/sleep/new/`, enter yesterday 11 PM to today 7 AM | Live preview calculates 8h 00m; saves to database, sets sleep date to wake date (BR-11), redirects with success message |
| 4 | **BR-07 & BR-09 Validation** | Enter wake time earlier than bedtime or > 24 hours | Rejection with clear validation error messages |
| 5 | **BR-10 Future Validation** | Enter a future bedtime or wake time | Form rejects future timestamps with error message |
| 6 | **BR-11 Single Entry Per Date** | Attempt to log a second sleep entry waking on the same date | Blocked by unique constraint on `(user_id, sleep_date)` |
| 7 | **BR-12 Overlap Validation** | Log an entry that overlaps with an existing time range | System prevents overlapping entries with an explanatory error |
| 8 | **F-12 Tag Management** | Go to `/sleep/tags/`, create tag "Exam Week" | Tag created (1-30 chars, BR-20); unique per user case-insensitive |
| 9 | **BR-21 & BR-22 Tag Constraints** | Attach up to 5 tags to an entry | Attaching more than 5 is blocked; user can only attach their own tags |
| 10 | **BR-23 Tag Deletion Cascade** | Delete tag "Exam Week" on `/sleep/tags/` | Tag link is removed, but original sleep logs remain completely intact |
| 11 | **F-05 Sleep History** | Go to `/sleep/history/`, browse list and calendar | Shows paginated entries newest first; calendar displays days with goal badges |
| 12 | **F-11 Search & Multi-filter** | Enter keyword in notes/tags, pick date range | Results filtered by `AND` combination (BR-24); invalid date range displays error (BR-25) |
| 13 | **BR-19 Edit & Delete Entry** | Edit an entry's notes/times; delete an entry | Updating updates `updated_at`; deleting requires explicit user confirmation |
| 14 | **F-06 & F-07 Dashboard & Trends** | Open Dashboard (`/accounts/dashboard/`) | Shows last night's sleep, 7-day rolling average (or "No data", BR-17), goal tracker (e.g. 5 of 7 days met), and Chart.js trend |
| 15 | **F-08 Profile & Timezone** | Go to `/accounts/profile/edit/`, change timezone | Timezone updated; sleep date and dashboard reflect updated timezone |
| 16 | **F-13 Summary Report** | Go to `/sleep/report/`, select 7, 14, 30, 90 days | Shows total nights, average, min/max, goal success rate, and per-tag averages |
| 17 | **BR-05 User Data Isolation** | Log in as Student A; attempt to edit Student B's log via URL ID | Returns HTTP 404 (strictly scoped to `request.user`) |

---

## 🌿 11. Git Branching Strategy & Workflow (PD2)

This repository follows the strict branching model required for **Project Development 2**:
* **`main`**: Production & stable release only. No direct commits allowed.
* **`develop`**: Central integration branch branched from `main`.
* **`feature/<name>`**: Individual feature branches created from `develop`.
  1. `feature/sleep-log`: Core Sleep Log models, CRUD operations, validations, and tests (PR #1 &rarr; `develop`).
  2. `feature/dashboard-goals`: Dashboard analytics, Chart.js weekly/monthly trend charts, goal tracker, and timezone settings (PR #2 &rarr; `develop`).
  3. `feature/search-tags-report`: Multi-criteria search/filter, tag management cascade, summary reporting, documentation, and test verification (PR #3 &rarr; `develop`).
* **Release Workflow:** Once all feature branches are merged into `develop`, a final Pull Request merges `develop` into `main`. No merged feature branches are deleted.

```
