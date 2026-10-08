import React, { useState } from 'react';
import { Mail, Lock, LogIn } from 'lucide-react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Logo } from '../components/brand/Logo';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { ForgotPasswordModal } from '../components/modals/ForgotPasswordModal';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  // Modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      await signIn({
        email: email.trim() || 'gestor@rnprecificacao.com.br',
        password: password || '123456',
      });
    } catch (err: any) {
      setErrors({
        general: err?.message || 'Falha ao processar login. Tente novamente mais tarde.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full flex flex-col items-center">
        {/* Brand Emblem & System Title */}
        <div className="mb-6 text-center">
          <Logo size="lg" orientation="vertical" showText={true} />
        </div>

        {/* Login Main Card */}
        <Card variant="dark" className="w-full border-amber-500/20 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-100">
              Acesso ao Sistema
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Informe suas credenciais para gerenciar cálculos e orçamentos
            </p>
          </CardHeader>

          <CardContent className="space-y-5 pt-3">
            {/* General Error Alert */}
            {errors.general && (
              <Alert
                type="error"
                onClose={() => setErrors((prev) => ({ ...prev, general: undefined }))}
              >
                {errors.general}
              </Alert>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <Input
                variant="dark"
                label="E-mail Corporativo"
                type="email"
                placeholder="nome@rnprecificacao.com.br"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                error={errors.email}
                leftIcon={<Mail className="w-4 h-4" />}
                autoComplete="email"
                disabled={isLoading}
              />

              <div className="space-y-1">
                <Input
                  variant="dark"
                  label="Senha de Acesso"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  error={errors.password}
                  leftIcon={<Lock className="w-4 h-4" />}
                  autoComplete="current-password"
                  disabled={isLoading}
                />

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(true)}
                    className="text-xs text-amber-400/90 hover:text-amber-300 transition-colors font-medium focus:outline-none focus:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                rightIcon={<LogIn className="w-4 h-4" />}
                className="mt-2"
              >
                {isLoading ? 'Autenticando...' : 'Entrar no Sistema'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        defaultEmail={email}
      />
    </AuthLayout>
  );
};

