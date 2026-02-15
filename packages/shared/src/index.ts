export type GlobalRole = "ANALYST" | "SUBSCRIBER";

export type GrantStatus = "PENDING" | "ACTIVE" | "REVOKED";

export type AccessGrantDTO = {
  _id: string;
  tenantId: string;
  subscriberUserId: string;
  status: GrantStatus;
  allowedLayerIds: "ALL" | string[];
  canSuggestContent: boolean;
  canSuggestRelations: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TenantDTO = {
  _id: string;
  ownerUserId: string;
  name: string;
  status: "active" | "suspended";
};

export type UserDTO = {
  _id: string;
  email: string;
  globalRole: GlobalRole;
};
