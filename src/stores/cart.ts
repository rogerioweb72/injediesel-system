import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: string
  sku: string
  name: string
  price: number
  quantity: number
  imageUrl?: string | null
}

interface CartStore {
  items: CartItem[]
  add: (item: Omit<CartItem, 'quantity'>) => void
  remove: (productId: string) => void
  updateQty: (productId: string, quantity: number) => void
  clear: () => void
}

export const useCart = create<CartStore>()(
  persist(
    (set) => ({
      items: [],

      add: (item) => set((s) => {
        const existing = s.items.find(i => i.productId === item.productId)
        if (existing) {
          return { items: s.items.map(i => i.productId === item.productId ? { ...i, quantity: i.quantity + 1, imageUrl: item.imageUrl ?? i.imageUrl } : i) }
        }
        return { items: [...s.items, { ...item, quantity: 1 }] }
      }),

      remove: (productId) => set((s) => ({ items: s.items.filter(i => i.productId !== productId) })),

      updateQty: (productId, quantity) => set((s) => {
        if (quantity <= 0) return { items: s.items.filter(i => i.productId !== productId) }
        return { items: s.items.map(i => i.productId === productId ? { ...i, quantity } : i) }
      }),

      clear: () => set({ items: [] }),
    }),
    { name: 'promax-cart' }
  )
)
