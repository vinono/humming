export type AuthUser = {
  token: string;
  headerValue: string;
  subject?: string;
  id?: string;
  roles?: string[];
  claims?: Record<string, unknown>;
};

export type AppBindings = {
  Variables: {
    requestId: string;
    startAt: number;
    authUser: AuthUser | null;
    localDebugRuntimeApplied: boolean;
  };
};
