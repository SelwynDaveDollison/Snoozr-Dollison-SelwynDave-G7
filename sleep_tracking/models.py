from decimal import Decimal
import zoneinfo
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.utils import timezone


class SleepGoal(models.Model):
    """
    Stores each user's sleep goal and its history (SDD Section 4.2 Table: sleep_goal).
    Supports F-08, F-09; enforces BR-14 to BR-16.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sleep_goals',
        help_text="User who set the goal"
    )
    target_hours = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        default=Decimal('8.0'),
        help_text="Target hours of sleep per night (4.0 to 12.0 in steps of 0.5)"
    )
    effective_from = models.DateField(
        help_text="First date the goal applies; latest date on or before a day is effective (BR-15)"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-effective_from', '-created_at']
        unique_together = ('user', 'effective_from')
        verbose_name = 'Sleep Goal'
        verbose_name_plural = 'Sleep Goals'

    def __str__(self):
        return f"{self.user.username} - {self.target_hours}h (Effective {self.effective_from})"

    def clean(self):
        super().clean()
        # BR-14: A sleep goal must be between 4.0 and 12.0 hours in steps of 0.5
        if self.target_hours is not None:
            if self.target_hours < Decimal('4.0') or self.target_hours > Decimal('12.0'):
                raise ValidationError({
                    'target_hours': 'A sleep goal must be between 4.0 and 12.0 hours.'
                })
            # Step of 0.5 check: (target_hours * 2) must be integer
            if (self.target_hours * 2) % 1 != 0:
                raise ValidationError({
                    'target_hours': 'Sleep goal must be in steps of 0.5 hours (e.g. 7.0, 7.5, 8.0).'
                })

    @classmethod
    def get_goal_for_date(cls, user, target_date):
        """
        BR-15: Each past day is judged against the goal that was in effect on that date.
        Finds the latest goal record with effective_from <= target_date.
        Defaults to 8.0 hours if none is explicitly found.
        """
        goal = cls.objects.filter(
            user=user,
            effective_from__lte=target_date
        ).order_by('-effective_from', '-created_at').first()

        if goal:
            return goal.target_hours
        # If no goal is prior to target_date, check for earliest goal set or return default 8.0
        earliest_goal = cls.objects.filter(user=user).order_by('effective_from').first()
        return earliest_goal.target_hours if earliest_goal else Decimal('8.0')


class Tag(models.Model):
    """
    Stores each user's personal tags (SDD Section 4.2 Table: tag).
    Supports F-11, F-12, F-13; enforces BR-20.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tags',
        help_text="User who owns the tag (BR-22)"
    )
    name = models.CharField(
        max_length=30,
        help_text="Label shown on entries, e.g. 'exam week' (BR-20)"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'name'],
                name='unique_user_tag_name'
            )
        ]
        verbose_name = 'Tag'
        verbose_name_plural = 'Tags'

    def __str__(self):
        return self.name

    def clean(self):
        super().clean()
        if self.name:
            self.name = self.name.strip()
            # BR-20: A tag name must be 1 to 30 characters long
            if len(self.name) < 1 or len(self.name) > 30:
                raise ValidationError({'name': 'Tag name must be between 1 and 30 characters.'})
            # BR-20: Unique per user (case-insensitive)
            if hasattr(self, 'user_id') and self.user_id:
                qs = Tag.objects.filter(user=self.user, name__iexact=self.name)
                if self.pk:
                    qs = qs.exclude(pk=self.pk)
                if qs.exists():
                    raise ValidationError({'name': f'You already have a tag named "{self.name}".'})

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)


