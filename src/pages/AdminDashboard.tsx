import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, AlertCircle, CheckCircle2, Clock, FileText, TrendingUp, BarChart3, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

type ComplaintWithProfile = {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  description: string;
  student_id: string;
  student_email: string;
  student_name: string;
  attachment_url: string | null;
  admin_remarks: string | null;
  priority: string;
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [complaints, setComplaints] = useState<ComplaintWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchComplaints();
    
    const channel = supabase
      .channel('admin-complaints-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'complaints'
        },
        () => {
          fetchComplaints();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchComplaints = async () => {
    try {
      const { data: complaintsData, error: complaintsError } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (complaintsError) throw complaintsError;

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, name');

      if (profilesError) throw profilesError;

      const profileMap = new Map(profilesData?.map(p => [p.id, { email: p.email, name: p.name }]) || []);
      
      const complaintsWithProfile = complaintsData?.map(c => {
        const profile = profileMap.get(c.student_id);
        return {
          ...c,
          student_email: profile?.email || 'Unknown',
          student_name: profile?.name || 'Unknown'
        };
      }) || [];
      
      setComplaints(complaintsWithProfile);
    } catch (error: any) {
      toast.error("Failed to load complaints");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchComplaints();
    toast.success("Data refreshed successfully");
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const handleComplaintClick = (complaint: ComplaintWithProfile) => {
    navigate(`/admin/complaint/${complaint.id}`);
  };

  const stats = {
    total: complaints.length,
    open: complaints.filter((c) => c.status === "Open").length,
    inProgress: complaints.filter((c) => c.status === "In Progress").length,
    resolved: complaints.filter((c) => c.status === "Resolved").length,
  };

  const categoryData = complaints.reduce((acc, complaint) => {
    const category = complaint.category;
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartCategoryData = Object.entries(categoryData).map(([name, value]) => ({
    name,
    value,
  }));

  const statusChartData = [
    { name: "Open", value: stats.open, color: "hsl(var(--warning))" },
    { name: "In Progress", value: stats.inProgress, color: "hsl(var(--primary))" },
    { name: "Resolved", value: stats.resolved, color: "hsl(var(--success))" },
  ].filter(item => item.value > 0);

  const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))"];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Open":
        return <AlertCircle className="h-4 w-4" />;
      case "In Progress":
        return <Clock className="h-4 w-4" />;
      case "Resolved":
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "outline" => {
    switch (status) {
      case "Open":
        return "default";
      case "In Progress":
        return "secondary";
      case "Resolved":
        return "outline";
      default:
        return "default";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Brototype" className="h-10 w-10" />
            <div>
              <h1 className="text-xl font-bold">Admin Portal</h1>
              <p className="text-sm text-muted-foreground">Manage all complaints</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Complaints</CardTitle>
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">All time</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Open</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-700 dark:text-orange-300">{stats.open}</div>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Awaiting review</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 border-yellow-200 dark:border-yellow-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-300">{stats.inProgress}</div>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Being handled</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700 dark:text-green-300">{stats.resolved}</div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}% completion
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Dashboard */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b">
            <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
              <p className="text-sm text-muted-foreground">Comprehensive complaint insights and trends</p>
            </div>
          </div>
          
          <div className="grid gap-6 lg:grid-cols-2 mb-8">
            {/* Status Distribution Pie Chart */}
            <Card className="shadow-lg border-2 hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-md bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                    <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Status Distribution</CardTitle>
                    <CardDescription className="text-xs">Current complaint status breakdown</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    Open: {
                      label: "Open",
                      color: "hsl(var(--chart-1))",
                    },
                    "In Progress": {
                      label: "In Progress",
                      color: "hsl(var(--chart-2))",
                    },
                    Resolved: {
                      label: "Resolved",
                      color: "hsl(var(--chart-3))",
                    },
                  }}
                  className="h-[280px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        <linearGradient id="statusGradient1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f97316" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#ea580c" stopOpacity={0.9}/>
                        </linearGradient>
                        <linearGradient id="statusGradient2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#eab308" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#ca8a04" stopOpacity={0.9}/>
                        </linearGradient>
                        <linearGradient id="statusGradient3" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#16a34a" stopOpacity={0.9}/>
                        </linearGradient>
                      </defs>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={90}
                        innerRadius={50}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusChartData.map((entry, index) => {
                          const gradients = ['url(#statusGradient1)', 'url(#statusGradient2)', 'url(#statusGradient3)'];
                          return <Cell key={`cell-${index}`} fill={gradients[index % gradients.length]} stroke="hsl(var(--background))" strokeWidth={2} />;
                        })}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }} 
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        iconType="circle"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Complaints by Category Bar Chart */}
            <Card className="shadow-lg border-2 hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-md bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
                    <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Complaints by Category</CardTitle>
                    <CardDescription className="text-xs">Distribution across different categories</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {chartCategoryData.length === 0 ? (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                    No category data available
                  </div>
                ) : (
                  <ChartContainer
                    config={{
                      value: {
                        label: "Complaints",
                        color: "hsl(var(--chart-4))",
                      },
                    }}
                    className="h-[280px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartCategoryData}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9}/>
                          <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.7}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="name" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
                      />
                      <Bar 
                        dataKey="value" 
                        fill="url(#barGradient)" 
                        radius={[8, 8, 0, 0]}
                        maxBarSize={60}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-6">All Complaints</h2>

        <div className="grid gap-4">
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading complaints...</p>
              </CardContent>
            </Card>
          ) : complaints.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">No complaints found</p>
              </CardContent>
            </Card>
          ) : complaints.map((complaint) => (
            <Card 
              key={complaint.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleComplaintClick(complaint)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{complaint.title}</h3>
                      <Badge variant={getStatusVariant(complaint.status)} className="flex items-center gap-1">
                        {getStatusIcon(complaint.status)}
                        {complaint.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{complaint.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="font-medium">{complaint.category}</span>
                    <span>•</span>
                    <span>{new Date(complaint.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="text-primary">ID: {complaint.id.slice(0, 8)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-foreground">{complaint.student_name}</span>
                    <span className="text-muted-foreground"> • {complaint.student_email}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
