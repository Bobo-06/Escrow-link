import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CompareItem {
  product_id: string;
  name: string;
  price: number;
  image?: string;
  image_b64?: string;
  seller_name?: string;
  category?: string;
  location?: string;
  rating?: number;
  is_verified?: boolean;
}

interface CompareState {
  items: CompareItem[];
  open: boolean;
  add: (item: CompareItem) => void;
  remove: (product_id: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  has: (product_id: string) => boolean;
}

const MAX = 4;

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      open: false,
      add: (item) =>
        set((s) => {
          if (s.items.find((i) => i.product_id === item.product_id)) return s;
          if (s.items.length >= MAX) return s;
          return { items: [...s.items, item] };
        }),
      remove: (product_id) =>
        set((s) => ({ items: s.items.filter((i) => i.product_id !== product_id) })),
      clear: () => set({ items: [] }),
      setOpen: (open) => set({ open }),
      toggleOpen: () => set((s) => ({ open: !s.open })),
      has: (product_id) => !!get().items.find((i) => i.product_id === product_id),
    }),
    { name: 'biz-salama-compare' }
  )
);
