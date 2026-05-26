import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Upload, X, ImageIcon, Link, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/shared/PageHeader'
import { useProduct, useUpsertProduct, useProductCategories } from '@/hooks/useProducts'
import { useStorageUpload } from '@/hooks/useStorageUpload'

const BUCKET = 'product-images'


const schema = z.object({
  sku:           z.string().min(1, 'SKU é obrigatório'),
  code:          z.string().nullable(),
  name:          z.string().min(2, 'Nome é obrigatório'),
  category:      z.string().min(1, 'Categoria é obrigatória'),
  description:   z.string().nullable(),
  image_url:     z.string().nullable(),
  stock:         z.preprocess((v) => Number(v), z.number().int().min(0)),
  cost_price:    z.preprocess((v) => v === '' || v === null || v === undefined ? null : Number(v), z.number().min(0).nullable()),
  active:        z.boolean(),
  featured:      z.boolean(),
  price_cliente_final:         z.preprocess((v) => Number(v), z.number().min(0)),
  price_franqueado_linha_leve: z.preprocess((v) => Number(v), z.number().min(0)),
  price_franqueado_full:       z.preprocess((v) => Number(v), z.number().min(0)),
})

type FormValues = z.infer<typeof schema>

const NEW_CAT_SENTINEL = '__new_category__'

