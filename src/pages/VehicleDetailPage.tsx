import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react'
import { useEcuCatalogCategoryKpis } from '@/hooks/useEcuCatalog'
import catCarros   from '@/assets/cat-carros.jpg'
import catPickups  from '@/assets/cat-pickups.jpg'
import catTrucks   from '@/assets/cat-trucks.jpg'
import catAgricola from '@/assets/cat-agricola.jpg'
import catMaquinas from '@/assets/cat-maquinas.jpg'
import catMotos    from '@/assets/cat-motos.jpg'
import { CatalogoCliente } from '@/components/catalogo/CatalogoCliente'

// ── Design tokens (aligned with home — hsl(var(--pm-gray-950)) = #141416) ────
const RED    = 'hsl(var(--pm-red-500))'
const BG     = 'hsl(var(--pm-gray-950))'
const CARD   = 'hsl(var(--pm-gray-900))'
const BORDER = 'hsl(var(--pm-gray-700))'
const MONO   = 'var(--pm-font-mono, "JetBrains Mono", monospace)'
const DISP   = 'var(--pm-font-display, "Barlow Condensed", "Arial Narrow", Arial, sans-serif)'
const BODY   = 'var(--pm-font-body, "Inter", sans-serif)'

// ── Data model ────────────────────────────────────────────────────────────────
type GainRow = { metric: string; stock: string; tuned: string; delta: string }
type Benefit = { num: string; title: string; detail: string }

type VehicleData = {
  slug:        string
  label:       string
  subtitle:    string
  img:         string
  kpi:         { label: string; value: string; unit: string }[]
  benefits:    Benefit[]
  gains:       GainRow[]
  caveats:     string
  ecuTitle:    string
  ecuDesc:     string
  ecuLines:    string[]
}

