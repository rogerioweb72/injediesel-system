import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Outlet, Navigate, useParams } from 'react-router-dom'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { AppShell } from '@/components/layout/AppShell'
import { FranqueadoShell } from '@/components/layout/FranqueadoShell'
import { useAuth } from '@/hooks/useAuth'
import { useProfileSync } from '@/hooks/useProfileSync'
import { TunerSplashProvider } from '@/components/branding/TunerSplashProvider'
import { RoutePrefixProvider } from '@/contexts/RoutePrefixContext'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { UnitGuard } from '@/components/auth/UnitGuard'
import { ModuleGuard } from '@/components/auth/ModuleGuard'
import { MATRIX_ROLES, FRANCHISE_ROLES, SYSTEM_ROLES, type RbacModule } from '@/types/app'

const Home              = lazy(() => import('@/pages/LandingV2'))
const LojaPage          = lazy(() => import('@/pages/LojaPage'))
const Login             = lazy(() => import('@/pages/Login'))
const LoginParceiro     = lazy(() => import('@/pages/LoginParceiro'))
const NotFound          = lazy(() => import('@/pages/NotFound'))
const Dashboard         = lazy(() => import('@/pages/app/Dashboard'))
const CustomersPage     = lazy(() => import('@/pages/app/clientes/CustomersPage'))
const CustomerForm      = lazy(() => import('@/pages/app/clientes/CustomerForm'))
const CustomerDetail    = lazy(() => import('@/pages/app/clientes/CustomerDetail'))
const ProductsPage      = lazy(() => import('@/pages/app/produtos/ProductsPage'))
const ProductForm       = lazy(() => import('@/pages/app/produtos/ProductForm'))
const ProductDetail     = lazy(() => import('@/pages/app/produtos/ProductDetail'))
const FranchiseesPage   = lazy(() => import('@/pages/app/franqueados/FranchiseesPage'))
const FranchiseeDetail  = lazy(() => import('@/pages/app/franqueados/FranchiseeDetail'))
const NovoContratoPage  = lazy(() => import('@/pages/app/franqueados/NovoContratoPage'))
const EcuJobsPage       = lazy(() => import('@/pages/app/arquivos/EcuJobsPage'))
const EcuJobForm        = lazy(() => import('@/pages/app/arquivos/EcuJobForm'))
const EcuJobDetail      = lazy(() => import('@/pages/app/arquivos/EcuJobDetail'))
const PdvPage           = lazy(() => import('@/pages/app/pdv/PdvPage'))
const OrdersPage        = lazy(() => import('@/pages/app/pedidos/OrdersPage'))
const PedidosB2BPage    = lazy(() => import('@/pages/app/pedidos/PedidosB2BPage'))
const SupportPage       = lazy(() => import('@/pages/app/suporte/SupportPage'))
const SupportTicketForm = lazy(() => import('@/pages/app/suporte/SupportTicketForm'))
const SupportTicketDetail = lazy(() => import('@/pages/app/suporte/SupportTicketDetail'))
const ConfigPage        = lazy(() => import('@/pages/app/configuracoes/ConfigPage'))
const FinanceiroPage    = lazy(() => import('@/pages/app/financeiro/FinanceiroPage'))
const VehicleDetailPage = lazy(() => import('@/pages/VehicleDetailPage'))
const TabelaRemapPage   = lazy(() => import('@/pages/app/tabela-remap/TabelaRemapPage'))
const FranqueadoCatalogPage   = lazy(() => import('@/pages/app/franqueados/FranqueadoCatalogPage'))
const FranqueadoDashboard     = lazy(() => import('@/pages/app/franqueados/FranqueadoDashboard'))
const AtualizacoesPage        = lazy(() => import('@/pages/app/franqueados/AtualizacoesPage'))
const FranqueadoConfigPage    = lazy(() => import('@/pages/app/franqueados/FranqueadoConfigPage'))
const FranqueadoPerfilPage    = lazy(() => import('@/pages/app/franqueados/FranqueadoPerfilPage'))
const FranqueadoFaturasPage   = lazy(() => import('@/pages/app/franqueados/FranqueadoFaturasPage'))
const FranqueadoLojaPage      = lazy(() => import('@/pages/app/franqueados/FranqueadoLojaPage'))
const FranqueadoCarrinhoPage  = lazy(() => import('@/pages/app/franqueados/FranqueadoCarrinhoPage'))
const FranqueadoCustomersPage = lazy(() => import('@/pages/app/clientes/CustomersPage'))
const FranqueadoCustomerForm  = lazy(() => import('@/pages/app/clientes/CustomerForm'))
const FranqueadoCustomerDetail = lazy(() => import('@/pages/app/clientes/CustomerDetail'))
const FranqueadoPedidosPage   = lazy(() => import('@/pages/app/franqueados/FranqueadoPedidosPage'))
const MateriaisPage           = lazy(() => import('@/pages/app/materiais/MateriaisPage'))
const MateriaisMatrizPage     = lazy(() => import('@/pages/app/materiais/MateriaisMatrizPage'))
const AtualizacoesMatrizPage  = lazy(() => import('@/pages/app/atualizacoes/AtualizacoesMatrizPage'))
const FirmwareEditorPage      = lazy(() => import('@/pages/app/atualizacoes/FirmwareEditorPage'))
const RelatoriosPage          = lazy(() => import('@/pages/app/franqueados/RelatoriosPage'))
const RelatoriosMatrizPage    = lazy(() => import('@/pages/app/relatorios/RelatoriosMatrizPage'))
const CadastrosPage           = lazy(() => import('@/pages/app/cadastros/CadastrosPage'))
const AjudaPage               = lazy(() => import('@/pages/app/ajuda/AjudaPage'))
const MatrizAjudaPage         = lazy(() => import('@/pages/app/ajuda/MatrizAjudaPage'))
const HelpArticleForm         = lazy(() => import('@/pages/app/ajuda/HelpArticleForm'))
const AuditoriaPage           = lazy(() => import('@/pages/app/auditoria/AuditoriaPage'))
const ControlTowerPage        = lazy(() => import('@/pages/app/controlTower/ControlTowerPage'))
const CaixaPage               = lazy(() => import('@/pages/app/caixa/CaixaPage'))
const AcessoNegado            = lazy(() => import('@/pages/AcessoNegado'))

