import type { Request, Response } from "express";

export default function health(_request: Request, response: Response) {
  response.json({ ok: true });
}
