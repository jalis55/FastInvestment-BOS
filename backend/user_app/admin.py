from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import CustomUser

class CustomUserAdmin(BaseUserAdmin):
    model = CustomUser
    list_display = ('email', 'name', 'is_staff', 'is_active')
    list_filter = ('is_staff', 'is_active', 'sex')
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('name', 'phone', 'profile_image', 'sex', 'bio', 'dob')}),
        ('Permissions', {'fields': ('is_staff', 'is_active', 'is_superuser')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'name', 'password1', 'password2', 'is_staff', 'is_active')}
        ),
    )
    search_fields = ('email',)
    ordering = ('email',)

admin.site.register(CustomUser, CustomUserAdmin)
