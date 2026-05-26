# Design: Firmware Updates — Atualizações de Software ECU

**Data:** 2026-05-25  
**Status:** Aprovado

---

## Visão Geral

Substituir a `AtualizacoesPage` atual (feed de eventos ECU/tickets) por um sistema completo de publicação de atualizações de firmware/software de equipamentos ECU.

A matriz publica artigos de atualização com conteúdo rico (blocos). O franqueado lê, aceita os termos de responsabilidade e libera o download. O aceite é gravado com trilha de auditoria.

---

## Banco de Dados

### `equipment_types`
Tipos de equipamento gerenciados pela matriz.

```sql
id          uuid PK
name        text NOT NULL
slug        text UNIQUE NOT NULL
description text
image_url   text
active      boolean DEFAULT true
created_by  uuid → profiles
created_at  timestamptz
updated_at  timestamptz
```

### `firmware_updates`
Um artigo de atualização por versão de equipamento.

```sql
id            uuid PK
equipment_id  uuid → equipment_types
version       text NOT NULL          -- ex: "v2.1.0"
title         text NOT NULL          -- ex: "Correção de leitura OBD"
blocks        jsonb NOT NULL DEFAULT '[]'
published     boolean DEFAULT false
published_at  timestamptz
created_by    uuid → profiles
created_at    timestamptz
updated_at    timestamptz
```

**Estrutura de um bloco (JSONB array):**
```json
[
  { "type": "aviso",   "content": "Faça backup antes de iniciar." },
  { "type": "texto",   "content": "Texto com **negrito** e listas." },
  { "type": "passos",  "items": ["Conecte via USB", "Abra o app"] },
  { "type": "imagem",  "r2_key": "firmware/imgs/abc.png", "caption": "Conexão USB" },
  { "type": "video",   "url": "https://youtube.com/watch?v=xxx" }
]
```

### `firmware_update_files`
Arquivos de download vinculados a um update (suporta múltiplos).

```sql
id          uuid PK
update_id   uuid → firmware_updates ON DELETE CASCADE
r2_key      text NOT NULL
file_name   text NOT NULL
file_size   bigint
sort_order  int DEFAULT 0
created_at  timestamptz
```

### `firmware_update_acceptances`
Trilha de auditoria de aceites por franquia.

```sql
id          uuid PK
update_id   uuid → firmware_updates
unit_id     uuid → franchise_units
user_id     uuid → profiles
accepted_at timestamptz DEFAULT now()
ip_address  text
```

**Constraint:** `UNIQUE (update_id, user_id)` — um usuário aceita uma vez por update.

### RLS
- `equipment_types`: SELECT → qualquer autenticado; INSERT/UPDATE/DELETE → `company_admin`, `operations_admin`
- `firmware_updates`: SELECT published → qualquer autenticado; SELECT drafts + mutations → `company_admin`, `operations_admin`
- `firmware_update_files`: SELECT → qualquer autenticado (download só via Worker com token)
- `firmware_update_acceptances`: SELECT próprio → autenticado; INSERT → autenticado; sem UPDATE/DELETE

---

## R2 Storage

**Bucket:** `promax-firmware` (novo, separado de MKT e ECU)  
**Rotas no Worker:**
- `POST /r2-firmware-img-upload` — upload de imagem de bloco (matrix admin only)
- `POST /r2-firmware-file-upload` — upload de arquivo de firmware (matrix admin only)
- `POST /r2-firmware-download` — download do arquivo (qualquer autenticado, verifica `firmware_update_acceptances`)

O download via Worker verifica se o `user_id` tem aceite registrado antes de servir o arquivo.

---

## Fluxo Franqueado — `/atualizacoes`

### Estado 1: Lista de equipamentos
- Cards por `equipment_type` com contagem de updates publicados
- Badge "NOVO" se existe update publicado sem aceite do usuário logado
- Click → Estado 2

### Estado 2: Lista de versões do equipamento
- Updates em ordem cronológica decrescente (mais recente primeiro)
- Badge "NOVO" / "ACEITO" por update
- Click → Estado 3

### Estado 3: Artigo
- Header: nome do equipamento, versão, data de publicação
- Renderização de blocos em ordem: `aviso` (caixa amarela), `texto` (markdown), `passos` (lista numerada), `imagem` (img com caption), `video` (YouTube embed)
- Footer fixo: checkbox "Li todas as instruções e assumo a responsabilidade pela execução segura desta atualização"
- Checkbox desmarcado → botão download desabilitado (cinza, cadeado)
- Checkbox marcado → botão download ativo vermelho
- Click download:
  1. POST aceite no banco (update_id, unit_id, user_id, ip)
  2. GET arquivo via Worker R2 → download automático
  3. Se múltiplos arquivos → lista de botões, um por arquivo
- Se já aceitou antes: badge "Aceito em DD/MM/YYYY", download disponível direto sem re-aceite

---

## Fluxo Matriz — `/atualizacoes`

### Tela principal (acordeão por equipamento)
- Header: "Firmware" + botão "Novo Equipamento"
- Cada equipamento: nome, descrição, botões "Editar equip." e "+ Nova Atualização"
- Expandido: lista de updates (título, versão, status publicado/rascunho, data, botão editar)

### Modal: Novo/Editar Equipamento
- Campos: nome, slug (auto-gerado), descrição, upload de imagem (R2)
- Salvar / Cancelar

### Página: Editor de Update — `/atualizacoes/:equipmentSlug/novo` e `…/:updateId/editar`
- Campos fixos: versão (ex: v2.1.0), título
- Lista de blocos com botão "+ Adicionar bloco" → dropdown dos 5 tipos
- Cada bloco: barra de ações (mover ↑↓, excluir), campo de edição inline
  - `aviso`: textarea
  - `texto`: textarea (markdown simples)
  - `passos`: lista de inputs com botão "+" para adicionar passo
  - `imagem`: upload de arquivo → R2, campo caption
  - `video`: input URL YouTube
- Seção "Arquivos para download": lista de uploads + botão "Adicionar arquivo"
- Botões: "Salvar rascunho" e "Publicar"
- Publicar → `published = true`, `published_at = now()`

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/045_firmware_updates.sql` | Criar |
| `workers/r2-presign.ts` | Adicionar rotas firmware |
| `wrangler.toml` | Adicionar bucket `promax-firmware` |
| `src/hooks/useFirmwareUpdates.ts` | Criar |
| `src/pages/app/atualizacoes/AtualizacoesPage.tsx` | Substituir completamente |
| `src/pages/app/atualizacoes/FirmwareEditorPage.tsx` | Criar |
| `src/router/index.tsx` | Adicionar rota matrix + editor |
| `src/components/layout/Sidebar.tsx` | Nenhuma mudança necessária |

---

## Fora de Escopo

- Notificações push quando nova atualização é publicada (fase futura)
- Versionamento automático / diff entre versões
- Comentários ou perguntas por update
- Marcar update como "obrigatório" (bloqueia operação)
