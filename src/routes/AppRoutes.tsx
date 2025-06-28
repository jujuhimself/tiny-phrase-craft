
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navigation } from "@/components/Navigation";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Index from "@/pages/Index";

// Dashboard pages
import IndividualDashboard from "@/pages/IndividualDashboard";
import WholesaleDashboard from "@/pages/WholesaleDashboard";
import LabDashboard from "@/pages/LabDashboard";
import PharmacyDashboard from "@/pages/PharmacyDashboard";
import AdminDashboard from "@/pages/AdminDashboard";

// Individual user pages
import ProductDiscovery from "@/pages/ProductDiscovery";
import OrderTracking from "@/pages/OrderTracking";
import BrowseProducts from "@/pages/BrowseProducts";
import MyOrders from "@/pages/MyOrders";
import Cart from "@/pages/Cart";
import Prescriptions from "@/pages/Prescriptions";
import Appointments from "@/pages/Appointments";
import HealthRecords from "@/pages/HealthRecords";
import Settings from "@/pages/Settings";

// Business pages
import MultiBranchInventory from "@/pages/MultiBranchInventory";
import Products from "@/pages/Products";
import Orders from "@/pages/Orders";
import Profile from "@/pages/Profile";

// Wholesale routes
import WholesaleInventory from "@/pages/WholesaleInventory";
import WholesaleBusinessTools from "@/pages/WholesaleBusinessTools";
import WholesalePOS from "@/pages/wholesale/WholesalePOS";
import WholesaleAdvancedPOS from "@/pages/wholesale/WholesaleAdvancedPOS";
import WholesaleCreditCRM from "@/pages/wholesale/WholesaleCreditCRM";
import WholesaleStaffManagement from "@/pages/wholesale/WholesaleStaffManagement";
import WholesaleInventoryAdjustments from "@/pages/wholesale/WholesaleInventoryAdjustments";
import WholesaleAuditTrail from "@/pages/wholesale/WholesaleAuditTrail";

// Retail routes
import RetailDashboard from "@/pages/RetailDashboard";
import RetailBusinessTools from "@/pages/retail/RetailBusinessTools";
import RetailAdvancedPOS from "@/pages/retail/RetailAdvancedPOS";
import RetailStaffManagement from "@/pages/retail/RetailStaffManagement";
import RetailInventoryManagement from "@/pages/retail/RetailInventoryManagement";
import RetailPurchaseOrders from "@/pages/retail/RetailPurchaseOrders";

const AppRoutes = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {user && <Navigation />}
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
        
        {/* Protected routes */}
        <Route path="/" element={user ? <Index /> : <Navigate to="/login" />} />
        
        {/* Dashboard routes */}
        <Route path="/dashboard/individual" element={user?.role === 'individual' ? <IndividualDashboard /> : <Navigate to="/" />} />
        <Route path="/dashboard/wholesale" element={user?.role === 'wholesale' ? <WholesaleDashboard /> : <Navigate to="/" />} />
        <Route path="/dashboard/lab" element={user?.role === 'lab' ? <LabDashboard /> : <Navigate to="/" />} />
        <Route path="/dashboard/pharmacy" element={user?.role === 'retail' ? <PharmacyDashboard /> : <Navigate to="/" />} />
        <Route path="/dashboard/admin" element={user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/" />} />

        {/* Individual user routes */}
        <Route path="/discover" element={user ? <ProductDiscovery /> : <Navigate to="/login" />} />
        <Route path="/track-orders" element={user ? <OrderTracking /> : <Navigate to="/login" />} />
        <Route path="/browse" element={user ? <BrowseProducts /> : <Navigate to="/login" />} />
        <Route path="/my-orders" element={user ? <MyOrders /> : <Navigate to="/login" />} />
        <Route path="/cart" element={user ? <Cart /> : <Navigate to="/login" />} />
        <Route path="/prescriptions" element={user ? <Prescriptions /> : <Navigate to="/login" />} />
        <Route path="/appointments" element={user ? <Appointments /> : <Navigate to="/login" />} />
        <Route path="/health-records" element={user ? <HealthRecords /> : <Navigate to="/login" />} />
        <Route path="/settings" element={user ? <Settings /> : <Navigate to="/login" />} />

        {/* Business routes */}
        <Route path="/multi-branch-inventory" element={user ? <MultiBranchInventory /> : <Navigate to="/login" />} />
        <Route path="/products" element={user ? <Products /> : <Navigate to="/login" />} />
        <Route path="/orders" element={user ? <Orders /> : <Navigate to="/login" />} />
        <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />

        {/* Wholesale Routes */}
        <Route path="/wholesale/dashboard" element={user?.role === 'wholesale' ? <WholesaleDashboard /> : <Navigate to="/" />} />
        <Route path="/wholesale/inventory" element={user?.role === 'wholesale' ? <WholesaleInventory /> : <Navigate to="/" />} />
        <Route path="/wholesale/business-tools" element={user?.role === 'wholesale' ? <WholesaleBusinessTools /> : <Navigate to="/" />}>
          <Route path="pos" element={<WholesalePOS />} />
          <Route path="advanced-pos" element={<WholesaleAdvancedPOS />} />
          <Route path="credit-crm" element={<WholesaleCreditCRM />} />
          <Route path="staff" element={<WholesaleStaffManagement />} />
          <Route path="adjustments" element={<WholesaleInventoryAdjustments />} />
          <Route path="audit" element={<WholesaleAuditTrail />} />
        </Route>
        
        {/* Retail Routes */}
        <Route path="/retail/dashboard" element={user?.role === 'retail' ? <RetailDashboard /> : <Navigate to="/" />} />
        <Route path="/business-tools-retail" element={user?.role === 'retail' ? <RetailBusinessTools /> : <Navigate to="/" />}>
          <Route path="pos" element={<RetailAdvancedPOS />} />
          <Route path="staff" element={<RetailStaffManagement />} />
          <Route path="inventory" element={<RetailInventoryManagement />} />
          <Route path="purchase-orders" element={<RetailPurchaseOrders />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
};

export default AppRoutes;
