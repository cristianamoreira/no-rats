from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Achievement(models.Model):
    """Achievement template — data-driven, extensible."""

    CATEGORY_CHOICES = (
        ('task', 'Tasks'),
        ('streak', 'Streaks'),
        ('level', 'Levels'),
        ('infestation', 'Infestation'),
    )

    code = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Unique identifier: first_task, streak_7, etc"
    )
    name = models.CharField(max_length=150)
    description = models.TextField()
    icon = models.CharField(
        max_length=10,
        help_text="Emoji or URL"
    )
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES
    )
    condition = models.JSONField(
        default=dict,
        help_text='JSON: {"type": "...", "value": ...}'
    )
    reward_xp = models.IntegerField(default=0)
    order = models.IntegerField(default=0)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'achievements'
        ordering = ['category', 'order']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['active']),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"


class UserAchievement(models.Model):
    """User unlock log."""

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='achievements'
    )
    achievement = models.ForeignKey(
        Achievement,
        on_delete=models.CASCADE,
        related_name='user_records'
    )
    unlocked_at = models.DateTimeField(auto_now_add=True, db_index=True)
    seen = models.BooleanField(default=False)

    class Meta:
        db_table = 'user_achievements'
        unique_together = ('user', 'achievement')
        ordering = ['-unlocked_at']
        indexes = [
            models.Index(fields=['user', 'unlocked_at']),
        ]

    def __str__(self):
        return f"{self.user.name} - {self.achievement.name}"
