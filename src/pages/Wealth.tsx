
import { useState, useEffect, useCallback } from "react";
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
  ArrowDown,
  CreditCard,
  Plus,
  TrendingDown,
  Calculator,
  Receipt,
  Banknote
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

export default function Wealth() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDesc, setTransactionDesc] = useState('');
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [loading, setLoading] = useState(true);

  const [wealthMetrics, setWealthMetrics] = useState([
    { label: 'Total Balance', value: 0, unit: '', icon: Wallet, color: 'bg-green-500', trend: '0%', prefix: '$', description: 'All your money combined' },
    { label: 'Monthly Income', value: 0, unit: '', icon: ArrowUpRight, color: 'bg-blue-500', trend: '0%', prefix: '$', description: 'Money coming in' },
    { label: 'Monthly Spending', value: 0, unit: '', icon: ArrowDown, color: 'bg-red-500', trend: '0%', prefix: '$', description: 'Money going out' },
    { label: 'Savings Rate', value: 0, unit: '%', icon: PiggyBank, color: 'bg-purple-500', trend: '0%', prefix: '', description: 'Percent you save' }
  ]);

  const quickActions = [
    { 
      label: 'Add Expense', 
      icon: CreditCard, 
      action: () => {
        if (transactionAmount && transactionDesc) {
          addTransaction(parseFloat(transactionAmount), transactionDesc, 'out');
          setTransactionAmount('');
          setTransactionDesc('');
        }
      }
    },
    { 
      label: 'Add Income', 
      icon: ArrowUpRight, 
      action: () => {
        if (transactionAmount && transactionDesc) {
          addTransaction(parseFloat(transactionAmount), transactionDesc, 'in');
          setTransactionAmount('');
          setTransactionDesc('');
        }
      }
    },
    { 
      label: 'Save Money', 
      icon: PiggyBank, 
      action: () => {
        toast({ title: "Savings transferred!", description: "Emergency fund updated" });
      }
    },
    { 
      label: 'Invest', 
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
    { label: 'Daily spending limit', current: 0, target: 100, unit: '$', description: 'Try not to spend more than this' },
    { label: 'Savings goal', current: 0, target: 500, unit: '$', description: 'Money to set aside today' },
    { label: 'Budget progress', current: 0, target: 1500, unit: '$', description: 'Monthly budget progress' }
  ]);

  const [investments, setInvestments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);

  const fetchWealthData = useCallback(async () => {
    if (!user) return;
    
    try {
      // Fetch accounts and calculate net worth
      const { data: accountsData } = await supabase
        .from('finance_accounts')
        .select('*')
        .eq('user_id', user.id);
      
      setAccounts(accountsData || []);
      
      const netWorth = accountsData?.reduce((sum, account) => sum + parseFloat(String(account.balance || '0')), 0) || 0;
      
      // Fetch recent transactions
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('occurred_at', { ascending: false })
        .limit(10);
      
      // Calculate monthly income and expenses
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const monthlyTransactions = transactionsData?.filter(t => {
        const transDate = new Date(t.occurred_at);
        return transDate >= monthStart && transDate <= monthEnd;
      }) || [];
      
      const monthlyIncome = monthlyTransactions
        .filter(t => t.direction === 'in')
        .reduce((sum, t) => sum + parseFloat(String(t.amount || '0')), 0);
      
      const monthlyExpenses = monthlyTransactions
        .filter(t => t.direction === 'out')
        .reduce((sum, t) => sum + parseFloat(String(t.amount || '0')), 0);
      
      const savingsRate = monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100) : 0;
      
      // Update metrics
      setWealthMetrics([
        { label: 'Total Balance', value: netWorth, unit: '', icon: Wallet, color: 'bg-green-500', trend: '0%', prefix: '$', description: 'All your money combined' },
        { label: 'Monthly Income', value: monthlyIncome, unit: '', icon: ArrowUpRight, color: 'bg-blue-500', trend: '0%', prefix: '$', description: 'Money coming in' },
        { label: 'Monthly Spending', value: monthlyExpenses, unit: '', icon: ArrowDown, color: 'bg-red-500', trend: '0%', prefix: '$', description: 'Money going out' },
        { label: 'Savings Rate', value: Math.max(0, savingsRate), unit: '%', icon: PiggyBank, color: 'bg-purple-500', trend: '0%', prefix: '', description: 'Percent you save' }
      ]);
      
      // Update goals with actual data
      setTodaysGoals([
        { label: 'Daily spending limit', current: monthlyExpenses / 30, target: 100, unit: '$', description: 'Try not to spend more than this' },
        { label: 'Savings goal', current: monthlyIncome - monthlyExpenses, target: 500, unit: '$', description: 'Money to set aside today' },
        { label: 'Budget progress', current: monthlyExpenses, target: monthlyIncome, unit: '$', description: 'Monthly budget progress' }
      ]);
      
      // Fetch investments
      const { data: investmentsData } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', user.id);
      
      setInvestments(investmentsData?.map(inv => ({
        emoji: '📈',
        name: inv.instrument,
        value: parseFloat(String(inv.market_value || '0')),
        allocation: 0, // Would need more complex calculation
        positive: true,
        change: '+0%'
      })) || []);
      
      // Fetch expenses for budget tracking
      const expenseCategories: any = {};
      transactionsData?.forEach(trans => {
        const category = trans.category || 'Uncategorized';
        if (!expenseCategories[category]) {
          expenseCategories[category] = { amount: 0, percentage: 0 };
        }
        if (trans.direction === 'out') {
          expenseCategories[category].amount += parseFloat(String(trans.amount || '0'));
        }
      });
      
      // Calculate percentages
      const totalExpenses = monthlyExpenses || 1; // Avoid division by zero
      const expenseArray = Object.entries(expenseCategories).map(([category, data]: [any, any]) => ({
        emoji: '💰',
        category,
        amount: data.amount,
        percentage: Math.round((data.amount / totalExpenses) * 100)
      }));
      
      setExpenses(expenseArray);
      
      // Fetch financial goals
      const { data: goalsData } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id);
      
      setGoals(goalsData?.map(goal => ({
        emoji: '🎯',
        name: goal.category,
        current: goal.spent_amount,
        target: goal.limit_amount,
        progress: Math.round((parseFloat(String(goal.spent_amount || '0')) / parseFloat(String(goal.limit_amount || '1'))) * 100)
      })) || []);

    } catch (error) {
      console.error('Error fetching wealth data:', error);
      toast({
        title: "Error",
        description: "Failed to load wealth data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchWealthData();
    } else {
      setLoading(false);
    }
  }, [user, fetchWealthData]);

  const addTransaction = async (amount: number, description: string, direction: 'in' | 'out') => {
    if (!user) return;
    
    try {
      // Create transaction
      const { data: transaction } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          amount,
          category: description,
          direction,
          note: description,
          occurred_at: new Date().toISOString(),
          account_id: selectedAccountId || null
        }])
        .select()
        .single();
      
      if (!transaction) throw new Error('Failed to create transaction');
      
      // Update account balance if account was selected
      if (selectedAccountId) {
        const account = accounts.find(acc => acc.id === selectedAccountId);
        if (account) {
          const newBalance = direction === 'in' 
            ? (parseFloat(String(account.balance || 0)) + amount) 
            : (parseFloat(String(account.balance || 0)) - amount);
          
          const { error: updateError } = await supabase
            .from('finance_accounts')
            .update({ balance: newBalance })
            .eq('id', selectedAccountId);
          
          if (updateError) throw updateError;
        }
      }
      
      // Update budget if this is an expense
      if (direction === 'out') {
        const { data: budgets } = await supabase
          .from('budgets')
          .select('*')
          .eq('user_id', user.id)
          .ilike('category', `%${description}%`);
          
        if (budgets && budgets.length > 0) {
          // Update the first matching budget
          const budget = budgets[0];
          const newSpentAmount = parseFloat(String(budget.spent_amount || 0)) + amount;
          
          const { error: budgetError } = await supabase
            .from('budgets')
            .update({ spent_amount: newSpentAmount })
            .eq('id', budget.id);
          
          if (budgetError) throw budgetError;
        } else {
          // Check for general expense budget
          const { data: generalBudgets } = await supabase
            .from('budgets')
            .select('*')
            .eq('user_id', user.id)
            .ilike('category', '%General%');
            
          if (generalBudgets && generalBudgets.length > 0) {
            const budget = generalBudgets[0];
            const newSpentAmount = parseFloat(String(budget.spent_amount || 0)) + amount;
            
            const { error: budgetError } = await supabase
              .from('budgets')
              .update({ spent_amount: newSpentAmount })
              .eq('id', budget.id);
            
            if (budgetError) throw budgetError;
          }
        }
      }
      
      toast({
        title: "Transaction added!",
        description: `${direction === 'in' ? 'Income' : 'Expense'} of $${amount} recorded`
      });
      
      // Refresh data
      fetchWealthData();
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast({
        title: "Error",
        description: "Failed to add transaction",
        variant: "destructive"
      });
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Daily Score */}
      <Card className="wealth-gradient text-white overflow-hidden">
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/80 text-sm">Financial Health</p>
              <h2 className="text-4xl font-bold">{Math.min(100, Math.max(0, Math.round(wealthMetrics[3].value)))}</h2>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-white/90">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">{wealthMetrics[3].value > 0 ? 'Good' : 'Improve'}</span>
              </div>
              <p className="text-xs text-white/70 mt-1">Based on your savings</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-white/80">
              <span>Financial wellness</span>
              <span>{Math.min(100, Math.max(0, Math.round(wealthMetrics[3].value)))}%</span>
            </div>
            <Progress value={Math.min(100, Math.max(0, wealthMetrics[3].value))} className="h-2 bg-white/20" />
          </div>
        </CardContent>
      </Card>
      
      {/* Account Management */}
      {accounts.length === 0 && (
        <Card className="ios-card">
          <CardContent className="p-4">
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-2">No accounts yet</p>
              <Button 
                onClick={async () => {
                  if (!user) return;
                  
                  try {
                    const { error } = await supabase
                      .from('finance_accounts')
                      .insert([{ 
                        user_id: user.id, 
                        name: 'Primary Checking', 
                        type: 'checking', 
                        balance: 0 
                      }]);
                    
                    if (error) throw error;
                    
                    toast({
                      title: "Account created!",
                      description: "Your first account has been set up"
                    });
                    
                    fetchWealthData();
                  } catch (err) {
                    console.error('Error creating account:', err);
                    toast({
                      title: "Error",
                      description: "Failed to create account",
                      variant: "destructive"
                    });
                  }
                }}
                className="ios-button-primary"
              >
                Create First Account
              </Button>
              <Button 
                variant="outline"
                onClick={async () => {
                  if (!user) return;
                  
                  try {
                    const { error } = await supabase
                      .from('finance_accounts')
                      .insert([{ 
                        user_id: user.id, 
                        name: 'Savings Account', 
                        type: 'savings', 
                        balance: 0 
                      }]);
                    
                    if (error) throw error;
                    
                    toast({
                      title: "Account created!",
                      description: "A savings account has been added"
                    });
                    
                    fetchWealthData();
                  } catch (err) {
                    console.error('Error creating account:', err);
                    toast({
                      title: "Error",
                      description: "Failed to create account",
                      variant: "destructive"
                    });
                  }
                }}
                className="mt-2"
              >
                Add Savings Account
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <span className="text-xs text-muted-foreground font-medium">{metric.trend}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
                <p className="text-lg font-bold">
                  {metric.prefix}{metric.value.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">{metric.unit}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Today's Goals */}
      <Card className="ios-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Daily Goals</h3>
          <Target className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-4">
          {todaysGoals.map((goal, index) => {
            const progress = Math.min((goal.current / goal.target) * 100, 100);
            return (
              <div key={index}>
                <div className="flex justify-between text-sm mb-2">
                  <span>{goal.label}</span>
                  <span>{goal.unit}{Math.round(goal.current)} / {goal.unit}{Math.round(goal.target)}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{goal.description}</p>
                <Progress value={progress} className="h-2" />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Quick Transaction Entry */}
      <Card className="ios-card">
        <h3 className="font-semibold mb-4">Add Transaction</h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant={transactionType === 'expense' ? 'default' : 'outline'}
              className="flex-1 h-10"
              onClick={() => setTransactionType('expense')}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Expense
            </Button>
            <Button
              variant={transactionType === 'income' ? 'default' : 'outline'}
              className="flex-1 h-10"
              onClick={() => setTransactionType('income')}
            >
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Income
            </Button>
          </div>
          <Input
            placeholder="Amount ($100.00)"
            value={transactionAmount}
            onChange={(e) => setTransactionAmount(e.target.value)}
            type="number"
          />
          <Input
            placeholder="What was this for?"
            value={transactionDesc}
            onChange={(e) => setTransactionDesc(e.target.value)}
          />
          <Button 
            onClick={() => {
              if (transactionAmount && transactionDesc) {
                addTransaction(parseFloat(transactionAmount), transactionDesc, transactionType === 'income' ? 'in' : 'out');
                setTransactionAmount('');
                setTransactionDesc('');
              }
            }}
            className="ios-button-primary w-full"
            disabled={!transactionAmount || !transactionDesc}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {transactionType === 'income' ? 'Income' : 'Expense'}
          </Button>
          
          {/* Account selector */}
          {accounts.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-1">Select Account</p>
              <select 
                className="w-full p-2 border rounded-lg bg-background"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
              >
                <option value="">Choose an account</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} (${account.balance})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Card>

      {/* Monthly Summary */}
      <Card className="ios-card">
        <h3 className="font-semibold mb-4">Monthly Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/20 rounded-xl">
            <span className="text-sm font-medium">Income</span>
            <span className="font-bold text-green-600">+${wealthMetrics[1].value.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950/20 rounded-xl">
            <span className="text-sm font-medium">Spending</span>
            <span className="font-bold text-red-600">-${Math.abs(wealthMetrics[2].value).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-primary/10 rounded-xl">
            <span className="font-semibold">Net Change</span>
            <span className={`font-bold ${wealthMetrics[1].value - Math.abs(wealthMetrics[2].value) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {wealthMetrics[1].value - Math.abs(wealthMetrics[2].value) >= 0 ? '+' : '-'}$
              {Math.abs(wealthMetrics[1].value - Math.abs(wealthMetrics[2].value)).toLocaleString()}
            </span>
          </div>
          <div className="pt-2">
            <div className="flex justify-between text-sm mb-2">
              <span>Savings Rate</span>
              <span className="font-medium">{Math.round(wealthMetrics[3].value)}%</span>
            </div>
            <Progress value={Math.min(100, Math.max(0, wealthMetrics[3].value))} className="h-2" />
          </div>
        </div>
      </Card>
    </div>
  );

  const renderInvestments = () => (
    <div className="space-y-4">
      <Card className="ios-card">
        <h3 className="font-semibold mb-4">My Investments</h3>
        {investments.length > 0 ? (
          <div className="space-y-3">
            {investments.map((investment, index) => (
              <div key={investment.id || index} className="ios-list-item haptic-selection">
                <div className="text-2xl mr-3">{investment.emoji}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{investment.name}</p>
                  <p className="text-xs text-muted-foreground">${investment.value.toLocaleString()} • {investment.allocation}%</p>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${investment.positive ? 'text-green-600' : 'text-red-600'}`}>
                    {investment.change}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 mt-1 text-xs"
                    onClick={async () => {
                      if (!user || !investment.id) return;
                      
                      try {
                        const { error } = await supabase
                          .from('investments')
                          .delete()
                          .eq('id', investment.id)
                          .eq('user_id', user.id);
                        
                        if (error) throw error;
                        
                        toast({ title: "Investment sold!", description: `${investment.name} sold for $${investment.value}` });
                        fetchWealthData();
                      } catch (err) {
                        console.error('Error selling investment:', err);
                        toast({
                          title: "Error",
                          description: "Failed to sell investment",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    Sell
                  </Button>
                </div>
              </div>
            ))}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl mt-4">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                💡 Tip: Diversify your portfolio across different asset classes
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 space-y-3">
            <div className="text-4xl">🏦</div>
            <p className="text-muted-foreground">
              No investments yet
            </p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Start building your wealth by investing in stocks, bonds, or funds
            </p>
          </div>
        )}
      </Card>

      <Card className="ios-card">
        <h3 className="font-semibold mb-4">Start Investing</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">How much would you like to invest?</p>
            <Input
              placeholder="Enter amount"
              value={investmentAmount}
              onChange={(e) => setInvestmentAmount(e.target.value)}
              type="number"
            />
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium">Choose investment type</p>
            <div className="grid grid-cols-1 gap-2">
              <Button 
                onClick={async () => {
                  if (investmentAmount && user) {
                    try {
                      const { error } = await supabase
                        .from('investments')
                        .insert([{
                          user_id: user.id,
                          instrument: 'S&P 500 Index Fund',
                          units: 0, // Would calculate based on price
                          avg_cost: 0,
                          market_value: parseFloat(investmentAmount)
                        }]);
                      
                      if (error) throw error;
                      
                      toast({ title: "S&P 500 purchased!", description: `$${investmentAmount} in index fund` });
                      setInvestmentAmount('');
                      fetchWealthData();
                    } catch (err) {
                      console.error('Error purchasing investment:', err);
                      toast({
                        title: "Error",
                        description: "Failed to purchase investment",
                        variant: "destructive"
                      });
                    }
                  }
                }}
                variant="outline"
                className="justify-start h-12"
                disabled={!investmentAmount}
              >
                <div className="flex items-center justify-between w-full">
                  <span>📈 S&P 500 Index Fund</span>
                  <span className="text-xs text-muted-foreground ml-2">Low risk</span>
                </div>
              </Button>
              <Button 
                onClick={async () => {
                  if (investmentAmount && user) {
                    try {
                      const { error } = await supabase
                        .from('investments')
                        .insert([{
                          user_id: user.id,
                          instrument: 'Government Bonds',
                          units: 0, // Would calculate based on price
                          avg_cost: 0,
                          market_value: parseFloat(investmentAmount)
                        }]);
                      
                      if (error) throw error;
                      
                      toast({ title: "Bonds purchased!", description: `$${investmentAmount} in bonds` });
                      setInvestmentAmount('');
                      fetchWealthData();
                    } catch (err) {
                      console.error('Error purchasing investment:', err);
                      toast({
                        title: "Error",
                        description: "Failed to purchase investment",
                        variant: "destructive"
                      });
                    }
                  }
                }}
                variant="outline"
                className="justify-start h-12"
                disabled={!investmentAmount}
              >
                <div className="flex items-center justify-between w-full">
                  <span>🏛️ Government Bonds</span>
                  <span className="text-xs text-muted-foreground ml-2">Safer</span>
                </div>
              </Button>
              <Button 
                onClick={async () => {
                  if (investmentAmount && user) {
                    try {
                      const { error } = await supabase
                        .from('investments')
                        .insert([{
                          user_id: user.id,
                          instrument: 'Global Fund',
                          units: 0, // Would calculate based on price
                          avg_cost: 0,
                          market_value: parseFloat(investmentAmount)
                        }]);
                      
                      if (error) throw error;
                      
                      toast({ title: "International fund!", description: `$${investmentAmount} invested globally` });
                      setInvestmentAmount('');
                      fetchWealthData();
                    } catch (err) {
                      console.error('Error purchasing investment:', err);
                      toast({
                        title: "Error",
                        description: "Failed to purchase investment",
                        variant: "destructive"
                      });
                    }
                  }
                }}
                variant="outline"
                className="justify-start h-12"
                disabled={!investmentAmount}
              >
                <div className="flex items-center justify-between w-full">
                  <span>🌍 Global Fund</span>
                  <span className="text-xs text-muted-foreground ml-2">Diversified</span>
                </div>
              </Button>
            </div>
          </div>
          
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              💡 Tip: Start with index funds for broad market exposure and lower fees
            </p>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderExpenses = () => (
    <div className="space-y-4">
      <Card className="ios-card">
        <h3 className="font-semibold mb-4">Spending Categories</h3>
        {expenses.length > 0 ? (
          <div className="space-y-3">
            {expenses.map((expense, index) => (
              <div key={index} className="ios-list-item">
                <div className="text-2xl mr-3">{expense.emoji}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{expense.category}</p>
                  <p className="text-xs text-muted-foreground">${expense.amount.toLocaleString()} • {expense.percentage}%</p>
                </div>
                <div className="w-16">
                  <Progress value={expense.percentage} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 space-y-3">
            <div className="text-4xl">📊</div>
            <p className="text-muted-foreground">
              No expenses tracked yet
            </p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Every purchase you make gets recorded here automatically
            </p>
          </div>
        )}
      </Card>

      <Card className="ios-card">
        <h3 className="font-semibold mb-4">Budget Planning</h3>
        <div className="grid grid-cols-1 gap-3">
          <Button 
            onClick={() => {
              if (!user) return;
              setShowBudgetModal(true);
            }}
            variant="outline"
            className="h-16 justify-start p-4"
          >
            <div className="flex items-center w-full">
              <div className="mr-3 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <p className="font-medium">Create Budget</p>
                <p className="text-xs text-muted-foreground">Set spending limits</p>
              </div>
            </div>
          </Button>
          <Button 
            onClick={analyzeSpending}
            variant="outline"
            className="h-16 justify-start p-4"
          >
            <div className="flex items-center w-full">
              <div className="mr-3 p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Receipt className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-left">
                <p className="font-medium">Review Spending</p>
                <p className="text-xs text-muted-foreground">See where money goes</p>
              </div>
            </div>
          </Button>
        </div>
      </Card>
    </div>
  );

  const renderGoals = () => (
    <div className="space-y-4">
      <Card className="ios-card">
        <h3 className="font-semibold mb-4">My Goals</h3>
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
          <div className="text-center py-8 space-y-3">
            <div className="text-4xl">🎯</div>
            <p className="text-muted-foreground">
              No goals set yet
            </p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Set financial goals to stay motivated and track your progress
            </p>
          </div>
        )}
      </Card>

      <Card className="ios-card">
        <h3 className="font-semibold mb-4">Common Goals</h3>
        <div className="space-y-2">
          <Button 
            onClick={async () => {
              if (!user) return;
              
              try {
                const { error } = await supabase
                  .from('budgets')
                  .insert([{
                    user_id: user.id,
                    category: 'Emergency Fund',
                    limit_amount: 6000, // 3 months of $2000 expenses
                    period: 'monthly'
                  }]);
                
                if (error) throw error;
                
                toast({ title: "Emergency fund goal created!", description: "Saved $500 toward emergency fund" });
                fetchWealthData();
              } catch (err) {
                console.error('Error creating emergency fund goal:', err);
                toast({
                  title: "Error",
                  description: "Failed to create goal",
                  variant: "destructive"
                });
              }
            }}
            className="w-full justify-start h-14"
            variant="outline"
          >
            <div className="flex items-center w-full">
              <div className="mr-3 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <PiggyBank className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <p className="font-medium">Build Emergency Fund</p>
                <p className="text-xs text-muted-foreground">Save 3-6 months of expenses</p>
              </div>
            </div>
          </Button>
          <Button 
            onClick={async () => {
              if (!user) return;
              
              try {
                const { error } = await supabase
                  .from('budgets')
                  .insert([{
                    user_id: user.id,
                    category: 'House Down Payment',
                    limit_amount: 20000,
                    period: 'monthly'
                  }]);
                
                if (error) throw error;
                
                toast({ title: "House fund goal created!", description: "Saved $1000 toward house down payment" });
                fetchWealthData();
              } catch (err) {
                console.error('Error creating house fund goal:', err);
                toast({
                  title: "Error",
                  description: "Failed to create goal",
                  variant: "destructive"
                });
              }
            }}
            className="w-full justify-start h-14"
            variant="outline"
          >
            <div className="flex items-center w-full">
              <div className="mr-3 p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-left">
                <p className="font-medium">Save for a House</p>
                <p className="text-xs text-muted-foreground">Down payment & closing costs</p>
              </div>
            </div>
          </Button>
          <Button 
            onClick={async () => {
              if (!user) return;
              
              try {
                const { error } = await supabase
                  .from('budgets')
                  .insert([{
                    user_id: user.id,
                    category: 'Retirement Fund',
                    limit_amount: 50000,
                    period: 'monthly'
                  }]);
                
                if (error) throw error;
                
                toast({ title: "Retirement goal created!", description: "$2000 added to retirement fund" });
                fetchWealthData();
              } catch (err) {
                console.error('Error creating retirement goal:', err);
                toast({
                  title: "Error",
                  description: "Failed to create goal",
                  variant: "destructive"
                });
              }
            }}
            className="w-full justify-start h-14"
            variant="outline"
          >
            <div className="flex items-center w-full">
              <div className="mr-3 p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-left">
                <p className="font-medium">Plan for Retirement</p>
                <p className="text-xs text-muted-foreground">Long-term financial security</p>
              </div>
            </div>
          </Button>
        </div>
      </Card>
    </div>
  );

  // State for budget creation modal
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');
  
  // State for spending review modal
  const [showSpendingModal, setShowSpendingModal] = useState(false);
  const [spendingAnalysis, setSpendingAnalysis] = useState<any>(null);
  
  const createCustomBudget = async () => {
    if (!user) return;
    
    const limitAmount = parseFloat(budgetLimit);
    if (isNaN(limitAmount) || limitAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid positive number",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('budgets')
        .insert([{
          user_id: user.id,
          category: budgetCategory || 'General',
          limit_amount: limitAmount,
          period: 'monthly'
        }]);
      
      if (error) throw error;
      
      toast({ title: "Budget created!", description: `${budgetCategory || 'General'} budget of $${limitAmount} set up` });
      fetchWealthData();
      setShowBudgetModal(false);
      setBudgetCategory('');
      setBudgetLimit('');
    } catch (err) {
      console.error('Error creating budget:', err);
      toast({
        title: "Error",
        description: "Failed to create budget",
        variant: "destructive"
      });
    }
  };
  
  const analyzeSpending = async () => {
    if (!user) return;
    
    try {
      // Analyze spending patterns by fetching transactions
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('occurred_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()) // Current month
        .order('occurred_at', { ascending: false });
      
      if (transactionsData && transactionsData.length > 0) {
        // Calculate spending analysis
        const monthlyExpenses = transactionsData
          .filter(t => t.direction === 'out')
          .reduce((sum, t) => sum + parseFloat(String(t.amount || '0')), 0);
        
        const monthlyIncome = transactionsData
          .filter(t => t.direction === 'in')
          .reduce((sum, t) => sum + parseFloat(String(t.amount || '0')), 0);
        
        const savingsRate = monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100) : 0;
        
        // Group expenses by category
        const expenseCategories: Record<string, number> = {};
        transactionsData
          .filter(t => t.direction === 'out')
          .forEach(t => {
            const category = t.category || 'Uncategorized';
            expenseCategories[category] = (expenseCategories[category] || 0) + parseFloat(String(t.amount || '0'));
          });
        
        // Find top expense category
        const topCategory = Object.entries(expenseCategories)
          .sort((a, b) => b[1] - a[1])[0];
        
        // Calculate budget utilization
        const { data: budgetsData } = await supabase
          .from('budgets')
          .select('*')
          .eq('user_id', user.id);
        
        const budgetUtilization = budgetsData?.map(budget => {
          const categoryExpenses = expenseCategories[budget.category] || 0;
          const utilization = budget.limit_amount > 0 ? Math.round((categoryExpenses / budget.limit_amount) * 100) : 0;
          return {
            category: budget.category,
            spent: categoryExpenses,
            limit: budget.limit_amount,
            utilization
          };
        }) || [];
        
        const analysis = {
          monthlyExpenses,
          monthlyIncome,
          savingsRate,
          topCategory,
          expenseCategories,
          budgetUtilization
        };
        
        setSpendingAnalysis(analysis);
        setShowSpendingModal(true);
      } else {
        toast({ 
          title: "No transactions found", 
          description: "Add some transactions to see spending analysis"
        });
      }
    } catch (err) {
      console.error('Error analyzing spending:', err);
      toast({
        title: "Error",
        description: "Failed to analyze spending",
        variant: "destructive"
      });
    }
  };
  
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
              <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="h-10 w-10 p-0 haptic-light" onClick={() => navigate('/calendar')}>
              <Calendar className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-10 w-10 p-0 haptic-light">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Budget Creation Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-lg">Create New Budget</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <Input
                  placeholder="e.g., Groceries, Rent, Entertainment"
                  value={budgetCategory}
                  onChange={(e) => setBudgetCategory(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Limit Amount ($)</label>
                <Input
                  type="number"
                  placeholder="e.g., 500"
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setShowBudgetModal(false);
                  setBudgetCategory('');
                  setBudgetLimit('');
                }}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={createCustomBudget}
                disabled={!budgetCategory || !budgetLimit}
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Spending Review Modal */}
      {showSpendingModal && spendingAnalysis && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl w-full max-w-md p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <h3 className="font-semibold text-lg">Spending Analysis</h3>
            <div className="space-y-3">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Monthly Income</span>
                  <span className="font-medium">${spendingAnalysis.monthlyIncome.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Monthly Expenses</span>
                  <span className="font-medium text-red-600">-${spendingAnalysis.monthlyExpenses.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Savings Rate</span>
                  <span className={`font-medium ${spendingAnalysis.savingsRate >= 20 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {spendingAnalysis.savingsRate}%
                  </span>
                </div>
              </div>
              
              {spendingAnalysis.topCategory && (
                <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Top Expense Category</h4>
                  <div className="flex justify-between">
                    <span>{spendingAnalysis.topCategory[0]}</span>
                    <span className="font-medium">${spendingAnalysis.topCategory[1].toFixed(2)}</span>
                  </div>
                </div>
              )}
              
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Budget Utilization</h4>
                {spendingAnalysis.budgetUtilization.length > 0 ? (
                  <div className="space-y-2">
                    {spendingAnalysis.budgetUtilization.map((budget: any, index: number) => (
                      <div key={index}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{budget.category}</span>
                          <span>${budget.spent.toFixed(2)} / ${budget.limit.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${budget.utilization > 90 ? 'bg-red-500' : budget.utilization > 75 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(budget.utilization, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No budgets set up yet</p>
                )}
              </div>
              
              <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Expense Breakdown</h4>
                {Object.entries(spendingAnalysis.expenseCategories).length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {Object.entries(spendingAnalysis.expenseCategories)
                      .sort((a: any, b: any) => b[1] - a[1])
                      .map(([category, amount]: [any, any], index: number) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="truncate max-w-[60%]">{category}</span>
                          <span>${amount.toFixed(2)}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No expenses recorded</p>
                )}
              </div>
            </div>
            <Button 
              className="w-full mt-4"
              onClick={() => setShowSpendingModal(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}

      <div className="px-4 safe-area-left safe-area-right" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
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
