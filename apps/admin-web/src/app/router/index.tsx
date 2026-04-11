import { Navigate, Route, Routes } from "react-router-dom";
import { useAdminAuth } from "@/app/providers/auth-provider";
import { AccountDetailPage } from "@/pages/accounts/detail";
import { AccountsPage } from "@/pages/accounts";
import { BookingDetailPage } from "@/pages/bookings/detail";
import { BookingsPage } from "@/pages/bookings";
import { LoginPage } from "@/pages/login";
import { PostDetailPage } from "@/pages/posts/detail";
import { PostsPage } from "@/pages/posts";
import { routes } from "@/shared/config/routes";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, loading } = useAdminAuth();
  if (loading) {
    return null;
  }
  return isAuthenticated ? children : <Navigate to={routes.login} replace />;
};

export const AppRouter = () => (
  <Routes>
    <Route path={routes.login} element={<LoginPage />} />
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <Navigate to={routes.bookings} replace />
        </ProtectedRoute>
      }
    />
    <Route
      path={routes.bookings}
      element={
        <ProtectedRoute>
          <BookingsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path={routes.bookingDetail}
      element={
        <ProtectedRoute>
          <BookingDetailPage />
        </ProtectedRoute>
      }
    />
    <Route
      path={routes.accounts}
      element={
        <ProtectedRoute>
          <AccountsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path={routes.accountDetail}
      element={
        <ProtectedRoute>
          <AccountDetailPage />
        </ProtectedRoute>
      }
    />
    <Route
      path={routes.posts}
      element={
        <ProtectedRoute>
          <PostsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/posts/:slug"
      element={
        <ProtectedRoute>
          <PostDetailPage />
        </ProtectedRoute>
      }
    />
    <Route path="*" element={<Navigate to={routes.login} replace />} />
  </Routes>
);
