"""
Ported from the original standalone data_preprocessing.py.

Logic is unchanged - only the path resolution changed, from computing
BASE_DIR relative to __file__ to reusing Django's settings.BASE_DIR, so
the data folder lives at <project_root>/data regardless of which
management command or process imports this module.
"""
import os
import pandas as pd
from django.conf import settings

DATA_DIR = os.path.join(settings.BASE_DIR, "data")

DS1_PATH = os.path.join(DATA_DIR, "AI_Resume_Screening.csv")
DS2_PATH = os.path.join(DATA_DIR, "AI-based_Career_Recommendation_System.csv")


# DS2 has 32 very specific job titles. We map them down to 4 unified
# career classes that match DS1's labels.
DS2_CAREER_MAP = {
    "AI Researcher"            : "AI Researcher",
    "AI Specialist"            : "AI Researcher",
    "Deep Learning Engineer"   : "AI Researcher",
    "Machine Learning Engineer": "AI Researcher",
    "NLP Engineer"             : "AI Researcher",
    "Data Scientist"           : "Data Scientist",
    "Data Analyst"             : "Data Scientist",
    "Data Engineer"            : "Data Scientist",
    "Research Scientist"       : "Data Scientist",
    "Research Analyst"         : "Data Scientist",
    "Biostatistician"          : "Data Scientist",
    "UX Researcher"            : "Data Scientist",
    "Business Analyst"         : "Data Scientist",
    "Financial Analyst"        : "Data Scientist",
    "Software Engineer"        : "Software Engineer",
    "Software Developer"       : "Software Engineer",
    "Front-end Developer"      : "Software Engineer",
    "Full Stack Developer"     : "Software Engineer",
    "Backend Developer"        : "Software Engineer",
    "Mobile Developer"         : "Software Engineer",
    "DevOps Engineer"          : "Software Engineer",
    "Cloud Engineer"           : "Software Engineer",
    "Automation Engineer"      : "Software Engineer",
    "Embedded Systems Engineer": "Software Engineer",
    "Project Manager"          : "Software Engineer",
    "UX Designer"              : "Software Engineer",
    "Graphic Designer"         : "Software Engineer",
    "Digital Marketer"         : "Software Engineer",
    "Marketing Manager"        : "Software Engineer",
    "Content Strategist"       : "Software Engineer",
    "Cybersecurity Analyst"    : "Cybersecurity Analyst",
    "Cybersecurity Specialist" : "Cybersecurity Analyst",
}

# Education level mapping for both datasets
DS1_EDU_MAP = {
    "B.Sc"   : "Bachelor",
    "B.Tech" : "Bachelor",
    "MBA"    : "Master",
    "M.Tech" : "Master",
    "PhD"    : "PhD",
}

DS2_EDU_MAP = {
    "Bachelor's" : "Bachelor",
    "Master's"   : "Master",
    "PhD"        : "PhD",
}


def load_dataset1():
    # Load the resume screening dataset and clean it up
    df = pd.read_csv(DS1_PATH)

    # Drop columns we don't need for career prediction
    df.drop(columns=["Resume_ID", "Name", "Recruiter Decision",
                      "Salary Expectation ($)"], inplace=True)

    # Some certifications are missing, we just fill them with None
    df["Certifications"] = df["Certifications"].fillna("None")

    # Standardise education labels
    df["education_level"] = df["Education"].map(DS1_EDU_MAP).fillna("Bachelor")
    df.drop(columns=["Education"], inplace=True)

    # Combine years of experience and project count into a single score
    # Both are on a 0-10 scale so averaging them keeps the range consistent
    df["experience_score"] = (
        df["Experience (Years)"] + df["Projects Count"]
    ) / 2.0
    df.drop(columns=["Experience (Years)", "Projects Count"], inplace=True)

    # The AI Score is a 0-100 compatibility score, similar enough to CGPA
    df.rename(columns={"AI Score (0-100)": "cgpa"}, inplace=True)

    df.rename(columns={
        "Skills"        : "skills",
        "Certifications": "certifications",
        "Job Role"      : "career_label",
    }, inplace=True)

    df.drop_duplicates(inplace=True)

    return df[["education_level", "skills", "certifications",
               "experience_score", "cgpa", "career_label"]]


def load_dataset2():
    # Load the AI career recommendation dataset and bring it into
    # the same format as dataset 1
    df = pd.read_csv(DS2_PATH)

    # Remove personal information and columns not useful at prediction time
    df.drop(columns=["CandidateID", "Name", "Age"], inplace=True)

    # Map the 32 specific job titles down to our 4 unified career classes
    df["career_label"] = df["Recommended_Career"].map(DS2_CAREER_MAP)
    df.drop(columns=["Recommended_Career"], inplace=True)

    df["education_level"] = df["Education"].map(DS2_EDU_MAP).fillna("Bachelor")
    df.drop(columns=["Education"], inplace=True)

    # Skills in DS2 are semicolon-separated, convert to comma-separated
    df["skills"] = df["Skills"].str.replace(";", ",", regex=False).str.strip()
    df.drop(columns=["Skills"], inplace=True)

    # Interests serve as a proxy for certifications in this dataset
    df["certifications"] = (
        df["Interests"].str.replace(";", ",", regex=False).str.strip()
    )
    df.drop(columns=["Interests"], inplace=True)

    # DS2 has no experience data so we use a neutral midpoint
    df["experience_score"] = 5.0

    # Convert the recommendation score (0.85-0.95 range) to a 0-100 scale
    df["cgpa"] = (df["Recommendation_Score"] * 100).round(1)
    df.drop(columns=["Recommendation_Score"], inplace=True)

    df.drop_duplicates(inplace=True)

    return df[["education_level", "skills", "certifications",
               "experience_score", "cgpa", "career_label"]]


def merge_datasets():
    df1 = load_dataset1()
    df2 = load_dataset2()

    unified = pd.concat([df1, df2], axis=0, ignore_index=True)
    unified.drop_duplicates(inplace=True)

    return unified


def preprocess(df):
    # Trim whitespace from text columns
    for col in ["education_level", "career_label"]:
        df[col] = df[col].str.strip()
    for col in ["skills", "certifications"]:
        df[col] = df[col].fillna("None").str.strip()

    # Keep numeric values within valid ranges
    df["cgpa"]             = df["cgpa"].clip(0.0, 100.0)
    df["experience_score"] = df["experience_score"].clip(0.0, 10.0)

    # Fill any remaining nulls with safe defaults
    defaults = {
        "education_level"  : "Bachelor",
        "skills"           : "None",
        "certifications"   : "None",
        "experience_score" : 5.0,
        "cgpa"             : 70.0,
    }
    for col, val in defaults.items():
        df[col] = df[col].fillna(val)

    return df


def load_and_preprocess():
    unified = merge_datasets()
    clean   = preprocess(unified)
    return clean
