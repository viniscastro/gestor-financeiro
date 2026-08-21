import { z } from 'zod'
import { TRANSACTION_TYPES } from '@/lib/categories'
import type { CategoryDto, TransactionType } from '@/lib/types'

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome').max(40),
  type: z.enum(TRANSACTION_TYPES),
  color: z.string().min(1),
  icon: z.string().min(1),
})

export type CategoryInput = z.infer<typeof categorySchema>

export function toCategoryDto(category: {
  id: string
  name: string
  type: string
  color: string
  icon: string
  position: number
}): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    type: category.type as TransactionType,
    color: category.color,
    icon: category.icon,
    position: category.position,
  }
}
