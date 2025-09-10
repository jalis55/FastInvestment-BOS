# Register your models here.
from django.contrib import admin

from .models import Account, FundTransfer, Transaction

admin.site.register(Account)
admin.site.register(Transaction)
admin.site.register(FundTransfer)
