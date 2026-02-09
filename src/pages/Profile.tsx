import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Settings,
  Crown,
  Star,
  Award,
  TrendingUp,
  Heart,
  Target,
  Zap,
  Bell,
  Shield,
  LogOut,
  User as UserIcon,
  Edit,
  Calendar,
  Activity,
  DollarSign,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { NotificationSettings } from "@/components/profile/NotificationSettings";
import { PrivacySettings } from "@/components/profile/PrivacySettings";
import { FeatureToggles } from "@/components/profile/FeatureToggles";

interface Profile {
  first_name: string | null;
  last_name: string | null;
  tier: string | null;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [healthProfile, setHealthProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState([
    {
      label: "Health Score",
      value: 0,
      unit: "/100",
      color: "text-green-600",
      icon: Heart,
    },
    {
      label: "Wealth Score",
      value: 0,
      unit: "/100",
      color: "text-blue-600",
      icon: TrendingUp,
    },
    {
      label: "Relations Score",
      value: 0,
      unit: "/100",
      color: "text-purple-600",
      icon: Target,
    },
    {
      label: "Overall Wellness",
      value: 0,
      unit: "/100",
      color: "text-orange-600",
      icon: Star,
    },
  ]);

  const [achievements, setAchievements] = useState([
    {
      title: "First Week Complete",
      emoji: "🎯",
      description: "Completed your first week of tracking",
      earned: false,
    },
    {
      title: "Health Master",
      emoji: "💚",
      description: "Maintained 80+ health score for 5 days",
      earned: false,
    },
    {
      title: "Wealth Builder",
      emoji: "💎",
      description: "Set up your first financial goal",
      earned: false,
    },
    {
      title: "Social Butterfly",
      emoji: "🤝",
      description: "Connected with 3 different people this week",
      earned: false,
    },
    {
      title: "Consistency King",
      emoji: "👑",
      description: "Track daily for 30 days straight",
      earned: false,
    },
    {
      title: "Triple Threat",
      emoji: "⭐",
      description: "Score 90+ in all three pillars",
      earned: false,
    },
  ]);

  const fetchProfile = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, tier")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
        return;
      }

      setProfile(data);
      
      // Also fetch health profile to get gender
      const { data: healthData, error: healthError } = await supabase
        .from("user_profiles_health")
        .select("gender")
        .eq("user_id", user?.id)
        .maybeSingle();
      
