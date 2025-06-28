import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, ShoppingCart, Receipt, Printer, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProducts } from "@/hooks/useInventory";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  sku: string;
}

interface SaleReceipt {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  timestamp: string;
}

const RetailAdvancedPOS = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: products = [] } = useProducts();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<SaleReceipt | null>(null);
  const [recentSales, setRecentSales] = useState<any[]>([]);

  useEffect(() => {
    fetchRecentSales();
  }, []);

  const fetchRecentSales = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('pos_sales')
        .select(`
          *,
          pos_sale_items (
            *
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentSales(data || []);
    } catch (error: any) {
      console.error('Error fetching recent sales:', error);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: any) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        setCart(cart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        toast({
          title: "Insufficient Stock",
          description: `Only ${product.stock} units available`,
          variant: "destructive",
        });
      }
    } else {
      if (product.stock > 0) {
        setCart([...cart, {
          id: product.id,
          name: product.name,
          price: product.sell_price,
          quantity: 1,
          stock: product.stock,
          sku: product.sku
        }]);
      } else {
        toast({
          title: "Out of Stock",
          description: "This product is currently out of stock",
          variant: "destructive",
        });
      }
    }
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity === 0) {
      setCart(cart.filter(item => item.id !== id));
    } else {
      const item = cart.find(item => item.id === id);
      if (item && newQuantity <= item.stock) {
        setCart(cart.map(item =>
          item.id === id ? { ...item, quantity: newQuantity } : item
        ));
      }
    }
  };

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getTaxAmount = () => {
    return getSubtotal() * 0.18; // 18% VAT
  };

  const getTotalAmount = () => {
    return getSubtotal() + getTaxAmount();
  };

  const getChange = () => {
    return Math.max(0, amountPaid - getTotalAmount());
  };

  const processSale = async () => {
    if (!user || cart.length === 0) return;

    if (paymentMethod === 'cash' && amountPaid < getTotalAmount()) {
      toast({
        title: "Insufficient Payment",
        description: "Amount paid is less than total amount",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create POS sale
      const { data: saleData, error: saleError } = await supabase
        .from('pos_sales')
        .insert({
          user_id: user.id,
          total_amount: getTotalAmount(),
          payment_method: paymentMethod,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items and update inventory
      for (const item of cart) {
        await supabase
          .from('pos_sale_items')
          .insert({
            pos_sale_id: saleData.id,
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.price * item.quantity,
          });

        // Update product stock
        await supabase
          .from('products')
          .update({ 
            stock: item.stock - item.quantity 
          })
          .eq('id', item.id);

        // Log inventory movement
        await supabase
          .from('inventory_movements')
          .insert({
            user_id: user.id,
            product_id: item.id,
            movement_type: 'out',
            quantity: item.quantity,
            reason: `POS Sale - ${saleData.id}`,
            created_by: user.id
          });
      }

      // Generate receipt
      const receipt: SaleReceipt = {
        id: saleData.id,
        items: [...cart],
        subtotal: getSubtotal(),
        tax: getTaxAmount(),
        total: getTotalAmount(),
        paymentMethod,
        customerName: customerName || undefined,
        timestamp: new Date().toISOString()
      };

      setCurrentReceipt(receipt);
      setIsReceiptOpen(true);

      toast({
        title: "Sale Completed",
        description: `Sale processed successfully. Total: TZS ${getTotalAmount().toLocaleString()}`,
      });

      // Reset form
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setAmountPaid(0);
      setPaymentMethod("cash");
      setIsCheckoutOpen(false);
      fetchRecentSales();

    } catch (error: any) {
      console.error('Error processing sale:', error);
      toast({
        title: "Error",
        description: "Failed to process sale",
        variant: "destructive",
      });
    }
  };

  const printReceipt = () => {
    if (!currentReceipt) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${currentReceipt.id}</title>
          <style>
            body { font-family: monospace; width: 300px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; border-top: 1px dashed #000; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${user?.businessName || 'Retail Pharmacy'}</h2>
            <p>Receipt #${currentReceipt.id.substring(0, 8)}</p>
            <p>${new Date(currentReceipt.timestamp).toLocaleString()}</p>
            ${currentReceipt.customerName ? `<p>Customer: ${currentReceipt.customerName}</p>` : ''}
          </div>
          
          ${currentReceipt.items.map(item => `
            <div class="item">
              <span>${item.name} x${item.quantity}</span>
              <span>TZS ${(item.price * item.quantity).toLocaleString()}</span>
            </div>
          `).join('')}
          
          <div class="total">
            <div class="item">
              <span>Subtotal:</span>
              <span>TZS ${currentReceipt.subtotal.toLocaleString()}</span>
            </div>
            <div class="item">
              <span>Tax (18%):</span>
              <span>TZS ${currentReceipt.tax.toLocaleString()}</span>
            </div>
            <div class="item">
              <strong>Total:</strong>
              <strong>TZS ${currentReceipt.total.toLocaleString()}</strong>
            </div>
            <div class="item">
              <span>Payment:</span>
              <span>${currentReceipt.paymentMethod.toUpperCase()}</span>
            </div>
            ${paymentMethod === 'cash' && amountPaid > 0 ? `
              <div class="item">
                <span>Paid:</span>
                <span>TZS ${amountPaid.toLocaleString()}</span>
              </div>
              <div class="item">
                <span>Change:</span>
                <span>TZS ${getChange().toLocaleString()}</span>
              </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Please come again</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Retail POS System</h2>
          <p className="text-gray-600">Complete point of sale with inventory management</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-lg px-4 py-2">
            Cart: {cart.length} items
          </Badge>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            Total: TZS {cart.length > 0 ? getTotalAmount().toLocaleString() : '0'}
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
              <Input
                placeholder="Search products by name, SKU, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="border rounded-lg p-3 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{product.name}</h3>
                        <p className="text-xs text-gray-600">{product.sku}</p>
                        <p className="text-xs text-blue-600">{product.category}</p>
                      </div>
                      <Badge 
                        variant={product.stock > 10 ? "default" : product.stock > 0 ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        {product.stock}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm">TZS {product.sell_price.toLocaleString()}</span>
                      <Button
                        onClick={() => addToCart(product)}
                        disabled={product.stock === 0}
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cart and Checkout Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Shopping Cart
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Cart is empty</p>
              ) : (
                <div className="space-y-4">
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between items-center border-b pb-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-gray-600">{item.sku}</p>
                          <p className="text-xs font-medium">TZS {item.price.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="h-6 w-6 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="font-medium w-8 text-center text-sm">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.stock}
                            className="h-6 w-6 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-4 border-t space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>TZS {getSubtotal().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (18%):</span>
                      <span>TZS {getTaxAmount().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-base border-t pt-2">
                      <span>Total:</span>
                      <span>TZS {getTotalAmount().toLocaleString()}</span>
                    </div>
                  </div>

                  <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full">
                        <Receipt className="h-4 w-4 mr-2" />
                        Checkout
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Complete Sale</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Customer Name (Optional)</label>
                          <Input
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Enter customer name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Customer Phone (Optional)</label>
                          <Input
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="Enter phone number"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Payment Method</label>
                          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="card">Card</SelectItem>
                              <SelectItem value="mobile_money">Mobile Money</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {paymentMethod === 'cash' && (
                          <div>
                            <label className="block text-sm font-medium mb-1">Amount Paid</label>
                            <Input
                              type="number"
                              value={amountPaid}
                              onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                              placeholder="Enter amount paid"
                              min={getTotalAmount()}
                            />
                            {amountPaid > getTotalAmount() && (
                              <p className="text-sm text-green-600 mt-1">
                                Change: TZS {getChange().toLocaleString()}
                              </p>
                            )}
                          </div>
                        )}
                        <div className="border rounded-lg p-3 bg-gray-50 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Total:</span>
                            <span className="font-bold">TZS {getTotalAmount().toLocaleString()}</span>
                          </div>
                        </div>
                        <Button onClick={processSale} className="w-full">
                          Complete Sale
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Sales */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Recent Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {recentSales.slice(0, 5).map((sale) => (
                  <div key={sale.id} className="flex justify-between items-center text-sm border-b pb-1">
                    <div>
                      <p className="font-medium">TZS {sale.total_amount.toLocaleString()}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(sale.sale_date).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {sale.payment_method}
                    </Badge>
                  </div>
                ))}
                {recentSales.length === 0 && (
                  <p className="text-gray-500 text-center py-4 text-sm">No recent sales</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sale Receipt</DialogTitle>
          </DialogHeader>
          {currentReceipt && (
            <div className="space-y-4">
              <div className="text-center border-b pb-4">
                <h3 className="font-bold">{user?.businessName || 'Retail Pharmacy'}</h3>
                <p className="text-sm">Receipt #{currentReceipt.id.substring(0, 8)}</p>
                <p className="text-sm">{new Date(currentReceipt.timestamp).toLocaleString()}</p>
                {currentReceipt.customerName && (
                  <p className="text-sm">Customer: {currentReceipt.customerName}</p>
                )}
              </div>
              
              <div className="space-y-2">
                {currentReceipt.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.name} x{item.quantity}</span>
                    <span>TZS {(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>TZS {currentReceipt.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>TZS {currentReceipt.tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>TZS {currentReceipt.total.toLocaleString()}</span>
                </div>
              </div>
              
              <Button onClick={printReceipt} className="w-full">
                <Printer className="h-4 w-4 mr-2" />
                Print Receipt
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RetailAdvancedPOS;
