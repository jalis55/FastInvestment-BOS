from rest_framework import serializers
from django.db import transaction
from rest_framework.exceptions import ValidationError
from stock_app.models import Project
from .serializers import FinancialAdvisorSerializer,InvestmentDetailsSerializer
from .models import Project,FinancialAdvisor,Investment




class ProjectCreateSerializer(serializers.ModelSerializer):
    project_id = serializers.CharField(max_length=8, required=False)

    class Meta:
        model = Project
        fields = ('project_id', 'project_title', 'project_description','created_by'
                  )
        read_only_fields = ['created_by']

    def create(self, validated_data):
       
        if 'project_id' not in validated_data or not validated_data['project_id']:
            validated_data.pop('project_id', None)  
        return super().create(validated_data)


    
class ProjectBalanceSerializer(serializers.Serializer):
    project_id = serializers.CharField()
    available_balance = serializers.DecimalField(max_digits=10, decimal_places=2)