import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'complaint_created' | 'status_updated';
  studentEmail: string;
  studentName: string;
  complaintTitle: string;
  complaintId: string;
  status?: string;
  adminRemarks?: string;
  adminEmails?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      type, 
      studentEmail, 
      studentName,
      complaintTitle, 
      complaintId,
      status,
      adminRemarks,
      adminEmails = ['talk@brototype.com', 'admin@brototype.com']
    }: NotificationRequest = await req.json();

    const emails = [];

    if (type === 'complaint_created') {
      // Email to student
      emails.push(resend.emails.send({
        from: "Brototype <onboarding@resend.dev>",
        to: [studentEmail],
        subject: "Complaint Received - " + complaintTitle,
        html: `
          <h1>Hello ${studentName}!</h1>
          <p>We have received your complaint and our team will review it shortly.</p>
          <h2>Complaint Details:</h2>
          <p><strong>Title:</strong> ${complaintTitle}</p>
          <p><strong>ID:</strong> ${complaintId.slice(0, 8)}</p>
          <p><strong>Status:</strong> Open</p>
          <p>You can track your complaint status in your dashboard.</p>
          <p>Best regards,<br>Brototype Admin Team</p>
        `,
      }));

      // Email to admins
      emails.push(resend.emails.send({
        from: "Brototype <onboarding@resend.dev>",
        to: adminEmails,
        subject: "New Complaint Submitted - " + complaintTitle,
        html: `
          <h1>New Complaint Alert</h1>
          <p>A new complaint has been submitted by ${studentName}.</p>
          <h2>Details:</h2>
          <p><strong>Title:</strong> ${complaintTitle}</p>
          <p><strong>Student:</strong> ${studentName} (${studentEmail})</p>
          <p><strong>ID:</strong> ${complaintId.slice(0, 8)}</p>
          <p>Please review and respond to this complaint in the admin portal.</p>
        `,
      }));
    } else if (type === 'status_updated') {
      // Email to student about status update
      emails.push(resend.emails.send({
        from: "Brototype <onboarding@resend.dev>",
        to: [studentEmail],
        subject: "Complaint Status Updated - " + complaintTitle,
        html: `
          <h1>Hello ${studentName}!</h1>
          <p>Your complaint status has been updated.</p>
          <h2>Complaint Details:</h2>
          <p><strong>Title:</strong> ${complaintTitle}</p>
          <p><strong>ID:</strong> ${complaintId.slice(0, 8)}</p>
          <p><strong>New Status:</strong> ${status}</p>
          ${adminRemarks ? `<p><strong>Admin Remarks:</strong> ${adminRemarks}</p>` : ''}
          <p>You can view full details in your dashboard.</p>
          <p>Best regards,<br>Brototype Admin Team</p>
        `,
      }));
    }

    await Promise.all(emails);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
