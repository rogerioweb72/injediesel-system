import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Save } from 'lucide-react'
import { WizardProvider, useWizard, STEP_FIELDS, STEP_TITLES } from './WizardContext'
import type { FranchiseUnit } from '@/hooks/useFranchiseUnits'
import { Step1ContractType } from './steps/Step1ContractType'
import { Step2Identity } from './steps/Step2Identity'
import { Step3Territory } from './steps/Step3Territory'
import { Step4LegalContact } from './steps/Step4LegalContact'
import { Step5OpContact } from './steps/Step5OpContact'
import { Step6Address } from './steps/Step6Address'
import { Step7Operational } from './steps/Step7Operational'
import { ConfirmSummaryDialog } from './ConfirmSummaryDialog'

const TOTAL_STEPS = 7

const STEP_COMPONENTS: Record<number, React.FC> = {
  1: Step1ContractType,
  2: Step2Identity,
  3: Step3Territory,
  4: Step4LegalContact,
  5: Step5OpContact,
  6: Step6Address,
  7: Step7Operational,
}

function ProgressBar({ isEdit }: { isEdit: boolean }) {
  const { currentStep, setStep } = useWizard()
  return (
    <div className="space-y-2 mt-3">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => isEdit && setStep(step)}
            className={[
              'h-2 rounded-full transition-all duration-200',
              step === currentStep ? 'w-6 bg-[hsl(var(--pm-red-500))]' :
              step < currentStep ? 'w-2 bg-[hsl(var(--pm-red-500))]/40' :
              'w-2 bg-white/10',
              isEdit ? 'cursor-pointer' : 'cursor-default',
            ].join(' ')}
          />
        ))}
        <span className="ml-2 text-[10px] text-muted-foreground font-medium">
          Passo {currentStep} de {TOTAL_STEPS} — {STEP_TITLES[currentStep]}
        </span>
      </div>
    </div>
  )
}

interface WizardInnerProps {
  isEdit: boolean
  unit?: FranchiseUnit
  onOpenChange: (open: boolean) => void
}

function WizardInner({ isEdit, unit, onOpenChange }: WizardInnerProps) {
  const { form, currentStep, setStep, logoFile } = useWizard()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const StepComponent = STEP_COMPONENTS[currentStep]

  async function handleNext() {
    const fields = STEP_FIELDS[currentStep]
    const valid = await form.trigger(fields)
    if (!valid) return
    if (currentStep === TOTAL_STEPS) {
      const allValid = await form.trigger()
      if (allValid) setConfirmOpen(true)
    } else {
      setStep(currentStep + 1)
    }
  }

  function handlePrev() {
    if (currentStep === 1) {
      onOpenChange(false)
    } else {
      setStep(currentStep - 1)
    }
  }

  return (
    <>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0">
        <div className="sticky top-0 z-10 bg-background border-b border-white/[0.06] px-6 py-4">
          <SheetHeader>
            <SheetTitle className="text-base">
              {isEdit ? `Editar Unidade${unit ? ` — ${unit.name}` : ''}` : 'Nova Unidade Franqueada'}
            </SheetTitle>
          </SheetHeader>
          <ProgressBar isEdit={isEdit} />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <StepComponent />
        </div>

        <div className="sticky bottom-0 border-t border-white/[0.06] bg-background px-6 py-4 flex justify-between items-center">
          <Button type="button" variant="ghost" onClick={handlePrev}>
            {currentStep === 1 ? 'Cancelar' : (
              <><ChevronLeft size={16} className="mr-1" />Anterior</>
            )}
          </Button>
          <Button type="button" onClick={handleNext} style={{ background: 'var(--pm-accent-gradient)' }}>
            {currentStep === TOTAL_STEPS ? (
              <><Save size={15} className="mr-1.5" />{isEdit ? 'Salvar Alterações' : 'Salvar Unidade'}</>
            ) : (
              <>Próximo<ChevronRight size={16} className="ml-1" /></>
            )}
          </Button>
        </div>
      </SheetContent>

      <ConfirmSummaryDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        isEdit={isEdit}
        unit={unit}
        logoFile={logoFile}
        onSuccess={() => onOpenChange(false)}
      />
    </>
  )
}

function unitToInitialValues(unit: FranchiseUnit) {
  return {
    contract_type: unit.contract_type,
    contract_duration: 'custom' as const,
    contract_start_date: unit.contract_start_date?.split('T')[0] ?? '',
    contract_end_date: unit.contract_end_date?.split('T')[0] ?? '',
    name: unit.name,
    cnpj: unit.cnpj ?? '',
    razao_social: unit.razao_social,
    inscricao_estadual: unit.inscricao_estadual,
    phone: unit.phone,
    email: unit.email,
    website: unit.website,
    raio_atendimento_km: unit.raio_atendimento_km,
    cidades_atendidas_txt: unit.cidades_atendidas?.join(', ') ?? null,
    cidade_fiscal: unit.cidade_fiscal,
    perimetro_exclusivo: unit.perimetro_exclusivo ?? false,
    responsavel_legal_nome: unit.responsavel_legal_nome ?? '',
    responsavel_legal_cpf: unit.responsavel_legal_cpf ?? '',
    responsavel_legal_email: unit.responsavel_legal_email ?? '',
    responsavel_legal_telefone: unit.responsavel_legal_telefone ?? '',
    responsavel_legal_cargo: unit.responsavel_legal_cargo,
    responsavel_op_mesmo_legal: unit.responsavel_op_mesmo_legal ?? true,
    responsavel_op_nome: unit.responsavel_op_nome,
    responsavel_op_email: unit.responsavel_op_email,
    responsavel_op_telefone: unit.responsavel_op_telefone,
    cep: unit.cep ?? '',
    logradouro: unit.logradouro,
    numero: unit.numero ?? '',
    complemento: unit.complemento,
    bairro: unit.bairro,
    city: unit.city,
    state: unit.state,
    status: unit.status ?? 'em_implantacao',
    limite_colaboradores: unit.limite_colaboradores,
    observacoes_internas: unit.observacoes_internas,
  }
}

interface FranchiseeWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unit?: FranchiseUnit
}

export function FranchiseeWizard({ open, onOpenChange, unit }: FranchiseeWizardProps) {
  const isEdit = !!unit
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <WizardProvider key={unit?.id ?? 'new'} initialValues={isEdit && unit ? unitToInitialValues(unit) : undefined}>
        <WizardInner isEdit={isEdit} unit={unit} onOpenChange={onOpenChange} />
      </WizardProvider>
    </Sheet>
  )
}
