from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import generics, serializers
from rest_framework.permissions import IsAdminUser
from .holdings import project_holdings
from .models import Dividend, Profit, Project
from .serializers import InstrumentSerializer


class DividendSerializer(serializers.ModelSerializer):
    instrument_details = InstrumentSerializer(source='instrument', read_only=True)

    class Meta:
        model = Dividend
        fields = ['id', 'project', 'instrument', 'instrument_details', 'dividend_type',
                  'amount', 'qty', 'received_date', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate(self, data):
        if not data['project'].project_active_status:
            raise serializers.ValidationError('Cannot record dividends for a closed project.')
        if data.get('received_date', timezone.localdate()) > timezone.localdate():
            raise serializers.ValidationError('Received date cannot be in the future.')
        amount, qty = data.get('amount', Decimal('0')), data.get('qty', 0)
        if data['dividend_type'] == Dividend.CASH:
            if amount <= 0 or qty != 0:
                raise serializers.ValidationError('Cash dividends require a positive amount and zero shares.')
        elif qty <= 0 or amount != 0:
            raise serializers.ValidationError('Share dividends require a positive whole share quantity and zero cash.')
        return data

    @transaction.atomic
    def create(self, validated_data):
        project = Project.objects.select_for_update().get(pk=validated_data['project'].pk)
        if not project.project_active_status:
            raise serializers.ValidationError('Cannot record dividends for a closed project.')
        row = project_holdings(project).get(validated_data['instrument'].pk)
        if not row or row['available_quantity'] <= 0:
            raise serializers.ValidationError({'instrument': 'Choose an available instrument held by this project.'})
        dividend = super().create(validated_data)
        if dividend.dividend_type == Dividend.CASH:
            Profit.objects.create(project=project, dividend=dividend, amount=dividend.amount,
                                  authorized_by=dividend.authorized_by)
        return dividend


class DividendListCreateView(generics.ListCreateAPIView):
    serializer_class = DividendSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        queryset = Dividend.objects.select_related('instrument').order_by('-created_at')
        project_id = self.request.query_params.get('project_id')
        return queryset.filter(project_id=project_id) if project_id else queryset.none()

    def perform_create(self, serializer):
        serializer.save(authorized_by=self.request.user)
