# Suporte B2B — Matriz × Franquia

**Data:** 2026-05-21  
**Abordagem aprovada:** C — Híbrida com role-aware rendering  
**Status:** Aprovado pelo usuário

---

## 1. Visão Geral

Upgrade do módulo `/matriz/suporte` para suporte B2B entre matriz e franquias. Franqueados (`franchise_manager`, `unit_operator`) acessam a mesma rota, mas RLS + renderização por role garantem isolamento: veem só chamados da própria unidade, não veem notas internas e não controlam status.

Chat em tempo real via Supabase Realtime quando ticket está ativo. Ao resolver/fechar, chat vira histórico read-only. Anexos via Cloudflare R2 (novo bucket).

---

## 2. Roles e Permissões

| Recurso | `franchise_manager` / `unit_operator` | `support_agent` / `operations_admin` / `company_admin` |
|---|---|---|
| Lista de tickets | Só própria `unit_id` | Todos |
| Criar ticket | Sim (unit_id automático) | Sim |
| Dados do solicitante | Nome + role + unidade | Nome + role + unidade + email |
| Chat público | Lê e escreve | Lê e escreve |
| Nota interna | Não vê | Escreve e lê |
| Mudar status | Não | Sim |
| Atribuir agente | Não | Sim |
| Reabrir chamado resolvido | Sim | Sim |
| Anexar arquivo | Sim | Sim |

---

## 3. Banco de Dados

### Migration `038_support_b2b.sql`

#### `support_tickets` — nova coluna

```sql
ALTER TABLE support_tickets ADD COLUMN title text NOT NULL DEFAULT '';
```

Título descritivo curto (ex: "Erro ao gerar arquivo ECU"). Campo obrigatório no form.

#### `support_tickets` — categoria estruturada

Trocar `category text` livre por enum. Tickets existentes com valor fora do enum são migrados para `'outro'`:

```sql
CREATE TYPE ticket_category AS ENUM (
  'tecnico', 'financeiro', 'operacional', 'ecu_arquivo', 'outro'
);
ALTER TABLE support_tickets
  ALTER COLUMN category TYPE ticket_category
  USING CASE
    WHEN category IN ('tecnico','financeiro','operacional','ecu_arquivo','outro')
      THEN category::ticket_category
    ELSE 'outro'::ticket_category
  END;
```

#### `support_messages` — novas colunas

```sql
ALTER TABLE support_messages
  ADD COLUMN is_internal          boolean NOT NULL DEFAULT false,
  ADD COLUMN attachment_r2_key    text,
  ADD COLUMN attachment_filename  text,
  ADD COLUMN attachment_mime      text,
  ADD COLUMN attachment_size_bytes integer;
```

#### RLS — `support_tickets`

```sql
-- Franqueado só vê tickets da própria unidade
CREATE POLICY franchise_select ON support_tickets
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
      NOT IN ('franchise_manager','unit_operator')
    OR unit_id = (SELECT unit_id FROM profiles WHERE id = auth.uid())
  );

-- Franqueado só insere ticket com unit_id da própria unidade
CREATE POLICY franchise_insert ON support_tickets
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid())
      NOT IN ('franchise_manager','unit_operator')
    OR unit_id = (SELECT unit_id FROM profiles WHERE id = auth.uid())
  );
```

#### RLS — `support_messages`

```sql
-- Franqueado não vê notas internas
CREATE POLICY franchise_messages_select ON support_messages
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
      NOT IN ('franchise_manager','unit_operator')
    OR is_internal = false
  );
```

#### Realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
```

#### R2 — novo bucket

- Nome: `promax-support-attachments`
- Env var novo: `R2_BUCKET_SUPPORT=promax-support-attachments`
- Mesmas credenciais R2 existentes (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`)

---

## 4. Ciclo de Vida do Chamado

```
aberto → em_atendimento → aguardando_cliente → resolvido → fechado
                                                     ↑
                                            franqueado pode reabrir
                                            (volta para 'aberto')
```

| Status | Chat | Input | Realtime |
|---|---|---|---|
| `aberto` | ativo | habilitado | ✅ conectado |
| `em_atendimento` | ativo | habilitado | ✅ conectado |
| `aguardando_cliente` | ativo | habilitado | ✅ conectado |
| `resolvido` | histórico | oculto | ❌ desconectado |
| `fechado` | histórico | oculto | ❌ desconectado |

Banner quando read-only: `"Chamado encerrado em DD/MM/YYYY — histórico somente leitura"`

---

## 5. Chat em Tempo Real

### Hook `useSupportChat(ticketId, isActive)`

- Subscription Supabase Realtime em `INSERT` de `support_messages` filtrado por `ticket_id`
- Deduplicação por `id` antes de append ao cache do TanStack Query
- Canal: `support-${ticketId}`
- Cleanup no unmount e quando `isActive` muda para `false`

```typescript
// Deduplicação
support_messages: old.support_messages.some(m => m.id === payload.new.id)
  ? old.support_messages
  : [...old.support_messages, payload.new]
```

### Envio de mensagem

`sendMessage(body, isInternal, attachment?)`:
1. Se há anexo: chama `support-upload-url` → PUT direto no R2 → captura `r2_key`
2. INSERT em `support_messages` com `is_internal`, `body`, e campos de anexo
3. Realtime entrega para outros participantes

### Badge de não lidos (sidebar)

Query separada conta mensagens com `created_at > last_seen_at` do usuário no ticket. `last_seen_at` atualizado via UPSERT quando usuário abre o detalhe do ticket.

Tabela auxiliar `support_ticket_views` (incluída na migration `038`):

```sql
CREATE TABLE support_ticket_views (
  ticket_id    uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ticket_id, user_id)
);
```

