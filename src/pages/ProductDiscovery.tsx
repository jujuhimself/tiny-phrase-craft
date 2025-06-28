
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, 
  MapPin, 
  Star, 
  ShoppingCart, 
  Plus,
  Filter,
  Clock,
  Phone
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  category: string;
  sell_price: number;
  stock: number;
  description: string;
  pharmacy_name: string;
  pharmacy_id: string;
  pharmacy_phone?: string;
  pharmacy_address?: string;
  pharmacy_rating?: number;
  distance?: string;
}

interface Pharmacy {
  id: string;
  name: string;
  address: string;
  phone: string;
  rating: number;
  distance: string;
  is_open: boolean;
  operating_hours: string;
}

const ProductDiscovery = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPharmacy, setSelectedPharmacy] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);

  const categories = ["all", "Medicines", "Supplements", "Medical Supplies", "Personal Care"];

  useEffect(() => {
    fetchProducts();
    fetchPharmacies();
    loadCart();
  }, []);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          profiles!products_user_id_fkey(
            name,
            pharmacy_name,
            phone,
            address,
            pharmacy_rating
          )
        `)
        .or('is_retail_product.eq.true,is_public_product.eq.true')
        .eq('status', 'in-stock')
        .gt('stock', 0)
        .order('name');

      if (error) throw error;

      const transformedProducts = (data || []).map((product: any) => ({
        ...product,
        pharmacy_name: product.profiles?.pharmacy_name || product.profiles?.name || 'Unknown Pharmacy',
        pharmacy_phone: product.profiles?.phone,
        pharmacy_address: product.profiles?.address,
        pharmacy_rating: product.profiles?.pharmacy_rating || 0,
        distance: Math.floor(Math.random() * 10) + 1 + 'km' // Mock distance
      }));

      setProducts(transformedProducts);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPharmacies = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'retail')
        .eq('is_approved', true);

      if (error) throw error;

      const transformedPharmacies = (data || []).map((pharmacy: any) => ({
        id: pharmacy.id,
        name: pharmacy.pharmacy_name || pharmacy.business_name || pharmacy.name,
        address: pharmacy.address || 'Address not provided',
        phone: pharmacy.phone || 'Phone not provided',
        rating: pharmacy.pharmacy_rating || 4.0,
        distance: Math.floor(Math.random() * 15) + 1 + 'km',
        is_open: Math.random() > 0.3,
        operating_hours: pharmacy.operating_hours || '8:00 AM - 8:00 PM'
      }));

      setPharmacies(transformedPharmacies);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load pharmacies",
        variant: "destructive",
      });
    }
  };

  const loadCart = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('items')
        .eq('user_id', user.id)
        .eq('status', 'cart')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      setCartItems(data?.items || []);
    } catch (error: any) {
      console.error('Error loading cart:', error);
    }
  };

  const addToCart = async (product: Product) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to log in to add items to cart",
        variant: "destructive",
      });
      return;
    }

    const existingItem = cartItems.find(item => item.id === product.id);
    let newCartItems;

    if (existingItem) {
      newCartItems = cartItems.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      newCartItems = [...cartItems, { ...product, quantity: 1 }];
    }

    try {
      const { error } = await supabase
        .from('orders')
        .upsert({
          user_id: user.id,
          status: 'cart',
          items: newCartItems,
          total_amount: newCartItems.reduce((sum, item) => sum + item.sell_price * item.quantity, 0),
          order_number: `CART-${user.id}-${Date.now()}`
        });

      if (error) throw error;

      setCartItems(newCartItems);
      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.pharmacy_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    const matchesPharmacy = selectedPharmacy === "all" || product.pharmacy_id === selectedPharmacy;
    
    return matchesSearch && matchesCategory && matchesPharmacy;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Discover Products</h1>
          <p className="text-gray-600 text-lg">Find medicines and health products from nearby pharmacies</p>
        </div>

        <Tabs defaultValue="products">
          <TabsList className="mb-6">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="pharmacies">Pharmacies</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            {/* Search and Filters */}
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === "all" ? "All Categories" : category}
                  </option>
                ))}
              </select>

              <select
                value={selectedPharmacy}
                onChange={(e) => setSelectedPharmacy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Pharmacies</option>
                {pharmacies.map(pharmacy => (
                  <option key={pharmacy.id} value={pharmacy.id}>
                    {pharmacy.name}
                  </option>
                ))}
              </select>

              <div className="text-sm text-gray-600 flex items-center">
                {filteredProducts.length} products found
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
                        <Badge variant="outline" className="mb-2">{product.category}</Badge>
                        <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-blue-600">{product.pharmacy_name}</span>
                          <span className="text-xs text-gray-500">{product.distance}</span>
                        </div>

                        {product.pharmacy_rating && (
                          <div className="flex items-center gap-1 mb-2">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm">{product.pharmacy_rating}</span>
                          </div>
                        )}
                      </div>
                      
                      <Badge variant={product.stock > 10 ? "default" : "secondary"}>
                        Stock: {product.stock}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-blue-600">
                        TZS {product.sell_price.toLocaleString()}
                      </span>
                      <Button
                        onClick={() => addToCart(product)}
                        disabled={product.stock === 0}
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Cart
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pharmacies">
            <div className="grid md:grid-cols-2 gap-6">
              {pharmacies.map((pharmacy) => (
                <Card key={pharmacy.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-xl mb-2">{pharmacy.name}</h3>
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{pharmacy.address}</span>
                          <span className="text-xs text-gray-500">{pharmacy.distance}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{pharmacy.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{pharmacy.operating_hours}</span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge variant={pharmacy.is_open ? "default" : "secondary"} className="mb-2">
                          {pharmacy.is_open ? "Open" : "Closed"}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{pharmacy.rating}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1"
                        onClick={() => setSelectedPharmacy(pharmacy.id)}
                      >
                        View Products
                      </Button>
                      <Button variant="outline">
                        Get Directions
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Cart Summary */}
        {cartItems.length > 0 && (
          <Card className="fixed bottom-4 right-4 w-80 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Cart ({cartItems.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold mb-2">
                Total: TZS {cartItems.reduce((sum, item) => sum + item.sell_price * item.quantity, 0).toLocaleString()}
              </div>
              <Button className="w-full" asChild>
                <a href="/cart">View Cart</a>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProductDiscovery;
