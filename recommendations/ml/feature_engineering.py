"""
Ported unchanged from the original feature_engineering.py.

build_features() is used only by the offline `train_model` management
command. transform_user_input() is the function the live API view calls
on every prediction request, reusing the encoders that were fitted
during training (loaded once at server start, see recommendations/apps.py).
"""
import numpy as np
import pandas as pd
from scipy.sparse import hstack, csr_matrix
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split

# Education levels are ordered so we encode them as integers
# Bachelor = 0, Master = 1, PhD = 2
EDUCATION_ORDER = {
    "Bachelor" : 0,
    "Master"   : 1,
    "PhD"      : 2,
}


def build_features(df, test_size=0.2, random_state=42):
    # Encode the career labels into integers for the classifier
    le_target = LabelEncoder()
    y = le_target.fit_transform(df["career_label"])
    label_classes = list(le_target.classes_)

    # Convert education level to an ordered number
    edu_encoded = (
        df["education_level"]
          .map(EDUCATION_ORDER)
          .fillna(0)
          .astype(float)
          .values
          .reshape(-1, 1)
    )

    # TF-IDF on skills text - captures which skills matter most
    # Using bigrams (1,2) helps catch phrases like "machine learning"
    tfidf_skills = TfidfVectorizer(
        max_features=100,
        ngram_range=(1, 2),
        min_df=2,
        strip_accents="unicode",
        lowercase=True,
    )
    skills_matrix = tfidf_skills.fit_transform(df["skills"])

    # TF-IDF on certifications text
    tfidf_certs = TfidfVectorizer(
        max_features=50,
        ngram_range=(1, 2),
        min_df=2,
        strip_accents="unicode",
        lowercase=True,
    )
    certs_matrix = tfidf_certs.fit_transform(df["certifications"])

    # Scale experience score and cgpa so they are on the same scale
    # as each other and don't dominate the other features
    scaler = StandardScaler()
    numeric_scaled = scaler.fit_transform(
        df[["experience_score", "cgpa"]].values
    )

    # Stack all features into one matrix
    edu_sparse     = csr_matrix(edu_encoded.astype(float))
    numeric_sparse = csr_matrix(numeric_scaled.astype(float))

    X = hstack([
        edu_sparse,
        skills_matrix,
        certs_matrix,
        numeric_sparse,
    ])

    # Stratified split ensures each career class is proportionally
    # represented in both train and test sets
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=test_size,
        random_state=random_state,
        stratify=y,
    )

    encoders = {
        "le_target"    : le_target,
        "tfidf_skills" : tfidf_skills,
        "tfidf_certs"  : tfidf_certs,
        "scaler"       : scaler,
    }

    return X_train, X_test, y_train, y_test, encoders, label_classes


def transform_user_input(user_input, encoders):
    # Apply the same transformations to a single user input at prediction time

    edu_raw = str(user_input.get("education_level", "")).strip()
    edu_val = EDUCATION_ORDER.get(edu_raw, 0)
    edu_sparse = csr_matrix([[float(edu_val)]])

    skills_text = str(user_input.get("skills", "None")).strip() or "None"
    skills_mat  = encoders["tfidf_skills"].transform([skills_text])

    certs_text = str(user_input.get("certifications", "None")).strip() or "None"
    certs_mat  = encoders["tfidf_certs"].transform([certs_text])

    exp_score = float(user_input.get("experience_score", 5.0))
    cgpa      = float(user_input.get("cgpa", 70.0))
    numeric_scaled = encoders["scaler"].transform([[exp_score, cgpa]])
    numeric_sparse = csr_matrix(numeric_scaled)

    X_user = hstack([edu_sparse, skills_mat, certs_mat, numeric_sparse])
    return X_user
