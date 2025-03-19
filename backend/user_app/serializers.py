from rest_framework import serializers
from .models import CustomUser
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


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
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)  # This ensures the password is hashed
        instance.save()
        return instance


class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'name', 'email', 'phone','profile_image','sex','is_staff', 'is_active']
        extra_kwargs={
            'email':{'read_only':True}
        }