      if (healthError && healthError.code !== "PGRST116") {
        console.error("Error fetching health profile:", healthError);
      } else {
        setHealthProfile(healthData);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/auth");
      toast({
        title: "Signed out successfully",
        description: "Come back soon!",
      });
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "Please try again",
      });
    }
  };

  const fetchUserStats = useCallback(async () => {
    try {
      // Calculate health score from recent data
      const { data: sleepData } = await supabase
        .from("sleep_records")
        .select("sleep_quality")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(7);

      const { data: exerciseData } = await supabase
        .from("exercise_records")
        .select("duration_minutes")
        .eq("user_id", user?.id)
        .gte(
          "completed_at",
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        )
        .order("completed_at", { ascending: false });

      const { data: mentalData } = await supabase
        .from("mental_health_logs")
        .select("mood_rating, energy_level")
        .eq("user_id", user?.id)
        .order("logged_at", { ascending: false })
        .limit(7);

      let healthScore = 0;

      if (sleepData && sleepData.length > 0) {
        const avgSleepQuality =
          sleepData.reduce(
            (sum, record) => sum + (record.sleep_quality || 0),
            0,
          ) / sleepData.length;
        healthScore += avgSleepQuality * 10; // Convert to 0-100 scale
      }

      if (exerciseData && exerciseData.length > 0) {
        const totalExercise = exerciseData.reduce(
          (sum, record) => sum + (record.duration_minutes || 0),
          0,
        );
        healthScore += Math.min(totalExercise / 5, 30); // Up to 30 points for exercise
      }

      if (mentalData && mentalData.length > 0) {
        const avgMood =
          mentalData.reduce(
            (sum, record) => sum + (record.mood_rating || 0),
            0,
          ) / mentalData.length;
        healthScore += avgMood * 3; // Up to 30 points for mental health
      }

      const finalHealthScore = Math.min(
        Math.max(Math.round(healthScore), 0),
        100,
      );
      const overallScore = Math.round(finalHealthScore / 3); // Only health data available

      setStats([
        {
          label: "Health Score",
          value: finalHealthScore,
          unit: "/100",
          color: "text-green-600",
          icon: Heart,
        },
        {
          label: "Wealth Score",
          value: 0,
          unit: "/100",
          color: "text-blue-600",
          icon: TrendingUp,
        },
        {
          label: "Relations Score",
          value: 0,
          unit: "/100",
          color: "text-purple-600",
          icon: Target,
        },
        {
          label: "Overall Wellness",
          value: overallScore,
          unit: "/100",
          color: "text-orange-600",
          icon: Star,
        },
      ]);

      // Check for achievements
      const updatedAchievements = [...achievements];

      // First Week Complete - check if user has data for 7 days
      const totalDataPoints =
        (sleepData?.length || 0) +
        (exerciseData?.length || 0) +
        (mentalData?.length || 0);
      if (totalDataPoints >= 7) {
        updatedAchievements[0].earned = true;
      }

      // Health Master - 80+ health score
      if (finalHealthScore >= 80) {
        updatedAchievements[1].earned = true;
      }

      setAchievements(updatedAchievements);
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  }, [user?.id, achievements]);

  useEffect(() => {
    if (!user) {
      // Allow profile page to render in guest mode when auth is bypassed
      setLoading(false);
      return;
    }

    fetchProfile();
    fetchUserStats();
  }, [user, fetchProfile, fetchUserStats]);

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Profile Header - Modern Design */}
      <section className="glass-panel p-6 rounded-3xl">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-2 border-white/50 shadow-lg">
            <AvatarFallback className="text-2xl bg-gradient-to-br from-orange-500 to-orange-400 text-white">
              {profile?.first_name?.[0] ||
                user?.email?.[0]?.toUpperCase() ||
                "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground">
              {profile?.first_name && profile?.last_name
                ? `${profile.first_name} ${profile.last_name}`
                : user?.email?.split("@")[0] || "User"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-primary/10 text-primary border-primary/20">
                <Crown className="h-3 w-3 mr-1" />
                {profile?.tier || "Free"} Plan
              </Badge>
              {healthProfile?.gender && (
                <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                  {healthProfile.gender === 'female' ? '♀️' : 
                   healthProfile.gender === 'male' ? '♂️' : 
                   healthProfile.gender === 'other' ? '🏳️‍🌈' : 
                   healthProfile.gender === 'prefer-not-to-say' ? '🤫' : '👤'}
                  <span className="ml-1 capitalize">
                    {healthProfile.gender === 'prefer-not-to-say' ? 'Not specified' : healthProfile.gender}
                  </span>
                </Badge>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats - Modern Grid */}
      <section className="glass-panel p-6 rounded-3xl">
        <header className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Wellness Overview
            </p>
            <h3 className="text-lg font-semibold text-foreground">
              Your Trinity Scores
            </h3>
          </div>
          <Star className="h-5 w-5 text-primary" />
        </header>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white/70 rounded-2xl p-4 border border-white/60 text-center"
              >
                <div className="flex items-center justify-center mb-2">
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {stat.value}
                  <span className="text-sm font-normal text-muted-foreground">
                    {stat.unit}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stat.label}
                </div>
                <Progress
                  value={stat.value}
                  className="h-1.5 mt-2 bg-muted/50"
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="glass-panel p-6 rounded-3xl">
        <header className="mb-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Quick Access
          </p>
          <h3 className="text-lg font-semibold text-foreground">
            Navigate to Pillars
          </h3>
        </header>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-16 flex-col gap-2 bg-white/70 border-white/60 rounded-2xl hover:bg-white/90"
            onClick={() => navigate("/health")}
          >
            <Heart className="h-5 w-5 text-green-600" />
            <span className="text-xs font-medium">Health Hub</span>
          </Button>
          <Button
            variant="outline"
            className="h-16 flex-col gap-2 bg-white/70 border-white/60 rounded-2xl hover:bg-white/90"
            onClick={() => navigate("/wealth")}
          >
            <DollarSign className="h-5 w-5 text-blue-600" />
            <span className="text-xs font-medium">Wealth Center</span>
          </Button>
          <Button
            variant="outline"
            className="h-16 flex-col gap-2 bg-white/70 border-white/60 rounded-2xl hover:bg-white/90"
            onClick={() => navigate("/relations")}
          >
            <Target className="h-5 w-5 text-purple-600" />
            <span className="text-xs font-medium">Relations</span>
          </Button>
          <Button
            variant="outline"
            className="h-16 flex-col gap-2 bg-white/70 border-white/60 rounded-2xl hover:bg-white/90"
            onClick={() => setActiveTab("settings")}
          >
            <Settings className="h-5 w-5 text-orange-600" />
            <span className="text-xs font-medium">Settings</span>
          </Button>
        </div>
      </section>
    </div>
  );

  const renderAchievements = () => (
    <div className="space-y-4">
      <section className="glass-panel p-6 rounded-3xl">
        <header className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Achievements
            </p>
            <h3 className="text-lg font-semibold text-foreground">
              Your Milestones
            </h3>
          </div>
          <Award className="h-5 w-5 text-primary" />
        </header>
        <div className="space-y-3">
          {achievements.map((achievement, index) => (
            <div
              key={index}
              className={`p-4 rounded-2xl border-2 transition-all ${
                achievement.earned
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-white/40 bg-white/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`text-2xl ${
                    achievement.earned ? "" : "grayscale opacity-50"
                  }`}
                >
                  {achievement.emoji}
                </div>
                <div className="flex-1">
                  <h4
                    className={`font-semibold text-sm ${
                      achievement.earned ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {achievement.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {achievement.description}
                  </p>
                </div>
                {achievement.earned && (
                  <Badge className="bg-primary text-primary-foreground text-xs">
                    Earned
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-4">
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full grid grid-cols-4 mb-6 bg-white/50 rounded-2xl p-1">
          <TabsTrigger
            value="profile"
            className="flex items-center gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <UserIcon className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger
            value="privacy"
            className="flex items-center gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Shield className="h-4 w-4" />
            Privacy
          </TabsTrigger>
          <TabsTrigger
            value="features"
            className="flex items-center gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Zap className="h-4 w-4" />
            Features
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileEditor />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="privacy">
          <PrivacySettings />
        </TabsContent>

        <TabsContent value="features">
          <FeatureToggles />
        </TabsContent>
      </Tabs>

      <section className="glass-panel p-6 rounded-3xl">
        <header className="mb-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Subscription
          </p>
          <h3 className="text-lg font-semibold text-foreground">Plan Details</h3>
        </header>
        <div className="text-center py-6">
          <Crown className="h-12 w-12 mx-auto mb-4 text-primary/60" />
          <h3 className="font-semibold mb-2 text-foreground">
            {profile?.tier || "Free"} Plan
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            You're currently on the free plan with access to basic features.
          </p>
          <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">
            Coming Soon
          </Badge>
          <p className="text-xs text-muted-foreground">
            Premium plans with advanced features will be available soon!
          </p>
        </div>
      </section>

      <section className="glass-panel p-4 rounded-3xl border-red-200">
        <Button
          variant="destructive"
          className="w-full rounded-2xl h-12"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </section>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--gradient-bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gradient-bg)] safe-area-top safe-area-bottom" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      {/* Modern Header */}
      <header className="pt-10 pb-6 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            className="h-10 w-10 p-0 haptic-light rounded-full glass-panel"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Profile
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
              Account Settings
            </h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-10 w-10 p-0 haptic-light rounded-full glass-panel"
            onClick={() => navigate('/calendar')}
          >
            <Calendar className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="px-6 space-y-6 safe-area-left safe-area-right">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="overview" className="mt-0">
            {renderOverview()}
          </TabsContent>

          <TabsContent value="achievements" className="mt-0">
            {renderAchievements()}
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            {renderSettings()}
          </TabsContent>
        </Tabs>
      </main>

      {/* Bottom Tab Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/30">
        <div
          className="w-full px-4 py-2"
          style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full h-12 flex bg-white/50 rounded-2xl p-1">
              <TabsTrigger
                value="overview"
                className="flex-1 py-2 px-3 text-xs font-medium transition-all duration-200 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="achievements"
                className="flex-1 py-2 px-3 text-xs font-medium transition-all duration-200 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                Achievements
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="flex-1 py-2 px-3 text-xs font-medium transition-all duration-200 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                Settings
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