function EmBreve({ titulo }: { titulo: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="rounded-full p-4" style={{ background: 'hsl(var(--pm-gray-800))' }}>
        <span className="text-3xl">🚧</span>
      </div>
      <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--pm-font-display)' }}>{titulo}</h2>
      <p className="text-sm text-muted-foreground">Em construção — disponível em breve.</p>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="pm-skeleton h-8 w-32" />
    </div>
  )
}

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
}

// Suspense + guarda de módulo (RBAC): bloqueia acesso direto por URL sem can_view.
function MS({ m, children }: { m: RbacModule; children: React.ReactNode }) {
  return (
    <ModuleGuard module={m}>
      <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
    </ModuleGuard>
  )
}

function RootLayout() {
  useAuth()
  useProfileSync()
  return (
    <TunerSplashProvider>
      <Outlet />
    </TunerSplashProvider>
  )
}

function ProtectedLayout() {
  const { agentSlug = '' } = useParams()
  return (
    <AuthGuard loginPath="/appinjediesel">
      <RoleGuard allowedRoles={[...SYSTEM_ROLES, ...MATRIX_ROLES]} redirectTo="/acesso-negado">
        <RoutePrefixProvider prefix={`/${agentSlug}`}>
          <AppShell>
            <Outlet />
          </AppShell>
        </RoutePrefixProvider>
      </RoleGuard>
    </AuthGuard>
  )
}

