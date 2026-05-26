export const ECU_CATEGORIES_ALL = 'Todas as Categorias' as const

export const ECU_CATEGORIES = [
  { label: 'Carros & SUVs', value: 'Carros & SUVs', slug: 'carros-e-suvs' },
  { label: 'Pickups',       value: 'Pickups',        slug: 'pickups'       },
  { label: 'Trucks',        value: 'Trucks',          slug: 'trucks'        },
  { label: 'Agrícola',      value: 'Agrícola',        slug: 'agricola'      },
  { label: 'Máquinas',      value: 'Máquinas',        slug: 'maquinas'      },
  { label: 'Motos',         value: 'Motos',           slug: 'motos'         },
] as const

/** value → slug, usado por CatalogoFiltros e useEcuCatalog */
export const ECU_CATEGORY_SLUG: Record<string, string> = Object.fromEntries(
  ECU_CATEGORIES.map((c) => [c.value, c.slug])
)

/** Lista plana de values com sentinela "Todas as Categorias" na primeira posição */
export const ECU_CATEGORY_VALUES_WITH_ALL = [
  ECU_CATEGORIES_ALL,
  ...ECU_CATEGORIES.map((c) => c.value),
] as const
