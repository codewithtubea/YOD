export type MemberRole = "member" | "admin";
export type MemberStatus = "active" | "suspended";

export type Membership = {
  display_name: string;
  role: MemberRole;
  status: MemberStatus;
};
