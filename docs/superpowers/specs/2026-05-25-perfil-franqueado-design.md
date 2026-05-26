# Spec: Editar Perfil do Franqueado

**Status:** APROVADO — pronto para implementação  
**Data:** 2026-05-25  
**Rota:** `/:unitSlug/:agentSlug/perfil` (substituir EmBreve no router)

---

## Decisões

| Questão | Decisão |
|---------|---------|
| Schema DB | Migration `015_perfil_franqueado.sql` — campos novos em `profiles` e `franchise_units` |
| Foto de perfil | Supabase Storage — bucket `avatars` |
| Trocar nome de usuário | Cria ticket de suporte categoria `username_change` |
| Renovar contrato | Modal real — coleta período + observação → cria ticket `contract_renewal` |

---

## Migration 015

### Tabela `profiles` — campos novos (editáveis pelo franqueado)

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone          text,
  ADD COLUMN IF NOT EXISTS birth_date     date,
  ADD COLUMN IF NOT EXISTS avatar_url     text,
  ADD COLUMN IF NOT EXISTS cep            text,
  ADD COLUMN IF NOT EXISTS street         text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS complement     text,
  ADD COLUMN IF NOT EXISTS neighborhood   text;
```

### Tabela `franchise_units` — campos novos (somente matriz edita)

```sql
ALTER TABLE franchise_units
  ADD COLUMN IF NOT EXISTS contract_start_date date,
  ADD COLUMN IF NOT EXISTS razao_social        text,
  ADD COLUMN IF NOT EXISTS inscricao_estadual  text,
  ADD COLUMN IF NOT EXISTS data_abertura       date,
  ADD COLUMN IF NOT EXISTS plan                text,        -- 'basico' | 'intermediario' | 'premium'
  ADD COLUMN IF NOT EXISTS financial_status    text,        -- 'adimplente' | 'inadimplente'
  ADD COLUMN IF NOT EXISTS file_limit          integer,
  ADD COLUMN IF NOT EXISTS commercial_phone    text,
  ADD COLUMN IF NOT EXISTS commercial_email    text,
  ADD COLUMN IF NOT EXISTS business_hours      text,
  ADD COLUMN IF NOT EXISTS main_technician     jsonb;       -- { name: string, contact: string }
```

### Supabase Storage

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT DO NOTHING;

-- RLS: franqueado só sobe/lê dentro de seu próprio userId/
CREATE POLICY "avatar_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatar_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');
```

---

## Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/015_perfil_franqueado.sql` | CRIAR |
| `src/pages/app/franqueados/FranqueadoPerfilPage.tsx` | CRIAR |
| `src/hooks/useUpdateProfile.ts` | CRIAR |
| `src/hooks/useUploadAvatar.ts` | CRIAR |
| `src/router/index.tsx` | MODIFICAR — substituir `EmBreve` de `perfil` |
| `src/types/database.ts` | MODIFICAR — adicionar campos novos nos tipos |

---

## Página: FranqueadoPerfilPage

### Header
- Título: `"EDITAR PERFIL DE USUÁRIO"` (padrão `PageHeader`)
- Botão `"Voltar ↵"` no canto superior direito → `navigate(-1)`

### Layout
```
Desktop (≥ 1024px): grid 2 colunas [30% | 70%]
Mobile  (< 1024px): coluna única, identidade no topo
```

---

### Coluna Esquerda — Identidade e Contrato

#### Foto de Perfil
- Avatar circular 96px, fallback iniciais do nome
- Botão `"ENVIAR FOTO"` → `<input type="file" accept="image/*">` oculto
- Upload: `supabase.storage.from('avatars').upload(`${userId}/avatar`, file, { upsert: true })`
- Salvar URL pública em `profiles.avatar_url`

#### Identidade da Unidade
- Cidade-UF (texto muted, somente leitura)
- Botão `"Trocar Nome de usuário"` → modal de confirmação → cria `support_tickets` com:
  ```
  category: 'username_change'
  title: 'Solicitação de troca de nome de usuário'
  body: `Novo nome solicitado: ${nomeDesejado}`
  ```
- Toast: "Solicitação enviada. A matriz irá analisar em breve."

#### Status do Contrato
- Componente `<ContractProgressBar startDate endDate />` (já existe)
- Dados de `useMyUnit()` — `contract_start_date` e `contract_end_date`

#### Ações
- Botão `"RENOVAR AGORA"` (verde) → `<RenovarContratoModal />`
- Link discreto `"Ler meu contrato"` → stub por ora (href="#")

---

### Modal: RenovarContratoModal

Campos:
- Select: período desejado (`6 meses` / `12 meses` / `24 meses`)
- Textarea: observação (opcional)

Ação ao confirmar:
```ts
supabase.from('support_tickets').insert({
  unit_id,
  category: 'contract_renewal',
  title: 'Solicitação de renovação de contrato',
  body: `Período desejado: ${periodo} meses.\n\nObservação: ${observacao}`,
  status: 'open',
})
```
Toast: "Solicitação de renovação enviada com sucesso."

