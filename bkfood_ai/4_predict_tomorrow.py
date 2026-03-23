"""
STEP 4 — Generate tomorrow's predictions and manager recommendations.
Takes today's production data, runs all models, outputs a human-readable action plan.

Usage:
    python 4_predict_tomorrow.py
    python 4_predict_tomorrow.py --today_csv csv_data/palettes_today.csv --output rapport_demain.json
"""

import pandas as pd
import numpy as np
import pickle
import json
import argparse
from pathlib import Path
from datetime import date, timedelta


def load_models(models_dir: str):
    """Load all trained models and their metadata."""
    models_dir = Path(models_dir)
    meta_path  = models_dir / "model_meta.json"

    if not meta_path.exists():
        raise FileNotFoundError(
            f"No model_meta.json found in {models_dir}. "
            "Run 3_train_model.py first."
        )

    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    models = {}
    all_names = meta["regression_targets"] + meta["classification_targets"]

    for name in all_names:
        model_path = models_dir / f"{name}.pkl"
        if model_path.exists():
            with open(model_path, "rb") as f:
                models[name] = pickle.load(f)
        else:
            print(f"⚠️  Model file missing: {model_path}")

    return models, meta


def build_today_features(today_data: dict, feature_columns: list) -> pd.DataFrame:
    """
    Build a single feature row from today's live data.
    today_data: dict of feature_name → value (from your app's API or CSV)
    """
    row = {col: today_data.get(col, 0) for col in feature_columns}
    return pd.DataFrame([row])


def load_today_from_csv(csv_dir: str, target_date: str = None) -> dict:
    """
    Load today's data from the most recent CSV files.
    Falls back to latest available date if today not found.
    """
    csv_dir = Path(csv_dir)
    today = target_date or str(date.today())

    data = {}

    # Load palettes
    pal_files = sorted(csv_dir.glob("palettes_*.csv"))
    if pal_files:
        df_pal = pd.read_csv(pal_files[-1])
        df_pal["entry_time"] = pd.to_datetime(df_pal["entry_time"], errors="coerce")

        data["palettes_entrees"]      = len(df_pal)
        data["tonnage_total_kg"]      = df_pal["weight_kg"].sum() if "weight_kg" in df_pal else 0
        data["tonnage_moyen_palette"] = df_pal["weight_kg"].mean() if ("weight_kg" in df_pal and len(df_pal) > 0) else 0

        if "exit_time" in df_pal.columns:
            df_pal["exit_time"]  = pd.to_datetime(df_pal["exit_time"], errors="coerce")
            df_pal["wait_hours"] = (df_pal["exit_time"] - df_pal["entry_time"]).dt.total_seconds() / 3600
            data["attente_moyenne_h"] = df_pal["wait_hours"].mean()
            data["attente_max_h"]     = df_pal["wait_hours"].max()
            data["nb_alertes_8h"]     = (df_pal["wait_hours"] > 8).sum()

        if "longe_type" in df_pal.columns:
            type_counts = df_pal["longe_type"].value_counts()
            for lt in ["CB Simple parage", "CB Double parage", "CT simple parage",
                       "Longe précuit", "Miette", "Morcelé"]:
                safe_key = "type_" + lt.lower().replace(" ", "_").replace("é", "e").replace("è", "e")
                data[safe_key] = int(type_counts.get(lt, 0))

        if "status" in df_pal.columns:
            data["stock_fin_jour"] = (df_pal["status"] == "IN_CHAMBRE").sum()

    # Load lignes
    lig_files = sorted(csv_dir.glob("lignes_*.csv"))
    if lig_files:
        df_lig = pd.read_csv(lig_files[-1])
        data["palettes_alimentees_ligne"] = len(df_lig)
        if "article" in df_lig.columns:
            data["nb_articles_differents"] = df_lig["article"].nunique()
        if "ligne_label" in df_lig.columns:
            counts = df_lig["ligne_label"].value_counts()
            for ligne in ["5/2 [1]", "5/2 [2]", "400", "1/5", "Manuel"]:
                safe = "ligne_" + ligne.lower().replace("/", "_").replace(" ", "").replace("[", "").replace("]", "")
                data[safe] = int(counts.get(ligne, 0))

    # Load autoclaves
    auto_files = sorted(csv_dir.glob("autoclaves_*.csv"))
    if auto_files:
        df_auto = pd.read_csv(auto_files[-1])
        data["nb_cycles_autoclave"]   = len(df_auto)
        data["duree_moyenne_cycle"]   = df_auto["duration_minutes"].mean() if "duration_minutes" in df_auto else 0
        data["duree_max_cycle"]       = df_auto["duration_minutes"].max()  if "duration_minutes" in df_auto else 0
        if "autoclave_id" in df_auto.columns:
            data["nb_autoclaves_utilises"] = df_auto["autoclave_id"].nunique()

    # Load emballage
    emb_files = sorted(csv_dir.glob("emballage_*.csv"))
    if emb_files:
        df_emb = pd.read_csv(emb_files[-1])
        data["boites_emballees"]  = df_emb["total_boxes"].sum() if "total_boxes" in df_emb else 0
        data["nb_lots_emballage"] = len(df_emb)

    # Day of week for tomorrow
    tomorrow = date.today() + timedelta(days=1)
    data["jour_semaine"] = tomorrow.weekday()
    data["est_lundi"]    = int(tomorrow.weekday() == 0)
    data["est_vendredi"] = int(tomorrow.weekday() == 4)

    return data


