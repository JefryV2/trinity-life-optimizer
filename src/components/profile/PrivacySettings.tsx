import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  Eye,
  Database,
  Download,
  Trash2,
  Lock,
  AlertTriangle,
  Save,
  FileText,
  UserX,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";

interface PrivacySettings {
  dataCollection: boolean;
  analyticsTracking: boolean;
  personalizedAds: boolean;
  shareWithPartners: boolean;
  publicProfile: boolean;
  showActivity: boolean;
}

export function PrivacySettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [settings, setSettings] = useState<PrivacySettings>({
    dataCollection: true,
    analyticsTracking: false,
    personalizedAds: false,
    shareWithPartners: false,
    publicProfile: false,
    showActivity: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: "Privacy settings updated",
        description: "Your privacy preferences have been saved",
      });
    } catch (error) {
      toast({
        title: "Error saving settings",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = (key: keyof PrivacySettings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const exportData = async () => {
    toast({
      title: "Data export requested",
      description:
        "Your data export will be ready within 24 hours and sent to your email",
    });
  };

  const deleteAccount = async () => {
    toast({
      title: "Account deletion requested",
      description: "Please contact support to complete account deletion",
      variant: "destructive",
    });
  };

  return (
    <div className="space-y-6">
      {/* Data Privacy */}
      <Card className="ios-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Privacy
          </CardTitle>
          <CardDescription>
            Control how your data is collected and used
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Essential Data Collection</Label>
              <div className="text-sm text-muted-foreground">
                Required for app functionality (cannot be disabled)
              </div>
            </div>
            <Switch checked={settings.dataCollection} disabled={true} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Analytics Tracking</Label>
              <div className="text-sm text-muted-foreground">
                Help improve the app with usage analytics
              </div>
            </div>
            <Switch
              checked={settings.analyticsTracking}
              onCheckedChange={(checked) =>
                updateSetting("analyticsTracking", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Personalized Recommendations</Label>
              <div className="text-sm text-muted-foreground">
                Use your data to provide personalized insights
              </div>
            </div>
            <Switch
              checked={settings.personalizedAds}
              onCheckedChange={(checked) =>
                updateSetting("personalizedAds", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Share with Health Partners</Label>
              <div className="text-sm text-muted-foreground">
                Share anonymized data with health research partners
              </div>
            </div>
            <Switch
              checked={settings.shareWithPartners}
              onCheckedChange={(checked) =>
                updateSetting("shareWithPartners", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Profile Visibility */}
      <Card className="ios-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Profile Visibility
          </CardTitle>
          <CardDescription>
            Control what others can see about your profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Public Profile</Label>
              <div className="text-sm text-muted-foreground">
                Make your profile visible to other users
              </div>
            </div>
            <Switch
              checked={settings.publicProfile}
              onCheckedChange={(checked) =>
                updateSetting("publicProfile", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Show Activity Status</Label>
              <div className="text-sm text-muted-foreground">
                Let others see when you're active
              </div>
            </div>
            <Switch
              checked={settings.showActivity}
              onCheckedChange={(checked) =>
                updateSetting("showActivity", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="ios-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>
            Manage your account security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            className="w-full justify-start h-12"
            onClick={() =>
              toast({
                title: "Password change",
                description: "Password change feature coming soon!",
              })
            }
          >
            <Lock className="h-4 w-4 mr-3" />
            Change Password
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-12"
            onClick={() =>
              toast({
                title: "Two-factor auth",
                description: "2FA setup coming soon!",
              })
            }
          >
            <Shield className="h-4 w-4 mr-3" />
            Enable Two-Factor Authentication
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-12"
            onClick={() =>
              toast({
                title: "Login history",
                description: "Login history feature coming soon!",
              })
            }
          >
            <Eye className="h-4 w-4 mr-3" />
            View Login History
          </Button>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="ios-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>Export or delete your personal data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            className="w-full justify-start h-12"
            onClick={exportData}
          >
            <Download className="h-4 w-4 mr-3" />
            Export My Data
          </Button>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Data exports include all your health data, preferences, and
              account information in JSON format.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="ios-card border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <UserX className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that affect your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              Account deletion is permanent and cannot be undone. All your data
              will be permanently removed.
            </AlertDescription>
          </Alert>

          <Button
            variant="destructive"
            className="w-full"
            onClick={deleteAccount}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Account
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        onClick={saveSettings}
        disabled={isLoading}
        className="w-full ios-button-primary"
      >
        <Save className="h-4 w-4 mr-2" />
        {isLoading ? "Saving..." : "Save Privacy Settings"}
      </Button>
    </div>
  );
}
