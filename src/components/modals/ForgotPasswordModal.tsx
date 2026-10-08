import React, { useState } from 'react';
import { Mail, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { useAuth } from '../../context/AuthContext';

export interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = '',
}) => {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Sync initial email when modal opens
  React.useEffect(() => {
    if (isOpen && defaultEmail) {
      setEmail(defaultEmail);
    }
    if (isOpen) {
      setError('');
      setSuccessMessage('');
    }
  }, [isOpen, defaultEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email.trim()) {
      setError('Por favor, informe seu e-mail cadastrado.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Por favor, informe um e-mail válido.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await sendPasswordReset(email);
      if (result.success) {
        setSuccessMessage(result.message || 'Instruções enviadas com sucesso!');
      } else {
        setError(result.error || 'Não foi possível solicitar a redefinição.');
      }
    } catch {
      setError('Ocorreu um erro ao processar sua solicitação.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dark"
      title="Recuperação de Senha"
      description="Informe seu e-mail cadastrado para receber um link de redefinição de acesso."
    >
      {successMessage ? (
        <div className="space-y-4 text-center py-2">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <Alert type="success" title="E-mail enviado!">
            {successMessage}
          </Alert>
          <Button variant="secondary" fullWidth onClick={onClose}>
            Voltar ao Login
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert type="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Input
            variant="dark"
            label="E-mail Cadastrado"
            type="email"
            placeholder="seu.email@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            required
            autoFocus
          />

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="flex-1"
            >
              Enviar Link
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
