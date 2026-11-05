"""Response-only serializers for the session API."""
from rest_framework import serializers
from .serializers import UserSerializer


class SessionUserSerializer(UserSerializer):
    is_admin = serializers.BooleanField(read_only=True)
    is_super_admin = serializers.BooleanField(read_only=True)
    role = serializers.ChoiceField(choices=['superadmin', 'admin', 'user'], read_only=True)

    class Meta(UserSerializer.Meta):
        fields = [field for field in UserSerializer.Meta.fields if field != 'password'] + [
            'is_admin', 'is_super_admin', 'role',
        ]


class SessionSerializer(serializers.Serializer):
    authenticated = serializers.BooleanField()
    user = SessionUserSerializer(allow_null=True)


class LoginResponseSerializer(SessionSerializer):
    message = serializers.CharField()


class MessageSerializer(serializers.Serializer):
    message = serializers.CharField()


class DetailSerializer(serializers.Serializer):
    detail = serializers.CharField()
