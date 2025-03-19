# Generated by Django 5.1.2 on 2024-11-06 10:43

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('stock_app', '0002_instrument_investment_trade'),
    ]

    operations = [
        migrations.AddField(
            model_name='trade',
            name='total_commission',
            field=models.DecimalField(decimal_places=2, default=0.22, max_digits=10),
            preserve_default=False,
        ),
    ]
