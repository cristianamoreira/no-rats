"""
API views for achievements.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from .models import Achievement, UserAchievement
from .serializers import AchievementSerializer, UserAchievementSerializer


class AchievementViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for listing available achievements.

    Provides:
    - GET /api/achievements/ - List all active achievements
    - GET /api/achievements/{id}/ - Get single achievement details

    This is a public endpoint (no authentication required).
    Used by frontend to populate achievement library/glossary.
    """

    queryset = Achievement.objects.filter(active=True).order_by(
        'category', 'order'
    )
    serializer_class = AchievementSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None  # Achievements list is usually small

    def get_queryset(self):
        """Filter achievements by category if requested."""
        queryset = super().get_queryset()

        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        return queryset

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def categories(self, request):
        """
        List available achievement categories.

        GET /api/achievements/categories/

        Returns:
            list: Available categories (e.g., 'task', 'streak', 'level')
        """
        categories = Achievement.objects.filter(
            active=True
        ).values_list('category', flat=True).distinct()

        return Response({
            'categories': list(categories),
        })


class UserAchievementViewSet(viewsets.ModelViewSet):
    """
    API endpoint for user's achievements.

    Provides:
    - GET /api/user/achievements/ - List user's unlocked achievements
    - GET /api/user/achievements/{id}/ - Get single unlock record
    - POST /api/user/achievements/{id}/seen/ - Mark achievement as seen

    All endpoints require authentication (JWT token).
    Users can only access their own achievements.
    """

    serializer_class = UserAchievementSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']  # No PUT/DELETE

    def get_queryset(self):
        """Only return achievements for authenticated user."""
        return UserAchievement.objects.filter(
            user=self.request.user
        ).select_related('achievement').order_by('-unlocked_at')

    def get_object(self):
        """Ensure user can only access their own achievements."""
        obj = super().get_object()
        if obj.user != self.request.user:
            raise PermissionDenied(
                "You can only access your own achievements."
            )
        return obj

    def list(self, request, *args, **kwargs):
        """
        List user's unlocked achievements.

        GET /api/user/achievements/

        Query Parameters:
        - category: Filter by category (task, streak, level, infestation)
        - unseen: 'true' to only show unseen achievements

        Returns:
            list: UserAchievement objects with nested achievement details
        """
        queryset = self.get_queryset()

        # Filter by category if provided
        category = request.query_params.get('category')
        if category:
            queryset = queryset.filter(achievement__category=category)

        # Filter by unseen if requested
        unseen_only = request.query_params.get('unseen', 'false').lower() == 'true'
        if unseen_only:
            queryset = queryset.filter(seen=False)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def seen(self, request, pk=None):
        """
        Mark achievement notification as seen (dismissed).

        POST /api/user/achievements/{id}/seen/

        This endpoint marks a UserAchievement as 'seen', which indicates
        that the user has dismissed the notification toast.

        Args:
            pk: UserAchievement ID

        Returns:
            dict: Updated UserAchievement object
        """
        user_achievement = self.get_object()
        user_achievement.seen = True
        user_achievement.save(update_fields=['seen'])

        serializer = self.get_serializer(user_achievement)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get aggregated stats about user's achievements.

        GET /api/user/achievements/stats/

        Returns:
            dict:
                - total_unlocked: Total number of achievements unlocked
                - by_category: Breakdown by category
                - newest: Most recently unlocked achievement
        """
        from .services import get_user_achievement_stats

        stats = get_user_achievement_stats(request.user)

        # Format stats for API response
        return Response({
            'total_unlocked': stats['total_unlocked'],
            'by_category': stats['by_category'],
            'newest': UserAchievementSerializer(
                stats['recent'][0],
                context={'request': request}
            ).data if stats['recent'] else None,
        })

    @action(detail=False, methods=['get'])
    def progress(self, request):
        """
        Get progress toward locked achievements (for UI hints).

        GET /api/user/achievements/progress/

        Returns:
            dict: For each locked achievement, current/required values and percentage

        Example response:
        {
            'level_10': {'current': 5, 'required': 10, 'percentage': 50},
            'streak_7': {'current': 2, 'required': 7, 'percentage': 28},
        }
        """
        from .services import get_user_achievement_progress

        progress = get_user_achievement_progress(request.user)
        return Response(progress)