def generate_recommendations(predictions: dict, today_data: dict) -> list:
    """
    Convert raw predictions into human-readable manager action recommendations.
    Returns a list of recommendation strings in French.
    """
    recs = []
    tomorrow = (date.today() + timedelta(days=1)).strftime("%A %d/%m/%Y")

    recs.append(f"📅 PLAN D'ACTION — {tomorrow.upper()}")
    recs.append("=" * 55)

    # ── Palettes & tonnage ────────────────────────────────────────────
    pred_pal = predictions.get("palettes_demain", 0)
    pred_ton = predictions.get("tonnage_demain", 0)
    today_pal = today_data.get("palettes_entrees", 0)

    recs.append(f"\n❄️  CHAMBRE 0")
    recs.append(f"   Palettes prévues demain  : ~{pred_pal:.0f} palettes")
    recs.append(f"   Tonnage prévu demain     : ~{pred_ton:.0f} kg")

    if today_pal > 0:
        if pred_pal > today_pal * 1.15:
            recs.append(f"   ⚠️  HAUSSE prévue (+{((pred_pal/today_pal)-1)*100:.0f}%) — prévoir personnel supplémentaire en chambre")
        elif pred_pal < today_pal * 0.85:
            recs.append(f"   📉 BAISSE prévue — journée moins chargée")
        else:
            recs.append(f"   ✅ Volume similaire à aujourd'hui")
    else:
        recs.append(f"   ✅ Aucune donnée d'aujourd'hui — utiliser prédiction seule")

    stock = today_data.get("stock_fin_jour", 0)
    if stock > 20:
        recs.append(f"   🚨 Stock actuel élevé ({stock} palettes) — accélérer sorties vers lignes demain")
    elif stock > 10:
        recs.append(f"   ⚡ Stock modéré ({stock} palettes) — surveiller les sorties")

    # ── Alertes 8h ────────────────────────────────────────────────────
    risk_alert = predictions.get("risque_alertes", 0)
    alertes_today = today_data.get("nb_alertes_8h", 0)

    recs.append(f"\n⏱️  ALERTES TEMPS DÉPASSÉ")
    if risk_alert > 0.6:
        recs.append(f"   🔴 RISQUE ÉLEVÉ ({risk_alert:.0%}) d'alertes >8h demain")
        recs.append(f"      → Planifier rotations chambre toutes les 6h")
        recs.append(f"      → Prévenir cheffe ligne dès 7h du matin")
    elif risk_alert > 0.3:
        recs.append(f"   🟡 Risque modéré ({risk_alert:.0%}) — surveiller les temps d'attente")
    else:
        recs.append(f"   🟢 Risque faible ({risk_alert:.0%}) — opérations normales")

    # ── Lignes ────────────────────────────────────────────────────────
    recs.append(f"\n🏭  LIGNES DE PRODUCTION")
    lignes_actives = today_data.get("palettes_alimentees_ligne", 0)
    if lignes_actives > 0:
        recs.append(f"   Palettes alimentées aujourd'hui : {lignes_actives}")
    if pred_ton > 2000:
        recs.append(f"   → Activer au moins 3 lignes demain pour absorber le volume")
    elif pred_ton > 1000:
        recs.append(f"   → 2 lignes suffisantes demain")
    else:
        recs.append(f"   → 1 ligne suffisante demain")

    # ── Autoclaves ────────────────────────────────────────────────────
    pred_cycles = predictions.get("cycles_demain", 0)
    today_cycles = today_data.get("nb_cycles_autoclave", 0)

    recs.append(f"\n🔥  AUTOCLAVES")
    recs.append(f"   Cycles prévus demain : ~{pred_cycles:.0f} cycles")

    if pred_cycles > today_cycles * 1.2:
        recs.append(f"   ⚠️  Plus de cycles que d'habitude — vérifier disponibilité conducteurs")
    if pred_cycles > 4:
        recs.append(f"   → Prévoir {min(5, int(pred_cycles))}/5 autoclaves opérationnels demain")
    elif pred_cycles > 2:
        recs.append(f"   → Prévoir 2-3 autoclaves opérationnels")
    else:
        recs.append(f"   → 1-2 autoclaves suffisants")

    avg_dur = today_data.get("duree_moyenne_cycle", 0)
    if avg_dur > 0:
        recs.append(f"   Durée moyenne cycle aujourd'hui : {avg_dur:.0f} min")

    # ── Emballage ─────────────────────────────────────────────────────
    pred_boites = predictions.get("boites_demain", 0)

    recs.append(f"\n📦  EMBALLAGE")
    recs.append(f"   Boîtes prévues demain : ~{pred_boites:.0f} boîtes")

    if pred_boites > 5000:
        recs.append(f"   ⚠️  Volume élevé — s'assurer matériaux emballage suffisants")
    if pred_boites > today_data.get("boites_emballees", 0) * 1.2:
        recs.append(f"   📈 Hausse prévue — prévoir personnel emballage renforcé")

    recs.append(f"\n{'=' * 55}")
    recs.append(f"⚙️  Généré automatiquement par BK FOOD AI")
    recs.append(f"   Basé sur {today_data.get('palettes_entrees', 0)} palettes traitées aujourd'hui")

    return recs


