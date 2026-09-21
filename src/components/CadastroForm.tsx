import { useState, type FormEvent } from 'react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import { cadastroSchema } from '../lib/validation/schemas';
import type { RoleSlug } from '../types/auth';

interface Props {
  perfilInicial: RoleSlug | null;
}

const ROLE_LABEL: Record<RoleSlug, string> = {
  modelador: 'Modelador',
  produtor: 'Produtor',
  cliente: 'Cliente',
};

export default function CadastroForm({ perfilInicial }: Props) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [perfil, setPerfil] = useState<RoleSlug | null>(perfilInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);

    const parsed = cadastroSchema.safeParse({ nome, email, senha, confirmarSenha, perfil });
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? 'Verifique os dados informados.');
      return;
    }

    setEnviando(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.senha,
        options: {
          data: {
            display_name: parsed.data.nome,
            perfil_inicial: parsed.data.perfil,
          },
        },
      });

      if (error) {
        setErro(error.message);
        return;
      }

      if (data.session) {
        window.location.assign('/conta');
        return;
      }

      // Projeto com confirmação de e-mail ativada: a conta e o papel já
      // foram criados (trigger no banco), só falta o usuário confirmar.
      setAguardandoConfirmacao(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível concluir o cadastro.');
    } finally {
      setEnviando(false);
    }
  }

  if (aguardandoConfirmacao) {
    return (
      <div className="auth-card">
        <h1>Quase lá</h1>
        <p className="auth-hint">
          Enviamos um link de confirmação para <strong>{email}</strong>. Confirme seu e-mail para entrar.
        </p>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h1>Criar conta</h1>
      <p className="auth-hint">
        {perfil ? `Cadastro como ${ROLE_LABEL[perfil]}. Você poderá acumular outros papéis depois.` : 'Escolha como você quer participar.'}
      </p>

      {erro && <div className="form-error" role="alert">{erro}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="perfil">Como você quer participar</label>
          <select
            id="perfil"
            value={perfil ?? ''}
            onChange={(e) => setPerfil((e.target.value || null) as RoleSlug | null)}
            required
          >
            <option value="" disabled>
              Selecione uma opção
            </option>
            {(Object.keys(ROLE_LABEL) as RoleSlug[]).map((slug) => (
              <option key={slug} value={slug}>
                {ROLE_LABEL[slug]}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="nome">Nome</label>
          <input id="nome" name="nome" type="text" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>

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
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <div className="field">
          <label htmlFor="confirmarSenha">Confirmar senha</label>
          <input
            id="confirmarSenha"
            name="confirmarSenha"
            type="password"
            autoComplete="new-password"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={enviando}>
          {enviando ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>

      <p className="auth-switch">
        Já tem conta? <a href="/entrar">Entrar</a>
      </p>
    </div>
  );
}
