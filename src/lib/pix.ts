function tlv(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, '0')}${value}`
}

function crc16(str: string): number {
  let crc = 0xffff
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) : (crc << 1)
      crc &= 0xffff
    }
  }
  return crc
}

export function generatePixPayload(params: {
  key: string
  name: string
  city: string
  amount: number
  txid?: string
}): string {
  const { key, name, city, amount, txid = '***' } = params

  const merchantAccount = tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', key)
  const additionalData  = tlv('05', txid.slice(0, 25).replace(/\s/g, ''))

  const payload = [
    tlv('00', '01'),
    tlv('01', '12'),
    tlv('26', merchantAccount),
    tlv('52', '0000'),
    tlv('53', '986'),
    tlv('54', amount.toFixed(2)),
    tlv('58', 'BR'),
    tlv('59', name.slice(0, 25).toUpperCase()),
    tlv('60', city.slice(0, 15).toUpperCase()),
    tlv('62', additionalData),
    '6304',
  ].join('')

  return payload + crc16(payload).toString(16).toUpperCase().padStart(4, '0')
}
