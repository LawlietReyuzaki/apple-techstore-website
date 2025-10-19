import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWishlist } from '@/hooks/useWishlist';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/ProductCard';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart } from 'lucide-react';
import { useProductCartStore } from '@/stores/productCartStore';

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  brand: string;
  stock: number;
}

export default function Wishlist() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wishlistItems } = useWishlist(user?.id);
  const [products, setProducts] = useState<Product[]>([]);
  const { toast } = useToast();
  const addItem = useProductCartStore(state => state.addItem);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchWishlistProducts = async () => {
      if (wishlistItems.length === 0) {
        setProducts([]);
        return;
      }

      const { data } = await supabase
        .from('products')
        .select('*')
        .in('id', wishlistItems);

      if (data) setProducts(data);
    };

    fetchWishlistProducts();
  }, [user, wishlistItems, navigate]);

  const addAllToCart = () => {
    products.forEach(product => {
      if (product.stock > 0) {
        addItem(product);
      }
    });
    
    toast({
      title: "Added to Cart",
      description: `${products.length} items added to cart`,
    });
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">My Wishlist</h1>
          {products.length > 0 && (
            <Button onClick={addAllToCart}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add All to Cart
            </Button>
          )}
        </div>

        {products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground mb-4">
              Your wishlist is empty
            </p>
            <Button onClick={() => navigate('/shop')}>
              Start Shopping
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
