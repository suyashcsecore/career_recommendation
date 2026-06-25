"""
Ported from the original model_training.py.

Path resolution updated to use Django's settings.BASE_DIR.
Everything else (RandomForest hyperparameters, evaluate/save/load
artifact logic) is unchanged from the original script.
"""
import os
import json
import joblib
import matplotlib
matplotlib.use("Agg")   # non-interactive backend, safe in server processes
import matplotlib.pyplot as plt
import seaborn as sns

from django.conf import settings
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, confusion_matrix, classification_report,
)

MODELS_DIR    = os.path.join(settings.BASE_DIR, "ml_models")
MODEL_PATH    = os.path.join(MODELS_DIR, "random_forest_model.joblib")
ENCODERS_PATH = os.path.join(MODELS_DIR, "encoders.joblib")
CLASSES_PATH  = os.path.join(MODELS_DIR, "label_classes.json")
METRICS_PATH  = os.path.join(MODELS_DIR, "evaluation_metrics.json")
CM_PLOT_PATH  = os.path.join(MODELS_DIR, "confusion_matrix.png")


def train_model(X_train, y_train):
    """
    Train a Random Forest with 300 trees.
    class_weight='balanced' handles the slight imbalance between career classes.
    max_features='sqrt' ensures diversity across trees without sacrificing accuracy.
    """
    rf = RandomForestClassifier(
        n_estimators      = 300,
        max_depth         = None,
        min_samples_split = 5,
        min_samples_leaf  = 2,
        max_features      = "sqrt",
        class_weight      = "balanced",
        random_state      = 42,
        n_jobs            = -1,
    )
    rf.fit(X_train, y_train)
    return rf


def evaluate_model(model, X_test, y_test, label_classes):
    """
    Compute accuracy / precision / recall / F1, save a confusion-matrix
    PNG, and write all metrics to evaluation_metrics.json.
    Returns the metrics dict so the management command can print a summary.
    """
    y_pred = model.predict(X_test)

    acc  = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, average="macro", zero_division=0)
    rec  = recall_score(y_test, y_pred, average="macro", zero_division=0)
    f1   = f1_score(y_test, y_pred, average="macro", zero_division=0)

    report_dict = classification_report(
        y_test, y_pred, target_names=label_classes,
        zero_division=0, output_dict=True,
    )

    cm = confusion_matrix(y_test, y_pred)
    _save_confusion_matrix(cm, label_classes)

    metrics = {
        "accuracy"              : round(float(acc),  4),
        "precision_macro"       : round(float(prec), 4),
        "recall_macro"          : round(float(rec),  4),
        "f1_macro"              : round(float(f1),   4),
        "test_samples"          : int(X_test.shape[0]),
        "classification_report" : report_dict,
    }

    os.makedirs(MODELS_DIR, exist_ok=True)
    with open(METRICS_PATH, "w") as fh:
        json.dump(metrics, fh, indent=2)

    return metrics


def _save_confusion_matrix(cm, labels):
    fig, ax = plt.subplots(figsize=(8, 6))
    sns.heatmap(
        cm, annot=True, fmt="d", cmap="Blues",
        xticklabels=labels, yticklabels=labels,
        ax=ax, linewidths=0.5, linecolor="grey",
    )
    ax.set_xlabel("Predicted Label", fontsize=11)
    ax.set_ylabel("True Label", fontsize=11)
    ax.set_title("Confusion Matrix", fontsize=13)
    plt.xticks(rotation=45, ha="right", fontsize=9)
    plt.yticks(rotation=0, fontsize=9)
    plt.tight_layout()
    os.makedirs(MODELS_DIR, exist_ok=True)
    plt.savefig(CM_PLOT_PATH, dpi=150)
    plt.close()


def save_artifacts(model, encoders, label_classes):
    """Persist model, fitted encoders, and label list to MODELS_DIR."""
    os.makedirs(MODELS_DIR, exist_ok=True)
    joblib.dump(model,    MODEL_PATH,    compress=3)
    joblib.dump(encoders, ENCODERS_PATH, compress=3)
    with open(CLASSES_PATH, "w") as fh:
        json.dump(label_classes, fh, indent=2)


def load_artifacts():
    """
    Load saved model artefacts from disk.
    Called once from RecommendationsConfig.ready() so the model is
    available in memory for every subsequent API request.
    Raises FileNotFoundError if training has never been run.
    """
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"No trained model found at {MODEL_PATH}. "
            "Run `python manage.py train_model` first."
        )
    model = joblib.load(MODEL_PATH)
    encoders = joblib.load(ENCODERS_PATH)
    with open(CLASSES_PATH) as fh:
        label_classes = json.load(fh)
    return model, encoders, label_classes
