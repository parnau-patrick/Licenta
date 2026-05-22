import { Request, Response } from "express";
import { AuthService, authSchema, updateProfileSchema } from "./auth.service.js";
import { z } from "zod";

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const data = authSchema.parse(req.body);
      const user = await AuthService.register(data);
      res.status(201).json({ user, message: "Cont creat! Verifică emailul pentru confirmare." });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const data = authSchema.parse(req.body);
      const { user, token } = await AuthService.login(data);

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({ user });
    } catch (err: any) {
      res.status(401).json({ error: err.message });
    }
  }

  static async logout(req: Request, res: Response) {
    res.clearCookie("token");
    res.status(200).json({ message: "Logged out successfully" });
  }

  static async getMe(req: Request, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await AuthService.getMe(req.user.userId);
      res.status(200).json({ user });
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  }

  static async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = z.object({ token: z.string() }).parse(req.body);
      const result = await AuthService.verifyEmail(token);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async verifyEmailDev(req: Request, res: Response) {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      const result = await AuthService.verifyEmailDev(email);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      const result = await AuthService.forgotPassword(email);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, password } = z
        .object({ token: z.string(), password: z.string().min(6) })
        .parse(req.body);
      const result = await AuthService.resetPassword(token, password);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const data = updateProfileSchema.parse(req.body);
      const user = await AuthService.updateProfile(req.user.userId, data);
      res.json({ user, message: "Profil actualizat cu succes!" });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async resendVerification(req: Request, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const result = await AuthService.resendVerification(req.user.userId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
