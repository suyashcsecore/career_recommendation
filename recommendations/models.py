"""
models.py

Converts the script's implicit data shapes into proper Django ORM models:

  UserProfile      ← the dict fed into transform_user_input()
  RecommendationLog ← what the script printed: predicted career + probability scores
  TrainingRun      ← what the script printed at the end of run_training()
"""
from django.db import models


class UserProfile(models.Model):
    """
    Stores every set of user features submitted to the prediction API.
    Fields mirror the keys that the original transform_user_input() expected.
    """
    EDUCATION_CHOICES = [
        ("Bachelor", "Bachelor"),
        ("Master",   "Master"),
        ("PhD",      "PhD"),
    ]

    education_level  = models.CharField(max_length=20, choices=EDUCATION_CHOICES, default="Bachelor")
    skills           = models.TextField(default="None", help_text="Comma-separated list of skills")
    certifications   = models.TextField(default="None", help_text="Comma-separated certifications")
    experience_score = models.FloatField(default=5.0, help_text="Averaged years + projects (0-10)")
    cgpa             = models.FloatField(default=70.0, help_text="Academic score or AI compatibility (0-100)")
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "User Profile"

    def __str__(self):
        return f"UserProfile #{self.pk} — {self.education_level}"


class RecommendationLog(models.Model):
    """
    Persists the output of each prediction request.
    predicted_career + confidence mirror what the original script printed;
    probabilities stores the full per-class softmax scores as JSON.
    """
    user_profile     = models.ForeignKey(
        UserProfile, on_delete=models.CASCADE, related_name="recommendations"
    )
    predicted_career = models.CharField(max_length=100)
    confidence       = models.FloatField(help_text="Probability of the top predicted class")
    probabilities    = models.JSONField(
        default=dict, help_text="Full {career: probability} mapping from predict_proba"
    )
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Recommendation Log"

    def __str__(self):
        return f"{self.predicted_career} ({self.confidence:.2%}) — Profile #{self.user_profile_id}"


class TrainingRun(models.Model):
    """
    Records each execution of the train_model management command,
    replacing the printed summary at the end of the original train.py.
    """
    triggered_at     = models.DateTimeField(auto_now_add=True)
    accuracy         = models.FloatField()
    precision_macro  = models.FloatField()
    recall_macro     = models.FloatField()
    f1_macro         = models.FloatField()
    test_samples     = models.IntegerField()
    label_classes    = models.JSONField(default=list)
    full_report      = models.JSONField(default=dict, help_text="Full classification_report dict")

    class Meta:
        ordering = ["-triggered_at"]
        verbose_name = "Training Run"

    def __str__(self):
        return (
            f"TrainingRun {self.triggered_at:%Y-%m-%d %H:%M} "
            f"| acc={self.accuracy:.4f} f1={self.f1_macro:.4f}"
        )
