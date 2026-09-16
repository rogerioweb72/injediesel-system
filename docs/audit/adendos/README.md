# Adendos de Auditoria — índice e regra de tamanho

> A partir de **15/09/2026**, novos adendos de auditoria (Injediesel → Promax
> Tuner / EvoPro) NÃO são mais anexados ao `CHECKLIST-AUDITORIA-SISTEMAS.md`
> (que já passou de 1.100 linhas e fica pesado/perde contexto ao ser lido ou
> editado por um agente). Esse arquivo fica **congelado** como está.

## Regra de ouro — arquivo novo, não arquivo gigante

- **Nenhum arquivo de adendo passa de ~400 linhas.** É pouco de propósito —
  400 já é considerado grande. Se o assunto crescer, **divide em outro
  arquivo** (`-parte-2`, ou um novo tema), nunca estica o mesmo arquivo.
- Um adendo = **um tema coeso** (ex.: "segurança e integridade de dados",
  "fluxo de arquivo ECU", "UX/produto — avaliar antes de portar"). Não
  misturar 10 assuntos não relacionados num arquivo só.
- Nome do arquivo: `AAAA-MM-DD-NN-slug-curto.md` (NN = sequência do dia, se
  houver mais de um tema na mesma sessão).
- Cada item dentro do adendo segue o formato consolidado nos adendos antigos
  (dentro do checklist): **Problema → Causa → Fix (arquivo/migration) →
  Commit → Ação Promax/EvoPro**. Direto ao ponto, sem prosa longa.
- Todo adendo deixa claro se é:
  - **Bug herdado do clone-base** → portar com prioridade, mesmo defeito
    provavelmente existe nos outros dois sistemas.
  - **Decisão de negócio do Injediesel** → NÃO portar sem o dono de cada
    sistema decidir (ex.: desativar antivírus, aceitar cliente estrangeiro).
  - **Bug introduzido só no Injediesel** (erro meu, não veio do clone) →
    registrar como aprendizado, mas nada a portar.

## Índice (mais recente primeiro)

| Data | Arquivo | Tema | Prioridade de porte |
|---|---|---|---|
| 15/09/2026 | [2026-09-15-01-seguranca-e-integridade-dados.md](./2026-09-15-01-seguranca-e-integridade-dados.md) | RLS, race conditions, overflow numérico, exclusão segura | **Alta** — bugs herdados do clone-base |
| 15/09/2026 | [2026-09-15-02-fluxo-ecu-arquivos-financeiro.md](./2026-09-15-02-fluxo-ecu-arquivos-financeiro.md) | Download/upload de arquivo ECU, financeiro, tags de serviço | **Alta** (itens de infra) / **Média** (features de produto) |
| 15/09/2026 | [2026-09-15-03-ux-produto-avaliar-antes-portar.md](./2026-09-15-03-ux-produto-avaliar-antes-portar.md) | Alerta sonoro, cliente estrangeiro, autocomplete de endereço | **Alta** (fix do som) / **Decisão do dono** (Paraguai) |

Adendos anteriores a 15/09/2026 continuam dentro do
`../CHECKLIST-AUDITORIA-SISTEMAS.md` (seção "ADENDO", buscar por data).
