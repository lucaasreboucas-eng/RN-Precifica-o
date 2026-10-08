import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured, getSupabaseClient } from '../lib/supabase';
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

const LOCAL_STORAGE_SESSION_KEY = 'rn_precificacao_auth_session_v1';

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
        // Clear old automatic demo session key
        localStorage.removeItem('rn_precificacao_demo_session');

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

        // Check local session persistence if not in Supabase or if Supabase session is empty
        const cachedSessionUser = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
        if (cachedSessionUser && isMounted) {
          try {
            const parsed = JSON.parse(cachedSessionUser);
            if (parsed?.id && parsed?.email) {
              setUser(parsed);
              setSessionToken('auth-session-active');
            } else {
              localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
            }
          } catch {
            localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
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
            if (!localStorage.getItem(LOCAL_STORAGE_SESSION_KEY)) {
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
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail || !password) {
        setIsLoading(false);
        return {
          success: false,
          error: 'Informe seu e-mail e senha para entrar.',
        };
      }

      try {
        // 1. Check master general user adm@rnprecificacao.com.br
        if (cleanEmail === 'adm@rnprecificacao.com.br' && password === 'adm12345') {
          const masterAdminUser: UserProfile = {
            id: 'user-adm',
            email: 'adm@rnprecificacao.com.br',
            fullName: 'Administrador Geral',
            role: 'Administrador Geral',
            createdAt: new Date().toISOString(),
          };
          localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(masterAdminUser));
          setUser(masterAdminUser);
          setSessionToken('master-admin-session');
          setIsLoading(false);
          return { success: true };
        }

        // 2. Check Supabase managed_users table if configured
        const client = supabase || (await getSupabaseClient());
        if (client) {
          const { data: managedUser } = await client
            .from('managed_users')
            .select('*, profiles(name)')
            .ilike('email', cleanEmail)
            .maybeSingle();

          if (managedUser) {
            if (managedUser.status === 'bloqueado') {
              setIsLoading(false);
              return {
                success: false,
                error: 'Este usuário está bloqueado. Contate o administrador.',
              };
            }

            if (managedUser.password && managedUser.password === password) {
              const authenticatedManagedUser: UserProfile = {
                id: managedUser.id,
                email: managedUser.email,
                fullName: managedUser.name,
                role: managedUser.profiles?.name || 'Administrador Geral',
                createdAt: managedUser.created_at || new Date().toISOString(),
              };
              localStorage.setItem(
                LOCAL_STORAGE_SESSION_KEY,
                JSON.stringify(authenticatedManagedUser)
              );
              setUser(authenticatedManagedUser);
              setSessionToken('managed-user-session');
              setIsLoading(false);
              return { success: true };
            } else {
              setIsLoading(false);
              return { success: false, error: 'E-mail ou senha incorretos.' };
            }
          }

          // 3. Try Supabase Auth
          const { data, error } = await client.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

          if (error) {
            setIsLoading(false);
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
              role: 'Administrador Geral',
              createdAt: data.user.created_at,
            });
            setSessionToken(data.session?.access_token || 'active-session');
            setIsLoading(false);
            return { success: true };
          }
        }

        // 4. Check local storage managed users
        try {
          const savedUsersRaw = localStorage.getItem('rn_precificacao_users_prod_v1');
          if (savedUsersRaw) {
            const savedUsers = JSON.parse(savedUsersRaw);
            const matchedLocalUser = savedUsers.find(
              (u: any) => u.email?.toLowerCase() === cleanEmail
            );
            if (matchedLocalUser) {
              if (matchedLocalUser.status === 'bloqueado') {
                setIsLoading(false);
                return {
                  success: false,
                  error: 'Este usuário está bloqueado. Contate o administrador.',
                };
              }
              if (matchedLocalUser.password && matchedLocalUser.password === password) {
                const localUserData: UserProfile = {
                  id: matchedLocalUser.id,
                  email: matchedLocalUser.email,
                  fullName: matchedLocalUser.name,
                  role:
                    matchedLocalUser.profileId === 'perfil-admin'
                      ? 'Administrador Geral'
                      : 'Orçamentista',
                  createdAt: matchedLocalUser.createdAt || new Date().toISOString(),
                };
                localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(localUserData));
                setUser(localUserData);
                setSessionToken('auth-session-active');
                setIsLoading(false);
                return { success: true };
              } else {
                setIsLoading(false);
                return { success: false, error: 'E-mail ou senha incorretos.' };
              }
            }
          }
        } catch {
          // ignore parse error
        }

        setIsLoading(false);
        return {
          success: false,
          error: 'E-mail ou senha incorretos.',
        };
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
    // No longer used
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
      localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
      localStorage.removeItem('rn_precificacao_demo_session');
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
