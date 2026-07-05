export type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionIds: string[];
};

export type PermissionOption = {
  id: string;
  key: string;
  module: string;
  action: string;
  description: string | null;
};
