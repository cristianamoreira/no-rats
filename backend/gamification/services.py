"""
Achievement unlock service.

This module contains the logic for checking and unlocking achievements
when users complete tasks or reach milestones.
"""

from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model

from .models import Achievement, UserAchievement

User = get_user_model()


def check_and_unlock_achievements(user):
    """
    Check all active achievements and unlock any that match user's current stats.

    This function should be called after every task completion or whenever
    user stats change (streak update, level up, etc).

    Args:
        user: User instance to check achievements for

    Returns:
        list: List of newly unlocked Achievement instances (for notifications)

    Example:
        >>> from django.contrib.auth import get_user_model
        >>> User = get_user_model()
        >>> user = User.objects.get(id=1)
        >>> newly_unlocked = check_and_unlock_achievements(user)
        >>> for ach in newly_unlocked:
        ...     print(f"🏆 Unlocked: {ach.name}")
    """
    newly_unlocked = []

    # Fetch all active achievements not yet unlocked by this user
    locked_achievements = Achievement.objects.filter(
        active=True
    ).exclude(
        user_records__user=user
    ).distinct()

    for achievement in locked_achievements:
        if _should_unlock(user, achievement):
            # Create unlock record
            user_ach, created = UserAchievement.objects.get_or_create(
                user=user,
                achievement=achievement,
            )

            if created:
                newly_unlocked.append(achievement)

                # Award bonus XP if any
                if achievement.reward_xp > 0:
                    try:
                        profile = user.profile
                        profile.xp += achievement.reward_xp
                        profile.save(update_fields=['xp'])
                    except AttributeError:
                        # Profile doesn't exist yet (user not fully initialized)
                        pass

    return newly_unlocked


def _should_unlock(user, achievement):
    """
    Evaluate if user meets achievement unlock condition.

    Args:
        user: User instance
        achievement: Achievement instance with condition to evaluate

    Returns:
        bool: True if user meets the condition, False otherwise
    """
    condition = achievement.condition
    if not condition:
        return False

    cond_type = condition.get('type')
    cond_value = condition.get('value')

    # Map condition types to evaluator functions
    evaluators = {
        'task_completed_count': _eval_task_completed_count,
        'streak_reached': _eval_streak_reached,
        'level_reached': _eval_level_reached,
        'zero_infestation_days': _eval_zero_infestation_days,
    }

    evaluator = evaluators.get(cond_type)
    if not evaluator:
        return False

    try:
        return evaluator(user, cond_value)
    except Exception as e:
        # Log silently if evaluator fails (probably missing data)
        print(f"Warning: Achievement evaluator failed for {achievement.code}: {e}")
        return False


# ============ Condition Evaluators ============


def _eval_task_completed_count(user, value):
    """
    Check if user has completed N or more tasks.

    Args:
        user: User instance
        value: Number of completed tasks required

    Returns:
        bool: True if user has completed >= value tasks
    """
    # Note: Requires Task model to exist in tasks app
    # For now, return False to avoid import errors
    try:
        from tasks.models import Task
        count = Task.objects.filter(
            user=user,
            completed=True
        ).count()
        return count >= value
    except ImportError:
        # Task model not implemented yet
        return False


def _eval_streak_reached(user, value):
    """
    Check if user has reached N or more day streak.

    Args:
        user: User instance
        value: Number of consecutive days required

    Returns:
        bool: True if user's current streak >= value
    """
    # Note: Requires user.profile.current_streak to exist
    try:
        profile = user.profile
        return profile.current_streak >= value
    except AttributeError:
        # Profile doesn't exist yet
        return False


def _eval_level_reached(user, value):
    """
    Check if user has reached level N or higher.

    Args:
        user: User instance
        value: Level number required

    Returns:
        bool: True if user's level >= value
    """
    # Note: Requires user.profile.level to exist
    try:
        profile = user.profile
        return profile.level >= value
    except AttributeError:
        # Profile doesn't exist yet
        return False


def _eval_zero_infestation_days(user, value):
    """
    Check if user has N consecutive days with 0% infestation.

    This is a complex metric that requires daily snapshots of infestation.
    For MVP, we implement a simplified version:
    - Count days in the last N days where no tasks were overdue

    Args:
        user: User instance
        value: Number of days with zero infestation required

    Returns:
        bool: True if user meets the criteria

    TODO:
        Implement full infestation tracking after daily snapshot model exists.
        Current implementation returns False as placeholder.
    """
    # TODO: Implement once infestation tracking is in place
    # For now, return False to avoid errors
    return False


# ============ Helper Functions ============


def get_user_achievement_stats(user):
    """
    Get aggregated achievement stats for a user.

    Useful for dashboards or analytics.

    Args:
        user: User instance

    Returns:
        dict: Statistics about user's achievements
            - total_unlocked: int
            - by_category: dict mapping category to count
            - recent: list of UserAchievement (last 5, ordered by unlock date)
    """
    unlocked = UserAchievement.objects.filter(user=user)

    by_category = {}
    for ach in unlocked.select_related('achievement'):
        cat = ach.achievement.category
        by_category[cat] = by_category.get(cat, 0) + 1

    return {
        'total_unlocked': unlocked.count(),
        'by_category': by_category,
        'recent': list(unlocked.select_related('achievement')[:5]),
    }


def get_user_achievement_progress(user):
    """
    Get progress toward locked achievements (useful for UI hints).

    Args:
        user: User instance

    Returns:
        dict: For each locked achievement, how close user is to unlocking it
            Example:
            {
                'first_task': {'current': 0, 'required': 1, 'percentage': 0},
                'streak_7': {'current': 3, 'required': 7, 'percentage': 43},
            }
    """
    progress = {}

    locked = Achievement.objects.filter(
        active=True
    ).exclude(
        user_records__user=user
    ).distinct()

    for ach in locked:
        if ach.condition.get('type') == 'task_completed_count':
            try:
                from tasks.models import Task
                current = Task.objects.filter(
                    user=user,
                    completed=True
                ).count()
            except ImportError:
                current = 0
        elif ach.condition.get('type') == 'streak_reached':
            try:
                current = user.profile.current_streak
            except AttributeError:
                current = 0
        elif ach.condition.get('type') == 'level_reached':
            try:
                current = user.profile.level
            except AttributeError:
                current = 0
        else:
            current = 0

        required = ach.condition.get('value', 1)
        percentage = min(100, int((current / required) * 100)) if required > 0 else 0

        progress[ach.code] = {
            'current': current,
            'required': required,
            'percentage': percentage,
        }

    return progress
