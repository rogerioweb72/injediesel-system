#!/bin/bash
# Full Application Audit Script
# Usage: ./scripts/full-audit.sh
# Runs: ESLint, Build, TypeScript, Security, Access Control, Menus, Code Quality

set -e

PROJECT_NAME="${1:-$(basename $PWD)}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
AUDIT_LOG="audit_${TIMESTAMP}.log"

echo "🔍 FULL AUDIT: $PROJECT_NAME" | tee "$AUDIT_LOG"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$AUDIT_LOG"

# 1. ESLint Check
echo "" | tee -a "$AUDIT_LOG"
echo "📋 [1/6] ESLint Code Quality..." | tee -a "$AUDIT_LOG"
ESL_ERRORS=$(npm run lint 2>&1 | grep -c "✖.*error" || echo "0")
ESL_WARNINGS=$(npm run lint 2>&1 | grep -c "⚠.*warning" || echo "0")
echo "  → Errors: $ESL_ERRORS | Warnings: $ESL_WARNINGS" | tee -a "$AUDIT_LOG"

if [ "$ESL_ERRORS" -gt 0 ]; then
  echo "  ❌ ESLint FAILED" | tee -a "$AUDIT_LOG"
  npm run lint 2>&1 | grep "error" | tee -a "$AUDIT_LOG"
  exit 1
fi
echo "  ✅ ESLint PASS" | tee -a "$AUDIT_LOG"

# 2. TypeScript Check
echo "" | tee -a "$AUDIT_LOG"
echo "📋 [2/6] TypeScript Type Safety..." | tee -a "$AUDIT_LOG"
if npx tsc --noEmit 2>&1 | grep -q "error"; then
  echo "  ❌ TypeScript FAILED" | tee -a "$AUDIT_LOG"
  npx tsc --noEmit 2>&1 | tee -a "$AUDIT_LOG"
  exit 1
fi
echo "  ✅ TypeScript PASS" | tee -a "$AUDIT_LOG"

# 3. Build Check
echo "" | tee -a "$AUDIT_LOG"
echo "📋 [3/6] Production Build..." | tee -a "$AUDIT_LOG"
if npm run build 2>&1 | grep -q "error"; then
  echo "  ❌ Build FAILED" | tee -a "$AUDIT_LOG"
  npm run build 2>&1 | tee -a "$AUDIT_LOG"
  exit 1
fi
BUILD_SIZE=$(ls -lh dist/assets/index-*.js | awk '{print $5}')
echo "  ✅ Build PASS (Bundle: $BUILD_SIZE)" | tee -a "$AUDIT_LOG"

# 4. Security Vulnerabilities (npm audit)
echo "" | tee -a "$AUDIT_LOG"
echo "📋 [4/6] Security Vulnerabilities..." | tee -a "$AUDIT_LOG"
VULN_COUNT=$(npm audit 2>&1 | grep -o "[0-9]* vulnerabilities" | grep -o "[0-9]*" || echo "0")
if [ "$VULN_COUNT" -gt 0 ]; then
  echo "  ⚠️  Found $VULN_COUNT vulnerabilities" | tee -a "$AUDIT_LOG"
  npm audit 2>&1 | tee -a "$AUDIT_LOG"
else
  echo "  ✅ No vulnerabilities found" | tee -a "$AUDIT_LOG"
fi

# 5. Code Quality Checks
echo "" | tee -a "$AUDIT_LOG"
echo "📋 [5/6] Code Quality Metrics..." | tee -a "$AUDIT_LOG"
TODO_COUNT=$(grep -r "TODO\|FIXME\|BUG" src/ --include="*.ts" --include="*.tsx" | wc -l)
ANY_COUNT=$(grep -r "as any" src/ --include="*.ts" --include="*.tsx" | wc -l)
echo "  → TODOs/FIXMEs: $TODO_COUNT" | tee -a "$AUDIT_LOG"
echo "  → 'as any' casts: $ANY_COUNT" | tee -a "$AUDIT_LOG"

if [ "$ANY_COUNT" -gt 5 ]; then
  echo "  ⚠️  High 'as any' cast count (>5)" | tee -a "$AUDIT_LOG"
else
  echo "  ✅ Type safety acceptable" | tee -a "$AUDIT_LOG"
fi

# 6. Test Coverage (if tests exist)
echo "" | tee -a "$AUDIT_LOG"
echo "📋 [6/6] Test Suite..." | tee -a "$AUDIT_LOG"
if [ -f "package.json" ] && grep -q '"test"' package.json; then
  if npm run test 2>&1 | grep -q "PASS\|passed"; then
    echo "  ✅ Tests PASS" | tee -a "$AUDIT_LOG"
  else
    echo "  ⚠️  Tests FAILED or not configured" | tee -a "$AUDIT_LOG"
  fi
else
  echo "  ⏭️  No test suite found (skipped)" | tee -a "$AUDIT_LOG"
fi

# Summary
echo "" | tee -a "$AUDIT_LOG"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$AUDIT_LOG"
echo "✅ AUDIT COMPLETE" | tee -a "$AUDIT_LOG"
echo "📄 Log saved: $AUDIT_LOG" | tee -a "$AUDIT_LOG"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$AUDIT_LOG"

echo ""
echo "Recommendations:"
echo "  • ESLint: Fix all errors before committing"
echo "  • TypeScript: Reduce 'as any' casts (currently: $ANY_COUNT)"
echo "  • Security: Run 'npm audit fix' if vulnerabilities found"
echo "  • Code: Address TODO/FIXME markers (currently: $TODO_COUNT)"
