import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

/**
 * POST /api/interest
 * Submit sign-up interest. Saves to DB and optionally sends email notification.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const record = await prisma.interest.create({
      data: {
        name: name.trim(),
        email: trimmedEmail,
        message: message?.trim() || null,
      },
    });

    // Send email notification if Resend is configured
    const resendKey = process.env.RESEND_API_KEY;
    const contactEmail = process.env.CONTACT_EMAIL;
    if (resendKey && contactEmail) {
      try {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "AI SDR Website <onboarding@resend.dev>",
          to: contactEmail,
          subject: `[AI SDR] Sign-up interest from ${name.trim()}`,
          html: `
            <p><strong>New sign-up interest</strong></p>
            <p><strong>Name:</strong> ${name.trim()}</p>
            <p><strong>Email:</strong> ${trimmedEmail}</p>
            ${message?.trim() ? `<p><strong>Message:</strong></p><p>${message.trim().replace(/\n/g, "<br>")}</p>` : ""}
          `,
        });
      } catch (emailErr) {
        console.error("[Interest] Failed to send email:", emailErr);
        // Don't fail the request—we've saved to DB
      }
    }

    return NextResponse.json({ success: true, id: record.id });
  } catch (error) {
    console.error("[Interest] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
