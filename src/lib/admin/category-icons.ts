import {
  Bike,
  Car,
  CarFront,
  Coffee,
  Heart,
  Hotel,
  House,
  MapPin,
  Martini,
  Mountain,
  Parasol,
  Plane,
  ShoppingBag,
  Star,
  Ticket,
  Utensils,
  type LucideIcon,
} from 'lucide-react';

export interface CategoryIconOption {
  key: string;
  Icon: LucideIcon;
}

// Each key is a translation key under admin.categories.modal.iconOptions.*.
export const CATEGORY_ICON_OPTIONS: CategoryIconOption[] = [
  { key: 'restaurant', Icon: Utensils },
  { key: 'cafe', Icon: Coffee },
  { key: 'barNightlife', Icon: Martini },
  { key: 'hotel', Icon: Hotel },
  { key: 'rental', Icon: House },
  { key: 'stay', Icon: House },
  { key: 'outdoor', Icon: Mountain },
  { key: 'culture', Icon: House },
  { key: 'experience', Icon: Star },
  { key: 'transfer', Icon: CarFront },
  { key: 'bikeScooter', Icon: Bike },
  { key: 'transport', Icon: Car },
  { key: 'beach', Icon: Parasol },
  { key: 'flight', Icon: Plane },
  { key: 'wellness', Icon: Heart },
  { key: 'shopping', Icon: ShoppingBag },
  { key: 'attraction', Icon: Ticket },
  { key: 'genericPlace', Icon: MapPin },
];

const ICON_BY_KEY: Record<string, LucideIcon> = Object.fromEntries(
  CATEGORY_ICON_OPTIONS.map((option) => [option.key, option.Icon]),
);

export const DEFAULT_CATEGORY_ICON = 'genericPlace';

export function resolveCategoryIcon(key: string | undefined): LucideIcon {
  return (key && ICON_BY_KEY[key]) || ICON_BY_KEY[DEFAULT_CATEGORY_ICON]!;
}