function FranqueadoLayout() {
  const { unitSlug = '', agentSlug = '' } = useParams()
  return (
    <AuthGuard loginPath="/login">
      <RoleGuard allowedRoles={FRANCHISE_ROLES} redirectTo="/acesso-negado">
        <UnitGuard unitSlug={unitSlug}>
          <RoutePrefixProvider prefix={`/${unitSlug}/${agentSlug}`}>
            <FranqueadoShell>
              <Outlet />
            </FranqueadoShell>
          </RoutePrefixProvider>
        </UnitGuard>
      </RoleGuard>
    </AuthGuard>
  )
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/',      element: <S><Home /></S> },
      { path: '/loja',  element: <S><LojaPage /></S> },
      { path: '/veiculos/:slug', element: <S><VehicleDetailPage /></S> },
      { path: '/appinjediesel',          element: <S><Login /></S> },
      { path: '/login',           element: <S><LoginParceiro /></S> },
      { path: '/parceiro/login',  element: <Navigate to="/login" replace /> },
      { path: '/parceiro',        element: <Navigate to="/login" replace /> },
      {
        path: '/:agentSlug',
        element: <ProtectedLayout />,
        children: [
          { index: true,                         element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard',                   element: <S><Dashboard /></S> },
          { path: 'clientes',                    element: <MS m="clientes"><CustomersPage /></MS> },
          { path: 'clientes/novo',               element: <MS m="clientes"><CustomerForm /></MS> },
          { path: 'clientes/:id',                element: <MS m="clientes"><CustomerDetail /></MS> },
          { path: 'clientes/:id/editar',         element: <MS m="clientes"><CustomerForm /></MS> },
          { path: 'produtos',                    element: <MS m="produtos"><ProductsPage /></MS> },
          { path: 'produtos/novo',               element: <MS m="produtos"><ProductForm /></MS> },
          { path: 'produtos/:id',                element: <MS m="produtos"><ProductDetail /></MS> },
          { path: 'produtos/:id/editar',         element: <MS m="produtos"><ProductForm /></MS> },
          { path: 'franqueados',                 element: <MS m="franqueados"><FranchiseesPage /></MS> },
          { path: 'franqueados/novo-contrato',   element: <S><RoleGuard allowedRoles={['company_admin', 'operations_admin', 'system_ti', 'seller']} redirectTo="/acesso-negado"><NovoContratoPage /></RoleGuard></S> },
          { path: 'franqueados/:id',             element: <MS m="franqueados"><FranchiseeDetail /></MS> },
          { path: 'arquivos',                    element: <MS m="ecu_arquivos"><EcuJobsPage /></MS> },
          { path: 'arquivos/novo',               element: <MS m="ecu_arquivos"><EcuJobForm /></MS> },
          { path: 'arquivos/:id',                element: <MS m="ecu_arquivos"><EcuJobDetail /></MS> },
          { path: 'pdv',                         element: <MS m="pdv"><PdvPage /></MS> },
          { path: 'pedidos',                     element: <MS m="pedidos"><OrdersPage /></MS> },
          { path: 'pedidos-b2b',                 element: <MS m="pedidos"><PedidosB2BPage /></MS> },
          { path: 'suporte',                     element: <MS m="suporte"><SupportPage /></MS> },
          { path: 'suporte/novo',                element: <MS m="suporte"><SupportTicketForm /></MS> },
          { path: 'suporte/:id',                 element: <MS m="suporte"><SupportTicketDetail /></MS> },
          { path: 'configuracoes',               element: <MS m="configuracoes"><ConfigPage /></MS> },
          { path: 'financeiro',                  element: <MS m="financeiro"><FinanceiroPage /></MS> },
          { path: 'relatorios',                  element: <S><RoleGuard allowedRoles={['company_admin', 'operations_admin', 'system_ti']} redirectTo="/acesso-negado"><RelatoriosMatrizPage /></RoleGuard></S> },
          { path: 'cadastros',                   element: <S><CadastrosPage /></S> },
          { path: 'tabela-remap',                element: <MS m="tabela_remap"><TabelaRemapPage /></MS> },
          { path: 'materiais',                   element: <S><MateriaisMatrizPage /></S> },
          { path: 'atualizacoes',                element: <S><AtualizacoesMatrizPage /></S> },
          { path: 'atualizacoes/:equipmentSlug/novo', element: <S><FirmwareEditorPage /></S> },
          { path: 'atualizacoes/:updateId/editar',    element: <S><FirmwareEditorPage /></S> },
          { path: 'ajuda',                       element: <S><MatrizAjudaPage /></S> },
          { path: 'ajuda/novo',                  element: <S><HelpArticleForm /></S> },
          { path: 'ajuda/:id/editar',            element: <S><HelpArticleForm /></S> },
          { path: 'auditoria',                   element: <MS m="configuracoes"><AuditoriaPage /></MS> },
          { path: 'control-tower',               element: <S><ControlTowerPage /></S> },
          { path: 'loja',                        element: <EmBreve titulo="Loja Online" /> },
        ],
      },
      {
        path: '/:unitSlug/:agentSlug',
        element: <FranqueadoLayout />,
        children: [
          { index: true,                         element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard',                   element: <S><FranqueadoDashboard /></S> },
          { path: 'arquivos',                    element: <MS m="ecu_arquivos"><EcuJobsPage /></MS> },
          { path: 'arquivos/novo',               element: <MS m="ecu_arquivos"><EcuJobForm /></MS> },
          { path: 'arquivos/:id',                element: <MS m="ecu_arquivos"><EcuJobDetail /></MS> },
          { path: 'tabela-remap',                element: <MS m="tabela_remap"><FranqueadoCatalogPage /></MS> },
          { path: 'loja',                        element: <MS m="pdv"><FranqueadoLojaPage /></MS> },
          { path: 'carrinho',                    element: <MS m="pdv"><FranqueadoCarrinhoPage /></MS> },
          { path: 'pedidos',                     element: <MS m="pdv"><FranqueadoPedidosPage /></MS> },
          { path: 'clientes',                    element: <MS m="clientes"><FranqueadoCustomersPage /></MS> },
          { path: 'clientes/novo',               element: <MS m="clientes"><FranqueadoCustomerForm /></MS> },
          { path: 'clientes/:id',                element: <MS m="clientes"><FranqueadoCustomerDetail /></MS> },
          { path: 'clientes/:id/editar',         element: <MS m="clientes"><FranqueadoCustomerForm /></MS> },
          { path: 'relatorios',                  element: <MS m="relatorios"><RelatoriosPage /></MS> },
          { path: 'cadastros',                   element: <S><CadastrosPage /></S> },
          { path: 'caixa',                       element: <MS m="financeiro"><CaixaPage /></MS> },
          { path: 'atualizacoes',                element: <S><AtualizacoesPage /></S> },
          { path: 'suporte',                     element: <S><SupportPage /></S> },
          { path: 'suporte/novo',                element: <S><SupportTicketForm /></S> },
          { path: 'suporte/:id',                 element: <S><SupportTicketDetail /></S> },
          { path: 'materiais',                   element: <S><MateriaisPage /></S> },
          { path: 'perfil',                      element: <S><FranqueadoPerfilPage /></S> },
          { path: 'faturas',                     element: <MS m="financeiro"><FranqueadoFaturasPage /></MS> },
          { path: 'ajuda',                       element: <S><AjudaPage /></S> },
          { path: 'configuracoes',               element: <S><FranqueadoConfigPage /></S> },
        ],
      },
      { path: '/acesso-negado', element: <S><AcessoNegado /></S> },
      { path: '*', element: <S><NotFound /></S> },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
