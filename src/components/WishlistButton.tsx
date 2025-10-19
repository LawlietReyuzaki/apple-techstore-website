import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWishlist } from '@/hooks/useWishlist';
import { cn } from '@/lib/utils';

interface WishlistButtonProps {
  productId: string;
  userId: string | undefined;
  className?: string;
}

export const WishlistButton = ({ productId, userId, className }: WishlistButtonProps) => {
  const { isInWishlist, toggleWishlist } = useWishlist(userId);
  const inWishlist = isInWishlist(productId);

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("hover:scale-110 transition-transform", className)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWishlist(productId);
      }}
    >
      <Heart
        className={cn(
          "h-5 w-5",
          inWishlist ? "fill-red-500 text-red-500" : "text-muted-foreground"
        )}
      />
    </Button>
  );
};
