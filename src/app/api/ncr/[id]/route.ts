import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getNCRById,
  updateNCR,
  deleteNCR,
  getUserById,
} from "@/server/repositories/ncr";
import { UpdateDraftSchema } from "@/lib/validators";
import { now } from "@/lib/utils";

function unauth() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
function notFound() {
  return NextResponse.json({ error: "NCR not found" }, { status: 404 });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sess = await getServerSession(authOptions);
  if (!sess?.user) return unauth();

  const { id } = await params;
  const userId = (sess.user as any).id as string;
  const ncr = await getNCRById(id);
  if (!ncr) return notFound();

  // Access control: must be a participant
  if (
    !ncr.participantIds.includes(userId) &&
    !(sess.user as any).roles?.includes("ADMIN")
  ) {
    return forbidden();
  }

  return NextResponse.json({ ncr });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sess = await getServerSession(authOptions);
  if (!sess?.user) return unauth();

  const { id } = await params;
  const user = sess.user as any;
  const ncr = await getNCRById(id);
  if (!ncr) return notFound();

  // Only creator can edit draft
  if (ncr.createdBy !== user.id) return forbidden();
  if (ncr.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only drafts can be edited." },
      { status: 400 },
    );
  }

  const body = await req.json();
  const parsed = UpdateDraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { problem, severity, department, approver1 } = parsed.data;
  const approverUser = await getUserById(approver1);
  if (!approverUser) {
    return NextResponse.json(
      { error: "Approver 1 not found." },
      { status: 400 },
    );
  }

  await updateNCR(id, {
    problem,
    severity,
    department,
    steps:
      ncr.steps.length > 0
        ? [
            {
              ...ncr.steps[0],
              assignedUserId: approverUser.id,
              assignedUserName: approverUser.name,
            },
          ]
        : [],
    updatedAt: now(),
  });

  const updated = await getNCRById(id);
  return NextResponse.json({ ncr: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sess = await getServerSession(authOptions);
  if (!sess?.user) return unauth();

  const { id } = await params;
  const user = sess.user as any;
  const ncr = await getNCRById(id);
  if (!ncr) return notFound();

  if (ncr.createdBy !== user.id) return forbidden();
  if (ncr.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only drafts can be deleted." },
      { status: 400 },
    );
  }

  await deleteNCR(id);
  return NextResponse.json({ ok: true });
}
