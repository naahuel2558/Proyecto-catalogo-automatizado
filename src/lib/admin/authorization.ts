export type AdminActor = {
  id?: string;
  role?: string;
} | null | undefined;

export type AdminAuthorizationCode = 'UNAUTHORIZED' | 'FORBIDDEN';

export class AdminAuthorizationError extends Error {
  constructor(
    public readonly code: AdminAuthorizationCode,
    message: string,
  ) {
    super(message);
    this.name = 'AdminAuthorizationError';
  }
}

export function assertAdminActor(actor: AdminActor): asserts actor is { id?: string; role: 'ADMIN' } {
  if (!actor) {
    throw new AdminAuthorizationError('UNAUTHORIZED', 'Debes iniciar sesión para realizar esta operación.');
  }
  if (actor.role !== 'ADMIN') {
    throw new AdminAuthorizationError('FORBIDDEN', 'No tienes permisos de administrador.');
  }
}
