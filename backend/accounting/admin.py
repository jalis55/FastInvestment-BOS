from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import Account, Transaction,FundTransfer

admin.site.register(Account)
admin.site.register(Transaction)
admin.site.register(FundTransfer)
