import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { UserPlus, Mail, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function RegisterForm() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      toast.error('Заповніть всі поля');
      return;
    }
    if (password.length < 6) {
      toast.error('Пароль має бути не менше 6 символів');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Паролі не співпадають');
      return;
    }
    setLoading(true);
    try {
      await register(email, password);
      toast.success('Реєстрація успішна');
      navigate('/');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || 'Помилка реєстрації';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="input-field pl-10"
            autoComplete="email"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Пароль
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
            className="input-field pl-10"
            autoComplete="new-password"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Підтвердіть пароль
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="********"
            className="input-field pl-10"
            autoComplete="new-password"
          />
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <>
            <UserPlus className="mr-2 h-4 w-4" />
            Зареєструватися
          </>
        )}
      </button>

      <p className="text-center text-sm text-gray-500">
        Вже маєте акаунт?{' '}
        <Link
          to="/login"
          className="font-medium text-blue-600 hover:text-blue-700"
        >
          Увійти
        </Link>
      </p>
    </form>
  );
}
