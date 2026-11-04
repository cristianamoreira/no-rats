from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

User = get_user_model()


def validate_condition(value):
    """Validate achievement condition format."""
    if not isinstance(value, dict):
        raise ValidationError("Condition must be a dictionary.")

    required_keys = {'type', 'value'}
    if not required_keys.issubset(value.keys()):
        raise ValidationError(
            f"Condition must contain keys: {', '.join(required_keys)}. "
            f"Got: {', '.join(value.keys())}"
        )

    valid_types = {
        'task_completed_count',
        'streak_reached',
        'level_reached',
        'zero_infestation_days',
    }
    if value['type'] not in valid_types:
        raise ValidationError(
            f"Condition type must be one of: {', '.join(valid_types)}. "
            f"Got: {value['type']}"
        )

    if not isinstance(value['value'], (int, float)) or value['value'] < 0:
        raise ValidationError("Condition value must be a non-negative number.")


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
        max_length=255,
        help_text="Emoji or URL to icon image"
    )
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES
    )
    condition = models.JSONField(
        default=dict,
        validators=[validate_condition],
        help_text='JSON: {"type": "task_completed_count|streak_reached|level_reached|zero_infestation_days", "value": <number>}'
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

    def clean(self):
        """Validate condition on save."""
        super().clean()
        validate_condition(self.condition)

    def __str__(self):
        return f"{self.code} - {self.name}"


class UserAchievement(models.Model):
    """User unlock log — immutable record of achievement unlocks."""

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
    seen = models.BooleanField(
        default=False,
        help_text="Has user dismissed the notification?"
    )

    class Meta:
        db_table = 'user_achievements'
        ordering = ['-unlocked_at']
        indexes = [
            models.Index(fields=['user', 'unlocked_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'achievement'],
                name='user_achievement_unique'
            ),
        ]

    def __str__(self):
        return f"{self.user.name} - {self.achievement.name}"
