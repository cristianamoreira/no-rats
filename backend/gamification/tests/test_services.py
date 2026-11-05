"""
Tests for achievement unlock service.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model

from gamification.models import Achievement, UserAchievement
from gamification.services import (
    check_and_unlock_achievements,
    get_user_achievement_stats,
    get_user_achievement_progress,
)

User = get_user_model()


class TestAchievementUnlock(TestCase):
    """Test basic achievement unlock logic."""

    def setUp(self):
        """Create test user and achievement."""
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@example.com',
            password='testpass123'
        )
        # Mock user profile for tests
        self.user.profile = type('Profile', (), {
            'xp': 0,
            'current_streak': 0,
            'level': 1,
            'save': lambda *args, **kwargs: None,
        })()

    def test_no_achievements_unlocked_on_empty_user(self):
        """New user with no achievements should return empty list."""
        Achievement.objects.create(
            code='first_task',
            name='First Task',
            description='Complete first task',
            icon='✅',
            category='task',
            condition={'type': 'task_completed_count', 'value': 1},
        )

        unlocked = check_and_unlock_achievements(self.user)

        self.assertEqual(len(unlocked), 0)
        self.assertFalse(
            UserAchievement.objects.filter(user=self.user).exists()
        )

    def test_achievement_unlocked_on_condition_met(self):
        """Achievement should unlock when condition is met."""
        # This test is limited because Task model doesn't exist yet
        # But we can test with streak which uses profile
        ach = Achievement.objects.create(
            code='week_warrior',
            name='Week Warrior',
            description='Reach 7-day streak',
            icon='🔥',
            category='streak',
            condition={'type': 'streak_reached', 'value': 7},
            reward_xp=75,
        )

        # Set user's streak
        self.user.profile.current_streak = 7

        # Unlock achievements
        unlocked = check_and_unlock_achievements(self.user)

        # Check result
        self.assertEqual(len(unlocked), 1)
        self.assertEqual(unlocked[0].code, 'week_warrior')

        # Verify unlock record created
        ua = UserAchievement.objects.get(user=self.user, achievement=ach)
        self.assertIsNotNone(ua.unlocked_at)
        self.assertFalse(ua.seen)

    def test_achievement_not_unlocked_twice(self):
        """Achievement should not be unlocked twice for same user."""
        ach = Achievement.objects.create(
            code='level_5',
            name='Level 5',
            description='Reach level 5',
            icon='⬆️',
            category='level',
            condition={'type': 'level_reached', 'value': 5},
        )

        # First time
        self.user.profile.level = 5
        unlocked1 = check_and_unlock_achievements(self.user)
        self.assertEqual(len(unlocked1), 1)

        # Second time (user still at level 5)
        unlocked2 = check_and_unlock_achievements(self.user)
        self.assertEqual(len(unlocked2), 0)

        # Only one UserAchievement record should exist
        count = UserAchievement.objects.filter(
            user=self.user,
            achievement=ach
        ).count()
        self.assertEqual(count, 1)

    def test_multiple_achievements_unlocked(self):
        """Multiple achievements can be unlocked in one call."""
        ach1 = Achievement.objects.create(
            code='level_5',
            name='Level 5',
            icon='⬆️',
            category='level',
            condition={'type': 'level_reached', 'value': 5},
        )
        ach2 = Achievement.objects.create(
            code='level_10',
            name='Level 10',
            icon='💪',
            category='level',
            condition={'type': 'level_reached', 'value': 10},
        )

        # User reaches level 10 (meets both conditions)
        self.user.profile.level = 10

        unlocked = check_and_unlock_achievements(self.user)

        self.assertEqual(len(unlocked), 2)
        self.assertTrue(any(a.code == 'level_5' for a in unlocked))
        self.assertTrue(any(a.code == 'level_10' for a in unlocked))

    def test_inactive_achievements_not_unlocked(self):
        """Inactive achievements should not be unlocked."""
        ach = Achievement.objects.create(
            code='inactive_ach',
            name='Inactive',
            icon='❌',
            category='task',
            condition={'type': 'level_reached', 'value': 1},
            active=False,  # Inactive
        )

        self.user.profile.level = 1
        unlocked = check_and_unlock_achievements(self.user)

        self.assertEqual(len(unlocked), 0)

    def test_reward_xp_awarded(self):
        """Bonus XP should be awarded on unlock."""
        ach = Achievement.objects.create(
            code='xp_reward',
            name='XP Reward',
            icon='⭐',
            category='task',
            condition={'type': 'level_reached', 'value': 1},
            reward_xp=100,
        )

        initial_xp = self.user.profile.xp
        self.user.profile.level = 1

        check_and_unlock_achievements(self.user)

        # Note: In our mock, save() doesn't actually persist
        # But we can verify the logic is called
        self.assertEqual(self.user.profile.xp, initial_xp + 100)

    def test_invalid_condition_silently_ignored(self):
        """Invalid conditions should not crash the service."""
        # Create achievement with unknown condition type
        ach = Achievement.objects.create(
            code='unknown_condition',
            name='Unknown',
            icon='❓',
            category='task',
            condition={'type': 'unknown_type', 'value': 5},
        )

        # Should not raise exception
        unlocked = check_and_unlock_achievements(self.user)

        self.assertEqual(len(unlocked), 0)


class TestStreakEvaluator(TestCase):
    """Test streak condition evaluator."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='streak_user',
            email='streak@example.com',
            password='pass'
        )
        self.user.profile = type('Profile', (), {
            'current_streak': 0,
        })()

    def test_streak_3(self):
        """Test 3-day streak achievement."""
        ach = Achievement.objects.create(
            code='streak_3',
            name='Getting Started',
            icon='🔥',
            category='streak',
            condition={'type': 'streak_reached', 'value': 3},
        )

        # Below threshold
        self.user.profile.current_streak = 2
        unlocked = check_and_unlock_achievements(self.user)
        self.assertEqual(len(unlocked), 0)

        # At threshold
        self.user.profile.current_streak = 3
        unlocked = check_and_unlock_achievements(self.user)
        self.assertEqual(len(unlocked), 1)

    def test_streak_30(self):
        """Test 30-day streak achievement."""
        ach = Achievement.objects.create(
            code='consistency_king',
            name='Consistency King',
            icon='👑',
            category='streak',
            condition={'type': 'streak_reached', 'value': 30},
            reward_xp=300,
        )

        self.user.profile.current_streak = 30
        self.user.profile.xp = 0
        self.user.profile.save = lambda **kwargs: None

        unlocked = check_and_unlock_achievements(self.user)

        self.assertEqual(len(unlocked), 1)
        self.assertEqual(unlocked[0].reward_xp, 300)


