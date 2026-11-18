from uuid import uuid4

from django.contrib.auth.models import (AbstractBaseUser, BaseUserManager,
                                        PermissionsMixin)
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .photo_storage import ProfilePhotoStorage, validate_profile_photo_size


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        """Create and return a regular user."""
        if not email:
            raise ValueError(_('The Email field must be set'))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Create and return a superuser."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    SEX_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    ]

    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, blank=True, null=True)
    profile_image = models.ImageField(
        upload_to='media/profile_images/', storage=ProfilePhotoStorage(),
        validators=[validate_profile_photo_size], blank=True, null=True,
    )
    sex = models.CharField(max_length=1, choices=SEX_CHOICES, blank=True, null=True)
    
    bio = models.TextField(blank=True, null=True)
    dob = models.DateField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    objects = CustomUserManager()

    def __str__(self):
        return self.email


class UserIdentityDocument(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)
    nid = models.CharField(max_length=17, blank=True)
    nid_scan_copy = models.BinaryField(null=True)


class ProfilePhoto(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    content = models.BinaryField()
    content_type = models.CharField(max_length=100)
