from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.core.cache import cache
from accounting.models import Account

User=get_user_model()


@receiver(post_save,sender=User)
def invalidate_user_cache(sender,instance,created,**kwargs):
    if created:
        print("cleaning cache")
        Account.objects.create(user=instance,balance=0)
        cache.delete_pattern('*user_cache*')
        print(cache.keys("*"))


