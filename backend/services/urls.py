from django.urls import path
from . import views

urlpatterns = [

    # Auth
    path('auth/register/', views.RegisterView.as_view()),
    path('auth/login/', views.LoginView.as_view()),

    # Profile
    path('users/me/', views.MyProfileView.as_view()),

    # Workers
    path('workers/', views.WorkerListView.as_view()),
    path('workers/<int:pk>/', views.WorkerDetailView.as_view()),
    path('workers/profile/', views.WorkerProfileUpdateView.as_view()),
    path('workers/<int:pk>/verify/', views.VerifyWorkerView.as_view()),
    path('workers/<int:pk>/approve/', views.ApproveWorkerView.as_view()),
    path('workers/<int:pk>/reviews/', views.WorkerReviewsView.as_view()),

    # Categories
    path('services/categories/', views.CategoryListView.as_view()),

    # Service Requests
    path('requests/', views.ServiceRequestListCreateView.as_view()),
    path('requests/<int:pk>/', views.ServiceRequestDetailView.as_view()),
    path('requests/<int:pk>/cancel/', views.CancelRequestView.as_view()),
    path('requests/<int:pk>/accept/', views.AcceptRequestView.as_view()),
    path('requests/<int:pk>/decline/', views.DeclineRequestView.as_view()),
    path('requests/<int:pk>/complete/', views.CompleteRequestView.as_view()),

    # Reviews
    path('reviews/', views.ReviewCreateView.as_view()),

    # Disputes
    path('disputes/', views.DisputeCreateView.as_view()),
    path('disputes/all/', views.DisputeListView.as_view()),
    path('disputes/<int:pk>/resolve/', views.ResolveDisputeView.as_view()),

    # Notifications
    path('notifications/', views.NotificationListView.as_view()),

    # Admin
    path('admin/users/', views.AdminUserListView.as_view()),
]