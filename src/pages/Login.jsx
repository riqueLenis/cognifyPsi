import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Lock, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

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
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });

  const from = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('from') || '/';
  }, [location.search]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const body = loginSchema.parse({ email: form.email, password: form.password });
        await base44.auth.login(body.email, body.password);
        toast.success('Login realizado!');
        navigate(from, { replace: true });
      } else {
        const body = registerSchema.parse({ fullName: form.fullName || undefined, email: form.email, password: form.password });
        await base44.auth.register(body.email, body.password, body.fullName);
        toast.success('Conta criada! Faça login.');
        setMode('login');
        setForm((prev) => ({ ...prev, password: '' }));
      }
    } catch (err) {
      const msg = err?.data?.error || err?.message || 'Erro ao autenticar';
      toast.error(msg);
    } finally {
      setLoading(false);
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
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <LabelUI htmlFor="password">Senha</LabelUI>
              <InputUI
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                required
                className="mt-1.5"
              />
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
                <button type="button" className="underline" onClick={() => setMode('register')}>
                  Não tenho conta
                </button>
              ) : (
                <button type="button" className="underline" onClick={() => setMode('login')}>
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
