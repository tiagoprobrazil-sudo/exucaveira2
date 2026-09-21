import { useState, type FormEvent } from 'react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import { entrarSchema } from '../lib/validation/schemas';

interface Props {
  next: string;
}

export default function EntrarForm({ next }: Props) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);

    const parsed = entrarSchema.safeParse({ email, senha });
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? 'Verifique os dados informados.');
      return;
    }

    setEnviando(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.senha,
      });

      if (error) {
        setErro('E-mail ou senha inválidos.');
        return;
      }

      window.location.assign(next || '/conta');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível entrar.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="auth-card">
      <h1>Entrar</h1>
      <p className="auth-hint">Acesse sua conta.</p>

      {erro && <div className="form-error" role="alert">{erro}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            name="senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p className="auth-switch">
        Ainda não tem conta? <a href="/cadastro">Criar conta</a>
      </p>
    </div>
  );
}
