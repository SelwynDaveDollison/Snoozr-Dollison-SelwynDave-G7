from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class CustomUser(AbstractUser):
    """Custom user model with role-based access."""

    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('member', 'Member'),
    )

    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='member')
    contact_number = models.CharField(max_length=20, blank=True, null=True)
    profile_photo = models.ImageField(upload_to='profile_photos/', blank=True, null=True)
    bio = models.TextField(max_length=500, blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    @property
    def is_admin_user(self):
        return self.role == 'admin'

    @property
    def is_member(self):
        return self.role == 'member'


class Profile(models.Model):
    """
    Stores personal information, one row per user (SDD Section 4.2 Table: profile).
    Supports F-01 and F-08.
    """
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='profile')
    full_name = models.CharField(max_length=100, blank=True, null=True)
    timezone = models.CharField(max_length=50, default='Asia/Manila')
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile of {self.user.username} ({self.timezone})"


@receiver(post_save, sender=CustomUser)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    """Ensure every user automatically has a profile created upon registration (F-01)."""
    if created:
        full_name = f"{instance.first_name} {instance.last_name}".strip() or instance.username
        Profile.objects.create(user=instance, full_name=full_name)
    else:
        if hasattr(instance, 'profile'):
            instance.profile.save()
