from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import transaction
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from .models import ProfilePhoto
from .photo_storage import PHOTO_PREFIX, profile_photo_id

User = get_user_model()


@receiver(pre_save, sender=User)
def remember_previous_photo(sender, instance, using, raw, update_fields, **kwargs):
    if raw or not instance.pk or (update_fields is not None and 'profile_image' not in update_fields):
        return
    previous = sender.objects.using(using).filter(pk=instance.pk)
    if transaction.get_connection(using).in_atomic_block:
        previous = previous.select_for_update()
    instance._previous_photo_id = profile_photo_id(previous.values_list('profile_image', flat=True).first())


def delete_unreferenced_photo(photo_id, using):
    if photo_id is None:
        return

    def delete_if_unused():
        if not User.objects.using(using).filter(profile_image=f'{PHOTO_PREFIX}{photo_id}').exists():
            ProfilePhoto.objects.using(using).filter(pk=photo_id).delete()

    transaction.on_commit(delete_if_unused, using=using, robust=True)


@receiver(post_save, sender=User)
def discard_replaced_photo(sender, instance, using, raw, **kwargs):
    if raw:
        return
    previous = instance.__dict__.pop('_previous_photo_id', None)
    if previous is not None and previous != profile_photo_id(instance.profile_image.name):
        delete_unreferenced_photo(previous, using)


@receiver(post_delete, sender=User)
def discard_deleted_users_photo(sender, instance, using, **kwargs):
    delete_unreferenced_photo(profile_photo_id(instance.profile_image.name), using)


@receiver(post_save, sender=User)
def invalidate_user_cache(sender, using, raw, **kwargs):
    if raw:
        return

    transaction.on_commit(lambda: cache.delete_pattern('*user_cache*'), using=using, robust=True)

