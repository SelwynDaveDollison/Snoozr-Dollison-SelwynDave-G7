# Snoozr - Sleep Tracking System

A full-stack Django web application for tracking and improving sleep habits.

## Features

- **Account Registration** – Secure sign-up with validation and password hashing
- **Login / Logout** – Session-based authentication with protected routes
- **Role-Based Dashboards** – Separate dashboards for Admin and Member roles
- **User Profile** – View and edit personal profile information

## Tech Stack

- **Backend & Frontend:** Django (Full Stack with Django Templates)
- **Database:** PostgreSQL
- **Authentication:** Django's built-in auth system

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/SelwynDaveDollison/Snoozr-Dollison-SelwynDave-G7.git
   cd Snoozr-Dollison-SelwynDave-G7
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

5. **Run migrations:**
   ```bash
   python manage.py migrate
   ```

6. **Create a superuser:**
   ```bash
   python manage.py createsuperuser
   ```

7. **Run the development server:**
   ```bash
   python manage.py runserver
   ```

8. **Open your browser and go to:** `http://127.0.0.1:8000/`

## User Roles

| Role   | Description                                    |
|--------|------------------------------------------------|
| Admin  | Full access to manage users and system settings |
| Member | Access to personal sleep tracking dashboard     |

## Project Structure

```
Snoozr/
├── snoozr_project/        # Django project settings
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── accounts/              # Account feature app
│   ├── models.py          # Custom user model with roles
│   ├── views.py           # Auth and profile views
│   ├── forms.py           # Registration and profile forms
│   ├── decorators.py      # Role-based access decorators
│   └── templates/         # HTML templates
├── manage.py
├── requirements.txt
└── .env.example
```

## Author

**Selwyn Dave Dollison** – Section G7