class TestLevelEvaluator(TestCase):
    """Test level condition evaluator."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='level_user',
            email='level@example.com',
            password='pass'
        )
        self.user.profile = type('Profile', (), {
            'level': 1,
        })()

    def test_level_progression(self):
        """Test multiple level achievements."""
        achievements = [
            {'value': 5, 'code': 'level_5'},
            {'value': 10, 'code': 'level_10'},
            {'value': 25, 'code': 'level_25'},
        ]

        for ach_data in achievements:
            Achievement.objects.create(
                code=ach_data['code'],
                name=f"Level {ach_data['value']}",
                icon='⬆️',
                category='level',
                condition={'type': 'level_reached', 'value': ach_data['value']},
            )

        # At level 5
        self.user.profile.level = 5
        unlocked = check_and_unlock_achievements(self.user)
        self.assertEqual(len(unlocked), 1)
        self.assertEqual(unlocked[0].code, 'level_5')

        # At level 10
        self.user.profile.level = 10
        unlocked = check_and_unlock_achievements(self.user)
        self.assertEqual(len(unlocked), 1)
        self.assertEqual(unlocked[0].code, 'level_10')

        # At level 25
        self.user.profile.level = 25
        unlocked = check_and_unlock_achievements(self.user)
        self.assertEqual(len(unlocked), 1)
        self.assertEqual(unlocked[0].code, 'level_25')


class TestHelperFunctions(TestCase):
    """Test helper functions for stats and progress."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='helper_user',
            email='helper@example.com',
            password='pass'
        )

    def test_get_user_achievement_stats(self):
        """Test achievement statistics aggregation."""
        # Create and unlock some achievements
        ach1 = Achievement.objects.create(
            code='task_ach',
            name='Task',
            icon='✅',
            category='task',
            condition={'type': 'task_completed_count', 'value': 1},
        )
        ach2 = Achievement.objects.create(
            code='streak_ach',
            name='Streak',
            icon='🔥',
            category='streak',
            condition={'type': 'streak_reached', 'value': 1},
        )

        # Manually create unlock records
        UserAchievement.objects.create(user=self.user, achievement=ach1)
        UserAchievement.objects.create(user=self.user, achievement=ach2)

        stats = get_user_achievement_stats(self.user)

        self.assertEqual(stats['total_unlocked'], 2)
        self.assertEqual(stats['by_category']['task'], 1)
        self.assertEqual(stats['by_category']['streak'], 1)
        self.assertEqual(len(stats['recent']), 2)

    def test_get_user_achievement_progress(self):
        """Test progress calculation toward locked achievements."""
        ach1 = Achievement.objects.create(
            code='level_10',
            name='Level 10',
            icon='💪',
            category='level',
            condition={'type': 'level_reached', 'value': 10},
        )

        # Mock profile
        self.user.profile = type('Profile', (), {
            'level': 5,
        })()

        progress = get_user_achievement_progress(self.user)

        self.assertIn('level_10', progress)
        self.assertEqual(progress['level_10']['current'], 5)
        self.assertEqual(progress['level_10']['required'], 10)
        self.assertEqual(progress['level_10']['percentage'], 50)

    def test_progress_empty_for_unlocked(self):
        """Progress should not include already unlocked achievements."""
        ach = Achievement.objects.create(
            code='unlocked_ach',
            name='Already Unlocked',
            icon='✅',
            category='task',
            condition={'type': 'task_completed_count', 'value': 1},
        )

        # Mark as unlocked
        UserAchievement.objects.create(user=self.user, achievement=ach)

        progress = get_user_achievement_progress(self.user)

        self.assertNotIn('unlocked_ach', progress)
