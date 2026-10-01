export class ProjectError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = "PROJECT_ERROR", status = 400) {
    super(message);
    this.name = "ProjectError";
    this.code = code;
    this.status = status;
  }
}
