
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { 
  TrendingUp, 
  Calendar,
  Target,
  Settings,
  ArrowLeft,
  DollarSign,
  PiggyBank,
  Wallet,
  ArrowUpRight,
  CreditCard,
  Plus,
  TrendingDown,
  Calculator,
  Receipt,
  Banknote
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function Wealth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDesc, setTransactionDesc] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState('');

  const [wealthMetrics, setWealthMetrics] = useState([
    { label: 'Net Worth', value: 0, unit: '', icon: Wallet, color: 'bg-green-500', trend: '0%', prefix: '$' },
    { label: 'Monthly Income', value: 0, unit: '', icon: ArrowUpRight, color: 'bg-blue-500', trend: '0%', prefix: '$' },
    { label: 'Savings Rate', value: 0, unit: '%', icon: PiggyBank, color: 'bg-purple-500', trend: '0%', prefix: '' },
    { label: 'Investment Growth', value: 0, unit: '%', icon: TrendingUp, color: 'bg-orange-500', trend: '0%', prefix: '' }
  ]);

  const quickActions = [
    { 
      label: 'Add Transaction', 
      icon: Plus, 
      action: () => {
        if (transactionAmount && transactionDesc) {
          toast({ title: "Transaction added!", description: `${transactionDesc}: $${transactionAmount}` });
          setTransactionAmount('');
          setTransactionDesc('');
        }
      }
    },
    { 
      label: 'Pay Bills', 
      icon: Receipt, 
      action: () => {
        toast({ title: "Bills paid!", description: "Monthly expenses updated" });
      }
    },
    { 
      label: 'Transfer Savings', 
      icon: PiggyBank, 
      action: () => {
        toast({ title: "Savings transferred!", description: "Emergency fund updated" });
      }
    },
    { 
      label: 'Invest Funds', 
      icon: TrendingUp, 
      action: () => {
        if (investmentAmount) {
          toast({ title: "Investment made!", description: `$${investmentAmount} invested` });
          setInvestmentAmount('');
        }
      }
    }
  ];

  const [todaysGoals, setTodaysGoals] = useState([
    { label: 'Daily spending limit', current: 0, target: 100, unit: '$' },
    { label: 'Investment allocation', current: 0, target: 500, unit: '$' },
    { label: 'Savings target', current: 0, target: 1500, unit: '$' }
  ]);

  const [investments, setInvestments] = useState<any[]>([]);

  const [expenses, setExpenses] = useState<any[]>([]);

  const [goals, setGoals] = useState<any[]>([]);

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Daily Score */}
      <Card className="wealth-gradient text-white overflow-hidden">
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/80 text-sm">Today's Wealth Score</p>
              <h2 className="text-4xl font-bold">0</h2>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-white/90">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Start tracking</span>
              </div>
              <p className="text-xs text-white/70 mt-1">Begin building wealth</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-white/80">
              <span>Financial wellness</span>
              <span>0%</span>
            </div>
            <Progress value={0} className="h-2 bg-white/20" />
          </div>
        </CardContent>
      </Card>

      {/* Wealth Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {wealthMetrics.map((metric, index) => {
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
                  {metric.prefix}{metric.value.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">{metric.unit}</span>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Today's Goals */}
      <Card className="ios-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Today's Financial Goals</h3>
          <Target className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-4">
          {todaysGoals.map((goal, index) => {
            const progress = Math.min((goal.current / goal.target) * 100, 100);
            return (
              <div key={index}>
                <div className="flex justify-between text-sm mb-2">
                  <span>{goal.label}</span>
                  <span>{goal.unit}{goal.current} / {goal.unit}{goal.target}</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Quick Transaction Entry */}
      <Card className="ios-card">
        <h3 className="font-semibold mb-4">Quick Transaction</h3>
        <div className="space-y-3">
          <Input
            placeholder=""
            value={transactionAmount}
            onChange={(e) => setTransactionAmount(e.target.value)}
            type="number"
          />
          <Input
            placeholder=""
            value={transactionDesc}
            onChange={(e) => setTransactionDesc(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={() => quickActions[0].action()}
              className="ios-button-primary"
              disabled={!transactionAmount || !transactionDesc}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Expense
            </Button>
            <Button 
              onClick={() => {
                if (transactionAmount && transactionDesc) {
                  toast({ title: "Income added!", description: `${transactionDesc}: +$${transactionAmount}` });
                  setTransactionAmount('');
                  setTransactionDesc('');
                }
              }}
              variant="outline"
              className="ios-button-secondary"
              disabled={!transactionAmount || !transactionDesc}
            >
              <ArrowUpRight className="h-4 w-4 mr-1" />
              Add Income
            </Button>
          </div>
        </div>
      </Card>

      {/* Monthly Summary */}
      <Card className="ios-card">
        <h3 className="font-semibold mb-4">Monthly Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/20 rounded-xl">
            <span className="text-sm font-medium">Income</span>
            <span className="font-bold text-green-600">+$0</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950/20 rounded-xl">
            <span className="text-sm font-medium">Expenses</span>
            <span className="font-bold text-red-600">-$0</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-primary/10 rounded-xl">
            <span className="font-semibold">Net Income</span>
            <span className="font-bold text-primary">+$0</span>
          </div>
          <div className="pt-2">
            <div className="flex justify-between text-sm mb-2">
              <span>Savings Rate</span>
              <span className="font-medium">0%</span>
            </div>
            <Progress value={0} className="h-2" />
          </div>
        </div>
      </Card>
    </div>
  );

  const renderInvestments = () => (
    <div className="space-y-4">
      <Card className="ios-card">
        <h3 className="font-semibold mb-4">Investment Portfolio</h3>
        {investments.length > 0 ? (
          <div className="space-y-3">
            {investments.map((investment, index) => (
              <div key={index} className="ios-list-item haptic-selection">
                <div className="text-2xl mr-3">{investment.emoji}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{investment.name}</p>
                  <p className="text-xs text-muted-foreground">${investment.value.toLocaleString()} • {investment.allocation}%</p>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${investment.positive ? 'text-green-600' : 'text-red-600'}`}>
                    {investment.change}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            No investments yet. Start building your portfolio!
          </p>
        )}
      </Card>

      <Card className="ios-card">
        <h3 className="font-semibold mb-4">Quick Invest</h3>
        <div className="space-y-3">
          <Input
            placeholder=""
            value={investmentAmount}
            onChange={(e) => setInvestmentAmount(e.target.value)}
            type="number"
          />
          <div className="grid grid-cols-3 gap-2">
            <Button 
              onClick={() => quickActions[3].action()}
              className="ios-button-primary text-xs py-2"
              disabled={!investmentAmount}
            >
              S&P 500
            </Button>
            <Button 
              onClick={() => {
                if (investmentAmount) {
                  toast({ title: "Bonds purchased!", description: `$${investmentAmount} in bonds` });
                  setInvestmentAmount('');
                }
              }}
              variant="outline"
              className="ios-button-secondary text-xs py-2"
              disabled={!investmentAmount}
            >
              Bonds
            </Button>
            <Button 
              onClick={() => {
                if (investmentAmount) {
                  toast({ title: "International fund!", description: `$${investmentAmount} invested globally` });
                  setInvestmentAmount('');
                }
              }}
              variant="outline"
              className="ios-button-secondary text-xs py-2"
              disabled={!investmentAmount}
            >
              International
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderExpenses = () => (
    <div className="space-y-4">
      <Card className="ios-card">
        <h3 className="font-semibold mb-4">Monthly Expenses</h3>
        {expenses.length > 0 ? (
          <div className="space-y-3">
            {expenses.map((expense, index) => (
              <div key={index} className="ios-list-item">
                <div className="text-2xl mr-3">{expense.emoji}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{expense.category}</p>
                  <p className="text-xs text-muted-foreground">${expense.amount} • {expense.percentage}%</p>
                </div>
                <div className="w-16">
                  <Progress value={expense.percentage} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            No expenses tracked yet. Start logging your spending!
          </p>
        )}
      </Card>

      <Card className="ios-card">
        <h3 className="font-semibold mb-4">Budget Tools</h3>
        <div className="grid grid-cols-2 gap-3">
          <Button 
            onClick={() => toast({ title: "Budget analyzed!", description: "Spending patterns reviewed" })}
            variant="outline"
            className="h-16 flex-col gap-2"
          >
            <Calculator className="h-5 w-5" />
            <span className="text-xs">Budget Calc</span>
          </Button>
          <Button 
            onClick={() => toast({ title: "Expenses categorized!", description: "Monthly breakdown ready" })}
            variant="outline"
            className="h-16 flex-col gap-2"
          >
            <Receipt className="h-5 w-5" />
            <span className="text-xs">Categorize</span>
          </Button>
        </div>
      </Card>
    </div>
  );

  const renderGoals = () => (
    <div className="space-y-4">
      <Card className="ios-card">
        <h3 className="font-semibold mb-4">Financial Goals</h3>
        {goals.length > 0 ? (
          <div className="space-y-4">
            {goals.map((goal, index) => (
              <div key={index} className="p-4 border rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{goal.emoji}</span>
                    <h4 className="font-medium text-sm">{goal.name}</h4>
                  </div>
                  <span className="text-sm font-medium">{goal.progress}%</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  ${goal.current.toLocaleString()} of ${goal.target.toLocaleString()}
                </p>
                <Progress value={goal.progress} className="h-2 mb-2" />
                <div className="text-xs text-muted-foreground">
                  ${(goal.target - goal.current).toLocaleString()} remaining
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            No financial goals set yet. Create your first goal!
          </p>
        )}
      </Card>

      <Card className="ios-card">
        <h3 className="font-semibold mb-4">Goal Actions</h3>
        <div className="space-y-2">
          <Button 
            onClick={() => toast({ title: "Emergency fund contribution!", description: "$500 added to emergency fund" })}
            className="w-full justify-start"
            variant="outline"
          >
            <PiggyBank className="h-4 w-4 mr-3" />
            Boost Emergency Fund
          </Button>
          <Button 
            onClick={() => toast({ title: "House fund contribution!", description: "$1000 saved for down payment" })}
            className="w-full justify-start"
            variant="outline"
          >
            <DollarSign className="h-4 w-4 mr-3" />
            Save for House
          </Button>
          <Button 
            onClick={() => toast({ title: "Retirement contribution!", description: "$2000 added to retirement" })}
            className="w-full justify-start"
            variant="outline"
          >
            <TrendingUp className="h-4 w-4 mr-3" />
            Boost Retirement
          </Button>
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
              <div className="ios-large-title">Wealth 💎</div>
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

      <div className="px-4 safe-area-left safe-area-right pb-32">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="overview" className="mt-0">
            {renderOverview()}
          </TabsContent>

          <TabsContent value="investments" className="mt-0">
            {renderInvestments()}
          </TabsContent>

          <TabsContent value="expenses" className="mt-0">
            {renderExpenses()}
          </TabsContent>

          <TabsContent value="goals" className="mt-0">
            {renderGoals()}
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
                value="investments" 
                className="flex-1 py-2 px-3 text-xs font-medium transition-all duration-200 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                Invest
              </TabsTrigger>
              <TabsTrigger 
                value="expenses" 
                className="flex-1 py-2 px-3 text-xs font-medium transition-all duration-200 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                Expenses
              </TabsTrigger>
              <TabsTrigger 
                value="goals" 
                className="flex-1 py-2 px-3 text-xs font-medium transition-all duration-200 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                Goals
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
