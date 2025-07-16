import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  email: string;
  organizationName: string;
  role: string;
  inviterName: string;
  invitationToken: string;
  expiresAt: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      email, 
      organizationName, 
      role, 
      inviterName, 
      invitationToken, 
      expiresAt 
    }: InvitationEmailRequest = await req.json();

    console.log("Sending invitation email to:", email);

    const acceptUrl = `${new URL(req.url).origin}/accept-invitation?token=${invitationToken}`;
    const expiryDate = new Date(expiresAt).toLocaleDateString();

    const roleDescriptions = {
      'admin': 'Admin - Can manage team and settings',
      'assessor': 'Assessor - Can create and edit assessments', 
      'viewer': 'Viewer - Can view assessments'
    };

    const roleDescription = roleDescriptions[role as keyof typeof roleDescriptions] || role;

    const emailResponse = await resend.emails.send({
      from: "Maturion <noreply@yourdomain.com>", // Replace with your verified domain
      to: [email],
      subject: `You're invited to join ${organizationName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Team Invitation</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 32px 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 32px 24px; }
            .org-info { background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .org-name { font-size: 20px; font-weight: 600; color: #1e293b; margin: 0; }
            .role-badge { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 500; margin-top: 8px; }
            .cta-button { display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; margin: 24px 0; transition: background 0.2s; }
            .cta-button:hover { background: #4f46e5; }
            .details { margin: 24px 0; padding: 16px; border-left: 3px solid #6366f1; background: #f8fafc; }
            .footer { text-align: center; padding: 24px; background: #f8fafc; color: #64748b; font-size: 14px; }
            .expires { color: #dc2626; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 You're Invited!</h1>
              <p style="margin: 8px 0 0 0; opacity: 0.9;">Join your team on Maturion</p>
            </div>
            
            <div class="content">
              <p>Hi there!</p>
              
              <p><strong>${inviterName}</strong> has invited you to join their organization on Maturion, a maturity assessment platform.</p>
              
              <div class="org-info">
                <div class="org-name">${organizationName}</div>
                <div class="role-badge">${roleDescription}</div>
              </div>
              
              <p>As a ${role}, you'll be able to participate in maturity assessments and help drive organizational improvement.</p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${acceptUrl}" class="cta-button">Accept Invitation</a>
              </div>
              
              <div class="details">
                <p><strong>What happens next?</strong></p>
                <ol>
                  <li>Click the "Accept Invitation" button above</li>
                  <li>Sign in to your Maturion account (or create one if needed)</li>
                  <li>Start collaborating with your team</li>
                </ol>
              </div>
              
              <p class="expires">⏰ This invitation expires on ${expiryDate}</p>
              
              <p style="color: #64748b; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
            </div>
            
            <div class="footer">
              <p>Sent by Maturion • Maturity Assessment Platform</p>
              <p>If you have any questions, please contact your team administrator.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id,
      message: "Invitation email sent successfully" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-invitation function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: "Failed to send invitation email"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);