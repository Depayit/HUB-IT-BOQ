export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toUserMessage(error: unknown): string {
  if (error instanceof AppError || error instanceof Error) {
    return error.message;
  }
  return "เกิดข้อผิดพลาดที่ไม่คาดคิด";
}
