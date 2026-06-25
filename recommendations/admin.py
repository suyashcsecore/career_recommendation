from django.contrib import admin
from .models import UserProfile, RecommendationLog, TrainingRun


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display  = ["id", "education_level", "experience_score", "cgpa", "created_at"]
    list_filter   = ["education_level"]
    search_fields = ["skills", "certifications"]
    readonly_fields = ["created_at"]


@admin.register(RecommendationLog)
class RecommendationLogAdmin(admin.ModelAdmin):
    list_display  = ["id", "user_profile", "predicted_career", "confidence", "created_at"]
    list_filter   = ["predicted_career"]
    search_fields = ["predicted_career"]
    readonly_fields = ["probabilities", "created_at"]


@admin.register(TrainingRun)
class TrainingRunAdmin(admin.ModelAdmin):
    list_display  = ["id", "triggered_at", "accuracy", "f1_macro", "test_samples"]
    readonly_fields = [
        "triggered_at", "accuracy", "precision_macro",
        "recall_macro", "f1_macro", "test_samples",
        "label_classes", "full_report",
    ]