class SleepLog(models.Model):
    """
    Stores one sleep entry per user per day (SDD Section 4.2 Table: sleep_log).
    Supports F-04 to F-07, F-09 to F-11, F-13; enforces BR-07 to BR-13, BR-19.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sleep_logs',
        help_text="User who owns the entry (BR-05)"
    )
    sleep_date = models.DateField(
        help_text="Calendar date of wake time; one entry per user per date (BR-11)"
    )
    bedtime = models.DateTimeField(
        help_text="Date and time the user went to bed"
    )
    wake_time = models.DateTimeField(
        help_text="Date and time the user woke up (BR-07)"
    )
    duration_minutes = models.PositiveIntegerField(
        editable=False,
        validators=[MinValueValidator(1), MaxValueValidator(1440)],
        help_text="Hours slept in whole minutes, auto-computed from bedtime & wake_time (BR-08, BR-09)"
    )
    note = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Optional note giving context for the entry (BR-13)"
    )
    tags = models.ManyToManyField(
        Tag,
        through='SleepLogTag',
        related_name='sleep_logs',
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-sleep_date', '-wake_time']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'sleep_date'],
                name='unique_user_sleep_date'
            ),
            models.CheckConstraint(
                condition=models.Q(wake_time__gt=models.F('bedtime')),
                name='check_wake_time_gt_bedtime'
            ),
            models.CheckConstraint(
                condition=models.Q(duration_minutes__gte=1) & models.Q(duration_minutes__lte=1440),
                name='check_duration_minutes_range'
            ),
        ]
        verbose_name = 'Sleep Log'
        verbose_name_plural = 'Sleep Logs'

    def __str__(self):
        return f"{self.user.username} - {self.sleep_date}: {self.formatted_duration}"

    @property
    def duration_hours(self):
        """Duration in fractional hours (e.g. 7.50)."""
        return round(self.duration_minutes / 60.0, 2)

    @property
    def formatted_duration(self):
        """Returns duration in human-readable 'Xh Ym' format."""
        hours = self.duration_minutes // 60
        mins = self.duration_minutes % 60
        return f"{hours}h {mins:02d}m"

    @property
    def target_goal(self):
        """Returns the target hours goal effective for this entry's sleep_date (BR-15)."""
        return SleepGoal.get_goal_for_date(self.user, self.sleep_date)

    @property
    def is_goal_met(self):
        """
        BR-16: A day counts as 'goal met' when its duration_minutes
        is >= goal's target_hours * 60.
        """
        target_minutes = int(self.target_goal * 60)
        return self.duration_minutes >= target_minutes

    def get_user_timezone(self):
        """Retrieve user's configured timezone from profile (default 'Asia/Manila')."""
        if hasattr(self.user, 'profile') and self.user.profile.timezone:
            return self.user.profile.timezone
        return 'Asia/Manila'

    def clean(self):
        super().clean()

        # BR-07: Wake time must be later than bedtime
        if self.bedtime and self.wake_time:
            if self.wake_time <= self.bedtime:
                raise ValidationError({
                    'wake_time': 'The wake time of an entry must be later than its bedtime.'
                })

            # BR-08: Sleep duration computed by system as wake time minus bedtime in whole minutes
            diff_seconds = (self.wake_time - self.bedtime).total_seconds()
            computed_minutes = int(diff_seconds // 60)
            self.duration_minutes = computed_minutes

            # BR-09: Single entry must last at least 1 minute and at most 24 hours (1,440 minutes)
            if computed_minutes < 1 or computed_minutes > 1440:
                raise ValidationError({
                    'wake_time': 'A single sleep entry must last at least 1 minute and at most 24 hours (1,440 minutes).'
                })

        # BR-10: Bedtime and wake time cannot be set in the future
        now_dt = timezone.now()
        if self.bedtime and self.bedtime > now_dt:
            raise ValidationError({
                'bedtime': 'Bedtime cannot be set in the future.'
            })
        if self.wake_time and self.wake_time > now_dt:
            raise ValidationError({
                'wake_time': 'Wake time cannot be set in the future.'
            })

        # BR-11: Sleep date is the calendar date of the wake time in user's timezone
        if self.wake_time:
            tz_str = self.get_user_timezone()
            try:
                user_tz = zoneinfo.ZoneInfo(tz_str)
            except Exception:
                user_tz = zoneinfo.ZoneInfo('Asia/Manila')
            local_wake = self.wake_time.astimezone(user_tz)
            self.sleep_date = local_wake.date()

            # BR-11: A user may have at most one entry per sleep date
            if hasattr(self, 'user_id') and self.user_id:
                qs = SleepLog.objects.filter(user=self.user, sleep_date=self.sleep_date)
                if self.pk:
                    qs = qs.exclude(pk=self.pk)
                if qs.exists():
                    raise ValidationError(
                        f'You already have a sleep entry logged for {self.sleep_date}. '
                        'Each sleep date can only have one entry.'
                    )

        # BR-12: The time ranges of one user's entries must not overlap
        if hasattr(self, 'user_id') and self.user_id and self.bedtime and self.wake_time:
            overlapping = SleepLog.objects.filter(
                user=self.user,
                bedtime__lt=self.wake_time,
                wake_time__gt=self.bedtime
            )
            if self.pk:
                overlapping = overlapping.exclude(pk=self.pk)
            if overlapping.exists():
                overlap_entry = overlapping.first()
                raise ValidationError(
                    f'The time range overlaps with an existing sleep log '
                    f'({overlap_entry.bedtime.strftime("%b %d, %H:%M")} to '
                    f'{overlap_entry.wake_time.strftime("%b %d, %H:%M")}).'
                )

        # BR-13: A note is optional and at most 255 characters long
        if self.note:
            self.note = self.note.strip()
            if len(self.note) > 255:
                raise ValidationError({'note': 'Note cannot exceed 255 characters.'})

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)


class SleepLogTag(models.Model):
    """
    Junction table linking entries and tags (many-to-many) (SDD Section 4.2 Table: sleep_log_tag).
    Supports F-04, F-11, F-12, F-13; enforces BR-21 and BR-23.
    """
    log = models.ForeignKey(
        SleepLog,
        on_delete=models.CASCADE,
        related_name='log_tags'
    )
    tag = models.ForeignKey(
        Tag,
        on_delete=models.CASCADE,
        related_name='tag_logs'
    )

    class Meta:
        unique_together = ('log', 'tag')
        verbose_name = 'Sleep Log Tag Link'
        verbose_name_plural = 'Sleep Log Tag Links'

    def __str__(self):
        return f"{self.log.sleep_date} - {self.tag.name}"

    def clean(self):
        super().clean()
        # BR-22: A user can attach only their own tags to their own entries
        if self.log.user != self.tag.user:
            raise ValidationError('A user can attach only their own tags to their own entries.')

        # BR-21: An entry can have at most 5 tags
        if not self.pk:
            current_tag_count = self.log.tags.count()
            if current_tag_count >= 5:
                raise ValidationError('An entry can have at most 5 tags.')

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
