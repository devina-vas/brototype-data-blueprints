import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LogOut, AlertCircle, CheckCircle2, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type ComplaintWithProfile = {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  description: string;
  student_id: string;
  student_email: string;
  attachment_url: string | null;
  admin_remarks: string | null;
  priority: string;
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [complaints, setComplaints] = useState<ComplaintWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintWithProfile | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [remarks, setRemarks] = useState("");

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
        .select('id, email');

      if (profilesError) throw profilesError;

      const profileMap = new Map(profilesData?.map(p => [p.id, p.email]) || []);
      
      const complaintsWithEmail = complaintsData?.map(c => ({
        ...c,
        student_email: profileMap.get(c.student_id) || 'Unknown'
      })) || [];
      
      setComplaints(complaintsWithEmail);
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

  const handleUpdateStatus = async () => {
    if (!selectedComplaint || !newStatus) return;

    try {
      const oldStatus = selectedComplaint.status;

      const { error: updateError } = await supabase
        .from('complaints')
        .update({ 
          status: newStatus,
          admin_remarks: remarks || null,
          resolved_by: newStatus === 'Resolved' ? user?.id : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedComplaint.id);

      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from('status_history')
        .insert({
          complaint_id: selectedComplaint.id,
          updated_by: user?.id,
          old_status: oldStatus,
          new_status: newStatus,
          remarks: remarks || null
        });

      if (historyError) throw historyError;

      toast.success("Complaint status updated successfully!");
      setSelectedComplaint(null);
      setNewStatus("");
      setRemarks("");
      fetchComplaints();
    } catch (error: any) {
      toast.error(error.message || "Failed to update complaint");
    }
  };

  const stats = {
    total: complaints.length,
    open: complaints.filter((c) => c.status === "Open").length,
    inProgress: complaints.filter((c) => c.status === "In Progress").length,
    resolved: complaints.filter((c) => c.status === "Resolved").length,
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
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Complaints</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Open</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.open}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.resolved}</div>
            </CardContent>
          </Card>
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
            <Card key={complaint.id} className="hover:shadow-md transition-shadow">
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
                    <p className="text-sm text-muted-foreground">{complaint.description}</p>
                    {complaint.attachment_url && (
                      <div className="mt-2">
                        <a 
                          href={complaint.attachment_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          📎 View Attachment
                        </a>
                      </div>
                    )}
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setSelectedComplaint(complaint)}>
                        Update Status
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Update Complaint Status</DialogTitle>
                        <DialogDescription>
                          Change the status and add remarks for complaint #{complaint.id}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>New Status</Label>
                          <Select value={newStatus} onValueChange={setNewStatus}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Open">Open</SelectItem>
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Resolved">Resolved</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Admin Remarks</Label>
                          <Textarea
                            placeholder="Add notes about the action taken..."
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            rows={3}
                          />
                        </div>
                        <Button onClick={handleUpdateStatus} className="w-full">
                          Update Status
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="font-medium">{complaint.category}</span>
                  <span>•</span>
                  <span>{new Date(complaint.created_at).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{complaint.student_email}</span>
                  <span>•</span>
                  <span className="text-primary">ID: {complaint.id.slice(0, 8)}</span>
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
