from django.contrib import admin
from .models import Achievement, UserAchievement


@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'icon', 'category', 'active', 'reward_xp']
    list_filter = ['category', 'active', 'created_at']
    search_fields = ['code', 'name']
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
        }),
        ('Status', {
            'fields': ('active',),
        }),
    )


@admin.register(UserAchievement)
class UserAchievementAdmin(admin.ModelAdmin):
    list_display = ['user', 'achievement', 'unlocked_at', 'seen']
    list_filter = ['achievement__category', 'seen', 'unlocked_at']
    search_fields = ['user__email', 'achievement__code']
    readonly_fields = ['unlocked_at']

    fieldsets = (
        ('Achievement', {
            'fields': ('user', 'achievement'),
        }),
        ('Status', {
            'fields': ('unlocked_at', 'seen'),
        }),
    )
