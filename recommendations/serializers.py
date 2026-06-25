"""
serializers.py

Three serializer responsibilities:

  UserProfileInputSerializer  — validates raw POST/GET params before they
                                 reach transform_user_input(), replacing the
                                 original script's silent .get()-with-defaults.

  RecommendationLogSerializer — shapes the API response payload.

  TrainingRunSerializer       — used by the /metrics/ endpoint to expose
                                 the last training run's results.
"""
from rest_framework import serializers
from .models import RecommendationLog, TrainingRun


class UserProfileInputSerializer(serializers.Serializer):
    education_level = serializers.ChoiceField(
        choices=["Bachelor", "Master", "PhD"],
        default="Bachelor",
    )
    skills = serializers.CharField(
        allow_blank=True,
        default="None",
        help_text="Comma-separated skills, e.g. 'Python, Machine Learning'",
    )
    certifications = serializers.CharField(
        allow_blank=True,
        default="None",
        help_text="Comma-separated certifications, e.g. 'AWS, TensorFlow'",
    )
    experience_score = serializers.FloatField(
        min_value=0.0,
        max_value=10.0,
        default=5.0,
        help_text="Average of years-of-experience and project count, clipped to 0-10",
    )
    cgpa = serializers.FloatField(
        min_value=0.0,
        max_value=100.0,
        default=70.0,
        help_text="Academic CGPA or AI compatibility score on a 0-100 scale",
    )


class RecommendationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model  = RecommendationLog
        fields = [
            "id",
            "user_profile",
            "predicted_career",
            "confidence",
            "probabilities",
            "created_at",
        ]
        read_only_fields = fields


class TrainingRunSerializer(serializers.ModelSerializer):
    class Meta:
        model  = TrainingRun
        fields = [
            "id",
            "triggered_at",
            "accuracy",
            "precision_macro",
            "recall_macro",
            "f1_macro",
            "test_samples",
            "label_classes",
            "full_report",
        ]
        read_only_fields = fields
