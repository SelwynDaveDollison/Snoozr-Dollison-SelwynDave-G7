# Snoozr &bull; Starry Night Sleep Sanctuary

> **IM2 Project Development 1 &ndash; Account Feature**  
> **Student:** Selwyn Dave Dollison &bull; **Section:** G7  
> **Repository:** [Snoozr-Dollison-SelwynDave-G7](https://github.com/SelwynDaveDollison/Snoozr-Dollison-SelwynDave-G7.git)

---

## 🌌 The Starry Night Experience

**Snoozr** is a full-stack Django sleep-tracking application designed with an immersive, realistic 3D aesthetic inspired by **Vincent van Gogh’s *The Starry Night***.

### Visual & Interactive Highlights:
- **3D Three.js Celestial Sky:** Dynamic Van Gogh cosmic vortex swirl with 4,200+ particle stars twisting and undulating across logarithmic spiral arms.
- **Realistic Twinkling Starfield:** 2,800 stars with varied astronomical temperatures (amber, diamond white, celestial cyan).
- **Luminous 3D Crescent Moon:** Multi-tiered volumetric corona with pulsing moonlight aura.
- **Shooting Stars (Meteors):** Dynamic meteors streaking across the night sky with fading starlight trails.
- **Interactive Mouse Inertia Parallax:** Realistic camera physics and celestial particle turbulence responding to cursor movement.
- **Ambient Night Soundscape (Web Audio API):** Procedural nocturnal white/pink noise wind whisper that users can toggle with one click.
- **Starry Glassmorphism UI:** Frosted glass panels (`backdrop-filter: blur(24px)`), golden starlight specular borders, responsive layouts, and smooth GSAP entrance animations.

---

## ✨ Features Implemented (Account Feature Phase)

### 1. Account Registration
- User-friendly registration with first name, last name, unique username, and valid email format verification.
- **Real-time Password Match Indicator** with visual matching feedback bar.
- Secure password hashing using Django's built-in authentication security (PBKDF2/argon2; never plaintext).
- Role assignment defaults to **Member** upon sign up.
- Clear error and success messaging with Bootstrap icons.

### 2. Login & Logout
- Session-based authentication with credential validation.
- User-friendly error messaging for invalid credentials.
- Safe logout ending user session and redirecting to login.
- Protected pages with `@login_required` preventing unauthorized access.

### 3. Role-Based User Dashboards
- **Two Roles Supported:**
  - **Member Dashboard (`/accounts/dashboard/member/`):** Personal sleep sanctuary featuring sleep readiness score (92), target bedtime optimizer, REM sleep breakdown, and an interactive bedtime prep journal.
  - **Admin Observatory (`/accounts/dashboard/admin/`):** Administrative command center with total user metrics, member counts, administrator breakdown, live user filter search, and direct access to Django Admin.
- **Strict Role-Based URL Protection:**
  - Protected with `@admin_required` and `@member_required` decorators.
  - A Member attempting to visit `/accounts/dashboard/admin/` is automatically blocked with an access error and returned to their own dashboard.

### 4. User Profile
- Profile viewing at `/accounts/profile/` with starlight avatar, personal details, contact number, member since date, and bio.
- Profile editing at `/accounts/profile/edit/` supporting name, email, contact, bio, and profile photo upload.
- Users can only view and edit their own profile.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Backend & Frontend** | Full Stack Django (Templates + Views + Models) |
| **3D Celestial Graphics** | Three.js (r128) + Custom Canvas Shader Textures |
| **Motion & Micro-interactions** | GSAP (GreenSock) + CSS Glassmorphism |
| **Icons & Typography** | Bootstrap Icons + Google Fonts (*Outfit* & *Plus Jakarta Sans*) |
| **Database** | SQLite (Dev / Test) & PostgreSQL compatible |
| **Testing** | Django TestCase (11/11 tests passing) + Playwright E2E |

---

## 🚀 Quickstart Guide

### 1. Clone the repository
```bash
git clone https://github.com/SelwynDaveDollison/Snoozr-Dollison-SelwynDave-G7.git
cd Snoozr-Dollison-SelwynDave-G7
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Apply database migrations
```bash
python manage.py migrate
```

### 4. Run the development server
```bash
python manage.py runserver
```
Navigate to: **`http://127.0.0.1:8000/`**

### 🔑 Demo Credentials

| Role | Username | Password |
|---|---|---|
| **Admin** | `admin` | `admin123` |

*(To test a Member account, either click **Create Account** to register a new user, or use any created member credentials)*

---

## 🧪 Testing Suite

### Unit & Integration Tests (11/11 tests passing):
```bash
python manage.py test accounts
```

### Playwright E2E Automated Tests:
```bash
python tests/e2e_playwright.py
```

---

## 📁 Project Architecture

```
Snoozr/
├── snoozr_project/           # Core Django settings & routing
│   ├── settings.py           # App configuration, auth model, templates
│   ├── urls.py               # Root URL configuration
│   └── wsgi.py
├── accounts/                 # Account feature app
│   ├── models.py             # CustomUser model (roles: admin/member)
│   ├── views.py              # Auth, dashboard routing, profile views
│   ├── forms.py              # Registration & profile update forms
│   ├── decorators.py         # Role protection decorators
│   ├── urls.py               # Account routes
│   ├── tests.py              # Comprehensive unit tests
│   └── admin.py              # Django admin registration
├── static/
│   ├── css/
│   │   └── starry-night.css  # Starry Night celestial design system
│   └── js/
│       └── starry-night-3d.js # Three.js 3D galactic vortex & moon engine
├── templates/
│   ├── base.html             # Master layout with 3D canvas & celestial navbar
│   └── accounts/
│       ├── auth_base.html    # Starry auth layout
│       ├── login.html        # Van Gogh aesthetic login
│       ├── register.html     # Registration with live password match meter
│       ├── member_dashboard.html # Sleep stats & sleep journal
│       ├── admin_dashboard.html  # System metrics & registry table
│       ├── profile.html      # User profile view
│       └── profile_edit.html # User profile edit & avatar upload
├── tests/
│   └── e2e_playwright.py     # Playwright browser automation test suite
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```
