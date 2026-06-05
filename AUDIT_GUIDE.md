# Full Application Audit Guide

Executar auditoria completa do projeto em qualquer repositório.

## Quick Start

```bash
# Na raiz do projeto
./scripts/full-audit.sh
```

Gera relatório em `audit_YYYYMMDD_HHMMSS.log`

## O que é auditado

| Categoria | Comando | Verifica |
|-----------|---------|----------|
| **ESLint** | `npm run lint` | Erros de código (bloqueia) |
| **TypeScript** | `tsc --noEmit` | Type safety (bloqueia) |
| **Build** | `npm run build` | Vite production build |
| **Security** | `npm audit` | Vulnerabilidades de dependências |
| **Code Quality** | `grep` | TODOs, `as any` casts |
| **Tests** | `npm test` | Suite de testes (se houver) |

## Uso em outro projeto (evopro)

```bash
# 1. Clone/abra o projeto evopro
cd ~/projetos/evopro

# 2. Copie o script
cp ~/projetos/promax-tuner/scripts/full-audit.sh ./scripts/

# 3. Execute
./scripts/full-audit.sh
```

## Output Example

```
🔍 FULL AUDIT: evopro
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 [1/6] ESLint Code Quality...
  → Errors: 0 | Warnings: 45
  ✅ ESLint PASS

📋 [2/6] TypeScript Type Safety...
  ✅ TypeScript PASS

📋 [3/6] Production Build...
  ✅ Build PASS (Bundle: 348.69 kB)

📋 [4/6] Security Vulnerabilities...
  ✅ No vulnerabilities found

📋 [5/6] Code Quality Metrics...
  → TODOs/FIXMEs: 12
  → 'as any' casts: 3
  ✅ Type safety acceptable

📋 [6/6] Test Suite...
  ✅ Tests PASS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ AUDIT COMPLETE
📄 Log saved: audit_20260605_150000.log
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## CI/CD Integration

Adicionar ao GitHub Actions:

```yaml
# .github/workflows/audit.yml
name: Daily Audit

on:
  schedule:
    - cron: '0 9 * * *'  # 9am daily
  workflow_dispatch:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: ./scripts/full-audit.sh
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: audit-report
          path: audit_*.log
```

## Customizar para seu projeto

Editar `scripts/full-audit.sh`:

```bash
# Adicionar checks customizados antes do Summary:
echo "" | tee -a "$AUDIT_LOG"
echo "📋 [7/6] Custom Database Migrations..." | tee -a "$AUDIT_LOG"
# Seu comando aqui
```

## Flags de Saída

- **0**: ✅ Audit passou (erros críticos = 0)
- **1**: ❌ Audit falhou (ESLint errors ou Build failed)

Usar em scripts:

```bash
./scripts/full-audit.sh
if [ $? -eq 0 ]; then
  echo "Safe to deploy"
  git push origin main
else
  echo "Fix errors before deploying"
  exit 1
fi
```

---

**Criado em:** 2026-06-05  
**Projeto:** promax-tuner  
**Adaptado para:** cualquer projeto Node/React/TypeScript
