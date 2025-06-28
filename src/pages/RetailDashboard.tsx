
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  Users, 
  DollarSign,
  BarChart3,
  Settings,
  Plus
} from "lucide-react";
import { Link } from "react-router-dom";

const RetailDashboard = () => {
  const { user } = useAuth();

  const stats = [
    {
      title: "Today's Sales",
      value: "TZS 45,000",
      change: "+12%",
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      title: "Orders",
      value: "23",
      change: "+5%",
      icon: ShoppingCart,
      color: "text-blue-600"
    },
    {
      title: "Products",
      value: "156",
      change: "-2%",
      icon: Package,
      color: "text-purple-600"
    },
    {
      title: "Customers",
      value: "89",
      change: "+8%",
      icon: Users,
      color: "text-orange-600"
    }
  ];

  const quickActions = [
    {
      title: "Add Product",
      description: "Add new products to inventory",
      icon: Plus,
      link: "/products",
      color: "bg-blue-500"
    },
    {
      title: "Process Order",
      description: "Handle customer orders",
      icon: ShoppingCart,
      link: "/orders",
      color: "bg-green-500"
    },
    {
      title: "View Reports",
      description: "Check sales and inventory reports",
      icon: BarChart3,
      link: "/reports",
      color: "bg-purple-500"
    },
    {
      title: "Settings",
      description: "Configure pharmacy settings",
      icon: Settings,
      link: "/settings",
      color: "bg-orange-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.email?.split('@')[0]}!
          </h1>
          <p className="text-gray-600 text-lg">Here's what's happening with your pharmacy today</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className={stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}>
                      {stat.change}
                    </span>{' '}
                    from yesterday
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Link key={index} to={action.link}>
                    <div className="p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer">
                      <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-3`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-semibold mb-1">{action.title}</h3>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((order) => (
                  <div key={order} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Order #{order}001</p>
                      <p className="text-sm text-gray-600">Customer Name</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">TZS 15,000</p>
                      <p className="text-sm text-gray-600">Pending</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link to="/orders">View All Orders</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Low Stock Alert</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium">Product {item}</p>
                      <p className="text-sm text-gray-600">SKU: P00{item}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-red-600">5 left</p>
                      <p className="text-sm text-gray-600">Min: 10</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link to="/products">Manage Inventory</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RetailDashboard;
