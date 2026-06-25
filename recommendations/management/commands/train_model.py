"""
management/commands/train_model.py

Django replacement for the original train.py entry point.

Original flow:
  1. copy_datasets()              → handled by DATA_DIR convention + FileNotFoundError message
  2. load_and_preprocess()        → recommendations.ml.data_preprocessing
  3. build_features()             → recommendations.ml.feature_engineering
  4. train_model()                → recommendations.ml.model_training
  5. evaluate_model()             → recommendations.ml.model_training
  6. save_artifacts()             → recommendations.ml.model_training
  7. print(metrics)               → stored in TrainingRun model + stdout

Usage:
  python manage.py train_model
  python manage.py train_model --test-size 0.25
"""
import logging
from django.core.management.base import BaseCommand, CommandError

from recommendations.ml.data_preprocessing  import load_and_preprocess
from recommendations.ml.feature_engineering import build_features
from recommendations.ml.model_training       import (
    train_model, evaluate_model, save_artifacts,
)
from recommendations.models import TrainingRun

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        "Runs the full offline training pipeline: "
        "data_preprocessing → feature_engineering → model_training. "
        "Saves artefacts to ml_models/ and records metrics in the DB."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--test-size",
            type=float,
            default=0.2,
            help="Fraction of data reserved for evaluation (default: 0.2)",
        )
        parser.add_argument(
            "--random-state",
            type=int,
            default=42,
            help="Random seed for reproducibility (default: 42)",
        )

    def handle(self, *args, **options):
        test_size    = options["test_size"]
        random_state = options["random_state"]

        # ── Step 1: Load & preprocess both CSV datasets ──────────────────
        self.stdout.write("Loading and preprocessing datasets...")
        try:
            df = load_and_preprocess()
        except FileNotFoundError as exc:
            raise CommandError(
                f"Dataset file not found: {exc}\n"
                "Place both CSV files inside the project's data/ directory:\n"
                "  data/AI_Resume_Screening.csv\n"
                "  data/AI-based_Career_Recommendation_System.csv"
            )

        self.stdout.write(self.style.SUCCESS(f"  Loaded {len(df):,} rows after merging and deduplication."))

        # ── Step 2: Build feature matrices ───────────────────────────────
        self.stdout.write("Building feature matrices (TF-IDF + scaling)...")
        X_train, X_test, y_train, y_test, encoders, label_classes = build_features(
            df, test_size=test_size, random_state=random_state
        )
        self.stdout.write(self.style.SUCCESS(
            f"  Train: {X_train.shape[0]:,} rows | Test: {X_test.shape[0]:,} rows | "
            f"Features: {X_train.shape[1]:,}"
        ))

        # ── Step 3: Train the Random Forest ──────────────────────────────
        self.stdout.write("Training Random Forest (300 trees, n_jobs=-1)...")
        model = train_model(X_train, y_train)
        self.stdout.write(self.style.SUCCESS("  Training complete."))

        # ── Step 4: Evaluate ──────────────────────────────────────────────
        self.stdout.write("Evaluating on held-out test set...")
        metrics = evaluate_model(model, X_test, y_test, label_classes)

        # ── Step 5: Save artefacts to disk ────────────────────────────────
        self.stdout.write("Saving model artefacts to ml_models/...")
        save_artifacts(model, encoders, label_classes)
        self.stdout.write(self.style.SUCCESS("  Artefacts saved."))

        # ── Step 6: Persist training metrics to DB ────────────────────────
        run = TrainingRun.objects.create(
            accuracy        = metrics["accuracy"],
            precision_macro = metrics["precision_macro"],
            recall_macro    = metrics["recall_macro"],
            f1_macro        = metrics["f1_macro"],
            test_samples    = metrics["test_samples"],
            label_classes   = label_classes,
            full_report     = metrics["classification_report"],
        )

        # ── Step 7: Print summary (mirrors original train.py output) ──────
        self.stdout.write("")
        self.stdout.write("━" * 50)
        self.stdout.write(self.style.SUCCESS("Training complete."))
        self.stdout.write(f"  Accuracy  : {metrics['accuracy']:.4f}")
        self.stdout.write(f"  Precision : {metrics['precision_macro']:.4f} (macro)")
        self.stdout.write(f"  Recall    : {metrics['recall_macro']:.4f} (macro)")
        self.stdout.write(f"  F1 Score  : {metrics['f1_macro']:.4f} (macro)")
        self.stdout.write(f"  Classes   : {label_classes}")
        self.stdout.write(f"  DB run ID : {run.pk}")
        self.stdout.write("━" * 50)
        self.stdout.write(
            "Restart the Django server so RecommendationsConfig.ready() "
            "reloads the new model artefacts."
        )
