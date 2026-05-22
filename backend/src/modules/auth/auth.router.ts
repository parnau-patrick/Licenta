import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { requireAuth } from "../../middlewares/requireAuth.js";

export const authRouter = Router();

authRouter.post("/register", AuthController.register);
authRouter.post("/login", AuthController.login);
authRouter.post("/logout", AuthController.logout);
authRouter.get("/me", requireAuth, AuthController.getMe);

// Email verification
authRouter.post("/verify-email", AuthController.verifyEmail);

// DEV ONLY: Mark email as verified (for testing without SMTP)
authRouter.post("/verify-email-dev", AuthController.verifyEmailDev);

// Password reset
authRouter.post("/forgot-password", AuthController.forgotPassword);
authRouter.post("/reset-password", AuthController.resetPassword);

// Profile update (protected)
authRouter.put("/profile", requireAuth, AuthController.updateProfile);

// Resend verification email (protected)
authRouter.post("/resend-verification", requireAuth, AuthController.resendVerification);

