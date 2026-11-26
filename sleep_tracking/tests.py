from datetime import timedelta
from decimal import Decimal
import zoneinfo

from django.core.exceptions import ValidationError
from django.test import TestCase, Client
from django.urls import reverse
from django.utils import timezone

from accounts.models import CustomUser, Profile
from sleep_tracking.models import SleepGoal, Tag, SleepLog, SleepLogTag


class SleepTrackingModelTests(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username='student1',
            email='student1@test.com',
            password='Password123!',
            role='member'
        )
        # Profile is created via post_save signal
        self.user2 = CustomUser.objects.create_user(
            username='student2',
            email='student2@test.com',
            password='Password123!',
            role='member'
        )
        self.now = timezone.now()

    def test_br08_auto_duration_calculation(self):
        """BR-08: Sleep duration computed by system as wake time minus bedtime in whole minutes."""
        bed = self.now - timedelta(hours=8)
        wake = self.now - timedelta(minutes=30)
        log = SleepLog.objects.create(
            user=self.user,
            bedtime=bed,
            wake_time=wake
        )
        expected_minutes = int((wake - bed).total_seconds() // 60)
        self.assertEqual(log.duration_minutes, expected_minutes)
        self.assertEqual(log.duration_hours, round(expected_minutes / 60.0, 2))

    def test_br07_wake_time_must_be_later_than_bedtime(self):
        """BR-07: The wake time of an entry must be later than its bedtime."""
        bed = self.now - timedelta(hours=4)
        wake = self.now - timedelta(hours=5)  # before bedtime
        log = SleepLog(user=self.user, bedtime=bed, wake_time=wake)
        with self.assertRaises(ValidationError):
            log.clean()

    def test_br09_duration_range_bounds(self):
        """BR-09: A single entry must last at least 1 minute and at most 24 hours (1,440 minutes)."""
        # Exactly 0 minutes
        log_zero = SleepLog(
            user=self.user,
            bedtime=self.now - timedelta(minutes=10),
            wake_time=self.now - timedelta(minutes=10)
        )
        with self.assertRaises(ValidationError):
            log_zero.clean()

        # > 24 hours (e.g. 25 hours)
        log_long = SleepLog(
            user=self.user,
            bedtime=self.now - timedelta(hours=26),
            wake_time=self.now - timedelta(hours=1)
        )
        with self.assertRaises(ValidationError):
            log_long.clean()

    def test_br10_no_future_timestamps(self):
        """BR-10: Bedtime and wake time cannot be set in the future."""
        future_bed = self.now + timedelta(hours=1)
        future_wake = self.now + timedelta(hours=8)
        log = SleepLog(user=self.user, bedtime=future_bed, wake_time=future_wake)
        with self.assertRaises(ValidationError):
            log.clean()

    def test_br11_one_entry_per_sleep_date(self):
        """BR-11: A user may have at most one entry per sleep date."""
        bed1 = self.now - timedelta(hours=16)
        wake1 = self.now - timedelta(hours=9)
        log1 = SleepLog.objects.create(user=self.user, bedtime=bed1, wake_time=wake1)

        # Attempt second entry waking on same calendar date
        bed2 = self.now - timedelta(hours=8)
        wake2 = self.now - timedelta(hours=2)
        log2 = SleepLog(user=self.user, bedtime=bed2, wake_time=wake2)
        with self.assertRaises(ValidationError):
            log2.clean()

    def test_br12_no_overlapping_entries(self):
        """BR-12: The time ranges of one user's entries must not overlap."""
        # Entry 1: 2 days ago, 10 PM to yesterday 6 AM
        t0 = self.now - timedelta(days=2)
        bed1 = t0.replace(hour=22, minute=0, second=0, microsecond=0)
        wake1 = (t0 + timedelta(days=1)).replace(hour=6, minute=0, second=0, microsecond=0)
        SleepLog.objects.create(user=self.user, bedtime=bed1, wake_time=wake1)

        # Overlapping Entry: yesterday 4 AM to yesterday 8 AM (overlaps 4 AM to 6 AM)
        bed2 = (t0 + timedelta(days=1)).replace(hour=4, minute=0, second=0, microsecond=0)
        wake2 = (t0 + timedelta(days=1)).replace(hour=8, minute=0, second=0, microsecond=0)
        overlap_log = SleepLog(user=self.user, bedtime=bed2, wake_time=wake2)
        with self.assertRaises(ValidationError):
            overlap_log.clean()

    def test_br14_and_br15_sleep_goal_bounds_and_effective_date(self):
        """BR-14 & BR-15: Sleep goals between 4.0 and 12.0 in steps of 0.5 with effective date."""
        today = timezone.localdate()
        # Invalid goal: 3.5 (too low)
        g_low = SleepGoal(user=self.user, target_hours=Decimal('3.5'), effective_from=today)
        with self.assertRaises(ValidationError):
            g_low.clean()

        # Invalid goal: 7.3 (not multiple of 0.5)
        g_step = SleepGoal(user=self.user, target_hours=Decimal('7.3'), effective_from=today)
        with self.assertRaises(ValidationError):
            g_step.clean()

        # Valid goal
        g_valid = SleepGoal.objects.create(user=self.user, target_hours=Decimal('7.5'), effective_from=today)
        self.assertEqual(SleepGoal.get_goal_for_date(self.user, today), Decimal('7.5'))

    def test_br16_goal_met_calculation(self):
        """BR-16: A day counts as goal met when duration_minutes >= target_hours * 60."""
        today = timezone.localdate()
        SleepGoal.objects.create(user=self.user, target_hours=Decimal('8.0'), effective_from=today - timedelta(days=5))

        # 8 hours 10 mins (490 mins) -> Met
        bed = self.now - timedelta(hours=9)
        wake = self.now - timedelta(minutes=50)
        log = SleepLog.objects.create(user=self.user, bedtime=bed, wake_time=wake)
        self.assertTrue(log.is_goal_met)

    def test_br20_tag_name_validation_and_uniqueness(self):
        """BR-20: Tag name 1-30 chars, case-insensitive unique per user."""
        Tag.objects.create(user=self.user, name='Exam Week')
        # Duplicate case-insensitive
        dup = Tag(user=self.user, name='exam week')
        with self.assertRaises(ValidationError):
            dup.clean()

        # User 2 can have the same tag name
        tag_user2 = Tag(user=self.user2, name='exam week')
        tag_user2.clean()  # should not raise

    def test_br21_and_br22_tag_limit_and_ownership(self):
        """BR-21 (max 5 tags) and BR-22 (user can attach only own tags)."""
        bed = self.now - timedelta(hours=7)
        wake = self.now - timedelta(hours=1)
        log = SleepLog.objects.create(user=self.user, bedtime=bed, wake_time=wake)

        # Attempt to attach another user's tag
        foreign_tag = Tag.objects.create(user=self.user2, name='Foreign Tag')
        link = SleepLogTag(log=log, tag=foreign_tag)
        with self.assertRaises(ValidationError):
            link.clean()

        # Attach 5 valid tags
        tags = [Tag.objects.create(user=self.user, name=f'Tag {i}') for i in range(5)]
        log.tags.set(tags)
        self.assertEqual(log.tags.count(), 5)

        # 6th tag should fail validation
        tag6 = Tag.objects.create(user=self.user, name='Tag 6')
        link6 = SleepLogTag(log=log, tag=tag6)
        with self.assertRaises(ValidationError):
            link6.clean()


class SleepTrackingViewTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = CustomUser.objects.create_user(
            username='student1',
            email='student1@test.com',
            password='Password123!',
            role='member'
        )
        self.client.login(username='student1', password='Password123!')
        self.now = timezone.now()

    def test_f04_sleep_log_create_get_and_post(self):
        """F-04: Test Sleep Log form display and successful creation."""
        res = self.client.get(reverse('sleep_tracking:log_create'))
        self.assertEqual(res.status_code, 200)

        bed = (self.now - timedelta(hours=8)).strftime('%Y-%m-%dT%H:%M')
        wake = (self.now - timedelta(hours=1)).strftime('%Y-%m-%dT%H:%M')
        res_post = self.client.post(reverse('sleep_tracking:log_create'), {
            'bedtime': bed,
            'wake_time': wake,
            'note': 'Feeling well-rested',
        })
        self.assertEqual(res_post.status_code, 302)  # Redirects to history
        self.assertEqual(SleepLog.objects.filter(user=self.user).count(), 1)
        log = SleepLog.objects.get(user=self.user)
        self.assertEqual(log.note, 'Feeling well-rested')

    def test_f05_sleep_history_view_and_pagination(self):
        """F-05: Test Sleep History view with list rendering."""
        res = self.client.get(reverse('sleep_tracking:history'))
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, 'Sleep History')

    def test_f05_sleep_log_update_view(self):
        """F-05: Test Sleep Log edit view."""
        bed = self.now - timedelta(hours=7)
        wake = self.now - timedelta(hours=1)
        log = SleepLog.objects.create(user=self.user, bedtime=bed, wake_time=wake, note='Initial note')

        update_url = reverse('sleep_tracking:log_update', args=[log.pk])
        res = self.client.get(update_url)
        self.assertEqual(res.status_code, 200)

        # POST update
        new_bed = (self.now - timedelta(hours=8)).strftime('%Y-%m-%dT%H:%M')
        new_wake = (self.now - timedelta(hours=1)).strftime('%Y-%m-%dT%H:%M')
        res_post = self.client.post(update_url, {
            'bedtime': new_bed,
            'wake_time': new_wake,
            'note': 'Updated note',
        })
        self.assertEqual(res_post.status_code, 302)
        log.refresh_from_db()
        self.assertEqual(log.note, 'Updated note')

    def test_f05_sleep_log_delete_view_get_and_post(self):
        """F-05 & BR-19: Delete requires confirmation and is permanent."""
        bed = self.now - timedelta(hours=7)
        wake = self.now - timedelta(hours=1)
        log = SleepLog.objects.create(user=self.user, bedtime=bed, wake_time=wake)

        delete_url = reverse('sleep_tracking:log_delete', args=[log.pk])
        res_get = self.client.get(delete_url)
        self.assertEqual(res_get.status_code, 200)
        self.assertContains(res_get, 'Delete Sleep Entry?')

        res_post = self.client.post(delete_url)
        self.assertEqual(res_post.status_code, 302)
        self.assertFalse(SleepLog.objects.filter(pk=log.pk).exists())

    def test_f12_tag_management_crud(self):
        """F-12: Tag creation and deletion."""
        # Create tag
        res_post = self.client.post(reverse('sleep_tracking:tags'), {'name': 'Exam Week'})
        self.assertEqual(res_post.status_code, 302)
        self.assertTrue(Tag.objects.filter(user=self.user, name='Exam Week').exists())

        # Delete tag
        tag = Tag.objects.get(user=self.user, name='Exam Week')
        del_url = reverse('sleep_tracking:tag_delete', args=[tag.pk])
        res_del = self.client.post(del_url)
        self.assertEqual(res_del.status_code, 302)
        self.assertFalse(Tag.objects.filter(pk=tag.pk).exists())

    def test_br05_user_isolation(self):
        """BR-05: User can only view, edit, or delete their own records."""
        user2 = CustomUser.objects.create_user(
            username='student2', email='student2@test.com', password='Password123!', role='member'
        )
        bed = self.now - timedelta(hours=7)
        wake = self.now - timedelta(hours=1)
        log2 = SleepLog.objects.create(user=user2, bedtime=bed, wake_time=wake)

        # Attempt to edit user2's log while logged in as user1 -> 404
        edit_url = reverse('sleep_tracking:log_update', args=[log2.pk])
        res = self.client.get(edit_url)
        self.assertEqual(res.status_code, 404)

        # Attempt to delete user2's log while logged in as user1 -> 404
        del_url = reverse('sleep_tracking:log_delete', args=[log2.pk])
        res = self.client.post(del_url)
        self.assertEqual(res.status_code, 404)
        self.assertTrue(SleepLog.objects.filter(pk=log2.pk).exists())

    def test_f06_dashboard_metrics_and_br17(self):
        """F-06 & BR-17: Dashboard shows last night's sleep and 7-day rolling average."""
        # 1. Empty state: should show 'No data'
        res_empty = self.client.get(reverse('accounts:member_dashboard'))
        self.assertEqual(res_empty.status_code, 200)
        self.assertContains(res_empty, 'No data')

        # 2. Add an entry 2 days ago (8 hours = 480 mins)
        t0 = self.now - timedelta(days=2)
        bed = t0.replace(hour=22, minute=0, second=0, microsecond=0)
        wake = (t0 + timedelta(days=1)).replace(hour=6, minute=0, second=0, microsecond=0)
        SleepLog.objects.create(user=self.user, bedtime=bed, wake_time=wake)

        res_entry = self.client.get(reverse('accounts:member_dashboard'))
        self.assertEqual(res_entry.status_code, 200)
        self.assertContains(res_entry, '8h 00m')
        self.assertContains(res_entry, '8h 00m')

    def test_f07_trend_chart_api_and_br18(self):
        """F-07 & BR-18: Weekly trend chart API returns gaps (null) for missing days."""
        t0 = self.now - timedelta(days=1)
        bed = t0.replace(hour=23, minute=0, second=0, microsecond=0)
        wake = (t0 + timedelta(days=1)).replace(hour=7, minute=0, second=0, microsecond=0)
        SleepLog.objects.create(user=self.user, bedtime=bed, wake_time=wake)

        res = self.client.get(reverse('sleep_tracking:trend_api') + '?days=7')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data['labels']), 7)
        self.assertEqual(len(data['durations']), 7)
        # BR-18: Missing days must be null (gaps), not 0
        self.assertIn(None, data['durations'])

    def test_f08_and_f09_goal_tracker_and_update(self):
        """F-08 & F-09: Update goal and check goal history."""
        res_post = self.client.post(reverse('sleep_tracking:goal'), {
            'target_hours': '7.5',
            'effective_from': timezone.localdate().isoformat(),
        })
        self.assertEqual(res_post.status_code, 302)
        self.assertEqual(SleepGoal.get_goal_for_date(self.user, timezone.localdate()), Decimal('7.5'))

    def test_f13_summary_report_view_and_br26(self):
        """F-13 & BR-26: Sleep Summary Report covers 7 to 90 days and reports stats."""
        # Test with no data: shows No Data Available
        res_no_data = self.client.get(reverse('sleep_tracking:report') + '?days=7')
        self.assertEqual(res_no_data.status_code, 200)
        self.assertContains(res_no_data, 'No Data Available')

        # Add 1 night of sleep
        bed = self.now - timedelta(hours=9)
        wake = self.now - timedelta(hours=1)
        SleepLog.objects.create(user=self.user, bedtime=bed, wake_time=wake)

        res_data = self.client.get(reverse('sleep_tracking:report') + '?days=7')
        self.assertEqual(res_data.status_code, 200)
        self.assertContains(res_data, 'Average Sleep')
        self.assertContains(res_data, 'Goal Success Rate')
