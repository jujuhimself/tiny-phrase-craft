
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Package, 
  Clock, 
  CheckCircle, 
  Truck, 
  MapPin,
  Phone,
  Search,
  Eye
} from "lucide-react";

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  items: any[];
  pharmacy_name?: string;
  pharmacy_phone?: string;
  estimated_delivery?: string;
  tracking_updates?: any[];
}

const OrderTracking = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user?.id)
        .neq('status', 'cart')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ordersWithDetails = await Promise.all(
        (data || []).map(async (order) => {
          // Get pharmacy details for each order
          let pharmacyName = 'Unknown Pharmacy';
          let pharmacyPhone = '';

          if (order.items && order.items.length > 0) {
            const firstItem = order.items[0];
            if (firstItem.pharmacy_id) {
              const { data: pharmacyData } = await supabase
                .from('profiles')
                .select('pharmacy_name, business_name, name, phone')
                .eq('id', firstItem.pharmacy_id)
                .single();

              if (pharmacyData) {
                pharmacyName = pharmacyData.pharmacy_name || pharmacyData.business_name || pharmacyData.name;
                pharmacyPhone = pharmacyData.phone || '';
              }
            }
          }

          return {
            ...order,
            pharmacy_name: pharmacyName,
            pharmacy_phone: pharmacyPhone,
            estimated_delivery: getEstimatedDelivery(order.created_at, order.status),
            tracking_updates: getTrackingUpdates(order)
          };
        })
      );

      setOrders(ordersWithDetails);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getEstimatedDelivery = (createdAt: string, status: string) => {
    const orderDate = new Date(createdAt);
    const deliveryDate = new Date(orderDate);
    
    switch (status) {
      case 'pending':
        deliveryDate.setDate(orderDate.getDate() + 2);
        break;
      case 'confirmed':
        deliveryDate.setDate(orderDate.getDate() + 1);
        break;
      case 'shipped':
        deliveryDate.setHours(orderDate.getHours() + 6);
        break;
      default:
        deliveryDate.setDate(orderDate.getDate() + 1);
    }
    
    return deliveryDate.toLocaleDateString() + ' ' + deliveryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTrackingUpdates = (order: any) => {
    const updates = [
      {
        status: 'Order Placed',
        timestamp: order.created_at,
        description: 'Your order has been placed successfully',
        completed: true
      }
    ];

    if (['confirmed', 'shipped', 'delivered'].includes(order.status)) {
      updates.push({
        status: 'Order Confirmed',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        description: 'Pharmacy has confirmed your order',
        completed: true
      });
    }

    if (['shipped', 'delivered'].includes(order.status)) {
      updates.push({
        status: 'Out for Delivery',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        description: 'Your order is on the way',
        completed: true
      });
    }

    if (order.status === 'delivered') {
      updates.push({
        status: 'Delivered',
        timestamp: new Date().toISOString(),
        description: 'Order delivered successfully',
        completed: true
      });
    } else {
      updates.push({
        status: 'Estimated Delivery',
        timestamp: getEstimatedDelivery(order.created_at, order.status),
        description: 'Expected delivery time',
        completed: false
      });
    }

    return updates;
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'confirmed':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'shipped':
        return <Truck className="h-5 w-5 text-purple-500" />;
      case 'delivered':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'cancelled':
        return <Package className="h-5 w-5 text-red-500" />;
      default:
        return <Package className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'secondary';
      case 'confirmed':
        return 'default';
      case 'shipped':
        return 'default';
      case 'delivered':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const filteredOrders = orders.filter(order =>
    order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.pharmacy_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Order Tracking</h1>
          <p className="text-gray-600 text-lg">Track your orders and delivery status</p>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by order number, pharmacy, or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Orders List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Your Orders ({filteredOrders.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredOrders.map((order) => (
                    <Card key={order.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusIcon(order.status)}
                              <span className="font-semibold">{order.order_number}</span>
                              <Badge variant={getStatusColor(order.status) as any}>
                                {order.status}
                              </Badge>
                            </div>
                            
                            <div className="text-sm text-gray-600 mb-2">
                              <div className="flex items-center gap-2 mb-1">
                                <MapPin className="h-4 w-4" />
                                <span>{order.pharmacy_name}</span>
                              </div>
                              {order.pharmacy_phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4" />
                                  <span>{order.pharmacy_phone}</span>
                                </div>
                              )}
                            </div>

                            <div className="text-sm text-gray-500">
                              <p>Items: {order.items?.length || 0}</p>
                              <p>Ordered: {new Date(order.created_at).toLocaleDateString()}</p>
                              {order.estimated_delivery && (
                                <p>Est. Delivery: {order.estimated_delivery}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-2xl font-bold text-blue-600 mb-2">
                              TZS {order.total_amount.toLocaleString()}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {filteredOrders.length === 0 && (
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
                      <p className="text-gray-600">
                        {searchTerm ? "Try adjusting your search terms." : "You haven't placed any orders yet."}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Details */}
          <div>
            {selectedOrder ? (
              <Card className="sticky top-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(selectedOrder.status)}
                    Order Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Order #{selectedOrder.order_number}</h4>
                    <Badge variant={getStatusColor(selectedOrder.status) as any}>
                      {selectedOrder.status}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Items ({selectedOrder.items?.length})</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedOrder.items?.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.name} x{item.quantity}</span>
                          <span>TZS {(item.sell_price * item.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>TZS {selectedOrder.total_amount.toLocaleString()}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Tracking Updates</h4>
                    <div className="space-y-3">
                      {selectedOrder.tracking_updates?.map((update: any, index: number) => (
                        <div key={index} className={`flex items-start gap-3 ${update.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                          <div className={`w-3 h-3 rounded-full mt-1 ${update.completed ? 'bg-blue-500' : 'bg-gray-300'}`} />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{update.status}</p>
                            <p className="text-xs text-gray-500">{update.description}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(update.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="sticky top-8">
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Select an order to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
