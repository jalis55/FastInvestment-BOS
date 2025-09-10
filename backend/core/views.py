from django.core.mail import send_mail
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .emailSerializers import EmailSerializer


class SendEmailView(generics.CreateAPIView):
    serializer_class = EmailSerializer
    permission_classes=[AllowAny]


    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        subject = serializer.validated_data['subject']
        message = serializer.validated_data['message']

        try:
            send_mail(
                subject,
                message,
                'info@trial-r83ql3pw29vgzw1j.mlsender.net ',  # Sender email
                [email],  # Recipient email(s)
                fail_silently=False,
            )
            return Response({"status": "success", "message": "Email sent successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)