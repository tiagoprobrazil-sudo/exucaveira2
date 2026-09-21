import { z } from 'zod';
import { ROLE_SLUGS } from '../../types/auth';

export const perfilParamSchema = z.enum(ROLE_SLUGS);

export const cadastroSchema = z
  .object({
    nome: z.string().trim().min(2, 'Informe seu nome.').max(120),
    email: z.email('E-mail inválido.').trim().toLowerCase(),
    senha: z.string().min(8, 'A senha precisa de pelo menos 8 caracteres.'),
    confirmarSenha: z.string(),
    perfil: perfilParamSchema,
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: 'As senhas não coincidem.',
    path: ['confirmarSenha'],
  });

export const entrarSchema = z.object({
  email: z.email('E-mail inválido.').trim().toLowerCase(),
  senha: z.string().min(1, 'Informe sua senha.'),
});

export type CadastroInput = z.infer<typeof cadastroSchema>;
export type EntrarInput = z.infer<typeof entrarSchema>;
