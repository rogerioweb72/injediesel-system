import { PageHeader } from '@/components/shared/PageHeader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { UsersTab } from './UsersTab'
import { CompanyTab } from './CompanyTab'

export default function ConfigPage() {
  return (
    <div>
      <PageHeader title="Configurações" subtitle="Usuários e configurações gerais da empresa" />

      <Tabs defaultValue="usuarios">
        <TabsList
          className="h-auto bg-transparent border-b border-[hsl(var(--pm-gray-700))] rounded-none p-0 mb-6 gap-1 justify-start w-full"
        >
          <TabsTrigger
            value="usuarios"
            className="rounded-none px-4 py-2 text-sm font-medium bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[hsl(var(--pm-red-500))] data-[state=active]:-mb-px text-muted-foreground hover:text-foreground"
          >
            Usuários
          </TabsTrigger>
          <TabsTrigger
            value="empresa"
            className="rounded-none px-4 py-2 text-sm font-medium bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[hsl(var(--pm-red-500))] data-[state=active]:-mb-px text-muted-foreground hover:text-foreground"
          >
            Empresa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios">
          <UsersTab />
        </TabsContent>
        <TabsContent value="empresa">
          <CompanyTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
