"""
career_recommendation/urls.py  — project root URL configuration
"""
from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView

urlpatterns = [
    path("",                     TemplateView.as_view(template_name="home.html"), name="home"),
    path("recommendation/",      TemplateView.as_view(template_name="recommendation.html"), name="recommendation"),
    path("dashboard/",           TemplateView.as_view(template_name="dashboard.html"), name="dashboard"),
    path("admin/",                admin.site.urls),
    path("api/recommendations/", include("recommendations.urls")),
]