def predict_tomorrow(csv_dir: str, models_dir: str, output_path: str):
    print("🤖 BK FOOD AI — Prédiction pour demain\n")

    # Load models
    try:
        models, meta = load_models(models_dir)
    except FileNotFoundError as e:
        print(f"❌ {e}")
        return

    feature_columns = meta["feature_columns"]

    # Load today's data from CSV
    print("📂 Chargement des données d'aujourd'hui...")
    today_data = load_today_from_csv(csv_dir)
    print(f"   Données chargées: {len(today_data)} features")

    # Build feature row
    X_today = build_today_features(today_data, feature_columns)

    # Run all predictions
    predictions = {}
    print("\n📊 Prédictions:")
    for model_name, model in models.items():
        try:
            pred = model.predict(X_today)[0]
            predictions[model_name] = float(pred)
            print(f"   {model_name:30s}: {pred:.2f}")
        except Exception as e:
            print(f"   ⚠️  {model_name} failed: {e}")
            predictions[model_name] = 0.0

    # Generate recommendations
    recs = generate_recommendations(predictions, today_data)
    print("\n" + "\n".join(recs))

    # Save output JSON
    output = {
        "date_prediction": str(date.today() + timedelta(days=1)),
        "generated_at":    str(date.today()),
        "predictions":     {k: round(v, 2) for k, v in predictions.items()},
        "today_summary":   {k: (float(v) if isinstance(v, (int, float, np.integer, np.floating)) else v)
                            for k, v in today_data.items()},
        "recommendations": recs,
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False, default=str)

    print(f"\n💾 Rapport sauvegardé: {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv_dir",    default="csv_data",           help="Folder with today's CSV data")
    parser.add_argument("--models_dir", default="models/",            help="Trained models folder")
    parser.add_argument("--output",     default="rapport_demain.json", help="Output JSON report path")
    args = parser.parse_args()

    predict_tomorrow(args.csv_dir, args.models_dir, args.output)
