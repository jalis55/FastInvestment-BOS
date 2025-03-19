
from rest_framework import serializers
from .serializers import FinancialAdvisorSerializer,TradeDetailsSerializer,InvestmentDetailsSerializer
from .models import Project,FinancialAdvisor,Investment


class ProjectDetailsSerializer(serializers.ModelSerializer):
    financial_advisors = FinancialAdvisorSerializer(many=True, read_only=True)
    investments = InvestmentDetailsSerializer(many=True, read_only=True)
    trades = TradeDetailsSerializer(many=True, read_only=True)  

    class Meta:
        model = Project
        fields = [
            'project_id', 'project_title', 'project_description',
            'total_investment', 'total_collection', 'gain_or_lose',
            'financial_advisors', 'investments', 'trades'
        ]
        read_only_fields = ['project_id', 'created_by', 'created_at', 'updated_at']