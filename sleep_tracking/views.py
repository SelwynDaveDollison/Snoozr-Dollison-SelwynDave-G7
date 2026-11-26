from datetime import datetime, timedelta
from decimal import Decimal
import json

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db.models import Avg, Min, Max, Count, Q
from django.http import JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.utils import timezone
from django.views.decorators.http import require_POST

from .models import SleepLog, Tag, SleepGoal
from .forms import SleepLogForm, TagForm, SleepGoalForm


@login_required
def sleep_log_create_view(request):
    """
    F-04: Sleep Log Entry
    Lets user enter bedtime and wake time for a night. Calculates duration automatically.
    """
    if request.method == 'POST':
        form = SleepLogForm(request.POST, user=request.user)
        if form.is_valid():
            log = form.save()
            goal_msg = "Goal achieved! 🎯" if log.is_goal_met else "Below target goal."
            messages.success(
                request,
                f"Sleep entry logged for {log.sleep_date}! "
                f"Duration: {log.formatted_duration}. {goal_msg}"
            )
            return redirect('sleep_tracking:history')
        else:
            messages.error(request, "Please correct the errors below.")
    else:
        # Prepopulate with a helpful default (e.g. yesterday 11 PM to today 7 AM)
        form = SleepLogForm(user=request.user)

    user_tags = Tag.objects.filter(user=request.user).order_by('name')
    context = {
        'form': form,
        'user_tags': user_tags,
        'is_edit': False,
    }
    return render(request, 'sleep_tracking/sleep_log_form.html', context)


@login_required
def sleep_log_update_view(request, pk):
    """
    F-05 & BR-19: Edit Sleep Log Entry.
    Must satisfy all business rules and updates updated_at.
    """
    log = get_object_or_404(SleepLog, pk=pk, user=request.user)

    if request.method == 'POST':
        form = SleepLogForm(request.POST, instance=log, user=request.user)
        if form.is_valid():
            log = form.save()
            messages.success(
                request,
                f"Sleep log for {log.sleep_date} updated successfully! "
                f"New duration: {log.formatted_duration}."
            )
            return redirect('sleep_tracking:history')
        else:
            messages.error(request, "Please correct the errors below.")
    else:
        form = SleepLogForm(instance=log, user=request.user)

    context = {
        'form': form,
        'log': log,
        'is_edit': True,
    }
    return render(request, 'sleep_tracking/sleep_log_form.html', context)


@login_required
def sleep_log_delete_view(request, pk):
    """
    F-05 & BR-19: Deleting an entry requires user confirmation and is permanent.
    """
    log = get_object_or_404(SleepLog, pk=pk, user=request.user)

    if request.method == 'POST':
        date_str = str(log.sleep_date)
        duration_str = log.formatted_duration
        log.delete()
        messages.success(request, f"Permanently deleted sleep log for {date_str} ({duration_str}).")
        return redirect('sleep_tracking:history')

    return render(request, 'sleep_tracking/sleep_log_confirm_delete.html', {'log': log})


