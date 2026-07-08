"""
views.py

Three API views that together replace the original scripts' execution flow:

  CareerRecommendationView  ← the live prediction path
                              (transform_user_input → model.predict_proba)

  RecommendationHistoryView ← lists all past RecommendationLog rows,
                              useful for auditing / dashboards

  ModelMetricsView          ← surfaces the last TrainingRun row,
                              replacing what train.py printed to stdout
"""
import logging
from django.apps import apps
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import UserProfile, RecommendationLog, TrainingRun
from .serializers import (
    UserProfileInputSerializer,
    RecommendationLogSerializer,
    TrainingRunSerializer,
)
from .ml.feature_engineering import transform_user_input

logger = logging.getLogger(__name__)


class CareerRecommendationView(APIView):
    """
    POST  /api/recommendations/predict/
    GET   /api/recommendations/predict/?education_level=Master&skills=Python,...

    Accepts a user's profile fields, runs them through the same feature
    transformation the training pipeline used (via transform_user_input),
    calls model.predict_proba, and returns the ranked career predictions.

    The model/encoders/label_classes are read from the AppConfig singleton
    that was populated once in RecommendationsConfig.ready() — no disk I/O
    happens on each request.
    """

    def _get_config(self):
        return apps.get_app_config("recommendations")

    def _predict(self, data):
        config = self._get_config()

        if config.model is None:
            return Response(
                {"error": "No trained model available. Run `python manage.py train_model` first."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # Validate + apply defaults using the serializer
        serializer = UserProfileInputSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated = serializer.validated_data

        # 1. Persist the incoming profile
        profile = None
        profile_id = None
        try:
            profile = UserProfile.objects.create(**validated)
            profile_id = profile.pk
        except Exception as e:
            logger.error("Failed to save profile (read-only DB or missing migrations): %s", e)

        # 2. Build the feature vector (same transform as training time)
        X_user = transform_user_input(validated, config.encoders)

        # 3. Run inference
        proba         = config.model.predict_proba(X_user)[0]
        label_classes = config.label_classes
        pred_idx      = int(proba.argmax())

        predicted_career = label_classes[pred_idx]
        confidence       = float(proba[pred_idx])
        probabilities    = {
            label_classes[i]: round(float(p), 6)
            for i, p in enumerate(proba)
        }

        # 4. Sort all careers by confidence descending for a ranked list
        ranked = sorted(probabilities.items(), key=lambda x: x[1], reverse=True)

        # 5. Persist the prediction for audit / history
        log_id = None
        if profile is not None:
            try:
                log = RecommendationLog.objects.create(
                    user_profile=profile,
                    predicted_career=predicted_career,
                    confidence=confidence,
                    probabilities=probabilities,
                )
                log_id = log.pk
            except Exception as e:
                logger.error("Failed to save recommendation log: %s", e)

        logger.info(
            "Prediction: profile_id=%s → %s (%.2f%%)",
            profile_id, predicted_career, confidence * 100,
        )

        return Response(
            {
                "profile_id"      : profile_id,
                "predicted_career": predicted_career,
                "confidence"      : f"{confidence:.2%}",
                "ranked_careers"  : [
                    {"career": career, "probability": f"{prob:.2%}"}
                    for career, prob in ranked
                ],
                "log_id"          : log_id,
            },
            status=status.HTTP_201_CREATED,
        )

    def post(self, request):
        return self._predict(request.data)

    def get(self, request):
        return self._predict(request.query_params)


class RecommendationHistoryView(APIView):
    """
    GET /api/recommendations/history/
    GET /api/recommendations/history/?limit=20

    Returns past prediction logs. Useful for auditing and dashboards.
    Optional ?limit=N query param (default 50, max 200).
    """

    def get(self, request):
        try:
            limit = min(int(request.query_params.get("limit", 50)), 200)
        except (TypeError, ValueError):
            limit = 50

        logs = RecommendationLog.objects.select_related("user_profile")[:limit]
        serializer = RecommendationLogSerializer(logs, many=True)
        return Response({"count": len(serializer.data), "results": serializer.data})


class ModelMetricsView(APIView):
    """
    GET /api/recommendations/metrics/

    Returns the metrics from the most recent training run, replacing the
    stdout summary that the original train.py printed at the end.
    """

    def get(self, request):
        run = TrainingRun.objects.first()
        if run is None:
            return Response(
                {"error": "No training run recorded yet. Run `python manage.py train_model`."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = TrainingRunSerializer(run)
        return Response(serializer.data)
