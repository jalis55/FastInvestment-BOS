# Generated by Django 5.1.2 on 2024-12-01 06:29

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounting', '0005_fundtransfer'),
    ]

    operations = [
        migrations.AddField(
            model_name='transaction',
            name='narration',
            field=models.CharField(blank=True, max_length=300, null=True),
        ),
    ]
