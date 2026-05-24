export type PlatformRole = "super_admin" | "support_agent";

export interface CreateUserDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: PlatformRole;
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: PlatformRole;
  isActive?: boolean;
}

export interface UserFilters {
  role?: PlatformRole;
  page?: number;
  limit?: number;
}
