from django.test import TestCase, Client
from django.urls import reverse
from .models import CustomUser


class CustomUserModelTest(TestCase):
    def test_create_user(self):
        user = CustomUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='member'
        )
        self.assertEqual(user.username, 'testuser')
        self.assertEqual(user.role, 'member')
        self.assertTrue(user.is_member)
        self.assertFalse(user.is_admin_user)

    def test_create_admin_user(self):
        user = CustomUser.objects.create_user(
            username='adminuser',
            email='admin@example.com',
            password='adminpass123',
            role='admin'
        )
        self.assertTrue(user.is_admin_user)
        self.assertFalse(user.is_member)


class AccountFeatureViewTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.member = CustomUser.objects.create_user(
            username='starry_member',
            email='member@starry.com',
            password='password123',
            role='member'
        )
        self.admin = CustomUser.objects.create_user(
            username='starry_admin',
            email='admin@starry.com',
            password='password123',
            role='admin'
        )

    def test_login_page_renders(self):
        response = self.client.get(reverse('accounts:login'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Snoozr')
        self.assertContains(response, 'starry-canvas-container')

    def test_registration_page_renders(self):
        response = self.client.get(reverse('accounts:register'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Create Account')

    def test_successful_login_redirects_to_dashboard(self):
        response = self.client.post(reverse('accounts:login'), {
            'username': 'starry_member',
            'password': 'password123'
        }, follow=True)
        # Follows redirect through /accounts/dashboard/ to /accounts/dashboard/member/
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Member Sanctuary')

    def test_invalid_login_shows_error(self):
        response = self.client.post(reverse('accounts:login'), {
            'username': 'starry_member',
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Invalid username or password')

    def test_member_dashboard_access(self):
        self.client.login(username='starry_member', password='password123')
        response = self.client.get(reverse('accounts:member_dashboard'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Member Sanctuary')

    def test_member_blocked_from_admin_dashboard(self):
        """Verify role protection: member cannot open admin dashboard."""
        self.client.login(username='starry_member', password='password123')
        response = self.client.get(reverse('accounts:admin_dashboard'), follow=True)
        # Member should be redirected to their own dashboard
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'You do not have permission')
        self.assertContains(response, 'Member Sanctuary')

    def test_admin_dashboard_access(self):
        self.client.login(username='starry_admin', password='password123')
        response = self.client.get(reverse('accounts:admin_dashboard'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'System Control')

    def test_profile_requires_login(self):
        response = self.client.get(reverse('accounts:profile'))
        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.url.startswith(reverse('accounts:login')))

    def test_profile_view_for_logged_in_user(self):
        self.client.login(username='starry_member', password='password123')
        response = self.client.get(reverse('accounts:profile'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'starry_member')
