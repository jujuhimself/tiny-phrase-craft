
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, 
  Bell, 
  Shield, 
  Building, 
  Plus,
  Trash2,
  Save
} from "lucide-react";

interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
}

interface UserSettings {
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    marketing: boolean;
  };
  privacy: {
    profile_visibility: "public" | "business_only" | "private";
    data_sharing: boolean;
    analytics_tracking: boolean;
  };
  business_settings?: {
    auto_reorder: boolean;
    low_stock_threshold: number;
    default_markup_percentage: number;
    tax_rate: number;
  };
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

  const [userSettings, setUserSettings] = useState<UserSettings>({
    notifications: {
      email: true,
      sms: false,
      push: true,
      marketing: false,
    },
    privacy: {
      profile_visibility: "business_only",
      data_sharing: false,
      analytics_tracking: true,
    },
  });

  const [branches, setBranches] = useState<Branch[]>([
    { id: "1", name: "Main Branch", code: "MB001", address: "Headquarters" }
  ]);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;

      try {
        // Fetch profile data
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

        // Fetch user settings
        const { data: settingsData, error: settingsError } = await supabase
          .from("user_settings")
          .select("notifications, privacy, business_settings")
          .eq("user_id", user.id)
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') {
          throw settingsError;
        }

        if (settingsData) {
          setUserSettings({
            notifications: typeof settingsData.notifications === 'object' 
              ? settingsData.notifications as any 
              : userSettings.notifications,
            privacy: typeof settingsData.privacy === 'object' 
              ? settingsData.privacy as any 
              : userSettings.privacy,
            business_settings: settingsData.business_settings as any,
          });
        }

        // Fetch branches
        const { data: branchesData, error: branchesError } = await supabase
          .from("branches")
          .select("id, name, code, address")
          .eq("user_id", user.id);

        if (branchesError) throw branchesError;

        if (branchesData && branchesData.length > 0) {
          setBranches(branchesData);
        }

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

  const handleSaveSettings = async () => {
    try {
      const { error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user?.id,
          notifications: userSettings.notifications,
          privacy: userSettings.privacy,
          business_settings: userSettings.business_settings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Settings Updated",
        description: "Your settings have been updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating settings:", error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    }
  };

  const addBranch = () => {
    setBranches([
      ...branches,
      { id: Date.now().toString(), name: "New Branch", code: "NB001", address: "Address" },
    ]);
  };

  const removeBranch = (index: number) => {
    const newBranches = [...branches];
    newBranches.splice(index, 1);
    setBranches(newBranches);
  };

  const updateBranch = (index: number, field: string, value: string) => {
    const newBranches = [...branches];
    newBranches[index] = { ...newBranches[index], [field]: value };
    setBranches(newBranches);
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
                    checked={userSettings.notifications.email}
                    onCheckedChange={(checked) => 
                      setUserSettings({
                        ...userSettings,
                        notifications: { ...userSettings.notifications, email: checked }
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="push_enabled">Push Notifications</Label>
                  <Switch
                    id="push_enabled"
                    checked={userSettings.notifications.push}
                    onCheckedChange={(checked) => 
                      setUserSettings({
                        ...userSettings,
                        notifications: { ...userSettings.notifications, push: checked }
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="sms_enabled">SMS Notifications</Label>
                  <Switch
                    id="sms_enabled"
                    checked={userSettings.notifications.sms}
                    onCheckedChange={(checked) => 
                      setUserSettings({
                        ...userSettings,
                        notifications: { ...userSettings.notifications, sms: checked }
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="marketing_enabled">Marketing Notifications</Label>
                  <Switch
                    id="marketing_enabled"
                    checked={userSettings.notifications.marketing}
                    onCheckedChange={(checked) => 
                      setUserSettings({
                        ...userSettings,
                        notifications: { ...userSettings.notifications, marketing: checked }
                      })
                    }
                  />
                </div>
                <Button onClick={handleSaveSettings}>
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
                    value={userSettings.privacy.profile_visibility}
                    onValueChange={(value) => 
                      setUserSettings({
                        ...userSettings,
                        privacy: { ...userSettings.privacy, profile_visibility: value as any }
                      })
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="business_only">Business Only</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="data_sharing">Allow Data Sharing</Label>
                  <Switch
                    id="data_sharing"
                    checked={userSettings.privacy.data_sharing}
                    onCheckedChange={(checked) => 
                      setUserSettings({
                        ...userSettings,
                        privacy: { ...userSettings.privacy, data_sharing: checked }
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="analytics_tracking">Analytics Tracking</Label>
                  <Switch
                    id="analytics_tracking"
                    checked={userSettings.privacy.analytics_tracking}
                    onCheckedChange={(checked) => 
                      setUserSettings({
                        ...userSettings,
                        privacy: { ...userSettings.privacy, analytics_tracking: checked }
                      })
                    }
                  />
                </div>
                <Button onClick={handleSaveSettings}>
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
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Branches</h4>
                  <div className="space-y-3">
                    {branches.map((branch, index) => (
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

                <Button onClick={handleSaveSettings}>
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
