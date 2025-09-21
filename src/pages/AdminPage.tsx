import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, Upload, X } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

interface Product {
  id: string;
  title: string;
  description: string;
  price: string;
  category: string;
  images: string[];
  created_at?: string;
  updated_at?: string;
}

const AdminPage = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    images: [] as string[]
  });

  const categories = ['náhrdelníky', 'náušnice', 'prsteny', 'náramky'];

  useEffect(() => {
    console.log('AdminPage: Auth loading:', loading, 'User:', !!user, 'Profile:', profile);
    
    if (!loading) {
      if (!user) {
        console.log('AdminPage: No user, redirecting to home');
        setIsLoading(false);
        navigate('/');
        return;
      }
      
      if (!profile) {
        console.log('AdminPage: No profile found');
        setIsLoading(false);
        toast({
          title: "Chyba profilu",
          description: "Nepodařilo se načíst profil uživatele.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }
      
      if (profile.role !== 'admin') {
        console.log('AdminPage: User is not admin, role:', profile.role);
        setIsLoading(false);
        toast({
          title: "Přístup odepřen",
          description: "Nemáte oprávnění k přístupu do administrativní sekce.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }
      
      console.log('AdminPage: User is admin, fetching products');
      fetchProducts();
    }
  }, [user, profile, loading, navigate, toast]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst produkty",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setUploading(true);
    const newImages: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `product-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);

        newImages.push(data.publicUrl);
      }

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newImages]
      }));

      toast({
        title: "Úspěch",
        description: "Obrázky byly úspěšně nahrány",
      });
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se nahrát obrázky",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast({
        title: "Chyba",
        description: "Název je povinný",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.price.trim() || isNaN(Number(formData.price.replace(/[^\d]/g, '')))) {
      toast({
        title: "Chyba",
        description: "Cena musí být číslo",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.category) {
      toast({
        title: "Chyba",
        description: "Kategorie je povinná",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const productData = {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        category: formData.category,
        images: formData.images
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        
        toast({
          title: "Úspěch",
          description: "Produkt byl úspěšně aktualizován",
        });
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) throw error;
        
        toast({
          title: "Úspěch",
          description: "Produkt byl úspěšně vytvořen",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit produkt",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      title: product.title,
      description: product.description,
      price: product.price,
      category: product.category,
      images: product.images
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Opravdu chcete smazat tento produkt?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Úspěch",
        description: "Produkt byl úspěšně smazán",
      });
      
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat produkt",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price: '',
      category: '',
      images: []
    });
    setEditingProduct(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-20 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Načítá se...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-20 px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-serif font-bold text-luxury mb-2">
                Administrativa
              </h1>
              <p className="text-muted-foreground">Správa produktů</p>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Přidat produkt
                </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? 'Upravit produkt' : 'Přidat nový produkt'}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Název *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Název produktu"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Popis</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Popis produktu"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="price">Cena *</Label>
                    <Input
                      id="price"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="2 890 Kč"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Kategorie *</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte kategorii" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Obrázky</Label>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {formData.images.map((image, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={image}
                              alt={`Product ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <button
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploading}
                          className="flex-1"
                        />
                        {uploading && (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSubmit} className="flex-1">
                      {editingProduct ? 'Aktualizovat' : 'Vytvořit'}
                    </Button>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Zrušit
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Produkty ({products.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Název</TableHead>
                      <TableHead>Kategorie</TableHead>
                      <TableHead>Cena</TableHead>
                      <TableHead>Obrázky</TableHead>
                      <TableHead>Akce</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.title}</TableCell>
                        <TableCell className="capitalize">{product.category}</TableCell>
                        <TableCell>{product.price}</TableCell>
                        <TableCell>{product.images.length} ks</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(product)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {products.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Žádné produkty nenalezeny</p>
                    <Button onClick={openAddDialog} className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Přidat první produkt
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default AdminPage;