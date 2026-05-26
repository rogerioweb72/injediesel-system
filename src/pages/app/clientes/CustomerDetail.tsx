import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { ArrowLeft, Edit, Trash2, Plus, Car } from 'lucide-react'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { PriceTierBadge } from '@/components/shared/PriceTierBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useCustomer, useDeleteCustomer } from '@/hooks/useCustomers'
import { useVehicles, useDeleteVehicle } from '@/hooks/useVehicles'
import { VehicleForm } from './VehicleForm'

export default function CustomerDetail() {
  const navigate = useNavigate()
  const prefix = useRoutePrefix()
  const { id } = useParams<{ id: string }>()
  const [addVehicle, setAddVehicle] = useState(false)
  const [deleteCustomerOpen, setDeleteCustomerOpen] = useState(false)
  const [deleteVehicleId, setDeleteVehicleId] = useState<string | null>(null)

  const { data: customer, isLoading } = useCustomer(id ?? '')
  const { data: vehicles = [] } = useVehicles(id ?? '')
  const deleteCustomer = useDeleteCustomer()
  const deleteVehicle = useDeleteVehicle()

  if (isLoading || !customer) return <div className="pm-skeleton h-64 w-full rounded" />

  async function handleDeleteCustomer() {
    if (!customer) return
    await deleteCustomer.mutateAsync(customer.id)
    setDeleteCustomerOpen(false)
    navigate(`${prefix}/clientes`)
  }

  async function handleDeleteVehicle() {
    if (!deleteVehicleId || !id) return
    await deleteVehicle.mutateAsync({ id: deleteVehicleId, customerId: id })
    setDeleteVehicleId(null)
  }

  return (
    <div>
      <PageHeader
        title={customer.name}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate(`${prefix}/clientes`)}>
              <ArrowLeft size={16} className="mr-2" />Voltar
            </Button>
            <PermissionGuard module="clientes" action="edit">
              <Button variant="outline" onClick={() => navigate(`${prefix}/clientes/${id}/editar`)}>
                <Edit size={16} className="mr-2" />Editar
              </Button>
            </PermissionGuard>
            <PermissionGuard module="clientes" action="delete">
              <Button variant="ghost" onClick={() => setDeleteCustomerOpen(true)}>
                <Trash2 size={16} />
              </Button>
            </PermissionGuard>
          </div>
        }
      />

      <div className="pm-card mb-6 grid grid-cols-2 gap-4 max-w-2xl">
        <div>
          <p className="text-xs text-muted-foreground">E-mail</p>
          <p className="text-sm text-foreground">{customer.email ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Telefone</p>
          <p className="text-sm text-foreground">{customer.phone ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">CPF / CNPJ</p>
          <p className="text-sm text-foreground">{customer.document ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Tier de Preço</p>
          <PriceTierBadge tier={customer.price_tier} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          <span className={`text-sm font-medium ${customer.active ? 'text-green-400' : 'text-muted-foreground'}`}>
            {customer.active ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="pm-accent-line">Veículos ({vehicles.length})</div>
        <PermissionGuard module="veiculos" action="create">
          <Button size="sm" onClick={() => setAddVehicle(true)} style={{ background: 'var(--pm-accent-gradient)' }}>
            <Plus size={14} className="mr-1" />Adicionar Veículo
          </Button>
        </PermissionGuard>
      </div>

      {vehicles.length === 0 ? (
        <div className="pm-card flex flex-col items-center py-10 text-center gap-2">
          <Car size={32} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum veículo cadastrado.</p>
        </div>
      ) : (
        <div className="pm-card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--pm-gray-700))]">
                <th className="text-left p-3 font-medium text-muted-foreground">Placa</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Marca / Modelo</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Ano</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Tipo</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} className="border-b border-[hsl(var(--pm-gray-700))] last:border-0">
                  <td className="p-3 font-mono">{v.plate ?? '—'}</td>
                  <td className="p-3">{v.brand} {v.model}</td>
                  <td className="p-3">{v.year ?? '—'}</td>
                  <td className="p-3 capitalize">{v.vehicle_type.replace(/_/g, ' ')}</td>
                  <td className="p-3 text-right">
                    <PermissionGuard module="veiculos" action="delete">
                      <Button variant="ghost" size="icon" onClick={() => setDeleteVehicleId(v.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </PermissionGuard>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <VehicleForm open={addVehicle} onOpenChange={setAddVehicle} customerId={id ?? ''} />

      <ConfirmDialog
        open={deleteCustomerOpen}
        onOpenChange={setDeleteCustomerOpen}
        title="Excluir Cliente"
        description={`Tem certeza que deseja excluir "${customer.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDeleteCustomer}
        isLoading={deleteCustomer.isPending}
        confirmLabel="Excluir"
      />

      <ConfirmDialog
        open={!!deleteVehicleId}
        onOpenChange={(v) => !v && setDeleteVehicleId(null)}
        title="Excluir Veículo"
        description="Tem certeza que deseja excluir este veículo?"
        onConfirm={handleDeleteVehicle}
        isLoading={deleteVehicle.isPending}
        confirmLabel="Excluir"
      />
    </div>
  )
}