// ── Category dataset (extracted from Guia_Tecnico_Reprogramacao_ECU.pdf) ─────
const VEHICLES: VehicleData[] = [
  {
    slug:    'carros-e-suvs',
    label:   'Carros & SUVs',
    subtitle: 'Hatch · Sedan · SUV · Esportivos',
    img:     catCarros,
    kpi: [
      { label: 'Potência',  value: '+125', unit: 'cv'     },
      { label: 'Torque',    value: '+14',  unit: 'kgf.m'  },
      { label: 'Melhoria',  value: '~55',  unit: '%'      },
    ],
    benefits: [
      { num: '01', title: 'Avanço de ignição otimizado', detail: 'Ponto de ignição recalibrado para combustível nacional, extraindo máxima energia por ciclo de combustão.' },
      { num: '02', title: 'Curva de injeção recalibrada', detail: 'Duração e pressão de injeção ajustadas para resposta imediata ao acelerador em toda faixa de RPM.' },
      { num: '03', title: 'Boost de turbo ampliado', detail: 'Pressão de sobrealimentação elevada com proteção térmica inteligente e controle de wastegate por mapa.' },
      { num: '04', title: 'Lambda e mistura otimizados', detail: 'Proporção ar/combustível recalibrada para máxima combustão sem comprometer a durabilidade do motor.' },
    ],
    gains: [
      { metric: 'Potência',   stock: '184 cv',      tuned: 'até 309 cv',     delta: '+68%'  },
      { metric: 'Torque',     stock: '30,6 kgf.m',  tuned: 'até 44,6 kgf.m', delta: '+46%'  },
      { metric: 'Eficiência', stock: 'base',         tuned: '-8 a -12%',      delta: 'consumo' },
    ],
    caveats: 'Recomendamos uso de combustível de qualidade premium (92+ octanas) e revisões dentro do prazo. Veículos com alta quilometragem podem exigir checagem prévia do motor e injetores. Válido para sistemas Bosch MED/EDC com protocolo CAN. Garanta que o arrefecimento esteja em bom estado.',
    ecuTitle: 'Bosch MED17.5.5 — Plataforma Gasolina',
    ecuDesc: 'Controle por barramento CAN de alta velocidade. Suporte a mapeamento de pressão de wastegate e correção de mistura em malha fechada via sonda lambda banda larga.',
    ecuLines: [
      '> INJEDIESEL_ECU_TOOL v4.2.1',
      '> CONNECT Bosch MED17.5.5 ... OK',
      '> READ FLASH 0x0000–0xFFFF ... OK [512KB]',
      '> PATCH wastegate_map[16x16] delta=+180mbar',
      '> PATCH ignition_map[20x20] delta=+4.2°',
      '> PATCH lambda_target[8x8]  delta=-0.08',
      '> WRITE FLASH ... OK',
      '> VERIFY CHECKSUM 4F8A·2D ... PASS ✓',
      '> STAGE 2 ACTIVE',
    ],
  },
  {
    slug:    'pickups',
    label:   'Pickups',
    subtitle: 'Diesel leve e pesado · Tração pesada',
    img:     catPickups,
    kpi: [
      { label: 'Potência',  value: '+90',  unit: 'cv'     },
      { label: 'Torque',    value: '+10',  unit: 'kgf.m'  },
      { label: 'Melhoria',  value: '~30',  unit: '%'      },
    ],
    benefits: [
      { num: '01', title: 'Injeção otimizada para baixo RPM', detail: 'Duração de injeção ampliada em baixas rotações, gerando torque imediato para arranque com carga.' },
      { num: '02', title: 'Boost progressivo de turbo', detail: 'Pressão de turbo elevada de forma gradual com proteção de temperatura de gases de escape.' },
      { num: '03', title: 'Pressão de rail recalibrada', detail: 'Common rail repressurizado para melhor atomização e combustão completa do diesel.' },
      { num: '04', title: 'Proteção de carga máxima', detail: 'Limitador de carga adaptado para operação prolongada sem danos aos componentes de alta pressão.' },
    ],
    gains: [
      { metric: 'Potência',   stock: '258 cv',    tuned: 'até 348 cv',    delta: '+35%'  },
      { metric: 'Torque',     stock: '58,0 kgf.m', tuned: 'até 68,0 kgf.m', delta: '+17%'  },
      { metric: 'Consumo',    stock: 'base',       tuned: '-10% em estrada', delta: 'eficiência' },
    ],
    caveats: 'Compatível com pickups diesel Euro 5 e Euro 6. Recomendamos troca de filtro de ar e combustível antes do remap. Verificar estado dos injetores para melhores resultados. Temperatura do líquido de arrefecimento deve ser monitorada nas primeiras 500km após o remap.',
    ecuTitle: 'Bosch EDC17C54 — Plataforma Diesel',
    ecuDesc: 'Protocolo KWP2004 com acesso direto a mapas de injeção, boost e emissões. Suporte a common rail de alta pressão com pressão de rail até 2.000 bar.',
    ecuLines: [
      '> INJEDIESEL_ECU_TOOL v4.2.1',
      '> CONNECT Bosch EDC17C54 ... OK',
      '> READ FLASH 0x0000–0xFFFF ... OK [1MB]',
      '> PATCH injection_duration[16x16] delta=+1.4ms',
      '> PATCH boost_map[16x16]          delta=+220mbar',
      '> PATCH rail_pressure[12x12]      delta=+180bar',
      '> PATCH smoke_limiter[8x8]        delta=+12%',
      '> WRITE FLASH ... OK',
      '> VERIFY CHECKSUM A2C1·7F ... PASS ✓',
      '> STAGE 2 DIESEL ACTIVE',
    ],
  },
  {
    slug:    'trucks',
    label:   'Trucks',
    subtitle: 'Caminhões leves, médios e pesados · Frotas',
    img:     catTrucks,
    kpi: [
      { label: 'Potência',  value: '+90',  unit: 'cv'    },
      { label: 'Torque',    value: '+20',  unit: '%'     },
      { label: 'Melhoria',  value: '~20',  unit: '%'     },
    ],
    benefits: [
      { num: '01', title: 'Limitador de torque por marcha', detail: 'Limitadores originais removidos com proteção inteligente ativa, permitindo uso total do torque disponível.' },
      { num: '02', title: 'Curva de fumaça otimizada', detail: 'Mapeamento de emissões recalibrado para reduzir fumaça escura sem perder desempenho em carga.' },
      { num: '03', title: 'Boost progressivo em subidas', detail: 'Pressão de sobrealimentação ampliada de forma escalonada para eficiência em rampas e estradas de montanha.' },
      { num: '04', title: 'Inibidor de velocidade ajustado', detail: 'Limitador de velocidade recalibrado conforme necessidade da frota e legislação vigente.' },
    ],
    gains: [
      { metric: 'Potência',  stock: '460–540 cv',  tuned: 'até 630 cv',     delta: '+17%'  },
      { metric: 'Torque',    stock: '~230 kgf.m',  tuned: '+15% a +20%',    delta: '+20%'  },
      { metric: 'Consumo',   stock: 'base',         tuned: '-8% em rodovia', delta: 'eficiência' },
    ],
    caveats: 'Aplicável em caminhões Euro 5 e Euro 6 com sistemas EDC. Recomendamos revisão completa de injetores e bomba injetora antes do remap. Validação requerida por técnico certificado. Caminhões com mais de 800.000 km devem passar por avaliação prévia de desgaste de componentes.',
    ecuTitle: 'Continental CM2350A — Heavy Duty',
    ecuDesc: 'Protocolo J1939 CAN com acesso a mapas de torque por marcha, controle de emissões e limitadores de velocidade de frota. Suporte a múltiplas ECUs em configuração master/slave.',
    ecuLines: [
      '> INJEDIESEL_ECU_TOOL v4.2.1',
      '> CONNECT Continental CM2350A J1939 ... OK',
      '> READ FLASH 0x0000–0x1FFFF ... OK [2MB]',
      '> PATCH gear_torque_limiter[8x6]   delta=REMOVED',
      '> PATCH boost_map[16x16]           delta=+260mbar',
      '> PATCH smoke_map[12x12]           delta=-18%',
      '> PATCH speed_limiter              val=0x0000',
      '> WRITE FLASH ... OK',
      '> VERIFY CHECKSUM 8B3D·C9 ... PASS ✓',
      '> HEAVY DUTY STAGE 2 ACTIVE',
    ],
  },
  {
    slug:    'agricola',
    label:   'Agrícola',
    subtitle: 'Tratores · Colheitadeiras · Implementos',
    img:     catAgricola,
    kpi: [
      { label: 'Potência',  value: '+50',  unit: 'cv'    },
      { label: 'Torque',    value: '+20',  unit: '%'     },
      { label: 'Rendimento', value: '+12', unit: '%'     },
    ],
    benefits: [
      { num: '01', title: 'Taxa do regulador otimizada', detail: 'Governor rate recalibrado para manter rotação estável em trabalho contínuo de alta carga como aração e colheita.' },
      { num: '02', title: 'Resposta de acelerador precisa', detail: 'Curva de acelerador ajustada para controle fino em manobras de precisão e trabalho em baixa velocidade.' },
      { num: '03', title: 'Torque ampliado em alta carga', detail: 'Curva de torque elevada na faixa de trabalho pesado, reduzindo afundamentos em terreno difícil.' },
      { num: '04', title: 'Proteção térmica por carga', detail: 'Proteção de temperatura programada dinamicamente conforme a carga de trabalho detectada pelo sensor de posição.' },
    ],
    gains: [
      { metric: 'Potência',       stock: '100–200 cv',  tuned: '+30 a +50 cv',  delta: '+25%'  },
      { metric: 'Torque',         stock: 'base',         tuned: '+15% a +20%',   delta: 'torque' },
      { metric: 'Rend. trabalho', stock: 'base',         tuned: '+12%',          delta: 'eficiência' },
    ],
    caveats: 'Aplicável em tratores com ECU eletrônica (não mecânica). Verificar se o modelo possui protocolo de comunicação compatível (ISO 11783 / ISOBUS). Consultar técnico para versões mais antigas com sistema mecânico de injeção. Modelos com adBlue requerem recalibração específica do SCR.',
    ecuTitle: 'Bosch EDC7 — Agricultural Platform',
    ecuDesc: 'Protocolo CARB-compliant CAN com suporte a ISO 11783 ISOBUS. Acesso a mapas de regulador, torque e curvas de carga. Compatível com John Deere, Case, New Holland e Massey Ferguson.',
    ecuLines: [
      '> INJEDIESEL_ECU_TOOL v4.2.1',
      '> CONNECT Bosch EDC7 ISOBUS ... OK',
      '> READ FLASH 0x0000–0x7FFF ... OK [256KB]',
      '> PATCH governor_rate_map[8x8]     delta=+15%',
      '> PATCH throttle_response[12x12]   delta=SPORT',
      '> PATCH torque_map[16x16]          delta=+18%',
      '> PATCH thermal_protection[4x4]    mode=DYNAMIC',
      '> WRITE FLASH ... OK',
      '> VERIFY CHECKSUM 3E9A·B1 ... PASS ✓',
      '> AGRICULTURAL STAGE 2 ACTIVE',
    ],
  },
  {
    slug:    'maquinas',
    label:   'Máquinas',
    subtitle: 'Escavadeiras · Guindastes · Equipamentos industriais',
    img:     catMaquinas,
    kpi: [
      { label: 'Potência',    value: '+40',  unit: 'cv'    },
      { label: 'Torque hidr.', value: '+18', unit: '%'     },
      { label: 'Consumo',     value: '-10',  unit: '%'     },
    ],
    benefits: [
      { num: '01', title: 'Motor-bomba hidráulica otimizado', detail: 'Correspondência entre motor e bomba hidráulica recalibrada para maximizar eficiência energética no ciclo de trabalho.' },
      { num: '02', title: 'Torque para içamento e escavação', detail: 'Curva de torque ampliada nas faixas críticas de içamento, escavação pesada e movimentação de terra.' },
      { num: '03', title: 'Precisão em movimentos lentos', detail: 'Resposta do acelerador calibrada para controle preciso em posicionamentos lentos e cargas delicadas.' },
      { num: '04', title: 'Proteção de sobrecarga aprimorada', detail: 'Sistema de proteção térmica atualizado para ciclos de trabalho pesado prolongado sem parada por superaquecimento.' },
    ],
    gains: [
      { metric: 'Potência',       stock: 'base',  tuned: '+25 a +40 cv',    delta: '+22%'  },
      { metric: 'Torque hidr.',   stock: 'base',  tuned: '+18%',            delta: 'eficiência' },
      { metric: 'Consumo',        stock: 'base',  tuned: '-8 a -10%',       delta: 'redução' },
    ],
    caveats: 'Aplicável em equipamentos com sistema eletrônico HPCR (High Pressure Common Rail). Requer diagnóstico completo antes do remap. Garantia condicionada a checagem do sistema hidráulico e estado dos vedantes. Não aplicável a sistemas mecânicos de injeção.',
    ecuTitle: 'Denso HP3 / Common Rail — Industrial',
    ecuDesc: 'Protocolo OBD-II Tier 4 com acesso a mapas de correspondência motor-bomba, torque de trabalho e proteções térmicas. Compatível com Caterpillar, Komatsu, Volvo CE e Liebherr.',
    ecuLines: [
      '> INJEDIESEL_ECU_TOOL v4.2.1',
      '> CONNECT Denso HP3 Tier4 ... OK',
      '> READ FLASH 0x0000–0xFFFF ... OK [512KB]',
      '> PATCH engine_pump_match[12x12]  delta=OPTIMIZED',
      '> PATCH torque_work_map[16x16]    delta=+18%',
      '> PATCH throttle_precision[8x8]   mode=FINE',
      '> PATCH thermal_overload[4x4]     threshold=+8°C',
      '> WRITE FLASH ... OK',
      '> VERIFY CHECKSUM 7C4E·F2 ... PASS ✓',
      '> INDUSTRIAL STAGE 2 ACTIVE',
    ],
  },
  {
    slug:    'motos',
    label:   'Motos',
    subtitle: 'Street · Trail · Esportivas · Naked',
    img:     catMotos,
    kpi: [
      { label: 'Potência',  value: '+20',  unit: 'cv'    },
      { label: 'Torque',    value: '+15',  unit: '%'     },
      { label: 'Resposta',  value: '+40',  unit: '%'     },
    ],
    benefits: [
      { num: '01', title: 'Válvula borboleta eletrônica (ETV)', detail: 'Mapeamento de ETV recalibrado para eliminar delay artificial e entregar resposta direta ao punho do acelerador.' },
      { num: '02', title: 'Avanço de ignição por faixa', detail: 'Ponto de ignição otimizado em cada faixa de RPM para máxima potência na pista e resposta na rua.' },
      { num: '03', title: 'Injeção para escapamento esportivo', detail: 'Curva de injeção adaptada para sistemas de escape esportivos, eliminando detonação e ganho de potência linear.' },
      { num: '04', title: 'Limitador de rotação para pista', detail: 'Rev limiter ajustado para aproveitamento máximo do motor em circuito, com proteção de sobre-rotação.' },
    ],
    gains: [
      { metric: 'Potência',       stock: '~210 cv',      tuned: 'até 230 cv',     delta: '+10%'  },
      { metric: 'Torque',         stock: '11,3 kgf.m',   tuned: '+8% a +15%',     delta: '+15%'  },
      { metric: 'Resposta accel.', stock: 'base',         tuned: '+40% parcial',   delta: '+40%'  },
    ],
    caveats: 'Compatível com motos injetadas a partir de 2010. Recomendamos uso de combustível premium (95+ octanas). Escapamento esportivo pode exigir mapa específico — consultar disponibilidade por modelo. Alguns modelos com controle de tração podem requerer adaptação adicional.',
    ecuTitle: 'Keihin / Magneti Marelli — Moto ECU',
    ecuDesc: 'Protocolo diagnóstico proprietário por OBD-II adaptado. Suporte a BMW, Honda, Triumph, Kawasaki e Ducati. Acesso a mapas de ETV, ignição e injeção por canal de RPM.',
    ecuLines: [
      '> INJEDIESEL_ECU_TOOL v4.2.1',
      '> CONNECT Magneti Marelli 5SM ... OK',
      '> READ FLASH 0x0000–0x3FFF ... OK [128KB]',
      '> PATCH etv_map[16x16]          delta=DIRECT_RESPONSE',
      '> PATCH ignition_map[20x20]     delta=+3.8°',
      '> PATCH injection_map[16x16]    mode=SPORT_EXHAUST',
      '> PATCH rev_limiter             val=0x3A98',
      '> WRITE FLASH ... OK',
      '> VERIFY CHECKSUM D1B7·4A ... PASS ✓',
      '> MOTO SPORT STAGE 2 ACTIVE',
    ],
  },
]

