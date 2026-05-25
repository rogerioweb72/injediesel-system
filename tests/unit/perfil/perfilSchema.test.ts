import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Schema duplicated here for isolated testing (will be imported from page in Task 8)
const perfilSchema = z.object({
  name:            z.string().min(3, 'Mínimo 3 caracteres'),
  phone:           z.string().min(10, 'Celular inválido'),
  email:           z.string().email('E-mail inválido').optional().or(z.literal('')),
  emailConfirm:    z.string().optional().or(z.literal('')),
  birth_date:      z.string().optional().or(z.literal('')),
  cep:             z.string().optional().or(z.literal('')),
  street:          z.string().optional().or(z.literal('')),
  address_number:  z.string().optional().or(z.literal('')),
  complement:      z.string().optional().or(z.literal('')),
  neighborhood:    z.string().optional().or(z.literal('')),
  city:            z.string().optional().or(z.literal('')),
  state:           z.string().optional().or(z.literal('')),
  newPassword:     z.string().optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
  oldPassword:     z.string().optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  if (data.email && data.email !== data.emailConfirm) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'E-mails não conferem', path: ['emailConfirm'] })
  }
  if (data.newPassword && data.newPassword.length < 8) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Mínimo 8 caracteres', path: ['newPassword'] })
  }
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Senhas não conferem', path: ['confirmPassword'] })
  }
  if ((data.email || data.newPassword) && !data.oldPassword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Obrigatório para trocar e-mail ou senha', path: ['oldPassword'] })
  }
})

const VALID_BASE = { name: 'João Silva', phone: '11999991234' }

describe('perfilSchema', () => {
  it('accepts minimal valid data', () => {
    expect(perfilSchema.safeParse(VALID_BASE).success).toBe(true)
  })

  it('rejects name shorter than 3 chars', () => {
    const r = perfilSchema.safeParse({ ...VALID_BASE, name: 'Jo' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].path[0]).toBe('name')
  })

  it('rejects phone shorter than 10 chars', () => {
    const r = perfilSchema.safeParse({ ...VALID_BASE, phone: '1199' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].path[0]).toBe('phone')
  })

  it('requires oldPassword when changing email', () => {
    const r = perfilSchema.safeParse({ ...VALID_BASE, email: 'new@test.com', emailConfirm: 'new@test.com' })
    expect(r.success).toBe(false)
    const paths = r.error?.issues.map(i => i.path[0])
    expect(paths).toContain('oldPassword')
  })

  it('rejects mismatched emails', () => {
    const r = perfilSchema.safeParse({ ...VALID_BASE, email: 'new@test.com', emailConfirm: 'other@test.com', oldPassword: 'secret123' })
    expect(r.success).toBe(false)
    const paths = r.error?.issues.map(i => i.path[0])
    expect(paths).toContain('emailConfirm')
  })

  it('rejects password shorter than 8 chars', () => {
    const r = perfilSchema.safeParse({ ...VALID_BASE, newPassword: 'abc123', confirmPassword: 'abc123', oldPassword: 'secret123' })
    expect(r.success).toBe(false)
    const paths = r.error?.issues.map(i => i.path[0])
    expect(paths).toContain('newPassword')
  })

  it('rejects mismatched passwords', () => {
    const r = perfilSchema.safeParse({ ...VALID_BASE, newPassword: 'Abc12345!', confirmPassword: 'Different1!', oldPassword: 'secret123' })
    expect(r.success).toBe(false)
    const paths = r.error?.issues.map(i => i.path[0])
    expect(paths).toContain('confirmPassword')
  })

  it('requires oldPassword when changing password', () => {
    const r = perfilSchema.safeParse({ ...VALID_BASE, newPassword: 'Abc12345!', confirmPassword: 'Abc12345!' })
    expect(r.success).toBe(false)
    const paths = r.error?.issues.map(i => i.path[0])
    expect(paths).toContain('oldPassword')
  })

  it('accepts full valid profile update', () => {
    const r = perfilSchema.safeParse({
      ...VALID_BASE,
      email: 'novo@test.com', emailConfirm: 'novo@test.com',
      newPassword: 'Abc12345!', confirmPassword: 'Abc12345!',
      oldPassword: 'Antiga123!',
      cep: '14780000', city: 'Barretos', state: 'SP',
    })
    expect(r.success).toBe(true)
  })
})
