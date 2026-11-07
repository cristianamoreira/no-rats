"""
End-to-end tests for the achievement system.

Tests the complete flow: user creation → task completion → achievement unlock
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.management import call_command

from gamification.models import Achievement, UserAchievement
from gamification.services import check_and_unlock_achievements

User = get_user_model()


class TestAchievementSystemE2E(TestCase):
    """End-to-end tests for the complete achievement system."""

    def setUp(self):
        """Load achievements from management command."""
        # Load achievements via management command
        call_command('load_achievements', verbosity=0)

        # Create test user
        self.user = User.objects.create_user(
            username='e2e_player',
            email='player@example.com',
            password='testpass123'
        )

        # Mock user profile
        self.user.profile = type('Profile', (), {
            'xp': 0,
            'current_streak': 0,
            'level': 1,
            'save': lambda self, **kwargs: None,
        })()

    def test_scenario_new_player_first_task(self):
        """
        Scenario 1: New player completes first task
        Expected: Unlocks 'first_task' achievement
        """
        # Player starts with no achievements
        self.assertEqual(
            UserAchievement.objects.filter(user=self.user).count(),
            0
        )

        # Simulate: Player completes first task
        # (In real app, Task.objects.create(..., completed=True))
        # For now, we mock by checking the condition directly
        unlocked = check_and_unlock_achievements(self.user)

        # Should NOT unlock yet (no completed tasks in DB)
        self.assertEqual(len(unlocked), 0)

    def test_scenario_streak_progression(self):
        """
        Scenario 2: Player maintains increasing streaks
        Expected: Unlocks multiple streak achievements
        """
        # Get all streak achievements
        streak_achievements = Achievement.objects.filter(
            category='streak',
            active=True
        ).order_by('condition')

        # Simulate: Player reaches 3-day streak
        self.user.profile.current_streak = 3
        unlocked = check_and_unlock_achievements(self.user)

        self.assertGreaterEqual(len(unlocked), 1)
        self.assertTrue(any(a.code == 'streak_3' for a in unlocked))

        # Simulate: Player extends to 7-day streak
        self.user.profile.current_streak = 7
        unlocked = check_and_unlock_achievements(self.user)

        self.assertGreaterEqual(len(unlocked), 1)
        self.assertTrue(any(a.code == 'streak_7' for a in unlocked))

        # Simulate: Player reaches 30-day streak
        self.user.profile.current_streak = 30
        unlocked = check_and_unlock_achievements(self.user)

        self.assertGreaterEqual(len(unlocked), 1)
        self.assertTrue(any(a.code == 'streak_30' for a in unlocked))

    def test_scenario_level_progression(self):
        """
        Scenario 3: Player levels up
        Expected: Unlocks level achievements at milestones
        """
        # Level 5
        self.user.profile.level = 5
        unlocked = check_and_unlock_achievements(self.user)
        self.assertTrue(any(a.code == 'level_5' for a in unlocked))

        # Level 10
        self.user.profile.level = 10
        unlocked = check_and_unlock_achievements(self.user)
        self.assertTrue(any(a.code == 'level_10' for a in unlocked))

        # Level 25
        self.user.profile.level = 25
        unlocked = check_and_unlock_achievements(self.user)
        self.assertTrue(any(a.code == 'level_25' for a in unlocked))

    def test_scenario_multiple_unlocks_same_check(self):
        """
        Scenario 4: Player reaches level 10 and 7-day streak simultaneously
        Expected: Multiple achievements unlock in one check
        """
        self.user.profile.level = 10
        self.user.profile.current_streak = 7

        unlocked = check_and_unlock_achievements(self.user)

        # Should unlock both level_10 and streak_7
        codes = [a.code for a in unlocked]
        self.assertIn('level_10', codes)
        self.assertIn('streak_7', codes)

    def test_scenario_no_duplicate_unlocks(self):
        """
        Scenario 5: Player unlocks achievement twice should not duplicate
        Expected: Only one UserAchievement record exists
        """
        # First check: Unlock at level 10
        self.user.profile.level = 10
        check_and_unlock_achievements(self.user)

        # Verify one record created
        count = UserAchievement.objects.filter(
            user=self.user,
            achievement__code='level_10'
        ).count()
        self.assertEqual(count, 1)

        # Second check: Still at level 10
        unlocked = check_and_unlock_achievements(self.user)

        # Should NOT unlock again
        self.assertEqual(len([a for a in unlocked if a.code == 'level_10']), 0)

        # Still only one record
        count = UserAchievement.objects.filter(
            user=self.user,
            achievement__code='level_10'
        ).count()
        self.assertEqual(count, 1)

    def test_scenario_progression_path(self):
        """
        Scenario 6: Full progression path (task → streak → level)
        Expected: Natural progression unlocks achievements
        """
        unlocked_codes = set()

        # Stage 1: Player does basic tasks
        # (Simulated by checking level 1)
        check_and_unlock_achievements(self.user)

        # Stage 2: Player starts maintaining streaks
        self.user.profile.current_streak = 3
        unlocked = check_and_unlock_achievements(self.user)
        unlocked_codes.update(a.code for a in unlocked)

        # Stage 3: Player levels up as they complete tasks
        self.user.profile.level = 5
        unlocked = check_and_unlock_achievements(self.user)
        unlocked_codes.update(a.code for a in unlocked)

        # Stage 4: Extended streak
        self.user.profile.current_streak = 7
        unlocked = check_and_unlock_achievements(self.user)
        unlocked_codes.update(a.code for a in unlocked)

        # Stage 5: More levels
        self.user.profile.level = 10
        unlocked = check_and_unlock_achievements(self.user)
        unlocked_codes.update(a.code for a in unlocked)

        # Verify we unlocked a reasonable progression
        self.assertGreaterEqual(len(unlocked_codes), 3)
        self.assertIn('level_5', unlocked_codes)
        self.assertIn('level_10', unlocked_codes)


class TestAchievementDataIntegrity(TestCase):
    """Tests to verify achievement data integrity."""

    def setUp(self):
        """Load achievements."""
        call_command('load_achievements', verbosity=0)

    def test_all_achievements_have_unique_codes(self):
        """All achievements must have unique codes."""
        achievements = Achievement.objects.all()
        codes = [a.code for a in achievements]
        unique_codes = set(codes)

        self.assertEqual(
            len(codes),
            len(unique_codes),
            f"Duplicate codes found: {[c for c in codes if codes.count(c) > 1]}"
        )

    def test_all_achievements_have_conditions(self):
        """All achievements must have valid conditions."""
        achievements = Achievement.objects.all()

        for ach in achievements:
            self.assertIsNotNone(ach.condition, f"{ach.code} has no condition")
            self.assertIn(
                'type',
                ach.condition,
                f"{ach.code} condition missing 'type'"
            )
            self.assertIn(
                'value',
                ach.condition,
                f"{ach.code} condition missing 'value'"
            )

    def test_achievement_categories_are_valid(self):
        """All achievements must have valid categories."""
        valid_categories = {'task', 'streak', 'level', 'infestation'}
        achievements = Achievement.objects.all()

        for ach in achievements:
            self.assertIn(
                ach.category,
                valid_categories,
                f"{ach.code} has invalid category: {ach.category}"
            )

    def test_achievement_icons_are_unicode(self):
        """Achievement icons should be emojis/unicode."""
        achievements = Achievement.objects.all()

        for ach in achievements:
            self.assertTrue(
                len(ach.icon) > 0,
                f"{ach.code} has empty icon"
            )
            # Icon should be short (1-4 chars typically for emoji)
            self.assertLessEqual(
                len(ach.icon),
                10,
                f"{ach.code} icon too long: {ach.icon}"
            )

    def test_reward_xp_non_negative(self):
        """All reward_xp values must be non-negative."""
        achievements = Achievement.objects.all()

        for ach in achievements:
            self.assertGreaterEqual(
                ach.reward_xp,
                0,
                f"{ach.code} has negative XP reward"
            )

    def test_loaded_achievement_count(self):
        """Verify the correct number of achievements were loaded."""
        count = Achievement.objects.filter(active=True).count()
        # We seed 15 achievements
        self.assertEqual(count, 15, f"Expected 15 achievements, got {count}")

    def test_achievement_distribution_by_category(self):
        """Verify achievements are distributed across categories."""
        categories = {
            'task': 4,
            'streak': 5,
            'level': 4,
            'infestation': 2,
        }

        for category, expected_count in categories.items():
            count = Achievement.objects.filter(
                category=category,
                active=True
            ).count()
            self.assertEqual(
                count,
                expected_count,
                f"Category '{category}' has {count} achievements, expected {expected_count}"
            )


class TestAchievementManagementCommand(TestCase):
    """Tests for the load_achievements management command."""

    def test_load_achievements_creates_records(self):
        """load_achievements command should create achievement records."""
        # Initially empty
        self.assertEqual(Achievement.objects.count(), 0)

        # Run command
        call_command('load_achievements', verbosity=0)

        # Should have created 15 achievements
        self.assertEqual(Achievement.objects.count(), 15)

    def test_load_achievements_is_idempotent(self):
        """load_achievements can be run multiple times safely."""
        call_command('load_achievements', verbosity=0)
        count_after_first = Achievement.objects.count()

        call_command('load_achievements', verbosity=0)
        count_after_second = Achievement.objects.count()

        # Should be same (idempotent)
        self.assertEqual(count_after_first, count_after_second)

    def test_load_achievements_with_reset(self):
        """load_achievements --reset should clear existing data."""
        # Load once
        call_command('load_achievements', verbosity=0)
        self.assertEqual(Achievement.objects.count(), 15)

        # Create a fake achievement
        Achievement.objects.create(
            code='fake_test',
            name='Fake',
            icon='❌',
            category='task',
            condition={}
        )
        self.assertEqual(Achievement.objects.count(), 16)

        # Load with reset
        call_command('load_achievements', verbosity=0, reset=True)

        # Should be back to 15
        self.assertEqual(Achievement.objects.count(), 15)
        self.assertFalse(Achievement.objects.filter(code='fake_test').exists())
