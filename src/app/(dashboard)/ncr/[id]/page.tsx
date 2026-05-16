import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getNCRById, getAllUsers } from "@/server/repositories/ncr";
import { canUserAct, fmtDate } from "@/lib/utils";
import { StatusBadge, SeverityBadge } from "@/components/ui/badges";
import { SafeUser, NCR, NCRStep } from "@/types/ncr";
import ActionPanel from "@/components/workflow/ActionPanel";
import Link from "next/link";
import { initials } from "@/lib/utils";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-stone-400 mb-1">
        {label}
      </div>
      <div className="text-sm text-stone-800">{children}</div>
    </div>
  );
}

function StepSection({
  step,
  title,
  actor,
  workers,
}: {
  step: NCRStep | undefined;
  title: string;
  actor: string;
  workers?: { userId: string; userName: string }[];
}) {
  if (!step) return null;
  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-stone-400">
          {title}
        </span>
        <span className="text-xs text-stone-400 font-mono">{actor}</span>
      </div>
      <div className="px-5 py-4 grid grid-cols-2 gap-4">
        <Field label="Assigned to">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-emerald-700 text-white text-xs flex items-center justify-center font-mono">
              {initials(step.assignedUserName)}
            </div>
            {step.assignedUserName}
          </div>
        </Field>
        <Field label="Decision">
          {step.action ? (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium ${step.action === "APPROVED" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
            >
              {step.action}
            </span>
          ) : (
            <span className="text-stone-400 text-xs italic">Pending</span>
          )}
        </Field>
        {step.comment && (
          <div className="col-span-2">
            <Field label="Comment">
              <div className="mt-1 px-3 py-2 bg-stone-50 border-l-2 border-stone-300 rounded text-sm whitespace-pre-wrap">
                {step.comment}
              </div>
            </Field>
          </div>
        )}
        {workers && workers.length > 0 && (
          <div className="col-span-2">
            <Field label="Workers (view-only)">
              <div className="flex flex-wrap gap-2 mt-1">
                {workers.map((w) => (
                  <div
                    key={w.userId}
                    className="flex items-center gap-1 text-xs text-stone-600 bg-stone-100 px-2 py-0.5 rounded"
                  >
                    <div className="w-4 h-4 rounded-full bg-stone-400 text-white text-xs flex items-center justify-center font-mono">
                      {initials(w.userName)}
                    </div>
                    {w.userName}
                  </div>
                ))}
              </div>
            </Field>
          </div>
        )}
      </div>
    </div>
  );
}

export default async function NCRDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as any;
  const { id } = await params;
  const [ncr, allUsers] = await Promise.all([getNCRById(id), getAllUsers()]);

  if (!ncr) notFound();

  // Access control
  const isAdmin = user.roles?.includes("ADMIN");
  if (!ncr.participantIds.includes(user.id) && !isAdmin) redirect("/inbox");

  const canAct = canUserAct(ncr.status, ncr.createdBy, ncr.steps, user.id);

  return (
    <div className="max-w-2xl mx-auto px-8 py-8">
      <div className="mb-6">
        <Link
          href="/inbox"
          className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
        >
          ← Back to inbox
        </Link>
        <div className="font-mono text-xs text-stone-400 mt-3 mb-1">
          {ncr.ref}
        </div>
        <h1 className="text-lg font-semibold text-stone-900 mb-2 line-clamp-2">
          {ncr.problem}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={ncr.status} />
          <SeverityBadge severity={ncr.severity} />
          <span className="text-xs text-stone-400 font-mono">
            {ncr.department}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {/* Step 1 */}
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-stone-400">
              Step 1 — NCR Details
            </span>
            <span className="text-xs text-stone-400 font-mono">Foreman</span>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Reported by">{ncr.createdByName}</Field>
              <Field label="Created">{fmtDate(ncr.createdAt)}</Field>
            </div>
            <Field label="Problem">
              <div className="whitespace-pre-wrap">{ncr.problem}</div>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Severity">
                <SeverityBadge severity={ncr.severity} />
              </Field>
              <Field label="Department">{ncr.department}</Field>
            </div>
          </div>
        </div>

        {/* Steps 2–4 */}
        <StepSection
          step={ncr.steps[0]}
          title="Step 2 — Approval 1"
          actor="Foreman Head"
        />
        <StepSection
          step={ncr.steps[1]}
          title="Step 3 — Approval 2"
          actor="PM / Dept. Owner"
          workers={ncr.workers}
        />
        <StepSection
          step={ncr.steps[2]}
          title="Step 4 — AMD Review"
          actor="Asst. MD"
        />

        {/* Closed notice */}
        {ncr.status === "CLOSED" && (
          <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">
            ✓ This NCR was permanently closed on {fmtDate(ncr.closedAt)}.
          </div>
        )}

        {/* Draft actions */}
        {ncr.status === "DRAFT" && ncr.createdBy === user.id && (
          <div className="flex gap-2">
            <Link
              href={`/ncr/${ncr.id}/edit`}
              className="px-3 py-1.5 text-xs border border-stone-200 rounded-md text-stone-600 hover:bg-stone-50 transition-colors"
            >
              Edit Draft
            </Link>
          </div>
        )}

        {/* Action panel */}
        {canAct && (
          <ActionPanel
            ncrId={ncr.id}
            status={ncr.status}
            users={allUsers}
            currentUserId={user.id}
          />
        )}

        {/* Timeline */}
        {ncr.history.length > 0 && (
          <div className="pt-2">
            <div className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">
              Activity
            </div>
            <div className="space-y-3">
              {[...ncr.history].reverse().map((h, i) => {
                const dotColor =
                  h.action.includes("Approved") || h.action === "Closed"
                    ? "bg-emerald-500"
                    : h.action.includes("Rejected")
                      ? "bg-red-500"
                      : h.action === "Submitted"
                        ? "bg-blue-500"
                        : "bg-stone-300";
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${dotColor}`}
                      />
                      {i < ncr.history.length - 1 && (
                        <div className="w-px flex-1 bg-stone-200 mt-1" />
                      )}
                    </div>
                    <div className="pb-3">
                      <div className="text-xs font-medium text-stone-700">
                        <span className="font-semibold">{h.actorName}</span> —{" "}
                        {h.action}
                      </div>
                      <div className="text-xs text-stone-400">
                        {fmtDate(h.at)}
                      </div>
                      {h.comment && (
                        <div className="mt-1.5 text-xs text-stone-600 bg-stone-50 border-l-2 border-stone-200 px-2.5 py-1.5 rounded-r">
                          {h.comment}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
