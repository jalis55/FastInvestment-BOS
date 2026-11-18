from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

User = get_user_model()


@receiver(post_save, sender=User)
def invalidate_user_cache(sender, using, raw, **kwargs):
    if raw:
        return

    transaction.on_commit(lambda: cache.delete_pattern('*user_cache*'), using=using, robust=True)