export default function ProductForm() {
  const navigate    = useNavigate()
  const { id }      = useParams<{ id: string }>()
  const isEdit      = !!id
  const prefix      = useRoutePrefix()
  const fileRef     = useRef<HTMLInputElement>(null)
  const { upload, uploading } = useStorageUpload()
  const [imgTab, setImgTab]   = useState<'url' | 'upload'>('url')
  const [newCatMode, setNewCatMode] = useState(false)
  const [newCatInput, setNewCatInput] = useState('')

  const { data: product, isLoading } = useProduct(id ?? '')
  const { data: categories = [] } = useProductCategories()
  const upsert = useUpsertProduct()

  const {
    register, handleSubmit, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      sku: '', code: null, name: '', category: '', description: null, image_url: null,
      stock: 0, cost_price: null, active: true, featured: false,
      price_cliente_final: 0, price_franqueado_linha_leve: 0, price_franqueado_full: 0,
    },
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const imageUrl  = watch('image_url')
   
  const catValue  = watch('category')

  useEffect(() => {
    if (product) {
      setValue('sku',          product.sku)
      setValue('code',         product.code ?? null)
      setValue('name',         product.name)
      setValue('category',     product.category)
      setValue('description',  product.description)
      setValue('image_url',    product.image_url)
      setValue('stock',        product.stock)
      setValue('cost_price',   product.cost_price ?? null)
      setValue('active',       product.active)
      setValue('featured',     product.featured ?? false)
      const prices = product.product_prices ?? []
      const cf = prices.find((p) => p.tier === 'cliente_final')
      const ll = prices.find((p) => p.tier === 'franqueado_linha_leve')
      const fu = prices.find((p) => p.tier === 'franqueado_full')
      if (cf) setValue('price_cliente_final',         cf.price)
      if (ll) setValue('price_franqueado_linha_leve', ll.price)
      if (fu) setValue('price_franqueado_full',        fu.price)
    }
  }, [product, setValue])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const ext  = file.name.split('.').pop()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { publicUrl, error } = await upload(BUCKET, path, file, { maxSizeMB: 5 })
    if (error) { toast.error(error); return }
    setValue('image_url', publicUrl)
    toast.success('Imagem enviada')
    if (fileRef.current) fileRef.current.value = ''
  }

  function confirmNewCategory() {
    const trimmed = newCatInput.trim()
    if (!trimmed) return
    setValue('category', trimmed)
    setNewCatMode(false)
    setNewCatInput('')
  }

  async function onSubmit(values: FormValues) {
    await upsert.mutateAsync({
      ...(isEdit && id ? { id } : {}),
      sku: values.sku, code: values.code ?? null, name: values.name, category: values.category,
      description: values.description ?? null,
      image_url: values.image_url || null,
      stock: values.stock, active: values.active, featured: values.featured,
      cost_price: values.cost_price ?? null,
      prices: [
        { tier: 'cliente_final',         price: values.price_cliente_final },
        { tier: 'franqueado_linha_leve', price: values.price_franqueado_linha_leve },
        { tier: 'franqueado_full',       price: values.price_franqueado_full },
      ],
    })
    navigate(`${prefix}/produtos`)
  }

  if (isEdit && isLoading) return <div className="pm-skeleton h-64 w-full rounded" />

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Editar Produto' : 'Novo Produto'}
        actions={
          <Button variant="ghost" onClick={() => navigate(`${prefix}/produtos`)}>
            <ArrowLeft size={16} className="mr-2" />Voltar
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="pm-card max-w-2xl space-y-5">

        {/* SKU + Código */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="sku">SKU *</Label>
            <Input id="sku" {...register('sku')} />
            {errors.sku && <p className="text-xs text-red-400">{errors.sku.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="code">Código</Label>
            <Input id="code" placeholder="Código do produto / EAN" {...register('code')} />
          </div>
        </div>

        {/* Name */}
        <div className="space-y-1">
          <Label htmlFor="name">Nome *</Label>
          <Input id="name" {...register('name')} />
          {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
        </div>

        {/* Category */}
        <div className="space-y-1">
          <Label>Categoria *</Label>
          {newCatMode ? (
            <div className="flex gap-2">
              <Input
                autoFocus
                placeholder="Nome da nova categoria..."
                value={newCatInput}
                onChange={e => setNewCatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmNewCategory() } }}
              />
              <Button type="button" variant="outline" size="sm" onClick={confirmNewCategory}>OK</Button>
              <Button
                type="button" variant="ghost" size="sm"
                onClick={() => { setNewCatMode(false); setNewCatInput('') }}
              >
                <X size={14} />
              </Button>
            </div>
          ) : (
            <Select
              value={catValue || ''}
              onValueChange={(v) => {
                if (v === NEW_CAT_SENTINEL) { setNewCatMode(true) }
                else { setValue('category', v) }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
                <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 8px' }} />
                <SelectItem value={NEW_CAT_SENTINEL}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8' }}>
                    <Plus size={13} /> Nova categoria...
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
          {errors.category && <p className="text-xs text-red-400">{errors.category.message}</p>}
        </div>

        {/* Description */}
        <div className="space-y-1">
          <Label htmlFor="description">Descrição</Label>
          <Textarea id="description" {...register('description')} rows={3} />
        </div>

        {/* Image */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Imagem do Produto</Label>
            <div className="flex gap-1 p-0.5 bg-black/20 border border-white/[0.06] rounded-lg">
              <button
                type="button"
                onClick={() => setImgTab('url')}
                className={[
                  'flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest px-3 py-1 rounded transition-all',
                  imgTab === 'url' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300',
                ].join(' ')}
              >
                <Link size={11} /> URL
              </button>
              <button
                type="button"
                onClick={() => setImgTab('upload')}
                className={[
                  'flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest px-3 py-1 rounded transition-all',
                  imgTab === 'upload' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300',
                ].join(' ')}
              >
                <Upload size={11} /> Upload
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="shrink-0 w-24 h-24 rounded-lg border border-white/[0.08] bg-black/30 overflow-hidden flex items-center justify-center">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="preview"
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <ImageIcon size={24} className="text-gray-600" />
              )}
            </div>

            <div className="flex-1 space-y-2">
              {imgTab === 'url' ? (
                <div className="relative">
                  <Input
                    placeholder="https://exemplo.com/imagem.jpg"
                    value={imageUrl ?? ''}
                    onChange={e => setValue('image_url', e.target.value || null)}
                    className="pr-8"
                  />
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setValue('image_url', null)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="w-full"
                  >
                    <Upload size={14} className="mr-2" />
                    {uploading ? 'Enviando...' : 'Selecionar Arquivo'}
                  </Button>
                  <p className="text-[10px] text-gray-500 mt-1">JPG, PNG, WebP · máx 5 MB</p>
                </div>
              )}

              {imageUrl && (
                <p className="text-[10px] text-gray-500 break-all truncate">{imageUrl}</p>
              )}
            </div>
          </div>
        </div>

        {/* Stock + Cost */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="stock">Estoque</Label>
            <Input id="stock" type="number" min={0} {...register('stock')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cost_price">Preço de Custo (R$)</Label>
            <Input
              id="cost_price"
              type="number"
              step="0.01"
              min={0}
              placeholder="0,00"
              {...register('cost_price')}
            />
          </div>
        </div>

        {/* Prices */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Preços por Tier</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="price_cf">Cliente Final (R$)</Label>
              <Input id="price_cf" type="number" step="0.01" min={0} {...register('price_cliente_final')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="price_ll">Linha Leve (R$)</Label>
              <Input id="price_ll" type="number" step="0.01" min={0} {...register('price_franqueado_linha_leve')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="price_fu">Full (R$)</Label>
              <Input id="price_fu" type="number" step="0.01" min={0} {...register('price_franqueado_full')} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <input id="active" type="checkbox" {...register('active')} className="h-4 w-4 rounded border-gray-600" />
            <Label htmlFor="active">Produto ativo</Label>
          </div>
          <div className="flex items-center gap-2">
            <input id="featured" type="checkbox" {...register('featured')} className="h-4 w-4 rounded border-gray-600" />
            <Label htmlFor="featured" className="text-muted-foreground">Destaque na loja virtual</Label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting} style={{ background: 'var(--pm-accent-gradient)' }}>
            {isSubmitting ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Produto'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate(`${prefix}/produtos`)}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
