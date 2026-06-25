"""
recommendations/urls.py

Three endpoints that replace the original script's stdout-only outputs:

  POST/GET  /predict/  → CareerRecommendationView  (was: run transform + predict_proba in terminal)
  GET       /history/  → RecommendationHistoryView  (was: no equivalent; now persisted)
  GET       /metrics/  → ModelMetricsView           (was: print(metrics) at end of train.py)
"""
from django.urls import path
from .views import (
    CareerRecommendationView,
    RecommendationHistoryView,
    ModelMetricsView,
)

app_name = "recommendations"

urlpatterns = [
    path("predict/", CareerRecommendationView.as_view(),    name="career-predict"),
    path("history/", RecommendationHistoryView.as_view(),   name="recommendation-history"),
    path("metrics/", ModelMetricsView.as_view(),            name="model-metrics"),
]
