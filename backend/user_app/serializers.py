import re

from django.contrib.auth import password_validation
from django.contrib.auth.hashers import check_password
from django.db import models, transaction
from PIL import Image, UnidentifiedImageError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import CustomUser, UserIdentityDocument


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        # Get the default token from the parent class
        token = super().get_token(user)

        # Add custom claims to the token
        token['user_id'] = user.id
        token['email'] = user.email
        token['name'] = user.name
        token['profile_image'] = user.profile_image.url if user.profile_image else None
        token['is_admin'] = user.is_staff 
        token['is_super_admin']=user.is_superuser
        return token

class UserStatusSerializer(serializers.Serializer):
    status=serializers.CharField()

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    
    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'name', 'phone', 'profile_image', 'sex', 'bio', 'dob','password']
        extra_kwargs = {
            'password': {'write_only': True},
        }

    def create(self, validated_data):
        """Handle user creation with hashed password"""
        password = validated_data.pop('password', None)
        user = CustomUser(**validated_data)
        if password:
            user.set_password(password)  # This ensures the password is hashed
        user.save()
        return user

    def update(self, instance, validated_data):
        """Handle updating a user, ensuring password is hashed if provided"""
        password = validated_data.pop('password', None)
        update_fields = list(validated_data)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)  # This ensures the password is hashed
            update_fields.append('password')
        if update_fields:
            instance.save(update_fields=update_fields)
        return instance


class UserIdentitySerializer(UserSerializer):
    nid = serializers.CharField(max_length=17, required=False, allow_blank=True, write_only=True)
    nid_scan_copy = serializers.FileField(required=False, write_only=True)

    class Meta(UserSerializer.Meta):
        fields = [field for field in UserSerializer.Meta.fields if field != 'bio'] + ['nid', 'nid_scan_copy']

    def validate_nid(self, value):
        if value and not re.fullmatch(r'[0-9]{1,17}', value):
            raise serializers.ValidationError('Enter an NID number with up to 17 digits.')
        return value

    def validate_nid_scan_copy(self, upload):
        if upload.size > 2 * 1024 * 1024:
            raise serializers.ValidationError('The scan must be 2 MB or smaller.')

        if upload.read(5) == b'%PDF-':
            upload.seek(0)
            return upload

        upload.seek(0)
        try:
            with Image.open(upload, formats=['JPEG', 'PNG']) as image:
                image.verify()
        except (UnidentifiedImageError, OSError, SyntaxError, ValueError, Image.DecompressionBombError):
            raise serializers.ValidationError('Upload a PDF, JPEG, or PNG file.')
        upload.seek(0)
        return upload


class UserRegistrationSerializer(UserIdentitySerializer):
    @transaction.atomic
    def create(self, validated_data):
        nid = validated_data.pop('nid', '')
        scan = validated_data.pop('nid_scan_copy', None)
        user = super().create(validated_data)
        if nid or scan:
            UserIdentityDocument.objects.create(
                user=user,
                nid=nid,
                nid_scan_copy=scan.read() if scan else None,
            )
        return user


class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'name', 'email', 'phone','profile_image','sex','is_staff', 'is_active']
        extra_kwargs={
            'email':{'read_only':True}
        }


class UserProfileSerializer(UserIdentitySerializer):
    nid = serializers.CharField(max_length=17, required=False, allow_blank=True)
    has_nid_scan = serializers.BooleanField(read_only=True)

    class Meta(UserIdentitySerializer.Meta):
        fields = [*UserIdentitySerializer.Meta.fields, 'has_nid_scan', 'bio']
        extra_kwargs = {**UserIdentitySerializer.Meta.extra_kwargs, 'email': {'required': False}}

    def to_representation(self, instance):
        data = super().to_representation(instance)
        document = UserIdentityDocument.objects.filter(user=instance).values_list(
            'nid',
            models.Case(
                models.When(nid_scan_copy__isnull=False, then=True),
                default=False,
                output_field=models.BooleanField(),
            ),
        ).first()
        data['nid'], data['has_nid_scan'] = document or ('', False)
        return data

    @transaction.atomic
    def update(self, instance, validated_data):
        nid = validated_data.pop('nid', None)
        scan = validated_data.pop('nid_scan_copy', None)
        user = super().update(instance, validated_data)
        changes = {}
        if nid is not None:
            changes['nid'] = nid
        if scan is not None:
            changes['nid_scan_copy'] = scan.read()
        if changes:
            UserIdentityDocument.objects.update_or_create(user=user, defaults=changes)
        return user


class AdminUserDetailsSerializer(UserProfileSerializer):
    class Meta(UserProfileSerializer.Meta):
        fields = [*UserIdentitySerializer.Meta.fields, 'has_nid_scan', 'is_staff', 'is_active']


class SelfUserProfileSerializer(UserProfileSerializer):
    def validate_password(self, value):
        raise serializers.ValidationError('Use Change password to update your password.')


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_current_password(self, value):
        if not check_password(value, self.instance.password):
            raise serializers.ValidationError('Your current password is incorrect.')
        return value

    def validate_new_password(self, value):
        password_validation.validate_password(value, self.instance)
        return value

    def update(self, instance, validated_data):
        instance.set_password(validated_data['new_password'])
        instance.save(update_fields=['password'])
        return instance
