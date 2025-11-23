import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Bell, BellOff, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface BackInStockNotificationProps {
  variantId: string;
  productTitle: string;
  isOutOfStock: boolean;
  className?: string;
}

export function BackInStockNotification({ 
  variantId, 
  productTitle, 
  isOutOfStock,
  className = '' 
}: BackInStockNotificationProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Only show if product is out of stock
  if (!isOutOfStock) {
    return null;
  }

  const handleSubscribe = async () => {
    if (isSubscribed) return;

    // Check if user is logged in
    if (!user?.email) {
      toast({
        title: 'Přihlášení vyžadováno',
        description: 'Pro přihlášení k notifikaci musíte být přihlášeni. Prosím přihlaste se.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/back-in-stock/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          variantId: variantId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Nepodařilo se přihlásit k notifikaci');
      }

      setIsSubscribed(true);
      toast({
        title: 'Úspěšně přihlášeno',
        description: `Budete informováni, až bude ${productTitle} opět skladem.`,
      });
    } catch (error) {
      console.error('Error subscribing to back-in-stock:', error);
      toast({
        title: 'Chyba',
        description: error instanceof Error ? error.message : 'Nepodařilo se přihlásit k notifikaci. Zkuste to prosím znovu.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {isSubscribed ? (
        <div className="flex items-center gap-2 text-green-600">
          <Check className="h-5 w-5" />
          <span className="text-sm font-medium">Přihlášeno k notifikaci</span>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSubscribe}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span>Přihlašuji...</span>
            </>
          ) : (
            <>
              <Bell className="h-4 w-4" />
              <span>Hlídat dostupnost</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}

