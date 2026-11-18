from django.test import TestCase
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
