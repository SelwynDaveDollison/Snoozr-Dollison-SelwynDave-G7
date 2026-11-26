from datetime import timedelta
from decimal import Decimal

from django.contrib import messages
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.decorators import login_required
from django.db.models import Avg
from django.shortcuts import render, redirect
from django.utils import timezone

from .decorators import admin_required, member_required
from .forms import RegistrationForm, ProfileUpdateForm
from .models import CustomUser, Profile
from sleep_tracking.models import SleepGoal, SleepLog, Tag


def register_view(request):
    """Handle user registration (F-01, BR-01, BR-02, BR-03, BR-14)."""
    if request.user.is_authenticated:
        return redirect('accounts:dashboard')

    if request.method == 'POST':
        form = RegistrationForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.role = 'member'  # Default role for new registrations
            user.save()
            # BR-14: every new account starts with a default goal of 8.0 hours
            SleepGoal.objects.get_or_create(
                user=user,
                effective_from=timezone.localdate(),
                defaults={'target_hours': Decimal('8.0')}
            )
            messages.success(request, 'Account created successfully! You can now log in.')
            return redirect('accounts:login')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = RegistrationForm()

    return render(request, 'accounts/register.html', {'form': form})


def login_view(request):
    """Handle user login (F-02, BR-03, BR-04, BR-06)."""
    if request.user.is_authenticated:
        return redirect('accounts:dashboard')

    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            messages.success(request, f'Welcome back, {user.first_name or user.username}!')
            return redirect('accounts:dashboard')
        else:
            messages.error(request, 'Invalid username or password. Please try again.')

    return render(request, 'accounts/login.html')


def logout_view(request):
    """Handle user logout (F-03, BR-04, BR-06)."""
    logout(request)
    messages.info(request, 'You have been logged out successfully.')
    return redirect('accounts:login')


@login_required
def dashboard_redirect(request):
    """Redirect users to their role-specific dashboard."""
    if request.user.role == 'admin':
        return redirect('accounts:admin_dashboard')
    else:
        return redirect('accounts:member_dashboard')


@login_required
@admin_required
def admin_dashboard(request):
    """Admin dashboard view."""
    total_users = CustomUser.objects.count()
    total_members = CustomUser.objects.filter(role='member').count()
    total_admins = CustomUser.objects.filter(role='admin').count()
    total_sleep_logs = SleepLog.objects.count()
    recent_users = CustomUser.objects.order_by('-date_joined')[:5]

    context = {
        'total_users': total_users,
        'total_members': total_members,
        'total_admins': total_admins,
        'total_sleep_logs': total_sleep_logs,
        'recent_users': recent_users,
    }
    return render(request, 'accounts/admin_dashboard.html', context)


@login_required
@member_required
def member_dashboard(request):
    """
    F-06 Dashboard & F-09 Sleep Goal Tracker.
    Shows last night's sleep duration, 7-day average (BR-17), goal status (BR-16),
    and small trend chart (BR-18).
    """
    today = timezone.localdate()
    last_7_days_start = today - timedelta(days=6)

    # BR-17: Entries whose sleep date falls in last 7 calendar days including today
    entries_7d = SleepLog.objects.filter(
        user=request.user,
        sleep_date__gte=last_7_days_start,
        sleep_date__lte=today
    ).order_by('-sleep_date')

    if entries_7d.exists():
        avg_mins = round(entries_7d.aggregate(avg=Avg('duration_minutes'))['avg'])
        seven_day_avg_formatted = f"{avg_mins // 60}h {avg_mins % 60:02d}m"
        seven_day_avg_hours = round(avg_mins / 60.0, 1)
    else:
        # BR-17: days with no entry excluded; with no entries dashboard shows "No data"
        seven_day_avg_formatted = "No data"
        seven_day_avg_hours = None

    # Last night's sleep duration (F-06)
    last_night_log = SleepLog.objects.filter(user=request.user).order_by('-sleep_date', '-wake_time').first()

    # Current target goal (F-08, F-09, BR-14, BR-15)
    current_goal_hours = SleepGoal.get_goal_for_date(request.user, today)

    # Goal tracker: how often goal was met in last 7 days (e.g. 5 of 7 days) (F-09)
    goals_met_7d = sum(1 for log in entries_7d if log.is_goal_met)
    logged_days_7d = entries_7d.count()

    # Recent sleep logs for table preview
    recent_logs = SleepLog.objects.filter(user=request.user).prefetch_related('tags').order_by('-sleep_date', '-wake_time')[:5]

    total_logs_count = SleepLog.objects.filter(user=request.user).count()
    total_tags_count = Tag.objects.filter(user=request.user).count()

    context = {
        'user': request.user,
        'today': today,
        'last_night_log': last_night_log,
        'seven_day_avg_formatted': seven_day_avg_formatted,
        'seven_day_avg_hours': seven_day_avg_hours,
        'current_goal_hours': current_goal_hours,
        'goals_met_7d': goals_met_7d,
        'logged_days_7d': logged_days_7d,
        'recent_logs': recent_logs,
        'total_logs_count': total_logs_count,
        'total_tags_count': total_tags_count,
    }
    return render(request, 'accounts/member_dashboard.html', context)


@login_required
def profile_view(request):
    """View user profile (F-08)."""
    today = timezone.localdate()
    profile = getattr(request.user, 'profile', None)
    current_goal_hours = SleepGoal.get_goal_for_date(request.user, today)
    logs_count = SleepLog.objects.filter(user=request.user).count()

    context = {
        'user': request.user,
        'profile': profile,
        'current_goal_hours': current_goal_hours,
        'logs_count': logs_count,
    }
    return render(request, 'accounts/profile.html', context)


@login_required
def profile_edit(request):
    """Edit user profile (F-08)."""
    if request.method == 'POST':
        form = ProfileUpdateForm(request.POST, request.FILES, instance=request.user)
        if form.is_valid():
            form.save()
            messages.success(request, 'Your profile and timezone have been updated successfully!')
            return redirect('accounts:profile')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = ProfileUpdateForm(instance=request.user)

    return render(request, 'accounts/profile_edit.html', {'form': form})
