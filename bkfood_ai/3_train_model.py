"""
STEP 3 — Train the prediction models on the dataset.
Trains one model per target (palettes, tonnage, cycles, boxes, alert risk).
Saves all models to the models/ folder.

Usage:
    python 3_train_model.py
    python 3_train_model.py --dataset dataset.csv --models_dir models/
"""

import pandas as pd
import numpy as np
import pickle
import os
import json
import argparse
from pathlib import Path

from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, r2_score, accuracy_score
from sklearn.pipeline import Pipeline


# ── Targets to predict ───────────────────────────────────────────────────────
REGRESSION_TARGETS = {
    "palettes_demain":  "target_palettes_demain",
    "tonnage_demain":   "target_tonnage_demain",
    "cycles_demain":    "target_cycles_demain",
    "boites_demain":    "target_boites_demain",
}

CLASSIFICATION_TARGETS = {
    "risque_alertes":   "target_alertes_demain",   # 0 or 1
}


def get_feature_columns(df):
    """Return all feature columns (exclude date and target columns)."""
    exclude = ["date", "source_file"] + \
              [c for c in df.columns if c.startswith("target_")]
    return [c for c in df.columns if c not in exclude]


def train_all_models(dataset_path: str, models_dir: str):
    models_dir = Path(models_dir)
    models_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(dataset_path)
    print(f"OK Dataset loaded: {len(df)} rows")

    if len(df) < 10:
        print("⚠️  Not enough data to train. Need at least 10 days of data.")
        print("    Tip: Export more days from BK FOOD, convert with script 1, then rerun script 2.")
        return

    feature_cols = get_feature_columns(df)
    X = df[feature_cols].fillna(0)

    print(f"   Features: {len(feature_cols)}")
    print(f"   Feature names: {feature_cols[:8]}...")

    results = {}

    # ── Train regression models ───────────────────────────────────────
    for model_name, target_col in REGRESSION_TARGETS.items():
        if target_col not in df.columns:
            print(f"  ⚠️  Target '{target_col}' not found — skipping {model_name}")
            continue

        y = df[target_col].fillna(0)

        print(f"\nOK Training: {model_name}")

        # Use GradientBoosting for better accuracy if enough data, else RandomForest
        if len(df) >= 30:
            model = Pipeline([
                ("scaler", StandardScaler()),
                ("model",  GradientBoostingRegressor(
                    n_estimators=100,
                    max_depth=4,
                    learning_rate=0.1,
                    random_state=42
                ))
            ])
        else:
            model = Pipeline([
                ("scaler", StandardScaler()),
                ("model",  RandomForestRegressor(
                    n_estimators=100,
                    max_depth=5,
                    random_state=42
                ))
            ])

        if len(df) >= 20:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            mae  = mean_absolute_error(y_test, y_pred)
            r2   = r2_score(y_test, y_pred)
            print(f"   MAE: {mae:.2f}  |  R²: {r2:.3f}")
            results[model_name] = {"mae": round(mae, 2), "r2": round(r2, 3)}
        else:
            # Not enough for split — train on all data
            model.fit(X, y)
            print(f"   Trained on all {len(df)} samples (dataset too small for test split)")
            results[model_name] = {"note": "trained on all data, no test split"}

        # Save model
        model_path = models_dir / f"{model_name}.pkl"
        with open(model_path, "wb") as f:
            pickle.dump(model, f)
        print(f"   OK Saved -> {model_path}")

    # ── Train classification models ───────────────────────────────────
    for model_name, target_col in CLASSIFICATION_TARGETS.items():
        if target_col not in df.columns:
            print(f"  ⚠️  Target '{target_col}' not found — skipping {model_name}")
            continue

        y = df[target_col].fillna(0).astype(int)
        print(f"\nOK Training classifier: {model_name}")

        model = Pipeline([
            ("scaler", StandardScaler()),
            ("model",  RandomForestClassifier(
                n_estimators=100,
                max_depth=5,
                class_weight="balanced",
                random_state=42
            ))
        ])

        if len(df) >= 20:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            acc = accuracy_score(y_test, y_pred)
            print(f"   Accuracy: {acc:.1%}")
            results[model_name] = {"accuracy": round(acc, 3)}
        else:
            model.fit(X, y)
            results[model_name] = {"note": "trained on all data"}

        model_path = models_dir / f"{model_name}.pkl"
        with open(model_path, "wb") as f:
            pickle.dump(model, f)
        print(f"   OK Saved -> {model_path}")

    # ── Save feature list (needed for prediction) ─────────────────────
    meta = {
        "feature_columns": feature_cols,
        "training_rows":   len(df),
        "regression_targets":     list(REGRESSION_TARGETS.keys()),
        "classification_targets": list(CLASSIFICATION_TARGETS.keys()),
        "results": results
    }
    meta_path = models_dir / "model_meta.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)

    print(f"\nOK All models trained and saved to: {models_dir}/")
    print(f"   Metadata saved to: {meta_path}")
    print(f"\nOK Training summary:")
    for k, v in results.items():
        print(f"   {k:30s}: {v}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset",    default="dataset.csv", help="Path to dataset CSV")
    parser.add_argument("--models_dir", default="models/",     help="Where to save trained models")
    args = parser.parse_args()

    train_all_models(args.dataset, args.models_dir)
