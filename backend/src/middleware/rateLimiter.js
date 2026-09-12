import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// Chat messages hit an external LLM (Gemini) on every request, so this
// limiter protects against both cost-abuse and accidental client loops.
// Keyed per authenticated user where available, falling back to IP.
export const chatMessageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    req.user?.id ? `user:${req.user.id}` : ipKeyGenerator(req.ip),
  message: {
    error: "You're sending messages too quickly. Please wait a moment and try again.",
  },
});
