import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, 
  Bell, 
  Shield, 
  Building, 
  CreditCard, 
  Plus,
  Edit,
  Trash2,
  Save,
  X
} from "lucide-react";

interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
}

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<{
    name: string;
    email: string;
    phone: string;
    address: string;
  }>({ name: "", email: "", phone: "", address: "" });

  const [notifications, setNotifications] = useState<{
    email_enabled: boolean;
    push_enabled: boolean;
    sms_enabled: boolean;
  }>({ email_enabled: false, push_enabled: false, sms_enabled: false });

  const [privacy, setPrivacy] = useState<{
    profile_visibility: "public" | "private";
    data_sharing: boolean;
  }>({ profile_visibility: "public", data_sharing: false });

  const [business, setBusiness] = useState<{
    business_name: string;
    industry: string;
    tax_id: string;
    branches: Branch[];
  }>({ business_name: "", industry: "", tax_id: "", branches: [{ id: "1", name: "Main Branch", code: "MB001", address: "Headquarters" }] });

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;

      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("name, email, phone, address")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;

        setProfile({
          name: profileData?.name || "",
          email: profileData?.email || "",
          phone: profileData?.phone || "",
          address: profileData?.address || "",
        });

        const { data: notificationData, error: notificationError } = await supabase
          .from("notification_settings")
          .select("email_enabled, push_enabled, sms_enabled")
          .eq("user_id", user.id)
          .single();

        if (notificationError) throw notificationError;

        setNotifications({
          email_enabled: notificationData?.email_enabled || false,
          push_enabled: notificationData?.push_enabled || false,
          sms_enabled: notificationData?.sms_enabled || false,
        });

        const { data: privacyData, error: privacyError } = await supabase
          .from("privacy_settings")
          .select("profile_visibility, data_sharing")
          .eq("user_id", user.id)
          .single();

        if (privacyError) throw privacyError;

        setPrivacy({
          profile_visibility: privacyData?.profile_visibility || "public",
          data_sharing: privacyData?.data_sharing || false,
        });

        const { data: businessData, error: businessError } = await supabase
          .from("business_settings")
          .select("business_name, industry, tax_id, branches")
          .eq("user_id", user.id)
          .single();

        if (businessError) throw businessError;

        setBusiness({
          business_name: businessData?.business_name || "",
          industry: businessData?.industry || "",
          tax_id: businessData?.tax_id || "",
          branches: businessData?.branches || [{ id: "1", name: "Main Branch", code: "MB001", address: "Headquarters" }],
        });
      } catch (error: any) {
        console.error("Error fetching settings:", error);
        toast({
          title: "Error",
          description: "Failed to load settings",
          variant: "destructive",
        });
      }
    };

    fetchSettings();
  }, [user, toast]);

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          address: profile.address,
        })
        .eq("id", user?.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const handleSaveNotifications = async () => {
    try {
      const { error } = await supabase
        .from("notification_settings")
        .update({
          email_enabled: notifications.email_enabled,
          push_enabled: notifications.push_enabled,
          sms_enabled: notifications.sms_enabled,
        })
        .eq("user_id", user?.id);

      if (error) throw error;

      toast({
        title: "Notifications Updated",
        description: "Your notification settings have been updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating notifications:", error);
      toast({
        title: "Error",
        description: "Failed to update notification settings",
        variant: "destructive",
      });
    }
  };

  const handleSavePrivacy = async () => {
    try {
      const { error } = await supabase
        .from("privacy_settings")
        .update({
          profile_visibility: privacy.profile_visibility,
          data_sharing: privacy.data_sharing,
        })
        .eq("user_id", user?.id);

      if (error) throw error;

      toast({
        title: "Privacy Updated",
        description: "Your privacy settings have been updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating privacy:", error);
      toast({
        title: "Error",
        description: "Failed to update privacy settings",
        variant: "destructive",
      });
    }
  };

  const handleSaveBusiness = async () => {
    try {
      const { error } = await supabase
        .from("business_settings")
        .update({
          business_name: business.business_name,
          industry: business.industry,
          tax_id: business.tax_id,
          branches: business.branches,
        })
        .eq("user_id", user?.id);

      if (error) throw error;

      toast({
        title: "Business Updated",
        description: "Your business settings have been updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating business:", error);
      toast({
        title: "Error",
        description: "Failed to update business settings",
        variant: "destructive",
      });
    }
  };

  const addBranch = () => {
    setBusiness({
      ...business,
      branches: [
        ...business.branches,
        { id: Date.now().toString(), name: "New Branch", code: "NB001", address: "Address" },
      ],
    });
  };

  const removeBranch = (index: number) => {
    const newBranches = [...business.branches];
    newBranches.splice(index, 1);
    setBusiness({ ...business, branches: newBranches });
  };

  const updateBranch = (index: number, field: string, value: string) => {
    const newBranches = [...business.branches];
    newBranches[index] = { ...newBranches[index], [field]: value };
    setBusiness({ ...business, branches: newBranches });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your profile, notifications, privacy, and business settings</p>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="mb-6">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="privacy">
              <Shield className="h-4 w-4 mr-2" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="business">
              <Building className="h-4 w-4 mr-2" />
              Business
            </TabsTrigger>
            {/* <TabsTrigger value="billing">
              <CreditCard className="h-4 w-4 mr-2" />
              Billing
            </TabsTrigger> */}
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    type="text"
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    type="email"
                    id="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    type="tel"
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  />
                </div>
                <Button onClick={handleSaveProfile}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Profile
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email_enabled">Email Notifications</Label>
                  <Switch
                    id="email_enabled"
                    checked={notifications.email_enabled}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, email_enabled: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="push_enabled">Push Notifications</Label>
                  <Switch
                    id="push_enabled"
                    checked={notifications.push_enabled}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, push_enabled: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="sms_enabled">SMS Notifications</Label>
                  <Switch
                    id="sms_enabled"
                    checked={notifications.sms_enabled}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, sms_enabled: checked })}
                  />
                </div>
                <Button onClick={handleSaveNotifications}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Notifications
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="profile_visibility">Profile Visibility</Label>
                  <Select
                    value={privacy.profile_visibility}
                    onValueChange={(value) => setPrivacy({ ...privacy, profile_visibility: value as "public" | "private" })}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="data_sharing">Allow Data Sharing</Label>
                  <Switch
                    id="data_sharing"
                    checked={privacy.data_sharing}
                    onCheckedChange={(checked) => setPrivacy({ ...privacy, data_sharing: checked })}
                  />
                </div>
                <Button onClick={handleSavePrivacy}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Privacy
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="business">
            <Card>
              <CardHeader>
                <CardTitle>Business Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="business_name">Business Name</Label>
                  <Input
                    type="text"
                    id="business_name"
                    value={business.business_name}
                    onChange={(e) => setBusiness({ ...business, business_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    type="text"
                    id="industry"
                    value={business.industry}
                    onChange={(e) => setBusiness({ ...business, industry: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="tax_id">Tax ID</Label>
                  <Input
                    type="text"
                    id="tax_id"
                    value={business.tax_id}
                    onChange={(e) => setBusiness({ ...business, tax_id: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Branches</h4>
                  <div className="space-y-3">
                    {business.branches.map((branch, index) => (
                      <div key={branch.id} className="flex items-center gap-4">
                        <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                          <div>
                            <Label htmlFor={`branch_name_${index}`}>Name</Label>
                            <Input
                              type="text"
                              id={`branch_name_${index}`}
                              value={branch.name}
                              onChange={(e) => updateBranch(index, "name", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`branch_code_${index}`}>Code</Label>
                            <Input
                              type="text"
                              id={`branch_code_${index}`}
                              value={branch.code}
                              onChange={(e) => updateBranch(index, "code", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`branch_address_${index}`}>Address</Label>
                            <Input
                              type="text"
                              id={`branch_address_${index}`}
                              value={branch.address}
                              onChange={(e) => updateBranch(index, "address", e.target.value)}
                            />
                          </div>
                        </div>
                        <Button variant="outline" size="icon" onClick={() => removeBranch(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button variant="secondary" onClick={addBranch}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Branch
                  </Button>
                </div>

                <Button onClick={handleSaveBusiness}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Business
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
