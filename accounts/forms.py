from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import CustomUser, Profile


TIMEZONE_CHOICES = [
    ('Asia/Manila', 'Asia/Manila (PHT, UTC+8) [Default]'),
    ('UTC', 'UTC (Coordinated Universal Time)'),
    ('Asia/Singapore', 'Asia/Singapore (SGT, UTC+8)'),
    ('Asia/Tokyo', 'Asia/Tokyo (JST, UTC+9)'),
    ('Asia/Hong_Kong', 'Asia/Hong_Kong (HKT, UTC+8)'),
    ('Europe/London', 'Europe/London (GMT/BST)'),
    ('Europe/Paris', 'Europe/Paris (CET/CEST)'),
    ('America/New_York', 'America/New_York (EST/EDT)'),
    ('America/Chicago', 'America/Chicago (CST/CDT)'),
    ('America/Los_Angeles', 'America/Los_Angeles (PST/PDT)'),
    ('Australia/Sydney', 'Australia/Sydney (AEST/AEDT)'),
]


class RegistrationForm(UserCreationForm):
    """Registration form with validation for new users (F-01, BR-01, BR-02, BR-03)."""

    email = forms.EmailField(
        required=True,
        widget=forms.EmailInput(attrs={
            'class': 'form-control starry-input',
            'placeholder': 'Email address',
        })
    )
    first_name = forms.CharField(
        required=True,
        widget=forms.TextInput(attrs={
            'class': 'form-control starry-input',
            'placeholder': 'First name',
        })
    )
    last_name = forms.CharField(
        required=True,
        widget=forms.TextInput(attrs={
            'class': 'form-control starry-input',
            'placeholder': 'Last name',
        })
    )

    class Meta:
        model = CustomUser
        fields = ['username', 'email', 'first_name', 'last_name', 'password1', 'password2']
        widgets = {
            'username': forms.TextInput(attrs={
                'class': 'form-control starry-input',
                'placeholder': 'Username (3-30 characters)',
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['password1'].widget.attrs.update({
            'class': 'form-control starry-input',
            'placeholder': 'Password (min 8 characters)',
        })
        self.fields['password2'].widget.attrs.update({
            'class': 'form-control starry-input',
            'placeholder': 'Confirm password',
        })

    def clean_email(self):
        email = self.cleaned_data.get('email', '').strip()
        # BR-02: Email address must be unique and valid
        if CustomUser.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError('This email address is already registered.')
        return email

    def clean_username(self):
        username = self.cleaned_data.get('username', '').strip()
        # BR-01: Username must be 3 to 30 characters long and case-insensitive unique
        if len(username) < 3 or len(username) > 30:
            raise forms.ValidationError('Username must be between 3 and 30 characters long.')
        if CustomUser.objects.filter(username__iexact=username).exists():
            raise forms.ValidationError('This username is already taken.')
        return username


class ProfileUpdateForm(forms.ModelForm):
    """Form for updating user personal profile information (F-08)."""

    timezone = forms.ChoiceField(
        choices=TIMEZONE_CHOICES,
        required=True,
        widget=forms.Select(attrs={'class': 'form-select starry-input'}),
        help_text="Timezone used to calculate your sleep date and 'last night' (BR-11, BR-17)"
    )

    class Meta:
        model = CustomUser
        fields = ['first_name', 'last_name', 'email', 'contact_number', 'bio', 'profile_photo']
        widgets = {
            'first_name': forms.TextInput(attrs={'class': 'form-control starry-input'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control starry-input'}),
            'email': forms.EmailInput(attrs={'class': 'form-control starry-input'}),
            'contact_number': forms.TextInput(attrs={'class': 'form-control starry-input', 'placeholder': '+63 XXX XXX XXXX'}),
            'bio': forms.Textarea(attrs={'class': 'form-control starry-input', 'rows': 3, 'placeholder': 'Tell us about your sleep habits...'}),
            'profile_photo': forms.ClearableFileInput(attrs={'class': 'form-control starry-input'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            profile = getattr(self.instance, 'profile', None)
            if profile:
                self.fields['timezone'].initial = profile.timezone

    def clean_email(self):
        email = self.cleaned_data.get('email', '').strip()
        if CustomUser.objects.filter(email__iexact=email).exclude(pk=self.instance.pk).exists():
            raise forms.ValidationError('This email address is already in use by another account.')
        return email

    def save(self, commit=True):
        user = super().save(commit=commit)
        tz = self.cleaned_data.get('timezone', 'Asia/Manila')
        full_name = f"{user.first_name} {user.last_name}".strip() or user.username
        if commit:
            Profile.objects.update_or_create(
                user=user,
                defaults={'timezone': tz, 'full_name': full_name}
            )
        return user
