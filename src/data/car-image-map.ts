import type { EcuCatalogRow } from '@/types/ecu-catalog'

// Wikimedia Commons Special:FilePath — stable redirect, no hash needed
const WM = (file: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=800`

// carros-e-suvs
const CARROS: Record<string, string> = {
  'audi|a1'                      : WM('2013_Audi_A1_(8X_MY14)_1.4_TFSI_Sport_S_line_Sportback_5-door_hatchback_(2015-08-07)_01.jpg'),
  'audi|a3'                      : WM('Audi_A3_Sportback_1.6_TDI_Ambition_(8V)_–_Frontansicht,_6._April_2014,_Düsseldorf.jpg'),
  'audi|a4'                      : WM('Audi_A4_S_line_Package_(B9)_front.JPG'),
  'audi|a5'                      : WM('2016_Audi_A4_Sport_Ultra_TDi_S-A_2.0.jpg'),
  'audi|a6'                      : WM('2016_Audi_A4_Sport_Ultra_TDi_S-A_2.0.jpg'),
  'audi|q3'                      : WM('2013_Audi_A1_(8X_MY14)_1.4_TFSI_Sport_S_line_Sportback_5-door_hatchback_(2015-08-07)_01.jpg'),
  'audi|q5'                      : WM('2013_Audi_A1_(8X_MY14)_1.4_TFSI_Sport_S_line_Sportback_5-door_hatchback_(2015-08-07)_01.jpg'),
  'audi|tt'                      : WM('2013_Audi_A1_(8X_MY14)_1.4_TFSI_Sport_S_line_Sportback_5-door_hatchback_(2015-08-07)_01.jpg'),
  'audi'                         : WM('2013_Audi_A1_(8X_MY14)_1.4_TFSI_Sport_S_line_Sportback_5-door_hatchback_(2015-08-07)_01.jpg'),
  '|2015 b200'                   : WM('Mercedes-Benz_B_200_CDI_Sport-Paket_(W_246)_–_Frontansicht,_21._April_2014,_Düsseldorf.jpg'),
  'mercedes-benz|b200'           : WM('Mercedes-Benz_B_200_CDI_Sport-Paket_(W_246)_–_Frontansicht,_21._April_2014,_Düsseldorf.jpg'),
  'mercedes-benz|b 200'          : WM('Mercedes-Benz_B_200_CDI_Sport-Paket_(W_246)_–_Frontansicht,_21._April_2014,_Düsseldorf.jpg'),
  'mercedes-benz|c 180'          : WM('Mercedes-Benz_C_220_CDI_Avantgarde_(W204,_Facelift)_–_Frontansicht,_5._April_2014,_Düsseldorf.jpg'),
  'mercedes-benz|c 200'          : WM('Mercedes-Benz_C_220_CDI_Avantgarde_(W204,_Facelift)_–_Frontansicht,_5._April_2014,_Düsseldorf.jpg'),
  'mercedes-benz|c 250'          : WM('Mercedes-Benz_C_220_CDI_Avantgarde_(W204,_Facelift)_–_Frontansicht,_5._April_2014,_Düsseldorf.jpg'),
  'mercedes-benz'                : WM('Mercedes-Benz_B_200_CDI_Sport-Paket_(W_246)_–_Frontansicht,_21._April_2014,_Düsseldorf.jpg'),
  '|(pot+vmax) camaro / corvette': WM('2019_Chevrolet_Camaro_2SS_6.2L_front_3.16.19.jpg'),
  'chevrolet|camaro'             : WM('2019_Chevrolet_Camaro_2SS_6.2L_front_3.16.19.jpg'),
  'chevrolet|cruze'              : WM('Chevrolet_Cruze_2016_(25832507382).jpg'),
  'chevrolet|onix'               : WM('Chevrolet_Onix_LTZ_2013_(9498148939).jpg'),
  'volkswagen|golf'              : WM('2013-2015_Volkswagen_Golf_(5G)_110TDI_Highline_(R-Line)_5-door_hatchback_(2018-10-29)_01.jpg'),
  'volkswagen|polo'              : WM('VW_Polo_IV_Facelift_front_20100116.jpg'),
  'volkswagen|tiguan'            : WM('VW_Tiguan_2.0_TSI_4MOTION_–_Frontansicht,_23._März_2013,_Düsseldorf.jpg'),
  'volkswagen|jetta'             : WM('VW_Jetta_VI_front_20110902.jpg'),
  'volkswagen'                   : WM('2013-2015_Volkswagen_Golf_(5G)_110TDI_Highline_(R-Line)_5-door_hatchback_(2018-10-29)_01.jpg'),
  'bmw|320i'                     : WM('BMW_3er_F30_front_20111106.jpg'),
  'bmw|328i'                     : WM('BMW_3er_F30_front_20111106.jpg'),
  'bmw|335i'                     : WM('BMW_3er_F30_front_20111106.jpg'),
  'bmw'                          : WM('BMW_3er_F30_front_20111106.jpg'),
  'fiat|bravo'                   : WM('Fiat_Bravo_II_front_20100926.jpg'),
  'fiat|linea'                   : WM('Fiat_Linea_front_20091006.jpg'),
  'fiat'                         : WM('Fiat_Bravo_II_front_20100926.jpg'),
  'ford|focus'                   : WM('Ford_Focus_Mk_III_front_Poznan_2011.jpg'),
  'ford|fusion'                  : WM('Ford_Focus_Mk_III_front_Poznan_2011.jpg'),
  'ford'                         : WM('Ford_Focus_Mk_III_front_Poznan_2011.jpg'),
  'hyundai|tucson'               : WM('2016_Hyundai_Tucson_(TL)_Active_CRDi_AWD_wagon_(2016-07-16)_01.jpg'),
  'hyundai|i30'                  : WM('2012_Hyundai_i30_GD_Active_hatchback_(2012-12-18)_01.jpg'),
  'hyundai'                      : WM('2012_Hyundai_i30_GD_Active_hatchback_(2012-12-18)_01.jpg'),
  'toyota|corolla'               : WM('2014_Toyota_Corolla_E160_New_York_USA_22-01-2014_front.png'),
  'toyota|hilux'                 : WM('2016_Toyota_Hilux_(GUN126R)_SR5_dual_cab_utility_(2018-08-27)_01.jpg'),
  'toyota'                       : WM('2014_Toyota_Corolla_E160_New_York_USA_22-01-2014_front.png'),
  'honda|civic'                  : WM('Honda_Civic_sedan_front_-_2012_Montevideo_Motor_Show.jpg'),
  'honda|fit'                    : WM('Honda_Civic_sedan_front_-_2012_Montevideo_Motor_Show.jpg'),
  'honda'                        : WM('Honda_Civic_sedan_front_-_2012_Montevideo_Motor_Show.jpg'),
  'renault|megane'               : WM('Renault_Megane_III_Coupe_-_Frontansicht,_5._Maerz_2011,_Wuelfrath.jpg'),
  'renault|duster'               : WM('2012_Renault_Duster_Dynamique_4x4_1.6_16v_Hi-Flex.jpg'),
  'renault'                      : WM('Renault_Megane_III_Coupe_-_Frontansicht,_5._Maerz_2011,_Wuelfrath.jpg'),
  'nissan|sentra'                : WM('2013_Nissan_Sentra_SV_sedan_(2012-12-08),_front_8.4.jpg'),
  'nissan|tiida'                 : WM('Nissan_Tiida_sedan_front_20111130.jpg'),
  'nissan'                       : WM('2013_Nissan_Sentra_SV_sedan_(2012-12-08),_front_8.4.jpg'),
  'jeep|renegade'                : WM('2015_Jeep_Renegade_Limited_(17178025961).jpg'),
  'jeep|compass'                 : WM('Jeep_Compass_2017_front.jpg'),
  'jeep'                         : WM('2015_Jeep_Renegade_Limited_(17178025961).jpg'),
  'chevrolet|cobalt'             : WM('Chevrolet_Cobalt_LTZ_2012_(9498203339).jpg'),
  'chevrolet|spin'               : WM('2013_Chevrolet_Spin_Active_(front),_Campinas.jpg'),
  'chevrolet'                    : WM('Chevrolet_Cruze_2016_(25832507382).jpg'),
  'peugeot|207'                  : WM('Peugeot_207_1.6_SW_front_20100907.jpg'),
  'peugeot|308'                  : WM('Peugeot_308_II_front_20140411.jpg'),
  'peugeot'                      : WM('Peugeot_308_II_front_20140411.jpg'),
  'mitsubishi|asx'               : WM('Mitsubishi_ASX_–_Frontansicht,_5._April_2014,_Düsseldorf.jpg'),
  'mitsubishi|outlander'         : WM('Mitsubishi_Outlander_III_–_Frontansicht,_5._Mai_2012,_Düsseldorf.jpg'),
  'mitsubishi'                   : WM('Mitsubishi_ASX_–_Frontansicht,_5._April_2014,_Düsseldorf.jpg'),
  'land rover|discovery'         : WM('2017_Land_Rover_Discovery_Sport_SE_TD4_in_Indus_Silver,_front_left.jpg'),
  'land rover'                   : WM('2017_Land_Rover_Discovery_Sport_SE_TD4_in_Indus_Silver,_front_left.jpg'),
  'porsche|cayenne'              : WM('Porsche_Cayenne_Turbo_S_(958)_–_Frontansicht,_31._August_2014,_Düsseldorf.jpg'),
  'porsche'                      : WM('Porsche_Cayenne_Turbo_S_(958)_–_Frontansicht,_31._August_2014,_Düsseldorf.jpg'),
  'subaru|impreza'               : WM('Subaru_Impreza_2.0i_Sport_2012_(US).jpg'),
  'subaru|forester'              : WM('2013_Subaru_Forester_2.5i_Touring_(US).jpg'),
  'subaru'                       : WM('2013_Subaru_Forester_2.5i_Touring_(US).jpg'),
  'seat|ibiza'                   : WM('2012_SEAT_Ibiza_1.2_SE_5dr_(8093068929).jpg'),
  'seat|leon'                    : WM('2013_SEAT_León_ST_FR_TDI_(9406765098).jpg'),
  'seat'                         : WM('2013_SEAT_León_ST_FR_TDI_(9406765098).jpg'),
  'mini|cooper'                  : WM('MINI_Cooper_S_Facelift_front_20111027.jpg'),
  'mini'                         : WM('MINI_Cooper_S_Facelift_front_20111027.jpg'),
  'volvo|s40'                    : WM('2007_Volvo_S40_T5_AWD_--_front.jpg'),
  'volvo|xc60'                   : WM('2010_Volvo_XC60_D5_AWD_(6669553763).jpg'),
  'volvo'                        : WM('2010_Volvo_XC60_D5_AWD_(6669553763).jpg'),
}

// pickups
const PICKUPS: Record<string, string> = {
  'chevrolet|montana' : WM('Chevrolet_Montana_Turbo_LTZ_2023_(54286671367).jpg'),
  'chevrolet|s10'     : WM('Chevrolet_S-10_LT_2.8_TD_Crew_Cab_2013_(12725976734).jpg'),
  'chevrolet'         : WM('Chevrolet_S-10_LT_2.8_TD_Crew_Cab_2013_(12725976734).jpg'),
  'dodge|dodge ram'   : WM('2019_Ram_Truck_1500_Laramie.jpg'),
  'dodge'             : WM('2019_Ram_Truck_1500_Laramie.jpg'),
  'fiat|strada'       : WM('Fiat_Strada_2020_Volcano_in_Montevideo_(front).jpg'),
  'fiat'              : WM('Fiat_Strada_2020_Volcano_in_Montevideo_(front).jpg'),
  'ford|ranger'       : WM('2019_Ford_Ranger_XLT_FX4,_front_8.6.19.jpg'),
  'ford'              : WM('2019_Ford_Ranger_XLT_FX4,_front_8.6.19.jpg'),
  'vw|amarok'         : WM('VW_Amarok_2.0_TDI_Highline_–_Frontansicht,_20._Juli_2012,_Düsseldorf.jpg'),
  'volkswagen|amarok' : WM('VW_Amarok_2.0_TDI_Highline_–_Frontansicht,_20._Juli_2012,_Düsseldorf.jpg'),
  'toyota|hilux'      : WM('2016_Toyota_Hilux_(GUN126R)_SR5_dual_cab_utility_(2018-08-27)_01.jpg'),
  'toyota'            : WM('2016_Toyota_Hilux_(GUN126R)_SR5_dual_cab_utility_(2018-08-27)_01.jpg'),
  'mitsubishi|l200'   : WM('2016_Mitsubishi_L200_(KJ)_GLS_dual_cab_(2017-12-14)_01.jpg'),
  'mitsubishi'        : WM('2016_Mitsubishi_L200_(KJ)_GLS_dual_cab_(2017-12-14)_01.jpg'),
  'nissan|frontier'   : WM('2005_Nissan_Frontier,_King_Cab_XE.jpg'),
  'nissan'            : WM('2005_Nissan_Frontier,_King_Cab_XE.jpg'),
  'renault|duster'    : WM('2012_Renault_Duster_Dynamique_4x4_1.6_16v_Hi-Flex.jpg'),
}

// Generic truck fallback (DAF XF — confirmed 200)
const GENERIC_TRUCK = WM('DAF_-_XF.JPG')

// trucks (sem marca — identificar por modelo_descricao)
const TRUCK_MODELS: Array<{ match: string; url: string }> = [
  { match: 'xf',        url: WM('DAF_-_XF.JPG') },
  { match: 'cargo',     url: WM('Ford_Cargo_1833.jpg') },
  { match: 'actros',    url: WM('Mercedes_Benz_Actros_1851_LS.jpg') },
  { match: 'atego',     url: WM('Mercedes_Benz_Atego.jpg') },
  { match: 'volvo fh',  url: WM('DAF_-_XF.JPG') },
  { match: 'volvo fm',  url: WM('DAF_-_XF.JPG') },
  { match: 'scania',    url: WM('DAF_-_XF.JPG') },
  { match: 'iveco',     url: WM('DAF_-_XF.JPG') },
  { match: 'man',       url: WM('DAF_-_XF.JPG') },
  { match: 'volkswagen',url: WM('DAF_-_XF.JPG') },
]

// agricola
const AGRICOLA: Record<string, string> = {
  'cat'             : WM('Challenger_MT765C_-_2010.jpg'),
  'case ih'         : WM('Case_IH_Axial_Flow_8260_agra_2024_(DSC01569).jpg'),
  'john deere'      : WM('John_Deere_9770_STS_Hillmaster_(6003779680).jpg'),
  'new holland'     : WM('New_Holland_CR_Combine.jpg'),
  'fendt'           : WM('Fendt_936_Vario_TMS_front.jpg'),
  'claas'           : WM('CLAAS_LEXION_780_TT.jpg'),
  'massey'          : WM('Massey_Ferguson_7726_S_front.jpg'),
  'valtra'          : WM('Valtra_T254_Versu_(26735278789).jpg'),
}

// Generic machine fallback (Case 721 CXT — confirmed 200)
const GENERIC_MACHINE = WM('Case_721_CXT_wheel_loader_(1).jpg')

// maquinas (sem marca — identificar por modelo_descricao)
const MAQUINAS_MODELS: Array<{ match: string; url: string }> = [
  { match: 'caterpillar',  url: WM('Caterpillar_315_near_a_pond.jpg') },
  { match: 'john deere',   url: WM('John_Deere_690_D-LC_excavator.JPG') },
  { match: 'volvo',        url: WM('Radlader_Volvo_L70H.jpg') },
  { match: 'case',         url: WM('Case_721_CXT_wheel_loader_(1).jpg') },
  { match: 'komatsu',      url: WM('Caterpillar_315_near_a_pond.jpg') },
  { match: 'hitachi',      url: WM('Caterpillar_315_near_a_pond.jpg') },
]

function key(a: string, b: string) {
  return `${a.toLowerCase()}|${b.toLowerCase()}`
}

export function lookupCarImage(row: EcuCatalogRow): string | null {
  const marca   = (row.marca ?? '').trim()
  const secao   = (row.secao_original ?? '').trim()
  const modelo  = (row.modelo_descricao ?? '').trim().toLowerCase()
  const cat     = row.categoria_slug ?? ''

  if (cat === 'carros-e-suvs') {
    return (
      CARROS[key(marca, secao)] ??
      CARROS[key('', secao)] ??
      CARROS[marca.toLowerCase()] ??
      null
    )
  }

  if (cat === 'pickups') {
    return (
      PICKUPS[key(marca, secao)] ??
      PICKUPS[marca.toLowerCase()] ??
      null
    )
  }

  if (cat === 'trucks') {
    if (marca) {
      const m = TRUCK_MODELS.find(t => marca.toLowerCase().includes(t.match))
      if (m) return m.url
    }
    const found = TRUCK_MODELS.find(t => modelo.includes(t.match))
    return found?.url ?? GENERIC_TRUCK
  }

  if (cat === 'agricola') {
    return (
      AGRICOLA[marca.toLowerCase()] ??
      AGRICOLA[marca.split(' ')[0].toLowerCase()] ??
      null
    )
  }

  if (cat === 'maquinas') {
    const found = MAQUINAS_MODELS.find(t => modelo.includes(t.match))
    return found?.url ?? GENERIC_MACHINE
  }

  return null
}
