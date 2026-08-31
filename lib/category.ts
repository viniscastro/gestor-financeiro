import { z } from 'zod'
import { TRANSACTION_TYPES } from '@/lib/categories'
import type { CategoryDto, TransactionType } from '@/lib/types'
import type { SelectOption } from '@/components/select'

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome').max(40),
  type: z.enum(TRANSACTION_TYPES),
  color: z.string().min(1),
  icon: z.string().min(1),
  parentId: z.string().nullable().optional(),
})

export type CategoryInput = z.infer<typeof categorySchema>

export function toCategoryDto(category: {
  id: string
  name: string
  type: string
  color: string
  icon: string
  position: number
  parentId?: string | null
  children?: Array<{
    id: string
    name: string
    type: string
    color: string
    icon: string
    position: number
    parentId?: string | null
    children?: Array<{
      id: string
      name: string
      type: string
      color: string
      icon: string
      position: number
      parentId?: string | null
    }>
  }>
}): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    type: category.type as TransactionType,
    color: category.color,
    icon: category.icon,
    position: category.position,
    parentId: category.parentId ?? null,
    children: (category.children ?? []).map((c) => toCategoryDto(c)),
  }
}

export function flattenCategories(categories: CategoryDto[]): SelectOption[] {
  const result: SelectOption[] = []
  for (const cat of categories) {
    result.push({ value: cat.id, label: cat.name, depth: 0 })
    for (const child of cat.children) {
      result.push({ value: child.id, label: child.name, depth: 1 })
    }
  }
  return result
}
