'use client';

import React from 'react';
import {
  Briefcase,
  Car,
  Coffee,
  CreditCard,
  Dumbbell,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  LucideProps,
  PiggyBank,
  Plane,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tag,
  TrendingUp,
  Tv,
  Utensils,
  Wallet,
  Wrench,
  Zap,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  Utensils,
  Car,
  Home,
  Tv,
  HeartPulse,
  Gamepad2,
  Briefcase,
  TrendingUp,
  ShoppingBag,
  Coffee,
  Plane,
  GraduationCap,
  Dumbbell,
  Smartphone,
  Zap,
  PiggyBank,
  Wallet,
  CreditCard,
  Gift,
  Sparkles,
  Wrench,
  Tag,
};

interface CategoryIconProps extends LucideProps {
  name: string;
}

export function CategoryIcon({ name, className = 'w-4 h-4', ...props }: CategoryIconProps) {
  const IconComponent = ICON_MAP[name] ?? Tag;
  return <IconComponent className={className} {...props} />;
}
