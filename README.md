# CareerAI — AI-Powered Career Recommendation Engine

CareerAI is an intelligent job recommendation system that leverages a custom Machine Learning model to analyze a user's education, skills, certifications, and experience, suggesting the best-fitting career paths. Built on a robust Django backend with a modern, responsive frontend (featuring 3D animations using Three.js), it replaces traditional keyword-matching with deep semantic skill mapping.

---

## 🌟 Key Features

*   **Deep Learning Skill Mapping:** Employs a trained scikit-learn classification model to understand contextual relationships rather than just exact keywords.
*   **Instant Predictions:** Fast inference using a pre-trained `.joblib` model loaded into memory on startup via a Django AppConfig singleton.
*   **Interactive UI:** A highly responsive frontend with a 3D infinity particle loop built using Three.js, optimizing performance across desktop and mobile.
*   **Comprehensive API:** RESTful endpoints for live prediction, recommendation history auditing, and model metrics retrieval.
*   **Persisted Audit Logs:** Every prediction and training run is stored in a SQLite database via Django ORM for analytics and historical tracking.
*   **Automated Retraining:** Includes a custom Django management command (`python manage.py train_model`) to easily retrain the model and log accuracy metrics.

---

## 🛠️ Technology Stack

*   **Backend:** Python 3.x, Django 4.2+, Django REST Framework (DRF)
*   **Machine Learning:** scikit-learn, pandas, numpy, joblib
*   **Frontend:** HTML5, CSS3, JavaScript, Bootstrap 5, Three.js
*   **Database:** SQLite (Local) / PostgreSQL (Production ready via `dj-database-url`)
*   **Deployment:** Configured for seamless deployment on Vercel (`vercel.json`, `build_files.sh`).

---

## 🧠 Under the Hood (Architecture)

### 1. Data Models
The application relies on three core database models (found in `recommendations/models.py`):
*   **`UserProfile`**: Stores user features (education level, skills, certifications, experience score, CGPA).
*   **`RecommendationLog`**: Persists the outcome of every prediction request, storing the top predicted career and the full probability distribution (softmax scores) as JSON.
*   **`TrainingRun`**: Records metrics (Accuracy, Precision, Recall, F1-Macro) every time the model is retrained, storing the full classification report.

### 2. Machine Learning Pipeline
*   **Feature Engineering:** Located in `recommendations/ml/feature_engineering.py`. It cleans and structures the input, mapping text data and categorical variables to numerical vectors using pre-fitted encoders.
*   **Model Serving:** The model and encoders are loaded into memory *once* when the Django application starts via `RecommendationsConfig.ready()`. This ensures zero disk I/O overhead per prediction request.

---

## 🚀 Installation & Local Development

### Prerequisites
*   Python 3.10+
*   Git

### Setup Instructions

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/career_recommendation.git
    cd career_recommendation
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    # Windows
    python -m venv myvenv
    myvenv\Scripts\activate
    
    # macOS/Linux
    python3 -m venv myvenv
    source myvenv/bin/activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run database migrations:**
    ```bash
    python manage.py migrate
    ```

5.  *(Optional but recommended)* **Train the model:**
    If you don't have a pre-trained model in the `ml_models/` directory, generate one using the custom management command:
    ```bash
    python manage.py train_model
    ```
    *This parses the dataset, trains the classifier, saves the `.joblib` files to `ml_models/`, and records the metrics in the database.*

6.  **Start the development server:**
    ```bash
    python manage.py runserver
    ```
    Navigate to `http://localhost:8000/` in your browser.

---

## 📡 API Documentation

All API endpoints are prefixed with `/api/recommendations/`.

### 1. Predict Career
*   **Endpoint:** `POST /api/recommendations/predict/` (also supports GET with query params)
*   **Description:** Accepts a user profile, runs it through the ML pipeline, and returns ranked career predictions.
*   **Payload Example:**
    ```json
    {
      "education_level": "Bachelor",
      "skills": "Python, Django, React",
      "certifications": "AWS Certified Developer",
      "experience_score": 3.5,
      "cgpa": 85.0
    }
    ```

### 2. Recommendation History
*   **Endpoint:** `GET /api/recommendations/history/?limit=50`
*   **Description:** Returns past prediction logs with the associated user profile. Useful for building dashboards and auditing.

### 3. Model Metrics
*   **Endpoint:** `GET /api/recommendations/metrics/`
*   **Description:** Returns the performance metrics (Accuracy, F1, Precision, etc.) of the most recently executed training run.

---

## 🌐 Deployment (Vercel)

This project is pre-configured to be deployed on Vercel as a Serverless function. 

*   `vercel.json`: Routes traffic appropriately to the WSGI application and configures static file serving.
*   `build_files.sh`: The Vercel build script that installs requirements, collects static files, and applies database migrations.

To deploy, simply import the repository into your Vercel dashboard. Ensure you configure any required environment variables (e.g., `DJANGO_SECRET_KEY`, `DATABASE_URL` if not using SQLite).

---

## 📁 Project Structure

```text
career_recommendation/
│
├── career_recommendation/     # Django project configuration (settings, core urls)
├── recommendations/           # Main Django app
│   ├── ml/                    # Machine Learning pipeline (feature engineering, training scripts)
│   ├── static/                # CSS, JS (Three.js animations), Images
│   ├── templates/             # HTML templates (home, dashboard, recommendation forms)
│   ├── models.py              # Database schemas (UserProfile, RecommendationLog, TrainingRun)
│   ├── views.py               # REST API Views
│   └── urls.py                # App routing
│
├── data/                      # Raw datasets for model training
├── ml_models/                 # Serialized model artifacts (.joblib files)
├── manage.py                  # Django CLI
├── requirements.txt           # Python dependencies
├── vercel.json                # Vercel serverless configuration
└── build_files.sh             # Vercel deployment build script
```
