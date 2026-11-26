from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
from decimal import Decimal
from .forms import RegistrationForm, ProfileUpdateForm
from .decorators import admin_required, member_required
from .models import CustomUser
from sleep_tracking.models import SleepGoal


def register_view(request):
    """Handle user registration."""
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
    """Handle user login."""
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
    """Handle user logout."""
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
    recent_users = CustomUser.objects.order_by('-date_joined')[:5]

    context = {
        'total_users': total_users,
        'total_members': total_members,
        'total_admins': total_admins,
        'recent_users': recent_users,
    }
    return render(request, 'accounts/admin_dashboard.html', context)


@login_required
@member_required
def member_dashboard(request):
    """Member dashboard view."""
    context = {
        'user': request.user,
    }
    return render(request, 'accounts/member_dashboard.html', context)


@login_required
def profile_view(request):
    """View user profile."""
    return render(request, 'accounts/profile.html', {'user': request.user})


@login_required
def profile_edit(request):
    """Edit user profile."""
    if request.method == 'POST':
        form = ProfileUpdateForm(request.POST, request.FILES, instance=request.user)
        if form.is_valid():
            form.save()
            messages.success(request, 'Your profile has been updated successfully!')
            return redirect('accounts:profile')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = ProfileUpdateForm(instance=request.user)

    return render(request, 'accounts/profile_edit.html', {'form': form})
