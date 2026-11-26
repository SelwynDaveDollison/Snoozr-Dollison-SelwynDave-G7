from django import forms
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import SleepLog, Tag, SleepGoal
from decimal import Decimal


class SleepLogForm(forms.ModelForm):
    """
    Form for creating and editing sleep log entries (F-04, F-05, F-10).
    Enforces business rules BR-07 through BR-13, BR-21, BR-22.
    """
    tags = forms.ModelMultipleChoiceField(
        queryset=Tag.objects.none(),
        required=False,
        widget=forms.SelectMultiple(attrs={
            'class': 'form-select starry-input select-tags',
            'size': '4',
        }),
        help_text="Select up to 5 personal tags (Hold Ctrl/Cmd to select multiple)"
    )

    class Meta:
        model = SleepLog
        fields = ['bedtime', 'wake_time', 'note', 'tags']
        widgets = {
            'bedtime': forms.DateTimeInput(
                attrs={
                    'type': 'datetime-local',
                    'class': 'form-control starry-input',
                    'placeholder': 'Select bedtime',
                },
                format='%Y-%m-%dT%H:%M'
            ),
            'wake_time': forms.DateTimeInput(
                attrs={
                    'type': 'datetime-local',
                    'class': 'form-control starry-input',
                    'placeholder': 'Select wake time',
                },
                format='%Y-%m-%dT%H:%M'
            ),
            'note': forms.TextInput(
                attrs={
                    'class': 'form-control starry-input',
                    'maxlength': '255',
                    'placeholder': "Optional context (e.g. 'Exam week cramming', 'Drank chamomile tea')",
                }
            ),
        }

    def __init__(self, *args, user=None, **kwargs):
        self.user = user
        super().__init__(*args, **kwargs)
        if self.user and not getattr(self.instance, 'user_id', None):
            self.instance.user = self.user
        if self.user:
            if not getattr(self.instance, 'user_id', None):
                self.instance.user = self.user
            # BR-22: A user can attach only their own tags to their own entries
            self.fields['tags'].queryset = Tag.objects.filter(user=self.user).order_by('name')

        # Format datetime initial values for HTML5 datetime-local inputs
        if self.instance and self.instance.pk:
            if self.instance.bedtime:
                self.initial['bedtime'] = self.instance.bedtime.strftime('%Y-%m-%dT%H:%M')
            if self.instance.wake_time:
                self.initial['wake_time'] = self.instance.wake_time.strftime('%Y-%m-%dT%H:%M')
            self.initial['tags'] = self.instance.tags.all()

    def clean_tags(self):
        tags = self.cleaned_data.get('tags')
        if tags and len(tags) > 5:
            # BR-21: An entry can have at most 5 tags
            raise ValidationError('An entry can have at most 5 tags.')
        return tags

    def clean(self):
        cleaned_data = super().clean()
        bedtime = cleaned_data.get('bedtime')
        wake_time = cleaned_data.get('wake_time')
        note = cleaned_data.get('note')

        if not bedtime or not wake_time:
            return cleaned_data

        # Create or update a temporary instance to invoke model validation
        instance = self.instance
        instance.user = self.user
        instance.bedtime = bedtime
        instance.wake_time = wake_time
        instance.note = note

        try:
            instance.clean()
        except ValidationError as e:
            self.add_error(None, e)

        return cleaned_data

    def save(self, commit=True):
        instance = super().save(commit=False)
        instance.user = self.user
        if commit:
            instance.save()
            # Save M2M tags through intermediary
            tags = self.cleaned_data.get('tags', [])
            instance.tags.set(tags)
        return instance


class TagForm(forms.ModelForm):
    """
    Form for creating and editing personal tags (F-12, BR-20).
    """
    class Meta:
        model = Tag
        fields = ['name']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-control starry-input',
                'placeholder': 'Enter tag name (e.g. Exam Week, Stressed, Gaming)',
                'maxlength': '30',
                'autofocus': True,
            })
        }

    def __init__(self, *args, user=None, **kwargs):
        self.user = user
        super().__init__(*args, **kwargs)
        if self.user and not getattr(self.instance, 'user_id', None):
            self.instance.user = self.user

    def clean_name(self):
        name = self.cleaned_data.get('name', '').strip()
        if not name:
            raise ValidationError('Tag name cannot be empty.')
        if len(name) > 30:
            raise ValidationError('Tag name must be at most 30 characters.')
        if self.user:
            qs = Tag.objects.filter(user=self.user, name__iexact=name)
            if self.instance and self.instance.pk:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise ValidationError(f'You already have a tag named "{name}".')
        return name

    def save(self, commit=True):
        instance = super().save(commit=False)
        instance.user = self.user
        if commit:
            instance.save()
        return instance


class SleepGoalForm(forms.ModelForm):
    """
    Form for updating personal sleep goal (F-08, F-09, BR-14, BR-15).
    """
    target_hours = forms.ChoiceField(
        choices=[(f"{h:.1f}", f"{h:.1f} hours") for h in [x * 0.5 for x in range(8, 25)]],
        widget=forms.Select(attrs={'class': 'form-select starry-input'}),
        help_text="Target hours of sleep (4.0 to 12.0 in steps of 0.5)"
    )

    class Meta:
        model = SleepGoal
        fields = ['target_hours', 'effective_from']
        widgets = {
            'effective_from': forms.DateInput(
                attrs={
                    'type': 'date',
                    'class': 'form-control starry-input',
                }
            )
        }

    def __init__(self, *args, user=None, **kwargs):
        self.user = user
        super().__init__(*args, **kwargs)
        if self.user and not getattr(self.instance, 'user_id', None):
            self.instance.user = self.user
        if not self.initial.get('effective_from'):
            self.initial['effective_from'] = timezone.localdate().isoformat()

    def clean_target_hours(self):
        val = self.cleaned_data.get('target_hours')
        try:
            val_dec = Decimal(str(val))
        except Exception:
            raise ValidationError('Invalid target hours.')
        if val_dec < Decimal('4.0') or val_dec > Decimal('12.0'):
            raise ValidationError('Sleep goal must be between 4.0 and 12.0 hours.')
        if (val_dec * 2) % 1 != 0:
            raise ValidationError('Sleep goal must be in steps of 0.5 hours.')
        return val_dec

    def save(self, commit=True):
        instance = super().save(commit=False)
        instance.user = self.user
        if commit:
            # If a goal with effective_from already exists, update it, else create new
            SleepGoal.objects.update_or_create(
                user=self.user,
                effective_from=instance.effective_from,
                defaults={'target_hours': instance.target_hours}
            )
        return instance
