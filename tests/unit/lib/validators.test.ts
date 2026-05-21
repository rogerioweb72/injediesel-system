import { describe, it, expect } from 'vitest'
import {
  validarCNPJ, validarCPF,
  maskCNPJ, maskCPF, maskPhone, maskCEP,
} from '@/lib/validators'

describe('validarCNPJ', () => {
  it('aceita CNPJ válido', () => {
    expect(validarCNPJ('11.222.333/0001-81')).toBe(true)
  })
  it('rejeita CNPJ com dígitos repetidos', () => {
    expect(validarCNPJ('11.111.111/1111-11')).toBe(false)
  })
  it('rejeita CNPJ com dígito verificador errado', () => {
    expect(validarCNPJ('11.222.333/0001-00')).toBe(false)
  })
  it('rejeita string vazia', () => {
    expect(validarCNPJ('')).toBe(false)
  })
})

describe('validarCPF', () => {
  it('aceita CPF válido', () => {
    expect(validarCPF('529.982.247-25')).toBe(true)
  })
  it('rejeita CPF com dígitos repetidos', () => {
    expect(validarCPF('111.111.111-11')).toBe(false)
  })
  it('rejeita CPF com dígito verificador errado', () => {
    expect(validarCPF('529.982.247-00')).toBe(false)
  })
})

describe('maskCNPJ', () => {
  it('formata 14 dígitos', () => {
    expect(maskCNPJ('11222333000181')).toBe('11.222.333/0001-81')
  })
  it('aceita entrada já parcialmente mascarada', () => {
    expect(maskCNPJ('11.222.333/0001-81')).toBe('11.222.333/0001-81')
  })
})

describe('maskCPF', () => {
  it('formata 11 dígitos', () => {
    expect(maskCPF('52998224725')).toBe('529.982.247-25')
  })
})

describe('maskPhone', () => {
  it('formata 11 dígitos (celular)', () => {
    expect(maskPhone('11999990000')).toBe('(11) 99999-0000')
  })
  it('formata 10 dígitos (fixo)', () => {
    expect(maskPhone('1133330000')).toBe('(11) 3333-0000')
  })
})

describe('maskCEP', () => {
  it('formata 8 dígitos', () => {
    expect(maskCEP('01310100')).toBe('01310-100')
  })
})
