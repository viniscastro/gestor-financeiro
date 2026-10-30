import {
  Baby,
  Banknote,
  BookOpen,
  Briefcase,
  Building2,
  Bus,
  Car,
  Coins,
  CreditCard,
  Dumbbell,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Laptop,
  PawPrint,
  Phone,
  PiggyBank,
  Plane,
  Receipt,
  Shirt,
  ShoppingCart,
  Tag,
  TrendingUp,
  Utensils,
  Wallet,
} from '@/components/icons'

const ICON_MAP = {
  tag: Tag,
  wallet: Wallet,
  'shopping-cart': ShoppingCart,
  utensils: Utensils,
  bus: Bus,
  car: Car,
  home: Home,
  'heart-pulse': HeartPulse,
  'gamepad-2': Gamepad2,
  'graduation-cap': GraduationCap,
  receipt: Receipt,
  briefcase: Briefcase,
  laptop: Laptop,
  'trending-up': TrendingUp,
  gift: Gift,
  coins: Coins,
  'credit-card': CreditCard,
  phone: Phone,
  dumbbell: Dumbbell,
  'paw-print': PawPrint,
  baby: Baby,
  shirt: Shirt,
  plane: Plane,
  'book-open': BookOpen,
  'building-2': Building2,
  'piggy-bank': PiggyBank,
  banknote: Banknote,
} as const

export default function CategoryIcon({
  icon,
  className,
}: {
  icon?: string
  className?: string
}) {
  const Icon = icon ? (ICON_MAP[icon as keyof typeof ICON_MAP] ?? Tag) : Tag
  return <Icon aria-hidden="true" className={className} />
}
