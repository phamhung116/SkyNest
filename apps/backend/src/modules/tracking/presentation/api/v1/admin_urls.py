from django.urls import path

from modules.tracking.presentation.api.v1.views import AdminBookingTrackingApi, AdminFlightStatusUpdateApi

urlpatterns = [
    path(
        "bookings/<str:code>/tracking/",
        AdminBookingTrackingApi.as_view(),
        name="admin-booking-tracking",
    ),
    path(
        "bookings/<str:code>/flight-status/",
        AdminFlightStatusUpdateApi.as_view(),
        name="admin-flight-status-update",
    ),
]
