"""
apps.py — RecommendationsConfig

The ready() method replaces the original train.py's "load artifacts at startup"
pattern. Instead of reloading the model on every request, we load it ONCE here
when Django starts and store it on the AppConfig class as class-level attributes.
Views then pull model / encoders / label_classes off the config singleton.
"""
import logging
from django.apps import AppConfig

logger = logging.getLogger(__name__)


class RecommendationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "recommendations"
    verbose_name = "Career Recommendations"

    # Class-level slots — shared across all views, no per-request reload.
    model         = None
    encoders      = None
    label_classes = None

    def ready(self):
        # Import is deferred to here so Django's app registry is fully
        # initialised before any model / settings access happens.
        try:
            from .ml.model_training import load_artifacts
            (
                RecommendationsConfig.model,
                RecommendationsConfig.encoders,
                RecommendationsConfig.label_classes,
            ) = load_artifacts()
            logger.info(
                "Career recommendation model loaded. "
                "Classes: %s", RecommendationsConfig.label_classes
            )
        except FileNotFoundError:
            # Allow `migrate`, `collectstatic`, etc. to run before
            # the model has been trained for the first time.
            logger.warning(
                "No trained model found. "
                "Run `python manage.py train_model` to train before serving predictions."
            )
