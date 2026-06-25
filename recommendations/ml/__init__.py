# Expose the three key callables so views and management commands
# can import directly from recommendations.ml rather than
# digging into sub-modules.
from .data_preprocessing import load_and_preprocess
from .feature_engineering import build_features, transform_user_input
from .model_training import (
    train_model, evaluate_model,
    save_artifacts, load_artifacts,
)

__all__ = [
    "load_and_preprocess",
    "build_features",
    "transform_user_input",
    "train_model",
    "evaluate_model",
    "save_artifacts",
    "load_artifacts",
]
