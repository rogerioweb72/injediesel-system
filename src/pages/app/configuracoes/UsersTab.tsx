import { useState } from 'react'
import { maskCPF, maskPhone, maskCEP } from '@/lib/validators'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useUsers, useUpdateUser, useInviteUser, type Profile } from '@/hooks/useUsers'
import { useFranchiseUnitsList } from '@/hooks/useFranchiseUnits'
import { getEffectivePermissions, countActivePermissions } from '@/hooks/usePermissions'
import { useProfile } from '@/hooks/useProfile'
import { useMyUnit } from '@/hooks/useMyUnit'
import {
  ROLE_LABELS,
  MODULE_LABELS,
  ROLE_DEFAULT_PERMISSIONS,
  getAccountTier,
  type UserRole,
  type RbacModule,
  type PermissionEntry,
} from '@/types/app'
import {
  Shield, ChevronDown, ChevronUp, RotateCcw, Percent, Plus, Mail, CheckCircle2, MoreVertical,
  ShieldCheck, UserCog, Wrench, BadgeDollarSign, ClipboardCheck, LineChart,
  Building2, Settings, Wallet, Headset, Store, AlertTriangle,
  type LucideIcon,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'

// ─── Role profile cards shown at top ──────────────────────────────────────────

interface RoleInfo {
  role: UserRole
  icon: LucideIcon
  color: string
  bg: string
  description: string
}

const FRANCHISE_ROLE_PROFILES: RoleInfo[] = [
  {
    role: 'franchise_manager',
    icon: ShieldCheck,
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.12)',
    description: 'Acesso completo. Ideal para sócio ou dono da unidade.',
  },
  {
    role: 'unit_manager',
    icon: UserCog,
    color: '#FB923C',
    bg: 'rgba(251,146,60,0.12)',
    description: 'Acesso total por padrão, mas customizável. Ideal para gerentes.',
  },
  {
    role: 'ecu_technician',
    icon: Wrench,
    color: '#60A5FA',
    bg: 'rgba(96,165,250,0.12)',
    description: 'Clientes, veículos e arquivos ECU. Sem acesso a financeiro.',
  },
  {
    role: 'unit_seller',
    icon: BadgeDollarSign,
    color: '#4ADE80',
    bg: 'rgba(74,222,128,0.12)',
    description: 'Vendas, clientes e PDV. Comissão configurável por usuário.',
  },
  {
    role: 'receptionist',
    icon: ClipboardCheck,
    color: '#FBBF24',
    bg: 'rgba(251,191,36,0.12)',
    description: 'Atendimento, pedidos e cadastros. Sem financeiro ou ECU.',
  },
  {
    role: 'finance_staff',
    icon: LineChart,
    color: '#F472B6',
    bg: 'rgba(244,114,182,0.12)',
    description: 'Financeiro, caixa e relatórios. Visão limitada de operações.',
  },
]

const MATRIX_ROLE_PROFILES: RoleInfo[] = [
  {
    role: 'company_admin',
    icon: Building2,
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.12)',
    description: 'Acesso total à matriz.',
  },
  {
    role: 'operations_admin',
    icon: Settings,
    color: '#60A5FA',
    bg: 'rgba(96,165,250,0.12)',
    description: 'Operações completas, sem gestão de usuários.',
  },
  {
    role: 'finance_admin',
    icon: Wallet,
    color: '#4ADE80',
    bg: 'rgba(74,222,128,0.12)',
    description: 'Financeiro, relatórios e visão de pedidos.',
  },
  {
    role: 'support_agent',
    icon: Headset,
    color: '#FBBF24',
    bg: 'rgba(251,191,36,0.12)',
    description: 'Suporte, franqueados e clientes (leitura).',
  },
  {
    role: 'seller',
    icon: Store,
    color: '#F472B6',
    bg: 'rgba(244,114,182,0.12)',
    description: 'Vendas, clientes e PDV na matriz.',
  },
]

