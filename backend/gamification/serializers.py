"""
Serializers for achievement API endpoints.
"""

from rest_framework import serializers
from .models import Achievement, UserAchievement


class AchievementSerializer(serializers.ModelSerializer):
    """
    Serializer for Achievement templates.

    Used for GET /api/achievements/ endpoint to list all available achievements.
    """

    class Meta:
        model = Achievement
        fields = [
            'id',
            'code',
            'name',
            'description',
            'icon',
            'category',
            'reward_xp',
            'order',
        ]
        read_only_fields = fields

    def to_representation(self, instance):
        """Add computed fields to response."""
        data = super().to_representation(instance)
        # Include condition in representation for UI hints
        data['condition'] = instance.condition
        return data


class UserAchievementSerializer(serializers.ModelSerializer):
    """
    Serializer for UserAchievement unlock records.

    Used for GET /api/user/achievements/ endpoint to list user's unlocked achievements.
    Includes nested achievement details.
    """

    achievement = AchievementSerializer(read_only=True)
    unlocked_at = serializers.DateTimeField(format='iso-8601')

    class Meta:
        model = UserAchievement
        fields = [
            'id',
            'achievement',
            'unlocked_at',
            'seen',
        ]
        read_only_fields = ['id', 'achievement', 'unlocked_at']

    def to_representation(self, instance):
        """Add computed fields to response."""
        data = super().to_representation(instance)
        # Calculate days_ago for frontend display
        from django.utils import timezone
        from datetime import timedelta

        days_ago = (timezone.now() - instance.unlocked_at).days
        data['days_ago'] = days_ago

        return data
