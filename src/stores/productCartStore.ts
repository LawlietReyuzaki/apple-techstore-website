import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  wholesale_price?: number;
  sale_price?: number;
  images: string[];
}

export interface CartItem {
  product: CartProduct;
  quantity: number;
}

interface ProductCartStore {
  items: CartItem[];
  
  // Actions
  addItem: (product: CartProduct, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useProductCartStore = create<ProductCartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity = 1) => {
        const { items } = get();
        const existingItem = items.find(i => i.product.id === product.id);
        
        if (existingItem) {
          set({
            items: items.map(i =>
              i.product.id === product.id
                ? { ...i, quantity: i.quantity + quantity }
                : i
            )
          });
        } else {
          set({ items: [...items, { product, quantity }] });
        }
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        
        set({
          items: get().items.map(item =>
            item.product.id === productId ? { ...item, quantity } : item
          )
        });
      },

      removeItem: (productId) => {
        set({
          items: get().items.filter(item => item.product.id !== productId)
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((sum, item) => {
          const product = item.product;
          // Use sale_price if available, otherwise wholesale_price, otherwise regular price
          const effectivePrice = product.sale_price || product.wholesale_price || product.price;
          return sum + (effectivePrice * item.quantity);
        }, 0);
      }
    }),
    {
      name: 'dilbar-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
