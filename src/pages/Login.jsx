import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogIn } from 'lucide-react';
import { authApi } from '../api';
import { useAuthStore } from '../store/authStore';
import { Field, Input } from '../components/forms/Field';
import Button from '../components/ui/Button';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      const { data } = await authApi.login(values);
      setSession(data);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setServerError(err.message);
    }
  };

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-logo">
          <img src="/logo.jpg" alt="GIA Educare" />
        </div>
        <h1>Admin sign in</h1>
        <p className="sub">Manage content, leads and site settings.</p>

        {serverError && <div className="login-error">{serverError}</div>}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label="Email" required error={errors.email?.message}>
            <Input type="email" autoComplete="email" placeholder="you@giaeducare.com" {...register('email')} />
          </Field>

          <Field label="Password" required error={errors.password?.message}>
            <Input type="password" autoComplete="current-password" placeholder="••••••••" {...register('password')} />
          </Field>

          <Button type="submit" variant="gold" block icon={LogIn} loading={isSubmitting} style={{ marginTop: 6 }}>
            Sign in
          </Button>
        </form>

        <p className="login-hint">
          Seeded account: <strong>admin@giaeducare.com</strong>
          <br />
          Change this password from Profile after your first sign-in.
        </p>
      </div>
    </div>
  );
}
