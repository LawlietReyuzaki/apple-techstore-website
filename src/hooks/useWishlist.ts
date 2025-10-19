import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useWishlist = (userId: string | undefined) => {
  const [wishlistItems, setWishlistItems] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    const fetchWishlist = async () => {
      const { data } = await supabase
        .from('wishlist')
        .select('product_id')
        .eq('user_id', userId);

      if (data) {
        setWishlistItems(data.map(item => item.product_id));
      }
    };

    fetchWishlist();
  }, [userId]);

  const isInWishlist = (productId: string) => wishlistItems.includes(productId);

  const toggleWishlist = async (productId: string) => {
    if (!userId) {
      toast({
        title: "Login Required",
        description: "Please login to add items to wishlist",
        variant: "destructive",
      });
      return;
    }

    if (isInWishlist(productId)) {
      await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);

      setWishlistItems(prev => prev.filter(id => id !== productId));
      toast({
        title: "Removed from Wishlist",
        description: "Item removed from your wishlist",
      });
    } else {
      await supabase
        .from('wishlist')
        .insert({ user_id: userId, product_id: productId });

      setWishlistItems(prev => [...prev, productId]);
      toast({
        title: "Added to Wishlist",
        description: "Item added to your wishlist",
      });
    }
  };

  return { wishlistItems, isInWishlist, toggleWishlist };
};
