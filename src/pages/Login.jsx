import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
// @ts-nocheck
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/lib/AuthContext';

// `checkJs: true` + components built in plain JS can make TS infer `{}` props for `forwardRef`.
// Casting here keeps the login page clean without changing the UI library files.
const ButtonUI = /** @type {any} */ (Button);
const InputUI = /** @type {any} */ (Input);
const LabelUI = /** @type {any} */ (Label);
const CardUI = /** @type {any} */ (Card);
const CardHeaderUI = /** @type {any} */ (CardHeader);
const CardTitleUI = /** @type {any} */ (CardTitle);
const CardDescriptionUI = /** @type {any} */ (CardDescription);
const CardContentUI = /** @type {any} */ (CardContent);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  fullName: z.string().min(1).optional(),
  email: z.string().email(),
  password: z.string().min(8),
});

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const { checkAppState } = useAuth();
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [inlineError, setInlineError] = useState('');
  const [inlineInfo, setInlineInfo] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);

  const from = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('from') || '/';
  }, [location.search]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setInlineError('');
    setInlineInfo('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const body = loginSchema.parse({ email: form.email, password: form.password });
        await base44.auth.login(body.email, body.password);
        // Ensure the auth state is refreshed before navigating to protected routes.
        await checkAppState();
        toast.success('Login realizado!');
        navigate(from, { replace: true });
      } else {
        const body = registerSchema.parse({ fullName: form.fullName || undefined, email: form.email, password: form.password });
        await base44.auth.register(body.email, body.password, body.fullName);
        // Confirm it worked by logging in right away (also avoids confusion)
        await base44.auth.login(body.email, body.password);
        await checkAppState();
        toast.success('Conta criada e login realizado!');
        navigate(from, { replace: true });
      }
    } catch (err) {
      // Zod client validation
      if (err?.name === 'ZodError') {
        const msg = err?.issues?.[0]?.message || 'Dados inválidos.';
        setInlineError(msg);
        toast.error('Verifique os campos do formulário.');
        return;
      }

      const code = err?.data?.error;
      const status = err?.status;

      let msg = 'Erro ao autenticar.';
      if (status === 409 || code === 'email_already_exists') {
        msg = 'Este e-mail já está cadastrado. Tente fazer login.';
      } else if (status === 401 || code === 'invalid_credentials') {
        msg = 'E-mail ou senha inválidos.';
      } else if (status === 400 || code === 'invalid_body') {
        msg = 'Dados inválidos. Verifique e tente novamente.';
      } else if (status === 0 || err?.message?.includes('Failed to fetch')) {
        msg = 'Falha ao conectar no servidor. Verifique se o backend está rodando.';
      } else if (typeof code === 'string' && code) {
        msg = code;
      } else if (err?.message) {
        msg = err.message;
      }

      setInlineError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const onEmailBlur = async () => {
    if (mode !== 'register') return;
    setInlineError('');
    setInlineInfo('');

    const email = String(form.email || '').trim();
    if (!email) return;

    const parsed = z.string().email().safeParse(email);
    if (!parsed.success) return;

    setCheckingEmail(true);
    try {
      const res = await base44.auth.emailExists(email);
      if (res?.exists) {
        setInlineError('Este e-mail já está cadastrado.');
      } else {
        setInlineInfo('E-mail disponível para cadastro.');
      }
    } catch {
      // non-blocking
    } finally {
      setCheckingEmail(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6">
      <CardUI className="w-full max-w-md">
        <CardHeaderUI>
          <CardTitleUI className="text-2xl">{mode === 'login' ? 'Entrar' : 'Criar conta'}</CardTitleUI>
          <CardDescriptionUI>
            {mode === 'login'
              ? 'Use seu e-mail e senha para acessar.'
              : 'Crie seu usuário para começar.'}
          </CardDescriptionUI>
        </CardHeaderUI>
        <CardContentUI>
          <form onSubmit={onSubmit} className="space-y-4">
            {inlineError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Não foi possível continuar</AlertTitle>
                <AlertDescription>{inlineError}</AlertDescription>
              </Alert>
            )}

            {!inlineError && inlineInfo && (
              <Alert>
                <AlertTitle>Info</AlertTitle>
                <AlertDescription>{inlineInfo}</AlertDescription>
              </Alert>
            )}

            {mode === 'register' && (
              <div>
                <LabelUI htmlFor="fullName">Nome</LabelUI>
                <InputUI
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
            )}

            <div>
              <LabelUI htmlFor="email">E-mail</LabelUI>
              <InputUI
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                onBlur={onEmailBlur}
                required
                className="mt-1.5"
              />
              {mode === 'register' && checkingEmail && (
                <p className="text-xs text-slate-500 mt-1">Verificando e-mail...</p>
              )}
            </div>

            <div>
              <LabelUI htmlFor="password">Senha</LabelUI>
              <div className="relative mt-1.5">
                <InputUI
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'register' && (
                <p className="text-xs text-slate-500 mt-1">Mínimo de 8 caracteres.</p>
              )}
            </div>

            <ButtonUI type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Aguarde...
                </>
              ) : mode === 'login' ? (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Entrar
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Criar conta
                </>
              )}
            </ButtonUI>

            <div className="text-sm text-slate-600 text-center">
              {mode === 'login' ? (
                <button
                  type="button"
                  className="underline"
                  onClick={() => {
                    setInlineError('');
                    setInlineInfo('');
                    setMode('register');
                  }}
                >
                  Não tenho conta
                </button>
              ) : (
                <button
                  type="button"
                  className="underline"
                  onClick={() => {
                    setInlineError('');
                    setInlineInfo('');
                    setMode('login');
                  }}
                >
                  Já tenho conta
                </button>
              )}
            </div>
          </form>
        </CardContentUI>
      </CardUI>
    </div>
  );
}
