from uuid import UUID

from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.core.files.storage import FileSystemStorage
from django.urls import reverse
from django.utils.deconstruct import deconstructible
from PIL import Image

MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024
PHOTO_PREFIX = 'profile-photos/'


def validate_profile_photo_size(file):
    if file.size > MAX_PROFILE_PHOTO_BYTES:
        raise ValidationError('The profile photo must be 2 MB or smaller.')


def profile_photo_id(name):
    if not name or not name.startswith(PHOTO_PREFIX):
        return None
    try:
        return UUID(name.removeprefix(PHOTO_PREFIX))
    except ValueError:
        return None


@deconstructible
class ProfilePhotoStorage(FileSystemStorage):
    """Store new profile photos in the database and retain legacy local file access."""

    def _save(self, name, content):
        from .models import ProfilePhoto

        validate_profile_photo_size(content)
        with Image.open(content) as image:
            content_type = image.get_format_mimetype() or 'application/octet-stream'
        content.seek(0)
        photo = ProfilePhoto.objects.create(content=content.read(), content_type=content_type)
        return f'{PHOTO_PREFIX}{photo.pk}'

    def _open(self, name, mode='rb'):
        from .models import ProfilePhoto

        photo_id = profile_photo_id(name)
        if photo_id is None:
            return super()._open(name, mode)
        photo = ProfilePhoto.objects.filter(pk=photo_id).first()
        if photo is None:
            raise FileNotFoundError(name)
        return ContentFile(bytes(photo.content), name=name)

    def exists(self, name):
        from .models import ProfilePhoto

        photo_id = profile_photo_id(name)
        return ProfilePhoto.objects.filter(pk=photo_id).exists() if photo_id else super().exists(name)

    def size(self, name):
        photo_id = profile_photo_id(name)
        if photo_id is None:
            return super().size(name)
        return self._open(name).size

    def delete(self, name):
        from .models import ProfilePhoto

        photo_id = profile_photo_id(name)
        if photo_id is None:
            super().delete(name)
        else:
            ProfilePhoto.objects.filter(pk=photo_id).delete()

    def url(self, name):
        photo_id = profile_photo_id(name)
        if photo_id is None:
            return super().url(name)
        return reverse('profile-photo', kwargs={'photo_id': photo_id})

    def path(self, name):
        if profile_photo_id(name):
            raise NotImplementedError('Database photos have no filesystem path.')
        return super().path(name)
