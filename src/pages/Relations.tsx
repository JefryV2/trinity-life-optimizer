import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  TrendingUp, 
  Calendar,
  Target,
  Settings,
  ArrowLeft,
  MessageCircle,
  Users,
  BookOpen,
  Clock,
  Heart,
  Zap,
  Brain,
  Phone,
  Mail,
  Video,
  Gift,
  Plus,
  Search,
  Filter
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

export default function Relations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [gratitudeText, setGratitudeText] = useState('');
  const [connectionNote, setConnectionNote] = useState('');
  const [loading, setLoading] = useState(true);

  const [relationshipMetrics, setRelationshipMetrics] = useState([
    { label: 'Connection Score', value: 0, unit: '/100', icon: Heart, color: 'bg-red-500', trend: '0%' },
    { label: 'Social Energy', value: 0, unit: '%', icon: Zap, color: 'bg-yellow-500', trend: '0%' },
    { label: 'Quality Time', value: 0, unit: 'hrs/week', icon: Clock, color: 'bg-green-500', trend: '0%' },
    { label: 'Empathy Score', value: 0, unit: '/100', icon: Brain, color: 'bg-purple-500', trend: '0%' }
  ]);

  const handleAddGratitude = async () => {
    if (!gratitudeText.trim()) {
      toast({
        title: "Error",
        description: "Please enter something you're grateful for",
        variant: "destructive",
      });
      return;
    }

    try {
      // In a real app, this would connect to the backend
      const newEntry = {
        id: 1, // This will be replaced by actual backend data
        text: gratitudeText,
        date: new Date().toISOString().split('T')[0]
      };
      setGratitudeText('');
      
      toast({
        title: "Success",
        description: "Gratitude entry added!",
      });
    } catch (error) {
      console.error('Error adding gratitude:', error);
      toast({
        title: "Error",
        description: "Failed to add gratitude entry",
        variant: "destructive",
      });
    }
  };

  const handleAddInteraction = async () => {
    if (!connectionNote.trim()) {
      toast({
        title: "Error",
        description: "Please describe your interaction",
        variant: "destructive",
      });
      return;
    }

    try {
      // In a real app, this would connect to the backend
      setConnectionNote('');
      
      toast({
        title: "Success",
        description: "Interaction recorded!",
      });
    } catch (error) {
      console.error('Error adding interaction:', error);
      toast({
        title: "Error",
        description: "Failed to record interaction",
        variant: "destructive",
      });
    }
  };
  const quickActions = [
    { 
      label: 'Send Message', 
      icon: MessageCircle, 
      action: () => {
        toast({ title: "Message sent!", description: "Reached out to a loved one" });
      }
    },
    { 
      label: 'Schedule Call', 
      icon: Phone, 
      action: () => {
        toast({ title: "Call scheduled!", description: "Quality time planned" });
      }
    },
    { 
      label: 'Video Chat', 
      icon: Video, 
      action: () => {
        toast({ title: "Video call started!", description: "Connecting face-to-face" });
      }
    },
    { 
      label: 'Send Gift', 
      icon: Gift, 
      action: () => {
        toast({ title: "Gift idea noted!", description: "Thoughtful gesture planned" });
      }
    }
  ];

  const [todaysGoals, setTodaysGoals] = useState([
    { label: 'Quality conversations', current: 0, target: 3, unit: '' },
    { label: 'Gratitude expressions', current: 0, target: 3, unit: '' },
    { label: 'Active listening moments', current: 0, target: 2, unit: '' }
  ]);

  const [relationships, setRelationships] = useState<Array<{ emoji: string; name: string; type: string; lastContact: string; strength: number; status: string }>>([]);
  const [activities, setActivities] = useState([
    { title: 'Daily Gratitude', emoji: '🙏', description: 'Write 3 things you\'re grateful for', completed: false },
    { title: 'Quality Time', emoji: '⏰', description: 'Spend 30 minutes with loved ones', completed: false },
    { title: 'Active Listening', emoji: '👂', description: 'Practice mindful listening today', completed: false },
    { title: 'Express Appreciation', emoji: '💝', description: 'Tell someone why they matter', completed: false }
  ]);

  const [learningModules, setLearningModules] = useState([
    { title: 'Love Languages', description: 'Discover your primary love language', time: '10 min', completed: false },
    { title: 'Conflict Resolution', description: 'Learn healthy dispute techniques', time: '15 min', completed: false },
    { title: 'Emotional Intelligence', description: 'Build empathy and awareness', time: '20 min', completed: false }
  ]);

  const fetchRelationshipData = useCallback(async () => {
    if (!user) return;
    
    try {
      // Fetch relationships
      const { data: relationshipsData } = await supabase
        .from('relationships')
        .select('*')
        .eq('user_id', user.id);
      
      const formattedRelationships = relationshipsData?.map(rel => ({
        emoji: rel.relation_type === 'family' ? '👨‍👩‍👧' : rel.relation_type === 'friend' ? '👫' : '💼',
        name: rel.name,
        type: rel.relation_type || 'Other',
        lastContact: rel.last_contact_at ? new Date(rel.last_contact_at).toLocaleDateString() : 'Never',
        strength: rel.importance || 0,
        status: rel.importance && rel.importance > 3 ? 'Strong' : 'Developing'
      })) || [];
      
      setRelationships(formattedRelationships);
      
      // Fetch gratitude entries
      const { data: gratitudeData } = await supabase
        .from('gratitude_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      // Fetch quality time goals
      const { data: qtGoalsData } = await supabase
        .from('quality_time_goals')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);
      
      if (qtGoalsData && qtGoalsData.length > 0) {
        const qtGoal = qtGoalsData[0];
        setTodaysGoals([
          { label: 'Quality conversations', current: qtGoal.completed_minutes || 0, target: qtGoal.target_minutes_per_week || 120, unit: ' min' },
          { label: 'Gratitude expressions', current: gratitudeData?.length || 0, target: 7, unit: '' }, // Weekly target
          { label: 'Active listening moments', current: 0, target: 7, unit: '' } // Placeholder
        ]);
      }
      
      // Calculate relationship metrics based on data
      if (relationshipsData && relationshipsData.length > 0) {
        const avgImportance = relationshipsData.reduce((sum, rel) => sum + (rel.importance || 0), 0) / relationshipsData.length;
        const connectionScore = Math.round((avgImportance / 5) * 100);
        
        setRelationshipMetrics([
          { label: 'Connection Score', value: connectionScore, unit: '/100', icon: Heart, color: 'bg-red-500', trend: '0%' },
          { label: 'Social Energy', value: 50, unit: '%', icon: Zap, color: 'bg-yellow-500', trend: '0%' }, // Placeholder
          { label: 'Quality Time', value: qtGoalsData?.[0]?.completed_minutes || 0, unit: 'hrs/week', icon: Clock, color: 'bg-green-500', trend: '0%' },
          { label: 'Empathy Score', value: 60, unit: '/100', icon: Brain, color: 'bg-purple-500', trend: '0%' } // Placeholder
        ]);
      }
      
    } catch (error) {
      console.error('Error fetching relationship data:', error);
      toast({
        title: "Error",
        description: "Failed to load relationship data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchRelationshipData();
    } else {
      setLoading(false);
    }
  }, [user, fetchRelationshipData]);

  const handleGratitudeSubmit = async () => {
    if (!user || !gratitudeText.trim()) return;
    
    try {
      const { error } = await supabase
        .from('gratitude_entries')
        .insert([{
          user_id: user.id,
          text: gratitudeText
        }]);
      
      if (error) throw error;
      
      toast({
        title: "Gratitude logged!",
        description: "Your appreciation has been recorded."
      });
      
      setGratitudeText('');
      fetchRelationshipData(); // Refresh data
    } catch (error) {
      console.error('Error adding gratitude:', error);
      toast({
        title: "Error",
        description: "Failed to save gratitude entry",
        variant: "destructive"
      });
    }
  };

  const handleConnectionNote = async () => {
    if (!user || !connectionNote.trim()) return;
    
    try {
      // In a real app, we might want to store connection notes in a separate table
      // For now, just show a success message
      toast({
        title: "Connection noted!",
        description: "Your relationship insight has been saved."
      });
      
      setConnectionNote('');
    } catch (error) {
      console.error('Error saving connection note:', error);
      toast({
        title: "Error",
        description: "Failed to save connection note",
        variant: "destructive"
      });
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Daily Score */}
      <Card className="relations-gradient text-white overflow-hidden">
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/80 text-sm">Today's Connection Score</p>
              <h2 className="text-4xl font-bold">0</h2>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-white/90">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Start connecting</span>
              </div>
              <p className="text-xs text-white/70 mt-1">Build relationships</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-white/80">
              <span>Relationship wellness</span>
              <span>0%</span>
            </div>
            <Progress value={0} className="h-2 bg-white/20" />
          </div>
        </CardContent>
      </Card>

      {/* Relationship Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {relationshipMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className="metric-card haptic-light">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${metric.color} flex items-center justify-center`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs text-green-600 font-medium">{metric.trend}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
                <p className="text-lg font-bold">
                  {metric.value}<span className="text-sm font-normal text-muted-foreground">{metric.unit}</span>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Today's Goals */}
      <Card className="ios-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Today's Connection Goals</h3>
          <Target className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-4">
          {todaysGoals.map((goal, index) => {
            const progress = Math.min((goal.current / goal.target) * 100, 100);
            return (
              <div key={index}>
                <div className="flex justify-between text-sm mb-2">
                  <span>{goal.label}</span>
                  <span>{goal.current} / {goal.target}</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="ios-card">
        <h3 className="font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                variant="outline"
                className="ios-button-secondary haptic-medium h-16 flex-col gap-2"
                onClick={action.action}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </Card>

      {/* Key Relationships */}
      {relationships.length > 0 && (
        <Card className="ios-card">
          <h3 className="font-semibold mb-4">Key Relationships</h3>
          <div className="space-y-3">
            {relationships.map((relationship, index) => (
              <div key={index} className="ios-list-item haptic-selection">
                <div className="text-2xl mr-3">{relationship.emoji}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{relationship.name}</p>
                  <p className="text-xs text-muted-foreground">{relationship.type} • {relationship.lastContact}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{relationship.strength}%</div>
                  <div className="text-xs text-muted-foreground">{relationship.status}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );

  const renderConnections = () => (
    <div className="space-y-4">
      <Card className="ios-card">
        <h3 className="font-semibold mb-4">Express Gratitude</h3>
        <div className="space-y-3">
          <Textarea
            placeholder=""
            value={gratitudeText}
            onChange={(e) => setGratitudeText(e.target.value)}
            className="min-h-20"
          />
          <Button 
            onClick={handleGratitudeSubmit}
            className="w-full ios-button-primary"
            disabled={!gratitudeText.trim()}
          >
            <Heart className="h-4 w-4 mr-2" />
            Share Gratitude
          </Button>
        </div>
      </Card>

      <Card className="ios-card">
        <h3 className="font-semibold mb-4">Connection Insights</h3>
        <div className="space-y-3">
          <Textarea
            placeholder=""
            value={connectionNote}
            onChange={(e) => setConnectionNote(e.target.value)}
            className="min-h-20"
          />
          <Button 
            onClick={handleConnectionNote}
            variant="outline"
            className="w-full ios-button-secondary"
            disabled={!connectionNote.trim()}
          >
            <Brain className="h-4 w-4 mr-2" />
            Save Reflection
          </Button>
        </div>
      </Card>

      {/* Contact List with Actions */}
      <Card className="ios-card">
        <h3 className="font-semibold mb-4">Quick Connect</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: 'Mom', emoji: '👵', action: () => toast({ title: "Called Mom!", description: "Quality time scheduled" }) },
            { name: 'Best Friend', emoji: '👫', action: () => toast({ title: "Texted friend!", description: "Check-in message sent" }) },
            { name: 'Partner', emoji: '💕', action: () => toast({ title: "Date planned!", description: "Romantic evening scheduled" }) },
            { name: 'Sibling', emoji: '👨‍👩‍👧', action: () => toast({ title: "Family time!", description: "Catch-up call made" }) }
          ].map((contact) => (
            <Button
              key={contact.name}
              variant="outline"
              className="h-20 flex-col gap-2 p-4"
              onClick={contact.action}
            >
              <div className="text-2xl">{contact.emoji}</div>
              <span className="text-xs">{contact.name}</span>
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderActivities = () => (
    <div className="space-y-4">
      <Card className="ios-card">
        <h3 className="font-semibold mb-4">Today's Activities</h3>
        <div className="space-y-3">
          {activities.map((activity, index) => (
            <div key={index} className="ios-list-item haptic-selection">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 ${
                activity.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'
              }`}>
                {activity.completed && <div className="w-2 h-2 bg-white rounded-full"></div>}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{activity.emoji}</span>
                  <p className="text-sm font-medium">{activity.title}</p>
                </div>
                <p className="text-xs text-muted-foreground">{activity.description}</p>
              </div>
              {activity.completed && <span className="text-xs text-green-600 font-medium">Done</span>}
            </div>
          ))}
        </div>
      </Card>

      {/* Interactive Activities */}
      <Card className="ios-card">
        <h3 className="font-semibold mb-4">Relationship Builders</h3>
        <div className="space-y-3">
          {[
            { title: 'Send Appreciation', action: () => toast({ title: "Appreciation sent!", description: "Made someone's day brighter" }) },
            { title: 'Plan Quality Time', action: () => toast({ title: "Time blocked!", description: "Quality time scheduled" }) },
            { title: 'Practice Active Listening', action: () => toast({ title: "Mindful listening!", description: "Attention focused on others" }) },
            { title: 'Share a Memory', action: () => toast({ title: "Memory shared!", description: "Beautiful moment reconnected" }) }
          ].map((activity, index) => (
            <Button
              key={index}
              variant="outline"
              className="w-full justify-start h-12"
              onClick={activity.action}
            >
              <Heart className="h-4 w-4 mr-3" />
              {activity.title}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderGrowth = () => (
    <div className="space-y-4">
      <Card className="ios-card">
        <h3 className="font-semibold mb-4">Growth Modules</h3>
        <div className="space-y-4">
          {learningModules.map((module, index) => (
            <div key={index} className="p-4 border rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">{module.title}</h4>
                <span className="text-xs text-muted-foreground">{module.time}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">{module.description}</p>
              {module.completed ? (
                <div className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  Completed
                </div>
              ) : (
                <Button 
                  size="sm" 
                  className="ios-button-primary w-full haptic-medium"
                  onClick={() => toast({ title: `Started ${module.title}!`, description: "Learning module in progress" })}
                >
                  <BookOpen className="h-3 w-3 mr-1" />
                  Start Module
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom ios-scroll">
      {/* iOS-style Header */}
      <div className="ios-header safe-area-left safe-area-right">
        <div className="flex items-center justify-between w-full px-4">
          <div className="flex items-center gap-3">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-10 w-10 p-0 haptic-light"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="ios-large-title">Relations 🤝</div>
              <p className="text-sm text-muted-foreground">Sunday, Dec 15</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="h-10 w-10 p-0 haptic-light">
              <Calendar className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-10 w-10 p-0 haptic-light">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 safe-area-left safe-area-right" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="overview" className="mt-0">
            {renderOverview()}
          </TabsContent>

          <TabsContent value="connections" className="mt-0">
            {renderConnections()}
          </TabsContent>

          <TabsContent value="activities" className="mt-0">
            {renderActivities()}
          </TabsContent>

          <TabsContent value="growth" className="mt-0">
            {renderGrowth()}
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Tab Navigation - Full Width */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/30">
        <div className="w-full px-4 py-2" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full h-12 flex bg-muted/50 rounded-xl p-1">
              <TabsTrigger 
                value="overview" 
                className="flex-1 py-2 px-3 text-xs font-medium transition-all duration-200 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="connections" 
                className="flex-1 py-2 px-3 text-xs font-medium transition-all duration-200 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                Connect
              </TabsTrigger>
              <TabsTrigger 
                value="activities" 
                className="flex-1 py-2 px-3 text-xs font-medium transition-all duration-200 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                Activities
              </TabsTrigger>
              <TabsTrigger 
                value="growth" 
                className="flex-1 py-2 px-3 text-xs font-medium transition-all duration-200 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                Growth
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
