"""
Management command to seed achievement templates into the database.

Usage:
    python manage.py load_achievements
    python manage.py load_achievements --reset  # Delete existing achievements first
"""

from django.core.management.base import BaseCommand
from gamification.models import Achievement


class Command(BaseCommand):
    help = 'Load initial achievement templates into the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete all existing achievements before loading',
        )

    def handle(self, *args, **options):
        if options['reset']:
            Achievement.objects.all().delete()
            self.stdout.write(
                self.style.WARNING('Deleted all existing achievements')
            )

        # Achievement templates to seed
        achievements = [
            # ========== TASK-BASED ACHIEVEMENTS ==========
            {
                'code': 'first_task',
                'name': 'First Step',
                'description': 'Complete your first task',
                'icon': '✅',
                'category': 'task',
                'condition': {'type': 'task_completed_count', 'value': 1},
                'reward_xp': 0,
                'order': 1,
            },
            {
                'code': 'task_10',
                'name': 'Task Master',
                'description': 'Complete 10 tasks',
                'icon': '⭐',
                'category': 'task',
                'condition': {'type': 'task_completed_count', 'value': 10},
                'reward_xp': 50,
                'order': 2,
            },
            {
                'code': 'task_50',
                'name': 'Productivity Pro',
                'description': 'Complete 50 tasks',
                'icon': '🚀',
                'category': 'task',
                'condition': {'type': 'task_completed_count', 'value': 50},
                'reward_xp': 150,
                'order': 3,
            },
            {
                'code': 'task_100',
                'name': 'Unstoppable Force',
                'description': 'Complete 100 tasks',
                'icon': '💥',
                'category': 'task',
                'condition': {'type': 'task_completed_count', 'value': 100},
                'reward_xp': 300,
                'order': 4,
            },
            # ========== STREAK-BASED ACHIEVEMENTS ==========
            {
                'code': 'streak_3',
                'name': 'Getting Started',
                'description': 'Maintain a 3-day streak',
                'icon': '🔥',
                'category': 'streak',
                'condition': {'type': 'streak_reached', 'value': 3},
                'reward_xp': 25,
                'order': 1,
            },
            {
                'code': 'streak_7',
                'name': 'Week Warrior',
                'description': 'Maintain a 7-day streak',
                'icon': '🔥🔥',
                'category': 'streak',
                'condition': {'type': 'streak_reached', 'value': 7},
                'reward_xp': 75,
                'order': 2,
            },
            {
                'code': 'streak_15',
                'name': 'Two Weeks Strong',
                'description': 'Maintain a 15-day streak',
                'icon': '🔥🔥🔥',
                'category': 'streak',
                'condition': {'type': 'streak_reached', 'value': 15},
                'reward_xp': 150,
                'order': 3,
            },
            {
                'code': 'streak_30',
                'name': 'Consistency King',
                'description': 'Maintain a 30-day streak',
                'icon': '👑',
                'category': 'streak',
                'condition': {'type': 'streak_reached', 'value': 30},
                'reward_xp': 300,
                'order': 4,
            },
            {
                'code': 'streak_100',
                'name': 'Legend of Consistency',
                'description': 'Maintain a 100-day streak',
                'icon': '⚡',
                'category': 'streak',
                'condition': {'type': 'streak_reached', 'value': 100},
                'reward_xp': 500,
                'order': 5,
            },
            # ========== LEVEL-BASED ACHIEVEMENTS ==========
            {
                'code': 'level_5',
                'name': 'Level Up',
                'description': 'Reach level 5',
                'icon': '⬆️',
                'category': 'level',
                'condition': {'type': 'level_reached', 'value': 5},
                'reward_xp': 0,
                'order': 1,
            },
            {
                'code': 'level_10',
                'name': 'Power Player',
                'description': 'Reach level 10',
                'icon': '💪',
                'category': 'level',
                'condition': {'type': 'level_reached', 'value': 10},
                'reward_xp': 0,
                'order': 2,
            },
            {
                'code': 'level_25',
                'name': 'Master of House',
                'description': 'Reach level 25',
                'icon': '🏰',
                'category': 'level',
                'condition': {'type': 'level_reached', 'value': 25},
                'reward_xp': 0,
                'order': 3,
            },
            {
                'code': 'level_50',
                'name': 'Legend Status',
                'description': 'Reach level 50',
                'icon': '🌟',
                'category': 'level',
                'condition': {'type': 'level_reached', 'value': 50},
                'reward_xp': 0,
                'order': 4,
            },
            # ========== INFESTATION-BASED ACHIEVEMENTS ==========
            {
                'code': 'clean_3',
                'name': 'Clean Sweep',
                'description': '3 days with 0% infestation',
                'icon': '🧹',
                'category': 'infestation',
                'condition': {'type': 'zero_infestation_days', 'value': 3},
                'reward_xp': 50,
                'order': 1,
            },
            {
                'code': 'spotless_week',
                'name': 'Spotless Home',
                'description': '7 days with 0% infestation',
                'icon': '✨',
                'category': 'infestation',
                'condition': {'type': 'zero_infestation_days', 'value': 7},
                'reward_xp': 150,
                'order': 2,
            },
        ]

        # Load achievements (idempotent via get_or_create)
        created_count = 0
        updated_count = 0

        for ach_data in achievements:
            obj, is_new = Achievement.objects.get_or_create(
                code=ach_data['code'],
                defaults=ach_data,
            )

            if is_new:
                created_count += 1
                status = self.style.SUCCESS('✓')
            else:
                # Update existing (in case description changed)
                for key, value in ach_data.items():
                    if key != 'code':
                        setattr(obj, key, value)
                obj.save()
                updated_count += 1
                status = self.style.WARNING('→')

            self.stdout.write(f'{status} {ach_data["code"]:<20} {ach_data["name"]}')

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Achievements loaded: {created_count} created, {updated_count} updated'
            )
        )
