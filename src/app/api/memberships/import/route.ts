import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parseMembershipSheet } from "@/lib/excel";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !["super_admin", "organizer", "volunteer"].includes(user.role)) {
      return NextResponse.json(
        { error: "Forbidden: Authorized volunteer or staff role required" },
        { status: 403 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    let fileBuffer: ArrayBuffer | Uint8Array | string;
    let mode: "preview" | "execute" = "preview";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      mode = (formData.get("mode") as "preview" | "execute") || "preview";
      if (!file) {
        return NextResponse.json({ error: "No file provided in form data" }, { status: 400 });
      }
      fileBuffer = await file.arrayBuffer();
    } else {
      const body = await req.json();
      mode = body.mode || "preview";
      if (body.fileBase64) {
        const binaryString = atob(body.fileBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        fileBuffer = bytes;
      } else if (body.csvContent) {
        fileBuffer = body.csvContent;
      } else {
        return NextResponse.json({ error: "No file content or base64 provided" }, { status: 400 });
      }
    }

    const parsed = parseMembershipSheet(fileBuffer);

    if (parsed.totalRows === 0) {
      return NextResponse.json({ error: "No student records found in uploaded sheet" }, { status: 400 });
    }

    // If preview mode, return validation preview without committing to DB
    if (mode === "preview") {
      return NextResponse.json({
        preview: {
          totalRows: parsed.totalRows,
          validRows: parsed.validRows,
          invalidRows: parsed.invalidRows,
          duplicatePrns: parsed.duplicatePrns,
          sampleRows: parsed.records.slice(0, 15),
        },
      });
    }

    // Execute mode: Run safe upsert into DB
    const validDataToImport = parsed.records.filter((r) => r.isValid);
    const result = await db.bulkImportMemberships(validDataToImport, {
      id: user.id,
      name: user.full_name,
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalProcessed: parsed.totalRows,
        inserted: result.inserted,
        updated: result.updated,
        skipped: result.skipped + parsed.invalidRows,
        duplicatePrns: parsed.duplicatePrns,
        errors: [
          ...parsed.records.filter((r) => !r.isValid).map((r) => `${r.prn || "Row"}: ${r.error}`),
          ...result.errors,
        ],
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Spreadsheet processing failed" }, { status: 500 });
  }
}
