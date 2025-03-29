# Generated by Django 5.1.6 on 2025-03-28 03:55

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('accounting', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='account',
            name='user',
            field=models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='fundtransfer',
            name='issued_by',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='issued_by', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='fundtransfer',
            name='transfer_from',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transfer_from', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='fundtransfer',
            name='transfer_to',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transfer_to', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='transaction',
            name='issued_by',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transactions_issued', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='transaction',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL),
        ),
    ]
