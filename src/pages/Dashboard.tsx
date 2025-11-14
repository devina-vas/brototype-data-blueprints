import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, LogOut, AlertCircle, CheckCircle2, Clock, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import ContactInfo from "@/components/ContactInfo";

type Complaint = {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  description: string;
  student_id: string;
  attachment_url: string | null;
  priority: string;
  updated_at: string;
  resolved_by: string | null;
  admin_remarks: string | null;
};

type StatusHistory = {
  id: string;
  old_status: string;
  new_status: string;
  remarks: string | null;
  updated_at: string;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchComplaints();
    }
    
    const channel = supabase
      .channel('complaints-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'complaints',
          filter: `student_id=eq.${user?.id}`
        },
        () => {
          fetchComplaints();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user?.id)
        .maybeSingle();

      if (!error && data) {
        setUserName(data.name);
      }
    } catch (error) {
      console.error("Failed to load user profile:", error);
    }
  };

  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
    } catch (error: any) {
      toast.error("Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

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

  const handleViewStatus = async (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    
    try {
      const { data, error } = await supabase
        .from('status_history')
        .select('*')
        .eq('complaint_id', complaint.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setStatusHistory(data || []);
    } catch (error: any) {
      toast.error("Failed to load status history");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Brototype" className="h-10 w-10" />
            <div>
              <h1 className="text-xl font-bold">Complaint Portal</h1>
              <p className="text-sm text-muted-foreground">Hi {userName || user?.email}!</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ContactInfo />
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold">My Complaints</h2>
            <p className="text-muted-foreground">Track and manage your submitted complaints</p>
          </div>
          <Button onClick={() => navigate("/new-complaint")}>
            <Plus className="h-4 w-4 mr-2" />
            New Complaint
          </Button>
        </div>

        <div className="grid gap-4">
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading complaints...</p>
              </CardContent>
            </Card>
          ) : complaints.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No complaints submitted yet</p>
                <Button onClick={() => navigate("/new-complaint")} className="mt-4">
                  Submit Your First Complaint
                </Button>
              </CardContent>
            </Card>
          ) : (
            complaints.map((complaint) => (
              <Card key={complaint.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle>{complaint.title}</CardTitle>
                      <CardDescription>{complaint.description}</CardDescription>
                    </div>
                    <Badge variant={getStatusVariant(complaint.status)} className="flex items-center gap-1">
                      {getStatusIcon(complaint.status)}
                      {complaint.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="font-medium">{complaint.category}</span>
                      <span>•</span>
                      <span>{new Date(complaint.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="text-primary">ID: {complaint.id.slice(0, 8)}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewStatus(complaint)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Check Status
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      {/* Status Details Dialog */}
      <Dialog open={!!selectedComplaint} onOpenChange={(open) => !open && setSelectedComplaint(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedComplaint && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedComplaint.title}</DialogTitle>
                <DialogDescription>
                  <div className="flex items-center gap-2 pt-2">
                    <Badge variant={getStatusVariant(selectedComplaint.status)} className="flex items-center gap-1">
                      {getStatusIcon(selectedComplaint.status)}
                      {selectedComplaint.status}
                    </Badge>
                    <span>•</span>
                    <span>{selectedComplaint.category}</span>
                    <span>•</span>
                    <span>ID: {selectedComplaint.id.slice(0, 8)}</span>
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Description */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground">{selectedComplaint.description}</p>
                </div>

                {/* Attachment Preview */}
                {selectedComplaint.attachment_url && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Attachment</h3>
                    {selectedComplaint.attachment_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img 
                        src={selectedComplaint.attachment_url} 
                        alt="Complaint attachment" 
                        className="max-w-full h-auto rounded-lg border"
                      />
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(selectedComplaint.attachment_url!, '_blank')}
                      >
                        View Attachment
                      </Button>
                    )}
                  </div>
                )}

                {/* Admin Remarks */}
                {selectedComplaint.admin_remarks && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Admin Notes</h3>
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                      <p className="text-sm">{selectedComplaint.admin_remarks}</p>
                    </div>
                  </div>
                )}

                {/* Status History */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Status History</h3>
                  <div className="space-y-3">
                    {statusHistory.length > 0 ? (
                      statusHistory.map((history) => (
                        <div key={history.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                          <Clock className="h-4 w-4 text-muted-foreground mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {history.new_status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(history.updated_at).toLocaleString()}
                              </span>
                            </div>
                            {history.remarks && (
                              <p className="text-sm text-muted-foreground">{history.remarks}</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No status updates yet</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
