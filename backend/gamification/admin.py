from django.contrib import admin
from .models import Achievement, UserAchievement


@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'icon', 'category', 'order', 'active', 'reward_xp']
    list_filter = ['category', 'active', 'created_at']
    search_fields = ['code', 'name', 'description']
    ordering = ['category', 'order']

    fieldsets = (
        ('Identifiers', {
            'fields': ('code', 'name', 'icon'),
        }),
        ('Details', {
            'fields': ('description', 'category', 'order'),
        }),
        ('Logic', {
            'fields': ('condition', 'reward_xp'),
            'description': 'Define when this achievement unlocks.',
        }),
        ('Status', {
            'fields': ('active',),
        }),
    )


@admin.register(UserAchievement)
class UserAchievementAdmin(admin.ModelAdmin):
    list_display = ['user', 'achievement', 'unlocked_at', 'seen']
    list_filter = ['achievement__active', 'achievement__category', 'seen', 'unlocked_at']
    search_fields = ['user__email', 'achievement__code', 'achievement__name']
    readonly_fields = ['unlocked_at', 'user', 'achievement']

    fieldsets = (
        ('Achievement', {
            'fields': ('user', 'achievement'),
            'description': 'These fields are immutable (set by the system).',
        }),
        ('Status', {
            'fields': ('unlocked_at', 'seen'),
        }),
    )

    def has_add_permission(self, request):
        """
        UserAchievements should only be created by the achievement unlock service.
        Manual creation in admin is disabled.
        """
        return False

    def has_delete_permission(self, request, obj=None):
        """
        Prevent accidental deletion of achievement history.
        """
        return False

    def has_change_permission(self, request, obj=None):
        """
        Allow only marking achievements as 'seen' (dismissing notification).
        """
        return True
