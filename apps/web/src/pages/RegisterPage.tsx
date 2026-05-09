import { Navigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { RegisterForm } from '../components/auth/RegisterForm';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30">
            <MapPin className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SignalBot</h1>
          <p className="mt-1 text-sm text-gray-500">
            Моніторинг дорожнього трафіку
          </p>
        </div>

        {/* Card */}
        <div className="card">
          <h2 className="mb-6 text-center text-lg font-semibold text-gray-900">
            Створити акаунт
          </h2>
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
