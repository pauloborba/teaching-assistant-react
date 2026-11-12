/**
 * Violation of a business rule by a client request (e.g. registering a
 * student whose CPF is already taken). Unlike a programming error, it is
 * expected, carries a message meant for the client, and is the client's
 * fault.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

/**
 * A request names something that does not exist (e.g. a class, or the
 * enrollment of a student in a class). Reported to the client as a 404.
 */
export class NotFoundError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
