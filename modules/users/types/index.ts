export type UserRow = {
  id: string;
  fullName: string;
  email: string | null;
  status: string;
  roleIds: string[];
};

export type RoleOption = {
  id: string;
  name: string;
};
