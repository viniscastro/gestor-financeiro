import { prisma } from '@/lib/prisma'
import type { TransactionType } from '@/lib/types'

type ParentCheck = {
  userId: string
  parentId: string
  type: TransactionType
  categoryId?: string
}

// Retorna o problema encontrado, ou null quando a categoria pai é válida. A
// hierarquia tem um único nível: pai sempre na raiz e filho sem subcategorias.
export async function findParentProblem({
  userId,
  parentId,
  type,
  categoryId,
}: ParentCheck): Promise<{ error: string; status: number } | null> {
  if (parentId === categoryId) {
    return { error: 'Uma categoria não pode ser subcategoria de si mesma', status: 400 }
  }

  const parent = await prisma.category.findFirst({
    where: { id: parentId, userId },
    select: { type: true, parentId: true },
  })
  if (!parent) return { error: 'Categoria pai não encontrada', status: 404 }
  if (parent.type !== type) {
    return { error: 'Subcategoria deve ser do mesmo tipo da pai', status: 400 }
  }
  if (parent.parentId) {
    return { error: 'Não é possível criar subcategoria de uma subcategoria', status: 400 }
  }

  if (categoryId) {
    const children = await prisma.category.count({ where: { parentId: categoryId, userId } })
    if (children > 0) {
      return { error: 'Esta categoria tem subcategorias e não pode virar subcategoria', status: 400 }
    }
  }

  return null
}
