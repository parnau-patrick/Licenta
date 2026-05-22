import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "../../config/db.js";
import { env } from "../../config/env.js";
import { z } from "zod";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "./email.service.js";
import { emitToUser, emitToAdmins } from "../../config/socket.js";

export const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const updateProfileSchema = z.object({
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

export class AuthService {
  static async register(data: z.infer<typeof authSchema>) {
    const existingUser = await db.user.findUnique({ where: { email: data.email } });
    if (existingUser) throw new Error("Email already in use.");

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExp = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await db.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        verificationToken,
        verificationTokenExp,
      },
    });

    // Trimite email de confirmare (nu blocăm dacă SMTP nu e configurat)
    try {
      await sendVerificationEmail(user.email, verificationToken);
    } catch (err) {
      console.warn("[Auth] Email de confirmare netrimitere:", err);
    }

    // Notify admin: user nou
    try {
      const total = await db.user.count();
      emitToAdmins("admin:user-joined", { email: user.email, total });
    } catch {}

    return { id: user.id, email: user.email, role: user.role, plan: user.plan };
  }

  static async login(data: z.infer<typeof authSchema>) {
    const user = await db.user.findUnique({ where: { email: data.email } });
    if (!user) throw new Error("Invalid credentials.");

    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) throw new Error("Invalid credentials.");

    const token = jwt.sign(
      { userId: user.id, role: user.role, plan: user.plan },
      env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        plan: user.plan,
        emailVerified: user.emailVerified,
      },
      token,
    };
  }

  static async getMe(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        plan: true,
        planExpiresAt: true,
        emailVerified: true,
        stripeSubscriptionId: true,
        createdAt: true,
      },
    });
    if (!user) throw new Error("User not found.");
    return user;
  }

  static async verifyEmail(token: string) {
    const user = await db.user.findUnique({ where: { verificationToken: token } });
    if (!user) throw new Error("Token invalid sau expirat.");
    if (user.verificationTokenExp && user.verificationTokenExp < new Date()) {
      throw new Error("Token-ul a expirat. Solicită un nou email de confirmare.");
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExp: null,
      },
    });

    // Notifică user-ul în real-time
    emitToUser(user.id, "user:email-verified", { emailVerified: true });

    return { message: "Email confirmat cu succes!" };
  }

  static async verifyEmailDev(email: string) {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) throw new Error("Utilizatorul nu există.");

    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExp: null,
      },
    });

    return { message: "Email verificat (DEV MODE)!" };
  }

  static async forgotPassword(email: string) {
    const user = await db.user.findUnique({ where: { email } });
    // Răspundem mereu cu succes pentru securitate (nu dezvăluim dacă emailul există)
    if (!user) return { message: "Dacă emailul există, vei primi un link de resetare." };

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExp = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await db.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExp },
    });

    try {
      await sendPasswordResetEmail(user.email, resetToken);
    } catch (err) {
      console.warn("[Auth] Email reset netrimitere:", err);
    }

    return { message: "Dacă emailul există, vei primi un link de resetare." };
  }

  static async resetPassword(token: string, newPassword: string) {
    const user = await db.user.findUnique({ where: { resetToken: token } });
    if (!user) throw new Error("Token invalid sau expirat.");
    if (user.resetTokenExp && user.resetTokenExp < new Date()) {
      throw new Error("Token-ul a expirat. Solicită o nouă resetare.");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExp: null,
      },
    });

    return { message: "Parola a fost schimbată cu succes!" };
  }

  static async updateProfile(userId: string, data: z.infer<typeof updateProfileSchema>) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found.");

    const updateData: any = {};

    // Schimbare email
    if (data.email && data.email !== user.email) {
      const exists = await db.user.findUnique({ where: { email: data.email } });
      if (exists) throw new Error("Acest email este deja folosit.");

      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationTokenExp = new Date(Date.now() + 24 * 60 * 60 * 1000);

      updateData.email = data.email;
      updateData.emailVerified = false;
      updateData.verificationToken = verificationToken;
      updateData.verificationTokenExp = verificationTokenExp;

      try {
        await sendVerificationEmail(data.email, verificationToken);
      } catch (err) {
        console.warn("[Auth] Email verificare netrimitere:", err);
      }
    }

    // Schimbare parolă
    if (data.currentPassword && data.newPassword) {
      const isValid = await bcrypt.compare(data.currentPassword, user.password);
      if (!isValid) throw new Error("Parola curentă este incorectă.");
      updateData.password = await bcrypt.hash(data.newPassword, 10);
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error("Nicio modificare detectată.");
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, email: true, role: true, plan: true, emailVerified: true },
    });

    return updated;
  }

  static async resendVerification(userId: string) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found.");
    if (user.emailVerified) throw new Error("Emailul este deja verificat.");

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExp = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.user.update({
      where: { id: userId },
      data: { verificationToken, verificationTokenExp },
    });

    await sendVerificationEmail(user.email, verificationToken);
    return { message: "Email de verificare retrimis! Verifică inbox-ul." };
  }
}
