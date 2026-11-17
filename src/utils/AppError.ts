// An error we throw on purpose; its message is safe to send to the client.
export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}
