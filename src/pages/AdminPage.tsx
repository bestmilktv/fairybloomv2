import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const AdminPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to home if not authenticated or not admin
  React.useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 flex items-center justify-center">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded-lg w-64"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-luxury mb-4">Přístup odepřen</h1>
            <p className="text-muted-foreground">Pro přístup k administraci se musíte přihlásit.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-24 px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl font-serif font-bold text-luxury mb-6">
              Administrace
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Správa produktů je nyní přes Shopify
            </p>
            <div className="bg-card rounded-lg p-8 max-w-2xl mx-auto">
              <h2 className="text-2xl font-semibold text-luxury mb-4">
                Shopify Integrace
              </h2>
              <p className="text-muted-foreground mb-6">
                Všechny produkty jsou nyní spravovány přes Shopify. Pro správu produktů, 
                kolekcí a objednávek použijte Shopify admin panel.
              </p>
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">Produkty</h3>
                  <p className="text-sm text-muted-foreground">
                    Přidejte, upravte nebo odstraňte produkty v Shopify admin panelu.
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">Kolekce</h3>
                  <p className="text-sm text-muted-foreground">
                    Spravujte kolekce (náhrdelníky, náušnice, prsteny, náramky) v Shopify.
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">Objednávky</h3>
                  <p className="text-sm text-muted-foreground">
                    Sledujte a spravujte objednávky zákazníků v Shopify.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AdminPage;