---

### Coluna Direita — Formulário

#### Campos Editáveis (grid 2 colunas)

| Campo | Validação |
|-------|-----------|
| Nome do representante | obrigatório, min 3 |
| Celular/WhatsApp | máscara `(99) 9 9999-9999`, obrigatório |
| Novo e-mail | email válido |
| Confirmar novo e-mail | deve bater |
| CEP | máscara `99999-999`, ViaCEP onBlur |
| Cidade | auto-preenchido, editável |
| Estado (UF) | select 27 UFs, auto-preenchido |
| Rua/Logradouro | auto-preenchido |
| Número | manual |
| Complemento | opcional |
| Bairro | auto-preenchido |
| Data de nascimento | date picker |
| Nova senha | password + toggle visibilidade + indicador força (5 barras) |
| Confirmar nova senha | deve bater com nova senha |
| Senha antiga | obrigatório apenas se e-mail ou senha mudar |

#### ViaCEP
```ts
// onBlur do campo CEP
const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
const data = await res.json()
if (!data.erro) {
  setValue('street', data.logradouro)
  setValue('neighborhood', data.bairro)
  setValue('city', data.localidade)
  setValue('state', data.uf)
}
```

#### Indicador de Força de Senha
5 segmentos coloridos:
- 1 seg vermelho: < 6 chars
- 2 segs laranja: tem letras
- 3 segs amarelo: + números
- 4 segs verde-claro: + especiais
- 5 segs verde: ≥ 12 chars + mix completo

#### Lógica de Salvar

```
1. Validar form (Zod)
2. Se mudou e-mail:
   - Verificar senha antiga via signInWithPassword
   - supabase.auth.updateUser({ email: novoEmail })
   - Toast "Verifique seu novo e-mail para confirmar"
3. Se mudou senha:
   - Verificar senha antiga via signInWithPassword (se não fez no passo 2)
   - supabase.auth.updateUser({ password: novaSenha })
4. Salvar demais campos em profiles:
   supabase.from('profiles').update({ name, phone, birth_date, avatar_url,
     cep, street, address_number, complement, neighborhood }).eq('id', userId)
5. invalidateQueries(['profile', userId])
6. Toast verde "Alterações salvas com sucesso"
```

Se senha antiga errada: erro vermelho abaixo do campo `"Senha antiga incorreta"`.

---

### Bloco: Dados da Unidade (somente leitura)

Cabeçalho com `🔒` e tooltip `"Para alterar estes dados, entre em contato com a franqueadora."`.

Campos exibidos (read-only):
- Nome fantasia, Razão social, CNPJ, Inscrição estadual
- Data de abertura, Início do contrato, Término do contrato
- Plano contratado, Status financeiro, ID da unidade
- Limite de arquivos/serviços, Telefone comercial, E-mail comercial
- Horário de funcionamento, Técnico responsável

Visual: `background` cinza mais escuro, `cursor: not-allowed`, ícone cadeado dentro do input.

---

### Botão Salvar
- Posição: canto inferior direito da coluna direita
- Desabilitado enquanto `isSubmitting` ou form inválido
- Spinner durante save

---

## UX / Estados

| Situação | Comportamento |
|----------|---------------|
| Salvo com sucesso | Toast verde sonner canto superior direito |
| Senha antiga errada | Mensagem vermelha abaixo do campo |
| CEP não encontrado | Toast amarelo "CEP não encontrado" |
| Erro de upload foto | Toast vermelho com mensagem |
| Contrato expirado | Tarja vermelha no topo + botões ECU/Alientech bloqueados (já tratado por `contract_blocked`) |
| Menos de 60 dias | `ContractProgressBar` já exibe aviso (status `warning`) |

---

## Responsividade

```css
/* Desktop */
.perfil-grid { display: grid; grid-template-columns: 30% 70%; gap: 24px; }

/* Mobile */
@media (max-width: 1023px) {
  .perfil-grid { grid-template-columns: 1fr; }
}
```

---

## Hooks novos

### `useUpdateProfile`
```ts
// useMutation que faz:
// supabase.from('profiles').update(data).eq('id', userId)
// + invalidate ['profile', userId] e ['my-unit', userId]
```

### `useUploadAvatar`
```ts
// upload para storage.avatars/{userId}/avatar.{ext}
// retorna publicUrl
// salva em profiles.avatar_url
```

---

## Rota no Router

```tsx
// src/router/index.tsx — dentro de FranqueadoLayout children
// Substituir:
{ path: 'perfil', element: <EmBreve titulo="Perfil" /> }
// Por:
{ path: 'perfil', element: <S><FranqueadoPerfilPage /></S> }

// + lazy import:
const FranqueadoPerfilPage = lazy(() => import('@/pages/app/franqueados/FranqueadoPerfilPage'))
```
