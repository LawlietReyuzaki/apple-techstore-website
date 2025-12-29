import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartProduct {
  id: string;
  name: string;
  brand?: string;
  price: number;
  wholesale_price?: number;
  images?: string[];
  image?: string;
  type?: 'product' | 'spare_part' | 'shop_item';
  quantity?: number;
}

export interface CartItem {
  product: CartProduct;
  quantity: number;
  selectedColor?: string | null;
  selectedColorCode?: string | null;
  selectedPartType?: string | null;
}

interface ProductCartStore {
  items: CartItem[];
  
  // Actions
  addItem: (product: CartProduct, quantity?: number, selectedColor?: string | null, selectedColorCode?: string | null, selectedPartType?: string | null) => void;
  updateQuantity: (productId: string, quantity: number, selectedColor?: string | null, selectedPartType?: string | null) => void;
  removeItem: (productId: string, selectedColor?: string | null, selectedPartType?: string | null) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

// Helper to create unique cart item key
const getCartItemKey = (productId: string, selectedColor?: string | null, selectedPartType?: string | null) => {
  return `${productId}-${selectedColor || 'nocolor'}-${selectedPartType || 'noparttype'}`;
};

export const useProductCartStore = create<ProductCartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity = 1, selectedColor = null, selectedColorCode = null, selectedPartType = null) => {
        const { items } = get();
        const existingItem = items.find(i => 
          i.product.id === product.id && 
          i.selectedColor === selectedColor && 
          i.selectedPartType === selectedPartType
        );
        
        if (existingItem) {
          set({
            items: items.map(i =>
              i.product.id === product.id && 
              i.selectedColor === selectedColor && 
              i.selectedPartType === selectedPartType
                ? { ...i, quantity: i.quantity + quantity }
                : i
            )
          });
        } else {
          set({ 
            items: [...items, { 
              product, 
              quantity, 
              selectedColor, 
              selectedColorCode,
              selectedPartType 
            }] 
          });
        }
      },

      updateQuantity: (productId, quantity, selectedColor = null, selectedPartType = null) => {
        if (quantity <= 0) {
          get().removeItem(productId, selectedColor, selectedPartType);
          return;
        }
        
        set({
          items: get().items.map(item =>
            item.product.id === productId && 
            item.selectedColor === selectedColor && 
            item.selectedPartType === selectedPartType
              ? { ...item, quantity } 
              : item
          )
        });
      },

      removeItem: (productId, selectedColor = null, selectedPartType = null) => {
        set({
          items: get().items.filter(item => 
            !(item.product.id === productId && 
              item.selectedColor === selectedColor && 
              item.selectedPartType === selectedPartType)
          )
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      }
    }),
    {
      name: 'dilbar-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
