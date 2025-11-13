import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { LogOut, AlertCircle, CheckCircle2, Clock, FileText, Download, ExternalLink } from "lucide-react";
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
  student_name: string;
  attachment_url: string | null;
  admin_remarks: string | null;
  priority: string;
};

type StatusHistory = {
  id: string;
  old_status: string;
  new_status: string;
  remarks: string | null;
  updated_at: string;
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [complaints, setComplaints] = useState<ComplaintWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintWithProfile | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [newStatus, setNewStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);

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
      
      const complaintsWithEmail = complaintsData?.map(c => {
        const profile = profileMap.get(c.student_id);
        return {
          ...c,
          student_email: profile?.email || 'Unknown',
          student_name: profile?.name || 'Unknown'
        };
      }) || [];
      
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

  const fetchStatusHistory = async (complaintId: string) => {
    try {
      const { data, error } = await supabase
        .from('status_history')
        .select('*')
        .eq('complaint_id', complaintId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setStatusHistory(data || []);
    } catch (error: any) {
      toast.error("Failed to load status history");
    }
  };

  const handleComplaintClick = (complaint: ComplaintWithProfile) => {
    setSelectedComplaint(complaint);
    fetchStatusHistory(complaint.id);
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
      setShowUpdateDialog(false);
      setNewStatus("");
      setRemarks("");
      fetchComplaints();
      if (selectedComplaint) {
        fetchStatusHistory(selectedComplaint.id);
      }
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

      {/* Detailed Complaint View Sheet */}
      <Sheet open={!!selectedComplaint} onOpenChange={(open) => !open && setSelectedComplaint(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          {selectedComplaint && (
            <>
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-2xl">{selectedComplaint.title}</SheetTitle>
                  <Badge variant={getStatusVariant(selectedComplaint.status)} className="flex items-center gap-1">
                    {getStatusIcon(selectedComplaint.status)}
                    {selectedComplaint.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                  <span className="font-medium">{selectedComplaint.category}</span>
                  <span>•</span>
                  <span>Submitted {new Date(selectedComplaint.created_at).toLocaleDateString()}</span>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Student Information */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Student Information</h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-foreground">{selectedComplaint.student_name}</p>
                    <p className="text-muted-foreground">{selectedComplaint.student_email}</p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground">{selectedComplaint.description}</p>
                </div>

                {/* Attachment */}
                {selectedComplaint.attachment_url && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Attachment</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(selectedComplaint.attachment_url!, '_blank')}
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Attachment
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = selectedComplaint.attachment_url!;
                          link.download = 'attachment';
                          link.click();
                        }}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                )}

                {/* Status History */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Status History</h3>
                  <div className="space-y-2">
                    {statusHistory.length > 0 ? (
                      statusHistory.map((history) => (
                        <div key={history.id} className="flex items-start gap-3 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {history.new_status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(history.updated_at).toLocaleString()}
                              </span>
                            </div>
                            {history.remarks && (
                              <p className="text-muted-foreground mt-1">{history.remarks}</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No status updates yet</p>
                    )}
                  </div>
                </div>

                {/* Update Status Button */}
                <Button 
                  onClick={() => setShowUpdateDialog(true)} 
                  className="w-full"
                >
                  Update Status
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Update Status Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Complaint Status</DialogTitle>
            <DialogDescription>
              Change the status and add resolution notes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
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
              <Label>Admin Note</Label>
              <Textarea
                placeholder="Add resolution notes or updates..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">0/{remarks.length} characters</p>
            </div>
            <Button onClick={handleUpdateStatus} className="w-full">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
