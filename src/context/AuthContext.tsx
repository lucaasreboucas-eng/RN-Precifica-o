import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { UserProfile, LoginCredentials } from '../types/auth';

interface AuthContextType {
  user: UserProfile | null;
  sessionToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isConfigured: boolean;
  signIn: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  loginAsDemo: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_DEMO_USER_KEY = 'rn_precificacao_demo_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isConfigured = isSupabaseConfigured();

  // Load existing session on initial mount
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        if (isConfigured && supabase) {
          const { data, error } = await supabase.auth.getSession();
          if (!error && data?.session?.user && isMounted) {
            setUser({
              id: data.session.user.id,
              email: data.session.user.email || '',
              fullName: data.session.user.user_metadata?.full_name || data.session.user.email?.split('@')[0],
              role: 'Administrador',
              createdAt: data.session.user.created_at,
            });
            setSessionToken(data.session.access_token);
            setIsLoading(false);
            return;
          }
        }

        // Check local demo persistence if not in Supabase or if Supabase session is empty
        const cachedDemoUser = localStorage.getItem(LOCAL_STORAGE_DEMO_USER_KEY);
        if (cachedDemoUser && isMounted) {
          try {
            const parsed = JSON.parse(cachedDemoUser);
            setUser(parsed);
            setSessionToken('demo-token-active');
          } catch {
            localStorage.removeItem(LOCAL_STORAGE_DEMO_USER_KEY);
          }
        }
      } catch (err) {
        console.error('Erro ao verificar sessão:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkSession();

    // Setup Supabase auth state listener if client is configured
    if (isConfigured && supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (session?.user) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
              role: 'Administrador',
              createdAt: session.user.created_at,
            });
            setSessionToken(session.access_token);
          } else {
            // User signed out in Supabase
            if (!localStorage.getItem(LOCAL_STORAGE_DEMO_USER_KEY)) {
              setUser(null);
              setSessionToken(null);
            }
          }
          setIsLoading(false);
        }
      );

      return () => {
        isMounted = false;
        authListener?.subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, [isConfigured]);

  const signIn = useCallback(
    async ({ email, password }: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);

      try {
        if (isConfigured && supabase) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

          if (error) {
            setIsLoading(false);
            // Translate common Supabase Auth errors to Portuguese
            let errorMessage = 'Falha ao autenticar. Verifique suas credenciais.';
            if (error.message.includes('Invalid login credentials')) {
              errorMessage = 'E-mail ou senha incorretos.';
            } else if (error.message.includes('Email not confirmed')) {
              errorMessage = 'E-mail ainda não confirmado. Verifique sua caixa de entrada.';
            } else if (error.message.includes('Too many requests')) {
              errorMessage = 'Muitas tentativas consecutivas. Aguarde alguns minutos.';
            } else if (error.message) {
              errorMessage = error.message;
            }
            return { success: false, error: errorMessage };
          }

          if (data.user) {
            setUser({
              id: data.user.id,
              email: data.user.email || email,
              fullName: data.user.user_metadata?.full_name || email.split('@')[0],
              role: 'Administrador',
              createdAt: data.user.created_at,
            });
            setSessionToken(data.session?.access_token || 'active-session');
            setIsLoading(false);
            return { success: true };
          }
        }

        // Fallback / direct access mode
        await new Promise((resolve) => setTimeout(resolve, 300));

        const userEmail = email.trim() || 'gestor@rnprecificacao.com.br';
        const demoUserData: UserProfile = {
          id: 'gestor-rn',
          email: userEmail,
          fullName: userEmail.includes('@')
            ? userEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
            : 'Gestor RN Precificação',
          role: 'Administrador Gestor',
          createdAt: new Date().toISOString(),
        };

        localStorage.setItem(LOCAL_STORAGE_DEMO_USER_KEY, JSON.stringify(demoUserData));
        setUser(demoUserData);
        setSessionToken('auth-session-active');
        setIsLoading(false);
        return { success: true };
      } catch (err: any) {
        setIsLoading(false);
        return {
          success: false,
          error: err?.message || 'Ocorreu um erro inesperado ao conectar ao servidor.',
        };
      }
    },
    [isConfigured]
  );

  const loginAsDemo = useCallback(async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 600));

    const demoUser: UserProfile = {
      id: 'demo-admin-rn',
      email: 'gestor@rnprecificacao.com.br',
      fullName: 'Gestor RN Precificação',
      role: 'Administrador Principal',
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(LOCAL_STORAGE_DEMO_USER_KEY, JSON.stringify(demoUser));
    setUser(demoUser);
    setSessionToken('demo-auth-session');
    setIsLoading(false);
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isConfigured && supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Erro ao encerrar sessão no Supabase:', err);
    } finally {
      localStorage.removeItem(LOCAL_STORAGE_DEMO_USER_KEY);
      setUser(null);
      setSessionToken(null);
      setIsLoading(false);
    }
  }, [isConfigured]);

  const sendPasswordReset = useCallback(
    async (email: string): Promise<{ success: boolean; error?: string; message?: string }> => {
      try {
        if (isConfigured && supabase) {
          const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: window.location.origin,
          });

          if (error) {
            return {
              success: false,
              error: 'Não foi possível enviar o e-mail de recuperação: ' + error.message,
            };
          }

          return {
            success: true,
            message: 'Instruções de recuperação foram enviadas para o seu e-mail.',
          };
        }

        // Demo recovery simulation
        await new Promise((resolve) => setTimeout(resolve, 800));
        return {
          success: true,
          message: `Link de redefinição enviado com sucesso para ${email} (modo de teste).`,
        };
      } catch (err: any) {
        return {
          success: false,
          error: err?.message || 'Erro ao solicitar redefinição de senha.',
        };
      }
    },
    [isConfigured]
  );

  const value = {
    user,
    sessionToken,
    isLoading,
    isAuthenticated: Boolean(user && sessionToken),
    isConfigured,
    signIn,
    signOut,
    sendPasswordReset,
    loginAsDemo,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
