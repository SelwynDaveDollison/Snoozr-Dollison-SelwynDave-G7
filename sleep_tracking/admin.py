from django.contrib import admin
from .models import SleepGoal, Tag, SleepLog, SleepLogTag


class SleepLogTagInline(admin.TabularInline):
    model = SleepLogTag
    extra = 1


@admin.register(SleepGoal)
class SleepGoalAdmin(admin.ModelAdmin):
    list_display = ('user', 'target_hours', 'effective_from', 'created_at')
    list_filter = ('effective_from', 'target_hours')
    search_fields = ('user__username', 'user__email')


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'created_at')
    search_fields = ('name', 'user__username')
    list_filter = ('created_at',)


@admin.register(SleepLog)
class SleepLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'sleep_date', 'bedtime', 'wake_time', 'duration_minutes', 'is_goal_met', 'created_at')
    list_filter = ('sleep_date',)
    search_fields = ('user__username', 'note')
    inlines = [SleepLogTagInline]


@admin.register(SleepLogTag)
class SleepLogTagAdmin(admin.ModelAdmin):
    list_display = ('log', 'tag')
