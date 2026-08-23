import type { Metadata } from 'next'
import CategoriesManager from '@/components/categories-manager'

export const metadata: Metadata = {
  title: 'Categorias | Gestor Financeiro',
}

export default function CategoriesPage() {
  return <CategoriesManager />
}
