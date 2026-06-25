from flask import Flask, render_template, request
import numpy as np
import joblib
import os

app = Flask(__name__)

# =========================
# Load model artifacts
# =========================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "model")

rf_model = joblib.load(os.path.join(MODEL_DIR, "random_forest_hypertension_model.pkl"))
scaler = joblib.load(os.path.join(MODEL_DIR, "scaler_hypertension.pkl"))
label_encoders = joblib.load(os.path.join(MODEL_DIR, "label_encoders_hypertension.pkl"))

# Jika file feature_columns ada, pakai untuk menjaga urutan fitur sesuai training.
feature_columns_path = os.path.join(MODEL_DIR, "feature_columns_hypertension.pkl")
if os.path.exists(feature_columns_path):
    feature_columns = joblib.load(feature_columns_path)
else:
    feature_columns = [
        "Age",
        "Salt_Intake",
        "Stress_Score",
        "BP_History",
        "Sleep_Duration",
        "BMI",
        "Medication",
        "Family_History",
        "Exercise_Level",
        "Smoking_Status",
    ]

target_col = "Has_Hypertension"
categorical_cols = ["BP_History", "Medication", "Family_History", "Exercise_Level", "Smoking_Status"]


def encode_kategori(col, value):
    """
    Encode nilai kategorikal menggunakan LabelEncoder yang sudah dilatih.
    Jika value tidak dikenal, fallback ke kelas pertama agar aplikasi tetap berjalan.
    """
    le = label_encoders.get(col)
    if le is None:
        raise ValueError(f"Encoder untuk kolom '{col}' tidak ditemukan di label_encoders.")

    value = "" if value is None else str(value).strip()
    if value not in le.classes_:
        value = le.classes_[0]

    return int(le.transform([value])[0])


def parse_float(form, key):
    return float(form.get(key, 0))


def parse_int(form, key):
    return int(float(form.get(key, 0)))


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():
    try:
        # =========================
        # Ambil input form
        # =========================
        age = parse_float(request.form, "Age")
        salt_intake = parse_float(request.form, "Salt_Intake")
        stress_score = parse_float(request.form, "Stress_Score")
        bp_history = request.form.get("BP_History", "").strip()
        sleep_duration = parse_float(request.form, "Sleep_Duration")
        bmi = parse_float(request.form, "BMI")
        medication = request.form.get("Medication", "").strip()
        family_history = request.form.get("Family_History", "").strip()
        exercise_level = request.form.get("Exercise_Level", "").strip()
        smoking_status = request.form.get("Smoking_Status", "").strip()

        # =========================
        # Encode kategori
        # =========================
        enc_bp_history = encode_kategori("BP_History", bp_history)
        enc_medication = encode_kategori("Medication", medication)
        enc_family_history = encode_kategori("Family_History", family_history)
        enc_exercise_level = encode_kategori("Exercise_Level", exercise_level)
        enc_smoking_status = encode_kategori("Smoking_Status", smoking_status)

        # =========================
        # Susun fitur sesuai training
        # =========================
        features = np.array([[
            age,
            salt_intake,
            stress_score,
            enc_bp_history,
            sleep_duration,
            bmi,
            enc_medication,
            enc_family_history,
            enc_exercise_level,
            enc_smoking_status,
        ]])

        # =========================
        # Scaling & Prediksi
        # =========================
        features_scaled = scaler.transform(features)
        prediction_num = rf_model.predict(features_scaled)[0]
        proba = rf_model.predict_proba(features_scaled)[0]
        confidence = round(float(np.max(proba)) * 100, 2)

        # Decode hasil label
        if target_col in label_encoders:
            prediction_label = label_encoders[target_col].inverse_transform([prediction_num])[0]
        else:
            prediction_label = "Yes" if int(prediction_num) == 1 else "No"

        # =========================
        # Data input untuk hasil
        # =========================
        input_data = {
            "Age": int(age),
            "Salt_Intake": salt_intake,
            "Stress_Score": int(stress_score),
            "BP_History": bp_history,
            "Sleep_Duration": sleep_duration,
            "BMI": bmi,
            "Medication": medication,
            "Family_History": family_history,
            "Exercise_Level": exercise_level,
            "Smoking_Status": smoking_status,
        }

        return render_template(
            "result.html",
            prediction=prediction_label,
            confidence=confidence,
            input_data=input_data,
        )

    except Exception as e:
        return render_template(
            "result.html",
            prediction=None,
            error=str(e),
            input_data={},
        )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