Badge conta: mensagens do ticket com `created_at > last_seen_at` e (`is_internal = false` OU usuário é da matriz).

---

## 6. Upload de Anexos

### Edge Function `support-upload-url`

- Recebe: `{ ticketId, filename, mime, size }`
- Valida: tamanho ≤ 10 MB, MIME em lista permitida
- MIMEs permitidos: `image/*`, `application/pdf`, `text/plain`, `.bin`, `.hex`, `.ori`, `.ori2`
- Gera chave R2: `support/<ticketId>/<uuid>.<ext>`
- Retorna: presigned PUT URL (expiração 10 min) + `r2_key`

### Edge Function `support-download-url`

- Recebe: `{ r2Key, ticketId }`
- Valida: usuário tem acesso ao ticket (via RLS — SELECT no ticket)
- Retorna: presigned GET URL (expiração 5 min)

---

## 7. Componentes

### Novos

| Componente | Responsabilidade |
|---|---|
| `src/components/support/SupportChatPanel.tsx` | Lista de mensagens + input + toggle interno + upload anexo |
| `src/components/support/SupportMessageBubble.tsx` | Bubble individual — público vs nota interna vs com anexo |
| `src/components/support/SupportRequesterCard.tsx` | Card com dados do solicitante (nome, role, unidade, email) |
| `src/components/support/SupportSLABadge.tsx` | Badge colorido baseado em `sla_due_at` |

### Modificados

| Arquivo | Mudanças |
|---|---|
| `src/pages/app/suporte/SupportPage.tsx` | + coluna SLA badge, + filtro por unidade (só matriz), + badge de não lidos |
| `src/pages/app/suporte/SupportTicketDetail.tsx` | Refatorado para layout 2 colunas; usa todos os componentes novos |
| `src/pages/app/suporte/SupportTicketForm.tsx` | + campo `title` (obrigatório), categoria vira select com enum, `unit_id` auto-preenchido para franqueado |
| `src/hooks/useSupportTickets.ts` | + join `created_by → profiles(name,role,unit_id→franchise_units(name))`, + campos de anexo em `SupportMessage`, + `useReopenTicket` mutation |

### Hook novo

`src/hooks/useSupportChat.ts` — Realtime subscription + `sendMessage` + deduplicação

---

## 8. Layout `SupportTicketDetail`

```
┌─ Header: [← Voltar] [Protocolo] [Status badge] [SLA badge]
│                                 [Atribuir] [Mudar status] ← só matriz
│
│  ┌── Chat (flex-1) ────────────────────┐  ┌── Info (w-80) ─────────────────┐
│  │  bubbles cronológicos               │  │  Solicitante                   │
│  │  · público: bg normal               │  │  Nome / Role / Unidade / Email │
│  │  · nota interna: bg âmbar + badge   │  │                                │
│  │  · com anexo: ícone + download      │  │  Detalhes do chamado           │
│  │                                     │  │  Título / Categoria            │
│  │  [banner read-only se fechado]      │  │  Prioridade / SLA              │
│  │                                     │  │  Criado em / Atribuído         │
│  │  [input textarea]                   │  │                                │
│  │  [🔒 Nota interna ← só matriz]      │  │  ECU job vinculado (se houver) │
│  │  [📎 Anexar] [Enviar]               │  │                                │
│  └─────────────────────────────────────┘  └────────────────────────────────┘
```

---

## 9. `SupportMessageBubble` — Variantes Visuais

| Tipo | Alinhamento | Fundo | Badge |
|---|---|---|---|
| Própria mensagem (público) | Direita | `pm-red-500/10` | — |
| Outra parte (público) | Esquerda | `bg-card` | — |
| Nota interna | Esquerda | `amber-500/10` | "🔒 Nota interna" |
| Com anexo (qualquer tipo) | — | mesmo do tipo | ícone + nome + botão download |

---

## 10. `SupportSLABadge` — Lógica de Cor

| Condição | Cor | Label |
|---|---|---|
| `sla_due_at` nulo | Cinza | "Sem SLA" |
| `sla_due_at` > agora + 4h | Verde | "SLA: DD/MM HH:mm" |
| `sla_due_at` entre agora e agora + 4h | Âmbar | "SLA: DD/MM HH:mm" |
| `sla_due_at` < agora | Vermelho | "SLA vencido" |

---

## 11. Fora do Escopo

- Notificações por email (fase posterior — Resend/Sendgrid já previsto no CLAUDE.md)
- Avaliação pós-atendimento
- Dashboard de métricas de suporte
- SLA configurável por categoria

---

## 12. Checklist de Entrega (Definition of Done)

- [ ] Migration `038_support_b2b.sql` aplicada e testada localmente
- [ ] RLS testado: franqueado não acessa tickets de outra unidade
- [ ] RLS testado: franqueado não vê `is_internal = true` via API
- [ ] Realtime: duas abas abertas recebem mensagens em tempo real
- [ ] Chat vira read-only ao mudar status para `resolvido`
- [ ] Franqueado consegue reabrir chamado `resolvido`
- [ ] Upload de anexo funciona end-to-end (R2 bucket `promax-support-attachments`)
- [ ] Download de anexo gera URL presigned e expira
- [ ] Nota interna não aparece na UI do franqueado
- [ ] SLA badge muda de cor conforme tempo restante
- [ ] Badge de não lidos no sidebar atualiza em tempo real
- [ ] `SupportTicketForm` pré-preenche `unit_id` para franqueado
- [ ] Layout 2 colunas responsivo (coluna info colapsa em mobile)
- [ ] Audit log registrado em: criar, mudar status, reabrir
- [ ] Tipos TypeScript atualizados em `database.ts` e `app.ts`