function RoleCard({ info, onClick }: { info: RoleInfo; onClick?: () => void }) {
  const defaults = ROLE_DEFAULT_PERMISSIONS[info.role] ?? []
  const active = countActivePermissions(defaults)
  const Icon = info.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative text-left w-full rounded-xl flex flex-col transition-all duration-200"
      style={{
        background: 'hsl(var(--pm-gray-900))',
        border: '1px solid rgba(255,255,255,0.08)',
        padding: 'clamp(10px, 2.5vw, 20px)',
        minHeight: 'clamp(110px, 15vw, 168px)',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        if (!onClick) return
        e.currentTarget.style.border = '1px solid rgba(255,255,255,0.18)'
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'
        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.35)'
      }}
    >
      {/* hover + button */}
      {onClick && (
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="p-1.5 rounded-md" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <Plus size={15} style={{ color: 'hsl(var(--pm-gray-300))' }} />
          </div>
        </div>
      )}

      {/* Icon + title */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="p-2.5 rounded-lg shrink-0 flex items-center justify-center"
          style={{ background: info.bg, border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <Icon size={20} strokeWidth={2} style={{ color: info.color }} />
        </div>
        <span className="font-semibold text-sm leading-tight pr-8" style={{ color: 'hsl(var(--pm-gray-100))' }}>
          {ROLE_LABELS[info.role]}
        </span>
      </div>

      {/* Description */}
      <p className="text-[13px] flex-1 leading-relaxed" style={{ color: 'hsl(var(--pm-gray-500))' }}>
        {info.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 mt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="text-[11px] font-medium" style={{ color: 'hsl(var(--pm-gray-500))' }}>
          {active} permissões padrão
        </span>
      </div>
    </button>
  )
}

// ─── Permission matrix ─────────────────────────────────────────────────────────

const COL_LABELS = ['Ver', 'Criar', 'Editar', 'Del.'] as const
const COL_KEYS: (keyof PermissionEntry)[] = ['can_view', 'can_create', 'can_edit', 'can_delete']

function PermMatrix({
  permissions,
  onChange,
}: {
  permissions: PermissionEntry[]
  onChange: (updated: PermissionEntry[]) => void
}) {
  const toggle = (module: RbacModule, key: keyof PermissionEntry) => {
    onChange(
      permissions.map((e) =>
        e.module === module ? { ...e, [key]: !e[key] } : e,
      ),
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr>
            <th className="text-left py-1 pr-2 font-medium" style={{ color: 'hsl(var(--pm-gray-500))' }}>
              Módulo
            </th>
            {COL_LABELS.map((l) => (
              <th key={l} className="text-center py-1 px-1 font-medium w-10" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {permissions.map((entry) => {
            const anyOn = COL_KEYS.some((k) => entry[k])
            return (
              <tr
                key={entry.module}
                style={{
                  background: anyOn ? 'rgba(255,255,255,0.02)' : 'transparent',
                  opacity: anyOn ? 1 : 0.5,
                }}
              >
                <td className="py-1 pr-2" style={{ color: anyOn ? 'hsl(var(--pm-gray-300))' : 'hsl(var(--pm-gray-600))' }}>
                  {MODULE_LABELS[entry.module] ?? entry.module}
                </td>
                {COL_KEYS.map((key) => (
                  <td key={key} className="text-center px-1 py-1">
                    <button
                      type="button"
                      onClick={() => toggle(entry.module, key)}
                      className="w-5 h-5 rounded flex items-center justify-center mx-auto transition-colors"
                      style={{
                        background: entry[key] ? 'hsl(var(--pm-red-500)/0.2)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${entry[key] ? 'hsl(var(--pm-red-500)/0.5)' : 'rgba(255,255,255,0.1)'}`,
                      }}
                    >
                      {entry[key] && (
                        <span style={{ color: 'hsl(var(--pm-red-500))', fontSize: 10, lineHeight: 1 }}>✓</span>
                      )}
                    </button>
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── sha256 helper ─────────────────────────────────────────────────────────────

async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─── Main component ────────────────────────────────────────────────────────────


function getRoleColor(role: UserRole): string {
  const tier = getAccountTier(role)
  if (tier === 'franchise') return '#60A5FA'
  if (tier === 'system') return '#F87171'
  return '#A78BFA'
}

export function UsersTab() {
  const { isSystemTI } = useProfile()
  const { data: myUnit } = useMyUnit()
  // Context determined by unit_id (URL-based routing), not by role
  const isFranchise = !!myUnit?.unit_id
  const isSystem    = isSystemTI()

  const { data: users = [], isLoading } = useUsers()
  const updateUser = useUpdateUser()
  const inviteUser = useInviteUser()

  const [editUser, setEditUser]       = useState<Profile | null>(null)
  const [pendingToggle, setPendingToggle] = useState<Profile | null>(null)

  // Create / invite state
  const [createOpen, setCreateOpen]           = useState(false)
  const [createDone, setCreateDone]           = useState(false)
  const [createEmailSent, setCreateEmailSent] = useState(true)
  const [createEmail, setCreateEmail]         = useState('')
  const [createName, setCreateName]           = useState('')
  const [createRole, setCreateRole]           = useState<UserRole>('unit_seller')
  const [createUnitId, setCreateUnitId]       = useState<string>('')
  const [createHasCommission, setCreateHasCommission] = useState(false)
  const [createCommission, setCreateCommission] = useState('0')
  const [createMaxDiscount, setCreateMaxDiscount] = useState('0')
  const [createPermissions, setCreatePermissions] = useState<PermissionEntry[]>([])
  const [createShowPerms, setCreateShowPerms] = useState(false)

  const needsUnitSelect = !isFranchise && getAccountTier(createRole) === 'franchise'
  const { data: unitsList = [] } = useFranchiseUnitsList(!isFranchise)

  function openCreate(role?: UserRole) {
    const defaultRole = role ?? (isFranchise ? 'unit_seller' : 'operations_admin')
    setCreateRole(defaultRole)
    setCreateEmail('')
    setCreateName('')
    setCreateUnitId('')
    setCreateHasCommission(false)
    setCreateCommission('0')
    setCreateMaxDiscount('0')
    setCreatePermissions(ROLE_DEFAULT_PERMISSIONS[defaultRole] ?? [])
    setCreateShowPerms(false)
    setCreateDone(false)
    setCreateEmailSent(true)
    setCreateOpen(true)
  }

  function handleCreateRoleChange(role: UserRole) {
    setCreateRole(role)
    setCreateUnitId('')
    setCreatePermissions(ROLE_DEFAULT_PERMISSIONS[role] ?? [])
  }

  async function submitCreate() {
    const result = await inviteUser.mutateAsync({
      email: createEmail.trim(),
      name: createName.trim(),
      role: createRole,
      unit_id: isFranchise ? (myUnit?.unit_id ?? null) : (needsUnitSelect ? createUnitId || null : null),
      commission_rate: createHasCommission ? (parseFloat(createCommission) || 0) : 0,
      max_discount_pct: parseFloat(createMaxDiscount) || 0,
      permissions: createPermissions,
    })
    setCreateEmailSent(result?.email_sent !== false)
    setCreateDone(true)
  }

  // edit sheet state — acesso
  const [editRole, setEditRole]               = useState<UserRole>('unit_operator')
  const [editMaxDiscount, setEditMaxDiscount] = useState('0')
  const [editHasCommission, setEditHasCommission] = useState(false)
  const [editCommission, setEditCommission]   = useState('0')
  const [editPermissions, setEditPermissions] = useState<PermissionEntry[]>([])
  const [editAuthPin, setEditAuthPin]         = useState('')
  const [editAuthPin2, setEditAuthPin2]       = useState('')
  const [pinMismatch, setPinMismatch]         = useState(false)
  const [showPerms, setShowPerms]             = useState(false)
  // edit sheet state — dados pessoais
  const [editName, setEditName]               = useState('')
  const [editPhone, setEditPhone]             = useState('')
  const [editCpf, setEditCpf]                 = useState('')
  const [editBirthDate, setEditBirthDate]     = useState('')
  // edit sheet state — endereço
  const [editCep, setEditCep]                 = useState('')
  const [editStreet, setEditStreet]           = useState('')
  const [editAddressNumber, setEditAddressNumber] = useState('')
  const [editComplement, setEditComplement]   = useState('')
  const [editNeighborhood, setEditNeighborhood] = useState('')
  const [editCity, setEditCity]               = useState('')
  const [editState, setEditState]             = useState('')
  const [cepLoading, setCepLoading]           = useState(false)
  // edit sheet state — RH
  const [editHireDate, setEditHireDate]       = useState('')
  const [editSalary, setEditSalary]           = useState('')
  // edit sheet state — relatórios
  const [editRelatorioFinanceiro, setEditRelatorioFinanceiro] = useState(false)
  const [editRelatorioEcu, setEditRelatorioEcu]               = useState(false)
  const [editRelatorioVendas, setEditRelatorioVendas]         = useState(false)
  const [editRelatorioFranquias, setEditRelatorioFranquias]   = useState(false)
  // edit sheet sections
  const [sectionOpen, setSectionOpen]         = useState<'acesso' | 'pessoal' | 'endereco' | 'rh'>('acesso')

  function openEdit(user: Profile) {
    setEditUser(user)
    setEditRole(user.role)
    setEditMaxDiscount(String(user.max_discount_pct ?? 0))
    setEditHasCommission((user.commission_rate ?? 0) > 0)
    setEditCommission(String(user.commission_rate ?? 0))
    setEditPermissions(getEffectivePermissions(user.role, user.permissions))
    setEditAuthPin('')
    setEditAuthPin2('')
    setPinMismatch(false)
    setShowPerms(false)
    setEditName(user.name ?? '')
    setEditPhone(maskPhone(user.phone ?? ''))
    setEditCpf(maskCPF(user.cpf ?? ''))
    setEditBirthDate(user.birth_date ?? '')
    setEditCep(maskCEP(user.cep ?? ''))
    setEditStreet(user.street ?? '')
    setEditAddressNumber(user.address_number ?? '')
    setEditComplement(user.complement ?? '')
    setEditNeighborhood(user.neighborhood ?? '')
    setEditCity(user.city ?? '')
    setEditState(user.state ?? '')
    setEditHireDate(user.hire_date ?? '')
    setEditSalary(user.salary != null ? String(user.salary) : '')
    setEditRelatorioFinanceiro(user.relatorio_financeiro ?? false)
    setEditRelatorioEcu(user.relatorio_ecu ?? false)
    setEditRelatorioVendas(user.relatorio_vendas ?? false)
    setEditRelatorioFranquias(user.relatorio_franquias ?? false)
    setSectionOpen('acesso')
  }

  function handleRoleChange(role: UserRole) {
    setEditRole(role)
    setEditPermissions(ROLE_DEFAULT_PERMISSIONS[role] ?? [])
  }

  function resetPermissions() {
    setEditPermissions(ROLE_DEFAULT_PERMISSIONS[editRole] ?? [])
  }

  async function lookupCep(cep: string) {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) return
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setEditStreet(data.logradouro ?? '')
        setEditNeighborhood(data.bairro ?? '')
        setEditCity(data.localidade ?? '')
        setEditState(data.uf ?? '')
      }
    } catch { /* silent */ } finally {
      setCepLoading(false)
    }
  }

  async function saveEdit() {
    if (!editUser) return
    setPinMismatch(false)

    const payload: Parameters<typeof updateUser.mutateAsync>[0] = {
      id: editUser.id,
      name: editName.trim() || editUser.name,
      role: editRole,
      max_discount_pct: parseFloat(editMaxDiscount) || 0,
      commission_rate: editHasCommission ? (parseFloat(editCommission) || 0) : 0,
      permissions: editPermissions,
      phone: editPhone.replace(/\D/g, '') || null,
      cpf: editCpf.replace(/\D/g, '') || null,
      birth_date: editBirthDate || null,
      cep: editCep.replace(/\D/g, '') || null,
      street: editStreet.trim() || null,
      address_number: editAddressNumber.trim() || null,
      complement: editComplement.trim() || null,
      neighborhood: editNeighborhood.trim() || null,
      city: editCity.trim() || null,
      state: editState.trim() || null,
      hire_date: editHireDate || null,
      salary: editSalary ? (parseFloat(editSalary) || null) : null,
      relatorio_financeiro: editRelatorioFinanceiro,
      relatorio_ecu:        editRelatorioEcu,
      relatorio_vendas:     editRelatorioVendas,
      relatorio_franquias:  editRelatorioFranquias,
    }

    if (editAuthPin) {
      if (editAuthPin !== editAuthPin2) { setPinMismatch(true); return }
      payload.discount_auth_hash = await sha256hex(editAuthPin)
    }

    await updateUser.mutateAsync(payload)
    setEditUser(null)
  }

  async function confirmToggle() {
    if (!pendingToggle) return
    await updateUser.mutateAsync({ id: pendingToggle.id, active: !pendingToggle.active })
    setPendingToggle(null)
  }

  // Franchise context: only franchise roles.
  // Matrix context: all roles (matrix-admin + all operational roles).
  // system_ti: unrestricted.
  const rolesForSelector = (Object.keys(ROLE_LABELS) as UserRole[]).filter((r) => {
    if (isSystem) return true
    const t = getAccountTier(r)
    if (t === 'system') return false          // never show system_ti to non-system
    if (isFranchise) return t === 'franchise' // franchise sees only franchise roles
    return true                               // matrix sees everything
  })

  const franchiseUsers = users.filter((u) => getAccountTier(u.role) === 'franchise')
  const matrixUsers    = users.filter((u) => getAccountTier(u.role) === 'matrix')
  const systemUsers    = users.filter((u) => getAccountTier(u.role) === 'system')

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="pm-skeleton h-14 rounded" />
        ))}
      </div>
    )
  }

  return (
    <>
      {/* ── Perfis Operacionais ── */}
      <section className="mb-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-5 gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'hsl(var(--pm-gray-400))' }}>
              Perfis Operacionais
            </p>
            <p className="text-sm" style={{ color: 'hsl(var(--pm-gray-500))' }}>
              Selecione um perfil para convidar um novo usuário com esse cargo.
            </p>
          </div>
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-2 text-sm font-medium text-white rounded-lg px-4 py-2.5 transition-colors shrink-0"
            style={{ background: 'hsl(var(--pm-red-500))', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <Plus size={17} /> Convidar Usuário
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {FRANCHISE_ROLE_PROFILES.map((info) => (
            <RoleCard key={info.role} info={info} onClick={() => openCreate(info.role)} />
          ))}
        </div>
      </section>

      {/* ── Perfis Administrativos (matrix only) ── */}
      {!isFranchise && (
        <section className="mb-10">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'hsl(var(--pm-gray-400))' }}>
              Perfis Administrativos da Matriz
            </p>
            <p className="text-sm" style={{ color: 'hsl(var(--pm-gray-500))' }}>
              Cargos restritos para gerenciamento e operações centrais.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {MATRIX_ROLE_PROFILES.map((info) => (
              <RoleCard key={info.role} info={info} onClick={() => openCreate(info.role)} />
            ))}
          </div>
        </section>
      )}

      {/* ── User list ── */}
      <UserSection title="Usuários da Franquia" users={franchiseUsers} onEdit={openEdit} onToggle={setPendingToggle} />
      <UserSection title="Usuários da Matriz"   users={matrixUsers}   onEdit={openEdit} onToggle={setPendingToggle} />
      <UserSection title="Suporte / Sistema"    users={systemUsers}   onEdit={openEdit} onToggle={setPendingToggle} />

      {users.length === 0 && (
        <div className="pm-card py-12 text-center text-sm text-muted-foreground">
          Nenhum usuário encontrado.
        </div>
      )}

      {/* ── Edit sheet ── */}
      <Sheet open={!!editUser} onOpenChange={(v) => !v && setEditUser(null)}>
        <SheetContent className="overflow-y-auto" style={{ maxWidth: 520, width: '100%' }}>
          <SheetHeader>
            <SheetTitle>Editar Colaborador</SheetTitle>
          </SheetHeader>

          {editUser && (
            <div className="mt-4 space-y-2">

              {/* ── Section tabs ── */}
              <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background: 'hsl(var(--pm-gray-900))' }}>
                {([
                  { key: 'acesso',   label: 'Acesso' },
                  { key: 'pessoal',  label: 'Pessoal' },
                  { key: 'endereco', label: 'Endereço' },
                  { key: 'rh',       label: 'RH' },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSectionOpen(key)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: sectionOpen === key ? 'hsl(var(--pm-gray-700))' : 'transparent',
                      color: sectionOpen === key ? 'hsl(var(--pm-gray-100))' : 'hsl(var(--pm-gray-500))',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* ════ ACESSO ════ */}
              {sectionOpen === 'acesso' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Cargo / Perfil</label>
                    <Select value={editRole} onValueChange={(v) => handleRoleChange(v as UserRole)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {rolesForSelector.filter((r) => getAccountTier(r) === 'franchise').length > 0 && <>
                          <p className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">Franquia</p>
                          {rolesForSelector.filter((r) => getAccountTier(r) === 'franchise').map((r) => (
                            <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                          ))}
                        </>}
                        {rolesForSelector.filter((r) => getAccountTier(r) === 'matrix').length > 0 && <>
                          <p className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground mt-1">Matriz</p>
                          {rolesForSelector.filter((r) => getAccountTier(r) === 'matrix').map((r) => (
                            <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                          ))}
                        </>}
                        {rolesForSelector.filter((r) => getAccountTier(r) === 'system').length > 0 && <>
                          <p className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground mt-1">Sistema</p>
                          {rolesForSelector.filter((r) => getAccountTier(r) === 'system').map((r) => (
                            <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                          ))}
                        </>}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-xl p-3 space-y-3" style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium flex items-center gap-1.5 text-foreground">
                        <Percent size={12} /> Direito a comissão
                      </label>
                      <Switch checked={editHasCommission} onCheckedChange={setEditHasCommission} />
                    </div>
                    {editHasCommission && (
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">Percentual (%)</label>
                        <Input type="number" min={0} max={100} step={0.5} value={editCommission}
                          onChange={(e) => setEditCommission(e.target.value)} placeholder="0" />
                        <p className="text-[11px] text-muted-foreground/60">Calculado sobre o valor líquido pago pelo cliente</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Desconto máximo autônomo (%)</label>
                    <Input type="number" min={0} max={100} step={0.5} value={editMaxDiscount}
                      onChange={(e) => setEditMaxDiscount(e.target.value)} placeholder="0" />
                    <p className="text-xs text-muted-foreground/60">0 = nenhum desconto sem aprovação</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Senha de autorização de desconto
                      {editUser.discount_auth_hash && <span style={{ marginLeft: 6, color: '#34D399' }}>(já configurada)</span>}
                    </label>
                    <Input type="password"
                      placeholder={editUser.discount_auth_hash ? 'Nova senha (deixe em branco para manter)' : 'Definir senha...'}
                      value={editAuthPin} onChange={(e) => { setEditAuthPin(e.target.value); setPinMismatch(false) }}
                      autoComplete="new-password" />
                    {editAuthPin && (
                      <Input type="password" placeholder="Confirmar senha" value={editAuthPin2}
                        onChange={(e) => { setEditAuthPin2(e.target.value); setPinMismatch(false) }}
                        autoComplete="new-password" className="mt-1.5" />
                    )}
                    {pinMismatch && <p className="text-xs text-red-400">As senhas não coincidem</p>}
                  </div>

                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                    <button type="button" onClick={() => setShowPerms(!showPerms)}
                      className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold"
                      style={{ background: 'hsl(var(--pm-gray-900))', color: 'hsl(var(--pm-gray-300))' }}>
                      <span className="flex items-center gap-2">
                        <Shield size={13} /> Permissões de Acesso
                        <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px]"
                          style={{ background: 'hsl(var(--pm-red-500)/0.15)', color: 'hsl(var(--pm-red-500))' }}>
                          {countActivePermissions(editPermissions)}
                        </span>
                      </span>
                      {showPerms ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    {showPerms && (
                      <div className="px-4 pb-4 pt-3 space-y-3" style={{ background: 'hsl(var(--pm-gray-900))' }}>
                        <div className="flex items-center justify-between">
                          <p className="text-[11px]" style={{ color: 'hsl(var(--pm-gray-500))' }}>Personalize os acessos abaixo ou</p>
                          <button type="button" onClick={resetPermissions}
                            className="flex items-center gap-1 text-[11px] transition-colors"
                            style={{ color: 'hsl(var(--pm-gray-500))' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'hsl(var(--pm-gray-500))')}>
                            <RotateCcw size={10} /> restaurar padrão
                          </button>
                        </div>
                        <PermMatrix permissions={editPermissions} onChange={setEditPermissions} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ════ DADOS PESSOAIS ════ */}
              {sectionOpen === 'pessoal' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Nome completo</label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome do colaborador" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">E-mail</label>
                    <Input value={editUser.email ?? ''} disabled className="opacity-50 cursor-not-allowed" />
                    <p className="text-[11px] text-muted-foreground/60">E-mail não pode ser alterado aqui</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Telefone</label>
                      <Input value={editPhone} onChange={(e) => setEditPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">CPF</label>
                      <Input value={editCpf} onChange={(e) => setEditCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Data de nascimento</label>
                    <Input type="date" value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} />
                  </div>
                </div>
              )}

              {/* ════ ENDEREÇO ════ */}
              {sectionOpen === 'endereco' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">CEP</label>
                    <div className="flex gap-2">
                      <Input value={editCep} onChange={(e) => setEditCep(maskCEP(e.target.value))}
                        onBlur={(e) => lookupCep(e.target.value)} placeholder="00000-000" className="flex-1" />
                      {cepLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin self-center" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground/60">Preenche endereço automaticamente ao sair do campo</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Logradouro</label>
                    <Input value={editStreet} onChange={(e) => setEditStreet(e.target.value)} placeholder="Rua, Avenida..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Número</label>
                      <Input value={editAddressNumber} onChange={(e) => setEditAddressNumber(e.target.value)} placeholder="123" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Complemento</label>
                      <Input value={editComplement} onChange={(e) => setEditComplement(e.target.value)} placeholder="Apto, sala..." />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Bairro</label>
                    <Input value={editNeighborhood} onChange={(e) => setEditNeighborhood(e.target.value)} placeholder="Bairro" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs text-muted-foreground">Cidade</label>
                      <Input value={editCity} onChange={(e) => setEditCity(e.target.value)} placeholder="Cidade" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">UF</label>
                      <Input value={editState} onChange={(e) => setEditState(e.target.value)} placeholder="PR" maxLength={2} />
                    </div>
                  </div>
                </div>
              )}

              {/* ════ RH ════ */}
              {sectionOpen === 'rh' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Data de contratação</label>
                    <Input type="date" value={editHireDate} onChange={(e) => setEditHireDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Salário / Remuneração (R$)</label>
                    <Input type="number" min={0} step={0.01} value={editSalary}
                      onChange={(e) => setEditSalary(e.target.value)} placeholder="0,00" />
                    <p className="text-[11px] text-muted-foreground/60">Dado interno — não visível ao colaborador</p>
                  </div>
                </div>
              )}

              {/* ── Acesso a Relatórios ─────────────────────────────────── */}
              <div className="space-y-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                  Acesso a Relatórios
                </p>
                {[
                  { key: 'relatorio_ecu'        as const, label: 'ECU',        desc: 'Histórico de arquivos por unidade e período', checked: editRelatorioEcu,        set: setEditRelatorioEcu },
                  { key: 'relatorio_financeiro' as const, label: 'Financeiro', desc: 'Extratos, cobranças ECU, faturas por unidade', checked: editRelatorioFinanceiro, set: setEditRelatorioFinanceiro },
                  { key: 'relatorio_franquias'  as const, label: 'Franquias',  desc: 'Ficha, dados cadastrais e contratos',          checked: editRelatorioFranquias,  set: setEditRelatorioFranquias },
                  { key: 'relatorio_vendas'     as const, label: 'Vendas',     desc: 'Pedidos B2B, produtos, faturamento (em breve)', checked: editRelatorioVendas,    set: setEditRelatorioVendas },
                ].map(({ key, label, desc, checked, set }) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{label}</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>{desc}</p>
                    </div>
                    <Switch
                      checked={checked}
                      onCheckedChange={set}
                    />
                  </div>
                ))}
              </div>

              <Button className="w-full mt-4" onClick={saveEdit} disabled={updateUser.isPending}
                style={{ background: 'var(--pm-accent-gradient)' }}>
                {updateUser.isPending ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Invite / create user sheet ── */}
      <Sheet open={createOpen} onOpenChange={(v) => { if (!v) setCreateOpen(false) }}>
        <SheetContent className="overflow-y-auto" style={{ maxWidth: 480, width: '100%' }}>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Mail size={16} /> Convidar Usuário
            </SheetTitle>
          </SheetHeader>

          {createDone ? (
            <div className="mt-10 flex flex-col items-center gap-4 text-center">
              {createEmailSent ? (
                <>
                  <CheckCircle2 size={40} style={{ color: '#34D399' }} />
                  <p className="text-base font-semibold text-foreground">Convite enviado!</p>
                  <p className="text-sm text-muted-foreground">
                    Um e-mail de convite foi enviado para <strong>{createEmail}</strong>.<br />
                    O usuário receberá um link para definir sua senha e acessar o sistema.
                  </p>
                </>
              ) : (
                <>
                  <AlertTriangle size={40} style={{ color: '#FBBF24' }} />
                  <p className="text-base font-semibold text-foreground">Usuário vinculado, e-mail não enviado</p>
                  <p className="text-sm text-muted-foreground">
                    Usuário vinculado, mas nenhum e-mail foi enviado automaticamente.<br />
                    Envie um link de recuperação de senha manualmente para <strong>{createEmail}</strong>.
                  </p>
                </>
              )}
              <Button
                className="mt-4 w-full"
                variant="outline"
                onClick={() => { setCreateDone(false); setCreateEmail(''); setCreateName('') }}
              >
                Convidar outro usuário
              </Button>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">E-mail *</label>
                <Input
                  type="email"
                  placeholder="usuario@email.com"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  autoComplete="off"
                />
              </div>

              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Nome completo *</label>
                <Input
                  type="text"
                  placeholder="Nome do usuário"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                />
              </div>

              {/* Role */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Cargo / Perfil</label>
                <Select value={createRole} onValueChange={(v) => handleCreateRoleChange(v as UserRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {rolesForSelector.filter((r) => getAccountTier(r) === 'franchise').length > 0 && <>
                      <p className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">Franquia</p>
                      {rolesForSelector.filter((r) => getAccountTier(r) === 'franchise').map((r) => (
                        <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                      ))}
                    </>}
                    {rolesForSelector.filter((r) => getAccountTier(r) === 'matrix').length > 0 && <>
                      <p className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground mt-1">Matriz</p>
                      {rolesForSelector.filter((r) => getAccountTier(r) === 'matrix').map((r) => (
                        <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                      ))}
                    </>}
                  </SelectContent>
                </Select>
              </div>

              {/* Unit selector — optional when matrix user invites a franchise-role */}
              {needsUnitSelect && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Vincular à unidade (opcional)</label>
                  <Select value={createUnitId || '_matrix'} onValueChange={(v) => setCreateUnitId(v === '_matrix' ? '' : v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_matrix">Colaborador Matriz (sem unidade)</SelectItem>
                      {unitsList.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground/60">
                    Sem unidade = colaborador vinculado à matriz
                  </p>
                </div>
              )}

              {/* Commission toggle — available for any role */}
              <div
                className="rounded-xl p-3 space-y-3"
                style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium flex items-center gap-1.5 text-foreground">
                    <Percent size={12} /> Direito a comissão
                  </label>
                  <Switch
                    checked={createHasCommission}
                    onCheckedChange={setCreateHasCommission}
                  />
                </div>
                {createHasCommission && (
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">Percentual (%)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={createCommission}
                      onChange={(e) => setCreateCommission(e.target.value)}
                      placeholder="0"
                    />
                    <p className="text-[11px] text-muted-foreground/60">
                      Calculado sobre o valor líquido pago pelo cliente
                    </p>
                  </div>
                )}
              </div>

              {/* Discount limit */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Desconto máximo autônomo (%)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={createMaxDiscount}
                  onChange={(e) => setCreateMaxDiscount(e.target.value)}
                  placeholder="0"
                />
              </div>

              {/* Permissions */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <button
                  type="button"
                  onClick={() => setCreateShowPerms(!createShowPerms)}
                  className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold"
                  style={{ background: 'hsl(var(--pm-gray-900))', color: 'hsl(var(--pm-gray-300))' }}
                >
                  <span className="flex items-center gap-2">
                    <Shield size={13} />
                    Permissões de Acesso
                    <span
                      className="ml-1 px-1.5 py-0.5 rounded-full text-[10px]"
                      style={{ background: 'hsl(var(--pm-red-500)/0.15)', color: 'hsl(var(--pm-red-500))' }}
                    >
                      {countActivePermissions(createPermissions)}
                    </span>
                  </span>
                  {createShowPerms ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                {createShowPerms && (
                  <div className="px-4 pb-4 pt-3 space-y-3" style={{ background: 'hsl(var(--pm-gray-900))' }}>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px]" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                        Personalize ou restaure o padrão do cargo
                      </p>
                      <button
                        type="button"
                        onClick={() => setCreatePermissions(ROLE_DEFAULT_PERMISSIONS[createRole] ?? [])}
                        className="flex items-center gap-1 text-[11px] transition-colors"
                        style={{ color: 'hsl(var(--pm-gray-500))' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'hsl(var(--pm-gray-500))')}
                      >
                        <RotateCcw size={10} /> restaurar padrão
                      </button>
                    </div>
                    <PermMatrix permissions={createPermissions} onChange={setCreatePermissions} />
                  </div>
                )}
              </div>

              {inviteUser.isError && (
                <p className="text-xs text-red-400">
                  {(inviteUser.error)?.message ?? 'Erro ao enviar convite'}
                </p>
              )}

              <Button
                className="w-full"
                onClick={submitCreate}
                disabled={inviteUser.isPending || !createEmail.trim() || !createName.trim()}
                style={{ background: 'var(--pm-accent-gradient)' }}
              >
                {inviteUser.isPending ? 'Enviando convite...' : 'Enviar Convite'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Toggle active confirm */}
      <ConfirmDialog
        open={!!pendingToggle}
        onOpenChange={(v) => !v && setPendingToggle(null)}
        title={pendingToggle?.active ? 'Desativar usuário' : 'Reativar usuário'}
        description={
          pendingToggle?.active
            ? `"${pendingToggle?.name}" perderá acesso ao sistema.`
            : `"${pendingToggle?.name}" voltará a ter acesso ao sistema.`
        }
        onConfirm={confirmToggle}
        isLoading={updateUser.isPending}
        confirmLabel={pendingToggle?.active ? 'Desativar' : 'Reativar'}
      />
    </>
  )
}

// ─── User section ──────────────────────────────────────────────────────────────

function UserSection({
  title,
  users,
  onEdit,
  onToggle,
}: {
  title: string
  users: Profile[]
  onEdit: (u: Profile) => void
  onToggle: (u: Profile) => void
}) {
  if (users.length === 0) return null

  return (
    <section className="mb-8">
      <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'hsl(var(--pm-gray-400))' }}>
        {title}
      </p>
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {users.map((user, idx) => {
          const roleColor = getRoleColor(user.role)
          const perms = getEffectivePermissions(user.role, user.permissions)
          const activePerm = countActivePermissions(perms)
          const initials = user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

          return (
            <div
              key={user.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 transition-colors group"
              style={{
                borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.06)' : undefined,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Left: avatar + info */}
              <div className="flex items-center gap-4 mb-4 sm:mb-0">
                <div
                  className="w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-inner"
                  style={{
                    background: user.active
                      ? 'linear-gradient(135deg, hsl(var(--pm-red-500)), #9b1212)'
                      : 'hsl(var(--pm-gray-700))',
                    border: '2px solid rgba(255,255,255,0.07)',
                    opacity: user.active ? 1 : 0.6,
                  }}
                >
                  {initials}
                </div>

                <div>
                  <h4
                    className="text-base font-semibold leading-tight"
                    style={{ color: user.active ? 'hsl(var(--pm-gray-100))' : 'hsl(var(--pm-gray-500))', textDecoration: user.active ? undefined : 'line-through' }}
                  >
                    {user.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold"
                      style={{
                        background: `${roleColor}15`,
                        color: roleColor,
                        border: `1px solid ${roleColor}30`,
                      }}
                    >
                      {ROLE_LABELS[user.role]}
                    </span>
                    {(user.commission_rate ?? 0) > 0 && (
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{ background: 'rgba(74,222,128,0.08)', color: '#4ADE80', border: '1px solid rgba(74,222,128,0.2)' }}
                      >
                        comissão {user.commission_rate}%
                      </span>
                    )}
                    {(user.max_discount_pct ?? 0) > 0 && (
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{ background: 'rgba(251,191,36,0.08)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.2)' }}
                      >
                        desc. até {user.max_discount_pct}%
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: 'hsl(var(--pm-gray-600))' }}>
                      {activePerm} permissões{user.permissions ? ' (custom)' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: status + actions */}
              <div className="flex items-center gap-3 sm:ml-4 shrink-0">
                {/* Status badge */}
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full mr-1"
                  style={{
                    background: user.active ? 'rgba(52,211,153,0.08)' : 'rgba(148,163,184,0.06)',
                    border: `1px solid ${user.active ? 'rgba(52,211,153,0.2)' : 'rgba(148,163,184,0.15)'}`,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: user.active ? '#34D399' : '#475569',
                      flexShrink: 0,
                      boxShadow: user.active ? '0 0 6px rgba(52,211,153,0.7)' : 'none',
                    }}
                  />
                  <span className="text-xs font-semibold" style={{ color: user.active ? '#34D399' : '#475569' }}>
                    {user.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                {/* Edit button */}
                <button
                  onClick={() => onEdit(user)}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
                  style={{
                    background: 'hsl(var(--pm-gray-800))',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'hsl(var(--pm-gray-200))',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'hsl(var(--pm-gray-700))'
                    e.currentTarget.style.border = '1px solid rgba(255,255,255,0.18)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'hsl(var(--pm-gray-800))'
                    e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  Editar
                </button>

                {/* Toggle button */}
                <button
                  onClick={() => onToggle(user)}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
                  style={{
                    background: 'transparent',
                    border: '1px solid transparent',
                    color: user.active ? '#fb923c' : '#4ADE80',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = user.active ? 'rgba(251,146,60,0.08)' : 'rgba(74,222,128,0.08)'
                    e.currentTarget.style.border = user.active ? '1px solid rgba(251,146,60,0.25)' : '1px solid rgba(74,222,128,0.25)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.border = '1px solid transparent'
                  }}
                >
                  {user.active ? 'Desativar' : 'Reativar'}
                </button>

                {/* More */}
                <button
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'hsl(var(--pm-gray-600))' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.color = 'hsl(var(--pm-gray-300))'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'hsl(var(--pm-gray-600))'
                  }}
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
