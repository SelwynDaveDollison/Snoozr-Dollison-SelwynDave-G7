from django.urls import path
from . import views

app_name = 'sleep_tracking'

urlpatterns = [
    path('new/', views.sleep_log_create_view, name='log_create'),
    path('history/', views.sleep_history_view, name='history'),
    path('<int:pk>/edit/', views.sleep_log_update_view, name='log_update'),
    path('<int:pk>/delete/', views.sleep_log_delete_view, name='log_delete'),
    path('tags/', views.tag_management_view, name='tags'),
    path('tags/<int:pk>/delete/', views.tag_delete_view, name='tag_delete'),
    path('goal/', views.sleep_goal_view, name='goal'),
    path('report/', views.sleep_summary_report_view, name='report'),
    path('api/trend/', views.sleep_trend_api, name='trend_api'),
]
