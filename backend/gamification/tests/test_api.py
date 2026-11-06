"""
Tests for achievement API endpoints.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from gamification.models import Achievement, UserAchievement

User = get_user_model()


class AchievementAPITest(TestCase):
    """Test Achievement endpoints."""

    def setUp(self):
        """Create test data."""
        self.client = APIClient()

        # Create achievements
        self.ach1 = Achievement.objects.create(
            code='first_task',
            name='First Task',
            description='Complete your first task',
            icon='✅',
            category='task',
            condition={'type': 'task_completed_count', 'value': 1},
        )
        self.ach2 = Achievement.objects.create(
            code='week_warrior',
            name='Week Warrior',
            description='Reach 7-day streak',
            icon='🔥',
            category='streak',
            condition={'type': 'streak_reached', 'value': 7},
            reward_xp=75,
        )
        self.ach_inactive = Achievement.objects.create(
            code='inactive',
            name='Inactive',
            description='This is inactive',
            icon='❌',
            category='task',
            condition={},
            active=False,
        )

    def test_list_achievements(self):
        """Test GET /api/achievements/"""
        response = self.client.get('/api/achievements/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)  # Only active achievements

    def test_list_achievements_includes_condition(self):
        """Achievement response includes condition."""
        response = self.client.get('/api/achievements/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        first = response.data[0]
        self.assertIn('condition', first)
        self.assertIn('type', first['condition'])
        self.assertIn('value', first['condition'])

    def test_list_achievements_filter_by_category(self):
        """Test category filter on GET /api/achievements/"""
        response = self.client.get('/api/achievements/?category=streak')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['code'], 'week_warrior')

    def test_list_achievements_categories(self):
        """Test GET /api/achievements/categories/"""
        response = self.client.get('/api/achievements/categories/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('categories', response.data)
        self.assertIn('task', response.data['categories'])
        self.assertIn('streak', response.data['categories'])

    def test_get_single_achievement(self):
        """Test GET /api/achievements/{id}/"""
        response = self.client.get(f'/api/achievements/{self.ach1.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['code'], 'first_task')
        self.assertEqual(response.data['name'], 'First Task')

    def test_inactive_achievements_not_listed(self):
        """Inactive achievements should not be in list."""
        response = self.client.get('/api/achievements/')

        codes = [a['code'] for a in response.data]
        self.assertNotIn('inactive', codes)


class UserAchievementAPITest(TestCase):
    """Test UserAchievement endpoints."""

    def setUp(self):
        """Create test user and achievements."""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='pass123'
        )

        self.ach = Achievement.objects.create(
            code='first_task',
            name='First Task',
            icon='✅',
            category='task',
            condition={'type': 'task_completed_count', 'value': 1},
        )

    def test_list_user_achievements_requires_auth(self):
        """GET /api/user/achievements/ requires authentication."""
        response = self.client.get('/api/user/achievements/')

        # IsAuthenticated returns 403 without auth, not 401
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_list_user_achievements_authenticated(self):
        """Test GET /api/user/achievements/ with auth."""
        # Create unlock record
        ua = UserAchievement.objects.create(
            user=self.user,
            achievement=self.ach
        )

        # Authenticate and request
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/user/achievements/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['achievement']['code'], 'first_task')

    def test_user_sees_only_own_achievements(self):
        """Users can only see their own achievements."""
        other_user = User.objects.create_user(
            username='other',
            email='other@example.com',
            password='pass123'
        )

        # Create achievements for both users
        UserAchievement.objects.create(user=self.user, achievement=self.ach)
        UserAchievement.objects.create(user=other_user, achievement=self.ach)

        # Authenticate as testuser
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/user/achievements/')

        # Should see only their own
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_list_user_achievements_includes_nested_data(self):
        """User achievement response includes nested achievement data."""
        ua = UserAchievement.objects.create(
            user=self.user,
            achievement=self.ach
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/user/achievements/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data[0]
        self.assertIn('achievement', data)
        self.assertEqual(data['achievement']['name'], 'First Task')

    def test_list_user_achievements_includes_days_ago(self):
        """Response includes days_ago computed field."""
        ua = UserAchievement.objects.create(
            user=self.user,
            achievement=self.ach
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/user/achievements/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data[0]
        self.assertIn('days_ago', data)

    def test_mark_achievement_as_seen(self):
        """Test POST /api/user/achievements/{id}/seen/"""
        ua = UserAchievement.objects.create(
            user=self.user,
            achievement=self.ach,
            seen=False
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            f'/api/user/achievements/{ua.id}/seen/'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify in database
        ua.refresh_from_db()
        self.assertTrue(ua.seen)

    def test_user_cannot_see_other_achievements(self):
        """User cannot access other user's achievement via detail endpoint."""
        other_user = User.objects.create_user(
            username='other',
            email='other@example.com',
            password='pass123'
        )

        ua = UserAchievement.objects.create(
            user=other_user,
            achievement=self.ach
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/user/achievements/{ua.id}/')

        # Returns 404 because get_queryset filters by user
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_filter_achievements_by_category(self):
        """Test ?category filter on GET /api/user/achievements/"""
        ach2 = Achievement.objects.create(
            code='week_warrior',
            name='Week Warrior',
            icon='🔥',
            category='streak',
            condition={'type': 'streak_reached', 'value': 7},
        )

        UserAchievement.objects.create(user=self.user, achievement=self.ach)
        UserAchievement.objects.create(user=self.user, achievement=ach2)

        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/user/achievements/?category=streak')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['achievement']['code'], 'week_warrior')

    def test_filter_unseen_achievements(self):
        """Test ?unseen=true filter."""
        ua1 = UserAchievement.objects.create(
            user=self.user,
            achievement=self.ach,
            seen=True
        )

        ach2 = Achievement.objects.create(
            code='level_5',
            name='Level 5',
            icon='⬆️',
            category='level',
            condition={'type': 'level_reached', 'value': 5},
        )
        ua2 = UserAchievement.objects.create(
            user=self.user,
            achievement=ach2,
            seen=False
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/user/achievements/?unseen=true')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['achievement']['code'], 'level_5')

    def test_stats_endpoint(self):
        """Test GET /api/user/achievements/stats/"""
        # Create multiple achievements
        ach2 = Achievement.objects.create(
            code='level_5',
            name='Level 5',
            icon='⬆️',
            category='level',
            condition={'type': 'level_reached', 'value': 5},
        )

        UserAchievement.objects.create(user=self.user, achievement=self.ach)
        UserAchievement.objects.create(user=self.user, achievement=ach2)

        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/user/achievements/stats/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_unlocked'], 2)
        self.assertIn('by_category', response.data)
        self.assertEqual(response.data['by_category']['task'], 1)
        self.assertEqual(response.data['by_category']['level'], 1)

    def test_progress_endpoint(self):
        """Test GET /api/user/achievements/progress/"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/user/achievements/progress/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Response is a dict of achievement codes to progress
        self.assertIsInstance(response.data, dict)
