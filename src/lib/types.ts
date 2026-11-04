export type MemberRole = "member" | "admin";
export type MemberStatus = "pending" | "active" | "deactivated";

export type Membership = {
  display_name: string;
  role: MemberRole;
  status: MemberStatus;
};
