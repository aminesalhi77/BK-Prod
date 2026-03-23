"""
Flask API server — BK FOOD AI
Exposes predictions as a REST API so Next.js can call it.

Run:
    python api_server.py

Endpoints:
    GET  /health              → server status
    GET  /model-info          → trained model metadata
    GET  /predict             → run prediction using latest CSV data
    POST /predict-from-json   → run prediction with JSON body data
    POST /retrain             → retrain models with latest CSVs
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import subprocess
import sys
from pathlib import Path
from datetime import date, timedelta
import pickle
import pandas as pd
import numpy as np

# ── Import functions from predict_tomorrow.py ────────────────────────────────
# Files are in the same folder — add this folder to path first
import importlib.util

def _load_module(filename):
    path = Path(__file__).parent / filename
    spec = importlib.util.spec_from_file_location("predict_tomorrow", path)
    mod  = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

_pt = _load_module("4_predict_tomorrow.py")

load_models              = _pt.load_models
build_today_features     = _pt.build_today_features
load_today_from_csv      = _pt.load_today_from_csv
generate_recommendations = _pt.generate_recommendations

app = Flask(__name__)
CORS(app)  # Allow Next.js (different port) to call this API

CSV_DIR    = os.getenv("CSV_DIR",    str(Path(__file__).parent / "csv_data"))
MODELS_DIR = os.getenv("MODELS_DIR", str(Path(__file__).parent / "models"))


@app.route("/health")
def health():
    models_exist = Path(MODELS_DIR).exists() and \
                   (Path(MODELS_DIR) / "model_meta.json").exists()
    return jsonify({
        "status":       "ok",
        "models_ready": models_exist,
        "csv_dir":      CSV_DIR,
        "models_dir":   MODELS_DIR,
    })


@app.route("/model-info")
def model_info():
    """Return info about the current trained models."""
    try:
        meta_path = Path(MODELS_DIR) / "model_meta.json"
        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)
        return jsonify({"success": True, "meta": meta})
    except FileNotFoundError:
        return jsonify({
            "success": False,
            "error": "Aucun modèle entraîné. Importez des données Excel puis cliquez Entraîner."
        }), 404


@app.route("/predict")
def predict():
    """Run prediction using latest CSV data in csv_dir."""
    try:
        models, meta    = load_models(MODELS_DIR)
        feature_columns = meta["feature_columns"]

        today_data = load_today_from_csv(CSV_DIR)
        X_today    = build_today_features(today_data, feature_columns)

        predictions = {}
        for model_name, model in models.items():
            pred = model.predict(X_today)[0]
            predictions[model_name] = round(float(pred), 2)

        recs = generate_recommendations(predictions, today_data)

        return jsonify({
            "success":         True,
            "date_prediction": str(date.today() + timedelta(days=1)),
            "predictions":     predictions,
            "recommendations": recs,
            "today_summary": {
                k: (float(v) if isinstance(v, (int, float, np.integer, np.floating)) else v)
                for k, v in today_data.items()
            }
        })

    except FileNotFoundError as e:
        return jsonify({
            "success": False,
            "error":   str(e),
            "hint":    "Lancez d'abord l'entraînement depuis l'interface admin."
        }), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/predict-from-json", methods=["POST"])
def predict_from_json():
    """
    Run prediction with today's data sent directly as JSON.
    Next.js sends live stats from the database.
    """
    try:
        today_data = request.json or {}

        # Add day of week for tomorrow if not provided
        if "jour_semaine" not in today_data:
            tomorrow = date.today() + timedelta(days=1)
            today_data["jour_semaine"] = tomorrow.weekday()
            today_data["est_lundi"]    = int(tomorrow.weekday() == 0)
            today_data["est_vendredi"] = int(tomorrow.weekday() == 4)

        models, meta    = load_models(MODELS_DIR)
        feature_columns = meta["feature_columns"]
        X_today         = build_today_features(today_data, feature_columns)

        predictions = {}
        for model_name, model in models.items():
            pred = model.predict(X_today)[0]
            predictions[model_name] = round(float(pred), 2)

        recs = generate_recommendations(predictions, today_data)

        return jsonify({
            "success":         True,
            "date_prediction": str(date.today() + timedelta(days=1)),
            "predictions":     predictions,
            "recommendations": recs,
        })

    except FileNotFoundError as e:
        return jsonify({
            "success": False,
            "error":   "Aucun modèle entraîné.",
            "hint":    "Importez des données Excel et cliquez Entraîner dans l'interface admin."
        }), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/retrain", methods=["POST"])
def retrain():
    """
    Retrain models with the latest CSV data.
    Runs build_dataset.py then train_model.py.
    """
    base_dir = str(Path(__file__).parent)

    try:
        # Step 1 — Build dataset from CSVs
        r1 = subprocess.run(
            [sys.executable, "2_build_dataset.py",
             "--csv_dir", CSV_DIR,
             "--output",  str(Path(base_dir) / "dataset.csv")],
            capture_output=True,
            text=True,
            cwd=base_dir
        )
        if r1.returncode != 0:
            return jsonify({
                "success": False,
                "step":    "build_dataset",
                "error":   r1.stderr or r1.stdout
            }), 500

        # Step 2 — Train models
        r2 = subprocess.run(
            [sys.executable, "3_train_model.py",
             "--dataset",    str(Path(base_dir) / "dataset.csv"),
             "--models_dir", MODELS_DIR],
            capture_output=True,
            text=True,
            cwd=base_dir
        )
        if r2.returncode != 0:
            return jsonify({
                "success": False,
                "step":    "train_model",
                "error":   r2.stderr or r2.stdout
            }), 500

        return jsonify({
            "success":      True,
            "message":      "Modèles ré-entraînés avec succès",
            "build_output": r1.stdout[-800:],
            "train_output": r2.stdout[-800:],
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/upload", methods=["POST"])
def upload_files():
    """
    Handle file uploads from Next.js frontend.
    Supports both individual files and directory imports.
    """
    try:
        # Check if files were uploaded
        if 'files' in request.files:
            files = request.files.getlist('files')
            if not files or files[0].filename == '':
                return jsonify({
                    "success": False,
                    "error": "Aucun fichier sélectionné. Veuillez choisir un ou plusieurs fichiers Excel (.xlsx)."
                }), 400

            # Process individual files
            uploaded_files = []
            for file in files:
                if file.filename.lower().endswith('.xlsx'):
                    # Save file to exports directory
                    filename = file.filename
                    file_path = Path(__file__).parent / "exports" / filename
                    file.save(file_path)
                    uploaded_files.append(filename)
                else:
                    return jsonify({
                        "success": False,
                        "error": f"Format de fichier invalide pour '{file.filename}'. Seuls les fichiers Excel (.xlsx) sont acceptés."
                    }), 400

            return jsonify({
                "success": True,
                "filenames": uploaded_files,
                "message": f"Fichiers importés avec succès: {', '.join(uploaded_files)}"
            })

        # Check if directory was specified
        elif 'directory' in request.form:
            directory = request.form['directory']
            directory_path = Path(__file__).parent / "exports" / directory
            
            if not directory_path.exists():
                return jsonify({
                    "success": False,
                    "error": f"Répertoire non trouvé: {directory}"
                }), 400

            # Find all Excel files in directory
            excel_files = list(directory_path.glob("*.xlsx"))
            if not excel_files:
                return jsonify({
                    "success": False,
                    "error": f"Aucun fichier Excel (.xlsx) trouvé dans le répertoire '{directory}'."
                }), 400

            # Copy files to exports root
            uploaded_files = []
            for excel_file in excel_files:
                target_path = Path(__file__).parent / "exports" / excel_file.name
                excel_file.rename(target_path)
                uploaded_files.append(excel_file.name)

            return jsonify({
                "success": True,
                "filenames": uploaded_files,
                "message": f"Répertoire '{directory}' importé avec succès. {len(uploaded_files)} fichiers Excel trouvés."
            })

        else:
            return jsonify({
                "success": False,
                "error": "Aucun fichier ou répertoire spécifié."
            }), 400

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Erreur lors de l'importation: {str(e)}"
        }), 500


if __name__ == "__main__":
    # Make sure required folders exist
    Path(CSV_DIR).mkdir(parents=True, exist_ok=True)
    Path(MODELS_DIR).mkdir(parents=True, exist_ok=True)
    exports_dir = Path(__file__).parent / "exports"
    exports_dir.mkdir(exist_ok=True)

    print("=" * 50)
    print("BK FOOD AI Server")
    print("=" * 50)
    print("   CSV dir    : " + CSV_DIR)
    print("   Models dir : " + MODELS_DIR)
    print("   Running on : http://localhost:5001")
    print("")
    print("   Endpoints:")
    print("   GET  /health")
    print("   GET  /model-info")
    print("   GET  /predict")
    print("   POST /predict-from-json")
    print("   POST /retrain")
    print("=" * 50)

    app.run(host="0.0.0.0", port=5001, debug=False)