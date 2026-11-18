"""Response-only serializers for custom stock endpoints."""
from rest_framework import serializers
from .serializers import ProjectCloseSerializer


class ProjectClosedSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['closed'])
    data = ProjectCloseSerializer()


class StockMessageSerializer(serializers.Serializer):
    message = serializers.CharField()


class ProfitDisbursementResultSerializer(StockMessageSerializer):
    wallet_total = serializers.FloatField()
    reinvested_total = serializers.FloatField()


class ErrorSerializer(serializers.Serializer):
    error = serializers.CharField()
