const MAX_MESSAGE_LENGTH = 3000;

// C0 controls (except \t \n) + DEL + C1 controls, plus a handful of
// zero-width / directional-override code points sometimes used to hide
// or smuggle content past a casual read. None have a legitimate place in
// a plain chat message, and left in they can corrupt downstream
// rendering/logging.
const UNSAFE_CHARS_REGEX = new RegExp(
  "[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F-\\u009F" +
    "\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2064\\uFEFF]",
  "g"
);

function sanitizeMessage(raw) {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(UNSAFE_CHARS_REGEX, "")
    .trim();
}

export function validateChatMessage(req, res, next) {
  const body = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ error: "Invalid request body." });
  }

  const { message } = body;

  if (typeof message !== "string") {
    return res.status(400).json({ error: "Message is required and must be text." });
  }

  const sanitized = sanitizeMessage(message);

  if (!sanitized) {
    return res.status(400).json({ error: "Message is required." });
  }

  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).`,
    });
  }

  req.body.message = sanitized;
  next();
}
