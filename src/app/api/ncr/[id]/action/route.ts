import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getNCRById,
  updateNCRTransaction,
  getAllUsers,
} from "@/server/repositories/ncr";
import { WorkflowActionSchema } from "@/lib/validators";
import { transition, WorkflowError } from "@/lib/workflow/engine";
import { SafeUser } from "@/types/ncr";

function unauth() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sess = await getServerSession(authOptions);
  if (!sess?.user) return unauth();

  const sessionUser = sess.user as any;
  const { id } = await params;

  const body = await req.json();
  const parsed = WorkflowActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Pre-fetch users for name snapshots
  const allUsers: SafeUser[] = await getAllUsers();
  const userMap = new Map(allUsers.map((u) => [u.id, u]));
  const userLookup = (id: string) => userMap.get(id);

  try {
    const ncr = await updateNCRTransaction(id, (currentNCR) => {
      const actor = { userId: sessionUser.id, userName: sessionUser.name };
      const result = transition(currentNCR, actor, parsed.data, userLookup);
      return result;
    });

    return NextResponse.json({ ncr });
  } catch (err: unknown) {
    if (err instanceof WorkflowError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("Workflow action error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
