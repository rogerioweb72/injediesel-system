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
import { MATRIX_ROLES, FRANCHISE_ROLES, SYSTEM_ROLES } from '@/types/app'

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
    <AuthGuard loginPath="/appmax">
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
      { path: '/appmax',          element: <S><Login /></S> },
      { path: '/login',           element: <S><LoginParceiro /></S> },
      { path: '/parceiro/login',  element: <Navigate to="/login" replace /> },
      { path: '/parceiro',        element: <Navigate to="/login" replace /> },
      {
        path: '/:agentSlug',
        element: <ProtectedLayout />,
        children: [
          { index: true,                         element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard',                   element: <S><Dashboard /></S> },
          { path: 'clientes',                    element: <S><CustomersPage /></S> },
          { path: 'clientes/novo',               element: <S><CustomerForm /></S> },
          { path: 'clientes/:id',                element: <S><CustomerDetail /></S> },
          { path: 'clientes/:id/editar',         element: <S><CustomerForm /></S> },
          { path: 'produtos',                    element: <S><ProductsPage /></S> },
          { path: 'produtos/novo',               element: <S><ProductForm /></S> },
          { path: 'produtos/:id',                element: <S><ProductDetail /></S> },
          { path: 'produtos/:id/editar',         element: <S><ProductForm /></S> },
          { path: 'franqueados',                 element: <S><FranchiseesPage /></S> },
          { path: 'franqueados/:id',             element: <S><FranchiseeDetail /></S> },
          { path: 'arquivos',                    element: <S><EcuJobsPage /></S> },
          { path: 'arquivos/novo',               element: <S><EcuJobForm /></S> },
          { path: 'arquivos/:id',                element: <S><EcuJobDetail /></S> },
          { path: 'pdv',                         element: <S><PdvPage /></S> },
          { path: 'pedidos',                     element: <S><OrdersPage /></S> },
          { path: 'pedidos-b2b',                 element: <S><PedidosB2BPage /></S> },
          { path: 'suporte',                     element: <S><SupportPage /></S> },
          { path: 'suporte/novo',                element: <S><SupportTicketForm /></S> },
          { path: 'suporte/:id',                 element: <S><SupportTicketDetail /></S> },
          { path: 'configuracoes',               element: <S><ConfigPage /></S> },
          { path: 'financeiro',                  element: <S><FinanceiroPage /></S> },
          { path: 'cadastros',                   element: <S><CadastrosPage /></S> },
          { path: 'tabela-remap',                element: <S><TabelaRemapPage /></S> },
          { path: 'materiais',                   element: <S><MateriaisMatrizPage /></S> },
          { path: 'atualizacoes',                element: <S><AtualizacoesMatrizPage /></S> },
          { path: 'atualizacoes/:equipmentSlug/novo', element: <S><FirmwareEditorPage /></S> },
          { path: 'atualizacoes/:updateId/editar',    element: <S><FirmwareEditorPage /></S> },
          { path: 'ajuda',                       element: <S><MatrizAjudaPage /></S> },
          { path: 'ajuda/novo',                  element: <S><HelpArticleForm /></S> },
          { path: 'ajuda/:id/editar',            element: <S><HelpArticleForm /></S> },
          { path: 'auditoria',                   element: <S><AuditoriaPage /></S> },
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
          { path: 'arquivos',                    element: <S><EcuJobsPage /></S> },
          { path: 'arquivos/novo',               element: <S><EcuJobForm /></S> },
          { path: 'arquivos/:id',                element: <S><EcuJobDetail /></S> },
          { path: 'tabela-remap',                element: <S><FranqueadoCatalogPage /></S> },
          { path: 'loja',                        element: <S><FranqueadoLojaPage /></S> },
          { path: 'carrinho',                    element: <S><FranqueadoCarrinhoPage /></S> },
          { path: 'pedidos',                     element: <S><FranqueadoPedidosPage /></S> },
          { path: 'clientes',                    element: <S><FranqueadoCustomersPage /></S> },
          { path: 'clientes/novo',               element: <S><FranqueadoCustomerForm /></S> },
          { path: 'clientes/:id',                element: <S><FranqueadoCustomerDetail /></S> },
          { path: 'clientes/:id/editar',         element: <S><FranqueadoCustomerForm /></S> },
          { path: 'relatorios',                  element: <S><RelatoriosPage /></S> },
          { path: 'cadastros',                   element: <S><CadastrosPage /></S> },
          { path: 'caixa',                       element: <S><CaixaPage /></S> },
          { path: 'atualizacoes',                element: <S><AtualizacoesPage /></S> },
          { path: 'suporte',                     element: <S><SupportPage /></S> },
          { path: 'suporte/novo',                element: <S><SupportTicketForm /></S> },
          { path: 'suporte/:id',                 element: <S><SupportTicketDetail /></S> },
          { path: 'materiais',                   element: <S><MateriaisPage /></S> },
          { path: 'perfil',                      element: <S><FranqueadoPerfilPage /></S> },
          { path: 'faturas',                     element: <S><FranqueadoFaturasPage /></S> },
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
