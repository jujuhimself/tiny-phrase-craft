
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Building, 
  Package, 
  TrendingUp, 
  AlertTriangle,
  Search,
  Plus,
  ArrowRightLeft,
  BarChart3
} from "lucide-react";

interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  manager_name: string;
  is_active: boolean;
}

interface Product {
  id: string;
  name: string;
  category: string;
  sku: string;
  total_stock: number;
  branch_stocks: { [branchId: string]: number };
  min_stock_level: number;
  sell_price: number;
  buy_price: number;
}

interface StockTransfer {
  id: string;
  from_branch: string;
  to_branch: string;
  product_name: string;
  quantity: number;
  status: string;
  created_at: string;
}

const MultiBranchInventory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBranches();
      fetchProducts();
      fetchTransfers();
    }
  }, [user]);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      setBranches(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load branches",
        variant: "destructive",
      });
    }
  };

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const { data: productsData, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user?.id)
        .order('name');

      if (error) throw error;

      // Group products by branch and calculate totals
      const productsWithBranchStock = (productsData || []).reduce((acc: any[], product) => {
        const existingProduct = acc.find(p => p.sku === product.sku);
        
        if (existingProduct) {
          existingProduct.total_stock += product.stock;
          existingProduct.branch_stocks[product.branch_id || 'main'] = product.stock;
        } else {
          acc.push({
            id: product.id,
            name: product.name,
            category: product.category,
            sku: product.sku,
            total_stock: product.stock,
            branch_stocks: { [product.branch_id || 'main']: product.stock },
            min_stock_level: product.min_stock_level || 0,
            sell_price: product.sell_price || 0,
            buy_price: product.buy_price || 0
          });
        }
        
        return acc;
      }, []);

      setProducts(productsWithBranchStock);
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

  const fetchTransfers = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_adjustments')
        .select('*')
        .eq('user_id', user?.id)
        .eq('adjustment_type', 'transfer')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const transfersWithDetails = await Promise.all(
        (data || []).map(async (transfer) => {
          const { data: productData } = await supabase
            .from('products')
            .select('name')
            .eq('id', transfer.product_id)
            .single();

          const { data: fromBranch } = await supabase
            .from('branches')
            .select('name')
            .eq('id', transfer.branch_id)
            .single();

          const { data: toBranch } = await supabase
            .from('branches')
            .select('name')
            .eq('id', transfer.transfer_to_branch_id)
            .single();

          return {
            id: transfer.id,
            from_branch: fromBranch?.name || 'Unknown',
            to_branch: toBranch?.name || 'Unknown',
            product_name: productData?.name || 'Unknown Product',
            quantity: transfer.quantity,
            status: transfer.status,
            created_at: transfer.created_at
          };
        })
      );

      setTransfers(transfersWithDetails);
    } catch (error: any) {
      console.error('Error fetching transfers:', error);
    }
  };

  const createStockTransfer = async (fromBranchId: string, toBranchId: string, productId: string, quantity: number) => {
    try {
      const { error } = await supabase
        .from('stock_adjustments')
        .insert({
          user_id: user?.id,
          branch_id: fromBranchId,
          transfer_to_branch_id: toBranchId,
          product_id: productId,
          quantity: -quantity,
          adjustment_type: 'transfer',
          reason: `Transfer to ${toBranchId}`,
          created_by: user?.id,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Transfer Initiated",
        description: "Stock transfer has been created successfully",
      });

      fetchTransfers();
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create stock transfer",
        variant: "destructive",
      });
    }
  };

  const getBranchName = (branchId: string) => {
    if (branchId === 'main') return 'Main Branch';
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || 'Unknown Branch';
  };

  const getStockStatus = (product: Product) => {
    if (product.total_stock <= 0) {
      return { variant: 'destructive' as const, label: 'Out of Stock' };
    } else if (product.total_stock <= product.min_stock_level) {
      return { variant: 'secondary' as const, label: 'Low Stock' };
    } else {
      return { variant: 'default' as const, label: 'In Stock' };
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedBranch === "all") return matchesSearch;
    
    return matchesSearch && product.branch_stocks[selectedBranch] > 0;
  });

  const getTotalInventoryValue = () => {
    return products.reduce((total, product) => 
      total + (product.total_stock * product.sell_price), 0
    );
  };

  const getLowStockProducts = () => {
    return products.filter(product => product.total_stock <= product.min_stock_level);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Multi-Branch Inventory</h1>
          <p className="text-gray-600 text-lg">Manage inventory across all your branches</p>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Branches</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{branches.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{getLowStockProducts().length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">TZS {getTotalInventoryValue().toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="inventory">
          <TabsList className="mb-6">
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="transfers">Stock Transfers</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory">
            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      <SelectItem value="main">Main Branch</SelectItem>
                      {branches.map(branch => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Products Table */}
            <Card>
              <CardHeader>
                <CardTitle>Product Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Total Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Branch Distribution</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => {
                      const status = getStockStatus(product);
                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="font-medium">{product.name}</div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                          <TableCell>{product.category}</TableCell>
                          <TableCell>
                            <div className="font-medium">{product.total_stock}</div>
                            <div className="text-sm text-gray-500">Min: {product.min_stock_level}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {Object.entries(product.branch_stocks).map(([branchId, stock]) => (
                                <div key={branchId} className="flex justify-between text-sm">
                                  <span>{getBranchName(branchId)}</span>
                                  <span className="font-medium">{stock}</span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            TZS {(product.total_stock * product.sell_price).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              <ArrowRightLeft className="h-4 w-4 mr-2" />
                              Transfer
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transfers">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Stock Transfers</CardTitle>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Transfer
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>From Branch</TableHead>
                      <TableHead>To Branch</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.map((transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell>
                          {new Date(transfer.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">{transfer.product_name}</TableCell>
                        <TableCell>{transfer.from_branch}</TableCell>
                        <TableCell>{transfer.to_branch}</TableCell>
                        <TableCell>{transfer.quantity}</TableCell>
                        <TableCell>
                          <Badge variant={transfer.status === 'completed' ? 'default' : 'secondary'}>
                            {transfer.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Branch Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {branches.map(branch => (
                      <div key={branch.id} className="flex justify-between items-center p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{branch.name}</h4>
                          <p className="text-sm text-gray-600">{branch.address}</p>
                          <p className="text-sm text-gray-500">Manager: {branch.manager_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            {Object.values(products.reduce((acc, product) => {
                              const branchStock = product.branch_stocks[branch.id] || 0;
                              return acc + branchStock;
                            }, 0))}
                          </p>
                          <p className="text-sm text-gray-500">Total Items</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Low Stock by Branch</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getLowStockProducts().slice(0, 10).map(product => (
                      <div key={product.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-600">{product.sku}</p>
                        </div>
                        <Badge variant="destructive">
                          {product.total_stock} left
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MultiBranchInventory;
