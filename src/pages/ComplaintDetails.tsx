import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, AlertCircle, CheckCircle2, Clock, Download, ExternalLink, FileText } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";

type ComplaintDetails = {
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

const ComplaintDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [complaint, setComplaint] = useState<ComplaintDetails | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (id) {
      fetchComplaintDetails();
      fetchStatusHistory();
    }
  }, [id]);

  const fetchComplaintDetails = async () => {
    try {
      const { data: complaintData, error: complaintError } = await supabase
        .from('complaints')
        .select('*')
        .eq('id', id)
        .single();

      if (complaintError) throw complaintError;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('email, name')
        .eq('id', complaintData.student_id)
        .single();

      if (profileError) throw profileError;

      setComplaint({
        ...complaintData,
        student_email: profileData.email,
        student_name: profileData.name
      });
    } catch (error: any) {
      toast.error("Failed to load complaint details");
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  };

  const fetchStatusHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('status_history')
        .select('*')
        .eq('complaint_id', id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setStatusHistory(data || []);
    } catch (error: any) {
      console.error("Failed to load status history:", error);
    }
  };

  const handleUpdateStatus = async () => {
    if (!newStatus || !complaint) {
      toast.error("Please select a status");
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('complaints')
        .update({
          status: newStatus,
          admin_remarks: remarks || null,
          resolved_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', complaint.id);

      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from('status_history')
        .insert({
          complaint_id: complaint.id,
          old_status: complaint.status,
          new_status: newStatus,
          remarks: remarks || null,
          updated_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (historyError) throw historyError;

      toast.success("Status updated successfully");
      setShowUpdateDialog(false);
      setNewStatus("");
      setRemarks("");
      fetchComplaintDetails();
      fetchStatusHistory();
    } catch (error: any) {
      toast.error("Failed to update status");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Open":
        return <AlertCircle className="h-5 w-5" />;
      case "In Progress":
        return <Clock className="h-5 w-5" />;
      case "Resolved":
        return <CheckCircle2 className="h-5 w-5" />;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading complaint details...</p>
      </div>
    );
  }

  if (!complaint) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={logo} alt="Brototype" className="h-10 w-10" />
            <div>
              <h1 className="text-xl font-bold">Complaint Details</h1>
              <p className="text-sm text-muted-foreground">ID: {complaint.id.slice(0, 8)}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="grid gap-6">
          {/* Main Complaint Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-3xl">{complaint.title}</CardTitle>
                    <Badge variant={getStatusVariant(complaint.status)} className="flex items-center gap-2">
                      {getStatusIcon(complaint.status)}
                      {complaint.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="font-medium">{complaint.category}</span>
                    <span>•</span>
                    <span>Submitted {new Date(complaint.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <Badge variant="outline">{complaint.priority}</Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Student Information */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Student Information</h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Name:</span>
                    <span className="text-sm text-muted-foreground">{complaint.student_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Email:</span>
                    <span className="text-sm text-muted-foreground">{complaint.student_email}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Description</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{complaint.description}</p>
              </div>

              {/* Attachment */}
              {complaint.attachment_url && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Attachment</h3>
                  <div className="border rounded-lg p-4">
                    {complaint.attachment_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <div className="space-y-3">
                        <img 
                          src={complaint.attachment_url} 
                          alt="Complaint attachment" 
                          className="max-w-full h-auto rounded-lg border"
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(complaint.attachment_url!, '_blank')}
                            className="flex items-center gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Open in New Tab
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = complaint.attachment_url!;
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
                    ) : (
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Attachment</p>
                          <p className="text-xs text-muted-foreground">Click to view or download</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(complaint.attachment_url!, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = complaint.attachment_url!;
                              link.download = 'attachment';
                              link.click();
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Admin Remarks */}
              {complaint.admin_remarks && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Admin Notes</h3>
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                    <p className="text-sm text-foreground">{complaint.admin_remarks}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status History Card */}
          <Card>
            <CardHeader>
              <CardTitle>Status History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statusHistory.length > 0 ? (
                  statusHistory.map((history) => (
                    <div key={history.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                      <div className="mt-1">
                        {getStatusIcon(history.new_status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getStatusVariant(history.new_status)}>
                            {history.new_status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(history.updated_at).toLocaleString()}
                          </span>
                        </div>
                        {history.remarks && (
                          <p className="text-sm text-muted-foreground mt-2">{history.remarks}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No status updates yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Update Status Button */}
          <Button onClick={() => setShowUpdateDialog(true)} size="lg">
            Update Status
          </Button>
        </div>
      </main>

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
                rows={4}
              />
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

export default ComplaintDetails;