@login_required
def sleep_history_view(request):
    """
    F-05 & F-11: Sleep History browsable list and calendar view with search & multi-filter.
    Enforces BR-24 (keyword, date range, duration range, goal status, tag filters combine with AND).
    Enforces BR-25 (start date must not be later than end date).
    """
    qs = SleepLog.objects.filter(user=request.user).prefetch_related('tags')

    # Filter parameters
    q = request.GET.get('q', '').strip()
    tag_id = request.GET.get('tag', '').strip()
    goal_status = request.GET.get('goal_status', '').strip()
    start_date_str = request.GET.get('start_date', '').strip()
    end_date_str = request.GET.get('end_date', '').strip()
    min_hours = request.GET.get('min_hours', '').strip()
    max_hours = request.GET.get('max_hours', '').strip()
    view_mode = request.GET.get('view', 'list').strip()  # 'list' or 'calendar'

    # BR-24: Search matches entry note and tag names, case-insensitive
    if q:
        qs = qs.filter(Q(note__icontains=q) | Q(tags__name__icontains=q)).distinct()

    # Tag filter
    if tag_id and tag_id.isdigit():
        qs = qs.filter(tags__id=int(tag_id))

    # BR-25: In any date range filter, the start date must not be later than end date
    start_date = None
    end_date = None
    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        except ValueError:
            pass
    if end_date_str:
        try:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            pass

    if start_date and end_date and start_date > end_date:
        messages.error(request, "Start date cannot be later than end date (BR-25).")
    else:
        if start_date:
            qs = qs.filter(sleep_date__gte=start_date)
        if end_date:
            qs = qs.filter(sleep_date__lte=end_date)

    # Duration filters
    if min_hours:
        try:
            min_mins = int(float(min_hours) * 60)
            qs = qs.filter(duration_minutes__gte=min_mins)
        except ValueError:
            pass

    if max_hours:
        try:
            max_mins = int(float(max_hours) * 60)
            qs = qs.filter(duration_minutes__lte=max_mins)
        except ValueError:
            pass

    # BR-24: Sorted newest first
    qs = qs.order_by('-sleep_date', '-wake_time')

    # Post-filter for goal status if requested (requires computing dynamic target_goal)
    entries = list(qs)
    if goal_status == 'met':
        entries = [e for e in entries if e.is_goal_met]
    elif goal_status == 'not_met':
        entries = [e for e in entries if not e.is_goal_met]

    # Calendar data JSON for calendar view
    calendar_events = []
    for entry in entries:
        calendar_events.append({
            'title': f"{entry.formatted_duration}" + (" ★" if entry.is_goal_met else ""),
            'start': str(entry.sleep_date),
            'goal_met': entry.is_goal_met,
            'duration_hours': float(entry.duration_hours),
            'url': f"/sleep/{entry.pk}/edit/",
            'color': '#ffd166' if entry.is_goal_met else '#708090',
            'note': entry.note or '',
        })

    # Pagination for list view (10 per page)
    paginator = Paginator(entries, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    user_tags = Tag.objects.filter(user=request.user).order_by('name')

    context = {
        'page_obj': page_obj,
        'entries_count': len(entries),
        'user_tags': user_tags,
        'calendar_events_json': json.dumps(calendar_events),
        'view_mode': view_mode,
        'filter_params': {
            'q': q,
            'tag': tag_id,
            'goal_status': goal_status,
            'start_date': start_date_str,
            'end_date': end_date_str,
            'min_hours': min_hours,
            'max_hours': max_hours,
        }
    }
    return render(request, 'sleep_tracking/sleep_history.html', context)


@login_required
def tag_management_view(request):
    """
    F-12 & BR-20 to BR-23: Tag Management.
    Create, list, and delete personal tags.
    """
    if request.method == 'POST':
        form = TagForm(request.POST, user=request.user)
        if form.is_valid():
            tag = form.save()
            messages.success(request, f'Tag "{tag.name}" created successfully!')
            return redirect('sleep_tracking:tags')
        else:
            messages.error(request, form.errors.get('name', ['Error creating tag'])[0])
    else:
        form = TagForm(user=request.user)

    tags = Tag.objects.filter(user=request.user).annotate(
        entry_count=Count('sleep_logs')
    ).order_by('name')

    context = {
        'form': form,
        'tags': tags,
    }
    return render(request, 'sleep_tracking/tag_management.html', context)


@login_required
@require_POST
def tag_delete_view(request, pk):
    """
    F-12 & BR-23: Deleting a tag removes it from all entries but keeps the entries.
    """
    tag = get_object_or_404(Tag, pk=pk, user=request.user)
    name = tag.name
    tag.delete()
    messages.success(request, f'Tag "{name}" deleted. Associated sleep logs remain intact.')
    return redirect('sleep_tracking:tags')


@login_required
def sleep_goal_view(request):
    """
    F-08 & F-09: Profile Sleep Goal setting.
    Enforces BR-14 and BR-15 (creates new goal record with effective date).
    """
    current_goal_hours = SleepGoal.get_goal_for_date(request.user, timezone.localdate())

    if request.method == 'POST':
        form = SleepGoalForm(request.POST, user=request.user)
        if form.is_valid():
            goal = form.save()
            messages.success(
                request,
                f"Sleep goal updated to {goal.target_hours} hours effective from {goal.effective_from}."
            )
            return redirect('sleep_tracking:goal')
        else:
            messages.error(request, "Please correct the errors in the goal form.")
    else:
        form = SleepGoalForm(user=request.user, initial={
            'target_hours': f"{current_goal_hours:.1f}",
            'effective_from': timezone.localdate().isoformat()
        })

    goal_history = SleepGoal.objects.filter(user=request.user).order_by('-effective_from', '-created_at')

    context = {
        'form': form,
        'current_goal_hours': current_goal_hours,
        'goal_history': goal_history,
    }
    return render(request, 'sleep_tracking/sleep_goal.html', context)


@login_required
def sleep_summary_report_view(request):
    """
    F-13 & BR-26: Sleep Summary Report for a chosen date range (7 to 90 days).
    Shows number of nights logged, average, shortest, and longest sleep, goal-met rate,
    and average sleep per tag, or 'No data' if the range has no entries.
    """
    today = timezone.localdate()
    range_days = request.GET.get('days', '7')
    try:
        range_days = int(range_days)
        # BR-26: selected range of 7 to 90 days
        if range_days < 7 or range_days > 90:
            range_days = 7
    except ValueError:
        range_days = 7

    start_date = today - timedelta(days=range_days - 1)
    end_date = today

    custom_start = request.GET.get('custom_start')
    custom_end = request.GET.get('custom_end')
    if custom_start and custom_end:
        try:
            cs = datetime.strptime(custom_start, '%Y-%m-%d').date()
            ce = datetime.strptime(custom_end, '%Y-%m-%d').date()
            if cs <= ce:
                diff = (ce - cs).days + 1
                if 7 <= diff <= 90:
                    start_date = cs
                    end_date = ce
                    range_days = diff
                else:
                    messages.warning(request, "Custom date range must be between 7 and 90 days.")
            else:
                messages.error(request, "Start date cannot be later than end date.")
        except ValueError:
            pass

    logs = SleepLog.objects.filter(
        user=request.user,
        sleep_date__gte=start_date,
        sleep_date__lte=end_date
    ).prefetch_related('tags').order_by('sleep_date')

    total_nights = logs.count()

    if total_nights > 0:
        agg = logs.aggregate(
            avg_mins=Avg('duration_minutes'),
            min_mins=Min('duration_minutes'),
            max_mins=Max('duration_minutes')
        )
        avg_mins = round(agg['avg_mins'] or 0)
        min_mins = agg['min_mins'] or 0
        max_mins = agg['max_mins'] or 0

        # Goal met rate (BR-16)
        goals_met_count = sum(1 for log in logs if log.is_goal_met)
        goal_met_rate = round((goals_met_count / total_nights) * 100, 1)

        # Average sleep per tag
        tag_averages = []
        user_tags = Tag.objects.filter(user=request.user)
        for tag in user_tags:
            tag_logs = [l for l in logs if tag in l.tags.all()]
            if tag_logs:
                t_avg = round(sum(l.duration_minutes for l in tag_logs) / len(tag_logs))
                tag_averages.append({
                    'name': tag.name,
                    'count': len(tag_logs),
                    'avg_formatted': f"{t_avg // 60}h {t_avg % 60:02d}m",
                    'avg_hours': round(t_avg / 60.0, 1),
                })

        report_data = {
            'has_data': True,
            'total_nights': total_nights,
            'avg_formatted': f"{avg_mins // 60}h {avg_mins % 60:02d}m",
            'avg_hours': round(avg_mins / 60.0, 2),
            'min_formatted': f"{min_mins // 60}h {min_mins % 60:02d}m",
            'max_formatted': f"{max_mins // 60}h {max_mins % 60:02d}m",
            'goals_met_count': goals_met_count,
            'goal_met_rate': goal_met_rate,
            'tag_averages': tag_averages,
        }
    else:
        report_data = {
            'has_data': False,
        }

    context = {
        'range_days': range_days,
        'start_date': start_date,
        'end_date': end_date,
        'report': report_data,
    }
    return render(request, 'sleep_tracking/sleep_summary_report.html', context)


@login_required
def sleep_trend_api(request):
    """
    F-07 & BR-18: Weekly Trend Chart API (selectable 7 to 30 days, default 7).
    Days without an entry appear as null/gaps, not as zero hours.
    """
    days = request.GET.get('days', '7')
    try:
        days = int(days)
        if days < 7 or days > 30:
            days = 7
    except ValueError:
        days = 7

    today = timezone.localdate()
    start_date = today - timedelta(days=days - 1)

    # Fetch user logs in range
    logs = {
        log.sleep_date: log
        for log in SleepLog.objects.filter(
            user=request.user,
            sleep_date__gte=start_date,
            sleep_date__lte=today
        )
    }

    labels = []
    durations = []
    goals = []

    current = start_date
    while current <= today:
        labels.append(current.strftime('%b %d'))
        goal_for_day = float(SleepGoal.get_goal_for_date(request.user, current))
        goals.append(goal_for_day)

        if current in logs:
            durations.append(float(logs[current].duration_hours))
        else:
            # BR-18: days without an entry appear as gaps (None/null), not as zero hours
            durations.append(None)
        current += timedelta(days=1)

    return JsonResponse({
        'labels': labels,
        'durations': durations,
        'goals': goals,
    })