// ── Benefit card (2×2 grid) ───────────────────────────────────────────────────
function BenefitCard({ b }: { b: Benefit }) {
  return (
    <div style={{
      padding: '1.25rem 1.5rem',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '10px',
      transition: 'border-color 0.2s, background 0.2s',
    }}
      onMouseEnter={e => { (e.currentTarget).style.borderColor = 'rgba(193,13,25,0.3)'; (e.currentTarget).style.background = 'rgba(193,13,25,0.04)' }}
      onMouseLeave={e => { (e.currentTarget).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget).style.background = 'rgba(255,255,255,0.02)' }}
    >
      <span style={{ fontFamily: MONO, fontSize: '0.68rem', fontWeight: 700, color: RED, letterSpacing: '0.12em', display: 'block', marginBottom: '0.5rem' }}>
        {b.num}
      </span>
      <p style={{ fontFamily: DISP, fontWeight: 600, fontSize: '1.05rem', textTransform: 'uppercase', color: '#fff', marginBottom: '0.4rem', letterSpacing: '0.05em', lineHeight: 1.2 }}>
        {b.title}
      </p>
      <p style={{ fontFamily: BODY, fontSize: '0.85rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.46)', margin: 0 }}>
        {b.detail}
      </p>
    </div>
  )
}

// ── Scroll reveal ─────────────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLElement>(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); obs.disconnect() }
    }, { threshold: 0.06 })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  return [ref, vis] as const
}
const REVEAL: React.CSSProperties = {
  transition: 'opacity 0.75s cubic-bezier(0.16,1,0.3,1), transform 0.75s cubic-bezier(0.16,1,0.3,1)',
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function VehicleDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const data = VEHICLES.find(v => v.slug === slug)
  const { data: kpis } = useEcuCatalogCategoryKpis(slug ?? '')

  useEffect(() => {
    if (!data) navigate('/', { replace: true })
  }, [data, navigate])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [slug])

  const handleCta = () => {
    const msg = encodeURIComponent(
      `Olá! Gostaria de uma avaliação de reprogramação ECU para ${data?.label ?? 'meu veículo'}.`
    )
    window.open(
      `https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || '5511999999999'}?text=${msg}`,
      '_blank',
    )
  }

  const [rBenefits, vBenefits] = useReveal()
  const [rCaveats, vCaveats] = useReveal()
  const [rCta, vCta] = useReveal()

  if (!data) return null

  return (
    <>
      <style>{`
        @keyframes vd-fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes vd-hero-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes vd-pulse   { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.4); } }
      `}</style>

      <div style={{ background: BG, minHeight: '100vh', color: '#fff', fontFamily: BODY }}>

        {/* ── HERO ── */}
        <section style={{
          position: 'relative', height: 'min(52vh, 460px)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          justifyContent: 'flex-end',
        }}>
          <img src={data.img} alt={data.label} style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center 40%',
            filter: 'grayscale(20%) brightness(0.72)',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(20,20,22,0.1) 0%, rgba(20,20,22,0.3) 45%, rgba(20,20,22,0.92) 75%, rgba(20,20,22,1) 100%)',
          }} />
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
            background: `linear-gradient(to bottom, transparent 10%, ${RED} 40%, ${RED} 70%, transparent 90%)`,
          }} />

          {/* Back */}
          <button onClick={() => navigate(-1)} style={{
            position: 'absolute', top: '1.5rem', left: '1.5rem', zIndex: 10,
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(20,20,22,0.75)', backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)', border: `1px solid ${BORDER}`,
            borderRadius: '8px', padding: '0.5rem 1rem',
            color: 'rgba(255,255,255,0.75)', fontFamily: MONO, fontSize: '0.72rem',
            letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s',
          }}
            onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(193,13,25,0.28)'; (e.currentTarget).style.color = '#fff' }}
            onMouseLeave={e => { (e.currentTarget).style.background = 'rgba(20,20,22,0.75)'; (e.currentTarget).style.color = 'rgba(255,255,255,0.75)' }}
          >
            <ArrowLeft size={14} /> Voltar
          </button>

          {/* Title + KPI */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2.5rem 1.5rem', animation: 'vd-hero-in 0.7s cubic-bezier(0.16,1,0.3,1) both' }}>
              <p style={{ fontFamily: MONO, fontSize: '0.72rem', fontWeight: 700, color: RED, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Reprogramação de ECU — {data.subtitle}
              </p>
              <h1 style={{ fontFamily: DISP, fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', lineHeight: 0.9, textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#fff' }}>
                {data.label}
              </h1>
            </div>

            {/* KPI strip */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.10)', background: 'rgba(20,20,22,0.82)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
              <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2.5rem', display: 'flex' }}>
                {data.kpi.map((k, i) => {
                  let displayValue = k.value
                  let displayUnit  = k.unit
                  if (i === 0 && kpis?.maxCvGain != null) { displayValue = `+${Math.round(kpis.maxCvGain)}`; displayUnit = 'cv' }
                  else if (i === 1 && kpis?.maxKgfmGain != null) { displayValue = `+${kpis.maxKgfmGain.toFixed(1)}`; displayUnit = 'kgf.m' }
                  else if (i === 2 && kpis?.avgGainPct != null) { displayValue = `~${kpis.avgGainPct}`; displayUnit = '%' }
                  return (
                    <div key={i} style={{ flex: 1, padding: '1.2rem 1.5rem', borderRight: i < data.kpi.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                      <p style={{ fontFamily: MONO, fontSize: '0.65rem', color: 'rgba(255,255,255,0.38)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{k.label}</p>
                      <p style={{ fontFamily: DISP, fontWeight: 900, fontStyle: 'italic', fontSize: '2.2rem', color: RED, lineHeight: 1 }}>
                        {displayValue}<span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.5)', marginLeft: '4px', fontStyle: 'normal', fontWeight: 600 }}>{displayUnit}</span>
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── BENEFITS (2×2 grid) ── */}
        <section
          ref={rBenefits}
          style={{ padding: '3.5rem 2.5rem', borderBottom: `1px solid ${BORDER}`, ...REVEAL, opacity: vBenefits ? 1 : 0, transform: vBenefits ? 'none' : 'translateY(20px)' }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem', marginBottom: '1.75rem' }}>
              <p style={{ fontFamily: MONO, fontSize: '0.68rem', fontWeight: 700, color: RED, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
                Possíveis Melhorias
              </p>
              <h2 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', textTransform: 'uppercase', color: '#fff', lineHeight: 1, letterSpacing: '0.08em' }}>
                O que muda na prática
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              {data.benefits.map((b, i) => <BenefitCard key={i} b={b} />)}
            </div>
          </div>
        </section>

        {/* ── CATALOG ── */}
        <section style={{ padding: '3.5rem 0' }}>
          <CatalogoCliente categorySlug={slug!} />
        </section>

        {/* ── CAVEATS ── */}
        <section
          ref={rCaveats}
          style={{ padding: '2.5rem 2.5rem', borderTop: `1px solid ${BORDER}`, ...REVEAL, opacity: vCaveats ? 1 : 0, transform: vCaveats ? 'none' : 'translateY(20px)' }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{
              background: 'rgba(140,87,32,0.07)', border: '1px solid rgba(140,87,32,0.22)',
              borderRadius: '10px', padding: '1.5rem 2rem',
              display: 'flex', gap: '1rem', alignItems: 'flex-start',
            }}>
              <AlertTriangle size={18} color="#b87333" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ fontFamily: MONO, fontSize: '0.65rem', fontWeight: 700, color: '#b87333', letterSpacing: '0.20em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Ressalvas Técnicas
                </p>
                <p style={{ fontFamily: BODY, fontSize: '0.9rem', lineHeight: 1.7, color: 'rgba(184,115,51,0.85)', margin: 0 }}>
                  {data.caveats}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section
          ref={rCta}
          style={{ padding: '3.5rem 2.5rem', background: CARD, borderTop: `1px solid ${BORDER}`, ...REVEAL, opacity: vCta ? 1 : 0, transform: vCta ? 'none' : 'translateY(20px)' }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontFamily: MONO, fontSize: '0.68rem', fontWeight: 700, color: RED, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Pronto para mais performance?
              </p>
              <h2 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 'clamp(1.6rem, 2.5vw, 2.4rem)', textTransform: 'uppercase', color: '#fff', lineHeight: 1, letterSpacing: '0.06em' }}>
                Solicite uma avaliação para {data.label}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
              <button onClick={handleCta} style={{
                background: RED, border: 'none', cursor: 'pointer',
                padding: '0.85rem 1.75rem', borderRadius: '4px',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                fontFamily: BODY, fontSize: '0.85rem', fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase', color: '#fff',
                transition: 'filter 0.2s',
              }}
                onMouseEnter={e => { (e.currentTarget).style.filter = 'brightness(1.15)' }}
                onMouseLeave={e => { (e.currentTarget).style.filter = '' }}
              >
                Quero Mais Performance <ArrowRight size={14} />
              </button>
              <button onClick={() => navigate(-1)} style={{
                background: 'transparent', border: `1px solid ${BORDER}`,
                cursor: 'pointer', padding: '0.85rem 1.5rem', borderRadius: '4px',
                fontFamily: BODY, fontSize: '0.85rem', fontWeight: 600,
                color: 'rgba(255,255,255,0.6)', letterSpacing: '0.04em',
                transition: 'border-color 0.2s, color 0.2s',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}
                onMouseEnter={e => { (e.currentTarget).style.borderColor = 'rgba(255,255,255,0.4)'; (e.currentTarget).style.color = '#fff' }}
                onMouseLeave={e => { (e.currentTarget).style.borderColor = BORDER; (e.currentTarget).style.color = 'rgba(255,255,255,0.6)' }}
              >
                <ArrowLeft size={14} /> Outras categorias
              </button>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: '1.25rem 2.5rem', display: 'flex', justifyContent: 'center' }}>
          <span style={{ fontFamily: MONO, fontSize: '0.65rem', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.15em' }}>
            INJEDIESEL SYSTEM © 2025 — REPROGRAMAÇÃO DE ECU
          </span>
        </div>

      </div>
    </>
  )
}
