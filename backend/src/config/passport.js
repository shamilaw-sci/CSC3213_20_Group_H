require("dotenv").config();

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");

// Conditionally load Google Strategy only if credentials are present
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your_client_id_here') {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const user = {
                googleId: profile.id,
                name: profile.displayName,
                email: profile.emails[0].value,
            };

            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }));
} else {
    console.warn("⚠️ Google OAuth credentials missing. Google login will be disabled until .env is updated.");
}

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport;