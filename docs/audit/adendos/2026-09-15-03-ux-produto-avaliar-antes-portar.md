# Adendo 15/09/2026 (3) — UX/produto: avaliar antes de portar

> Cobre o período 04/09 → 15/09/2026 no Injediesel. Ver regra de tamanho e
> índice em [`README.md`](./README.md).

---

## 1. Alerta sonoro só tocava depois de atualizar a página — FIX HERDADO, prioridade alta

**Problema:** o alerta de arquivo novo (matriz) / arquivo concluído
(franquia) só disparava depois que o usuário atualizava a página ou voltava
o foco pra aba. Com a aba minimizada ou o usuário em outra parte do
sistema, o alerta não chegava.

**Causa:** a detecção usava polling do TanStack Query
(`refetchInterval: 30_000`) — navegadores **suspendem timers de aba em
background**, então o poll simplesmente não rodava. Só disparava de novo
quando o foco voltava (revalidação por foco).

**Fix (herdado do clone-base — PORTAR, prioridade ALTA):** trocado por
Supabase Realtime — hook assina `postgres_changes` na tabela `ecu_jobs`
(WebSocket, que **continua ativo em aba minimizada**) e dispara som +
notificação no instante em que o banco registra o evento. Requer:
- `ALTER PUBLICATION supabase_realtime ADD TABLE ecu_jobs;`
- `ALTER TABLE ecu_jobs REPLICA IDENTITY FULL;` (sem isso o payload `old` de
  um UPDATE só traz a PK — precisa do status ANTERIOR pra saber se a
  mudança é relevante, ex.: "acabou de virar concluído" vs já estava).

**Migration:** `130_ecu_jobs_realtime.sql`. Hook novo:
`useEcuJobRealtimeAlert` (substitui o antigo polling-diff).

**Ação Promax/EvoPro:** se o alerta sonoro usa o mesmo padrão de polling
(`refetchInterval` + comparação de contagem), é o MESMO bug — qualquer
sistema com esse recurso sofre do mesmo atraso em aba minimizada. Vale a
pena portar independente de qualquer decisão de produto, é puro bug de
entrega.

---

## 2. Volume do alerta em 3 níveis + timbre mais sutil

Melhorias de UX simples, sem risco de dado:
- Cada operador escolhe **Baixo / Médio / Alto** (localStorage por
  dispositivo) — antes o volume era fixo em código.
- Timbre trocado de campainha estridente (onda quadrada + compressor, 3
  repetições) pra "Toque Duplo" (duas notas suaves de sino, 1 toque só) —
  escolhido pelo cliente entre 5 opções apresentadas via link de preview.
- Opção de ativar notificação do sistema operacional (Notification API) —
  aparece mesmo com o navegador em outra janela/app (não funciona com o
  navegador TOTALMENTE fechado — isso seria Web Push de verdade, com
  service worker + VAPID, infra maior, não implementado).

**Ação Promax/EvoPro:** portar se quiserem a mesma flexibilidade — baixo
risco, puramente cosmético/UX.

---

## 3. Suporte a cliente do Paraguai — DECISÃO DE NEGÓCIO, não portar sem confirmar

**Contexto:** uma franquia do Injediesel opera no Paraguai. O sistema
exigia CPF (11 dígitos) e celular em formato BR — bloqueando cadastro de
cliente paraguaio (cédula/RUC e numeração de celular diferentes) e placa
antiga (pré-Mercosul).

**Fix:** seletor de país (🇧🇷 Brasil / 🇵🇾 Paraguai) nos dois pontos de
cadastro de cliente (página dedicada + modal inline do fluxo de arquivo).
Em PY: documento livre (sem validar CPF/CNPJ), celular livre, placa
estrangeira em campo livre (toggle no formulário de veículo). Coluna
`customers.country` (`BR`/`PY`, default `BR` — zero impacto em cliente
existente).

**Migration:** `126_customers_country.sql`.

**⚠️ Ação Promax/EvoPro:** **só portar se aquele sistema também tiver
operação fora do Brasil.** Não é bug, é escopo de negócio — cadastro de
cliente 100% nacional não precisa disso.

---

## 4. Autocomplete de cidade + seletor de estado/departamento

**Melhoria de UX genérica** (não depende do Paraguai): campo Estado virou
seletor com busca pelas primeiras letras (digita "P" → PR, PA, PB...);
campo Cidade autocompleta — Brasil via API do IBGE (por UF, com cache),
Paraguai com lista estática de departamentos/cidades principais (não há
API pública boa pro PY).

Componente `src/components/shared/LocationFields.tsx` + dados em
`src/lib/locations.ts`, usando `<datalist>` nativo (sem lib externa).

**Ação Promax/EvoPro:** a parte BR (27 UFs + IBGE) é útil pra qualquer
sistema com cadastro de cliente nacional, independente de ter ou não
operação no Paraguai — pode portar só essa metade se não precisar de PY.
