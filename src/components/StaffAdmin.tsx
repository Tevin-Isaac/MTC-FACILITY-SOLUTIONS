"use client";

import { UserPlus } from "lucide-react";
import { inviteStaff, setStaffRole } from "@/lib/actions/admin";
import { useAction } from "@/components/useAction";
import { Tile, SectionHead, Pill, buttonClass, inputClass, labelClass } from "@/components/ui";
import { ROLE_LABEL, STAFF_ROLES, isAdminRole, type StaffMember, type StaffRole } from "@/lib/roles";

function formatWhen(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function StaffAdmin({
  staff,
  currentUserId,
}: {
  staff: StaffMember[];
  currentUserId: string;
}) {
  const { pending, submit } = useAction();

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[20rem_1fr]">
      <Tile>
        <SectionHead title="Invite staff" sub="They get a login and a floor or admin seat." />
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            submit(inviteStaff, new FormData(form), () => form.reset());
          }}
        >
          <div>
            <label className={labelClass} htmlFor="staff-name">
              Full name
            </label>
            <input id="staff-name" name="name" required className={inputClass} placeholder="Jordan Hale" />
          </div>
          <div>
            <label className={labelClass} htmlFor="staff-email">
              Email
            </label>
            <input
              id="staff-email"
              name="email"
              type="email"
              required
              className={inputClass}
              placeholder="jordan@mtcfacility.com"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="staff-role">
              Role
            </label>
            <select id="staff-role" name="role" defaultValue="coordinator" className={inputClass}>
              {STAFF_ROLES.filter((role) => role !== "vendor").map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABEL[role]}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            <UserPlus className="h-4 w-4" />
            {pending ? "Creating…" : "Create login"}
          </button>
        </form>
      </Tile>

      <Tile padded={false}>
        <div className="px-5 pt-5 sm:px-6 sm:pt-6">
          <SectionHead title="Team" sub={`${staff.length} people with access`} />
        </div>
        <ul className="mt-4 divide-y divide-hairline">
          {staff.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center gap-3 px-5 py-3 sm:px-6">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {member.name}
                  {member.id === currentUserId ? (
                    <span className="ml-2 text-xs font-normal text-ink-3">you</span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-ink-3">{member.email}</p>
              </div>
              <Pill tone={isAdminRole(member.role) ? "gold" : "navy"}>{ROLE_LABEL[member.role]}</Pill>
              <p className="text-xs text-ink-3">Last in {formatWhen(member.lastSignInAt)}</p>
              <select
                className={`${inputClass} w-auto min-w-[10rem]`}
                defaultValue={member.role}
                disabled={pending}
                onChange={(event) => {
                  submit(setStaffRole, (() => {
                    const data = new FormData();
                    data.set("userId", member.id);
                    data.set("role", event.target.value as StaffRole);
                    return data;
                  })());
                }}
              >
                {STAFF_ROLES.filter((role) => role !== "vendor").map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABEL[role]}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </Tile>
    </div>
  );
}
