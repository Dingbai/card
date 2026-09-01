import type { Request, Response } from "express";
import { healthPayload } from "./config.js";

export function healthHandler(_request: Request, response: Response) {
  response.json(healthPayload);
}
