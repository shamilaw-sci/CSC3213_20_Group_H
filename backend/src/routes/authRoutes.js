import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';

import db from '../config/db.js';
import { SECRET } from '../config.js';
import { login, register, anonymousLogin } from '../controllers/authController.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/register/anonymous
router.post('/register/anonymous', anonymousLogin);

// Google Authentication

// Step 1: Redirect user to Google login
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

// Step 2: Google redirects back here
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/api/auth/login',
  }),

  async (req, res) => {

    try {

      const { email, name, googleId } = req.user;


      // Check if Google user already exists
      const [existingUsers] = await db.query(
        'SELECT id, role FROM users WHERE email = ?',
        [email]
      );


      let userId;
      let role = "Student";


      if (existingUsers.length > 0) {

        userId = existingUsers[0].id;
        role = existingUsers[0].role;

      } else {

        // Create new Google user
        const [result] = await db.query(
          `INSERT INTO users 
          (name, email, password, role)
          VALUES (?, ?, ?, ?)`,
          [
            name,
            email,
            null,
            "Student"
          ]
        );


        userId = result.insertId;

      }


      // Generate CareBridge JWT
      const token = jwt.sign(
        {
          id: userId,
          userId,
          role: String(role).toLowerCase(),
        },
        SECRET,
        {
          expiresIn: "24h"
        }
      );


      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

      res.redirect(
        `${frontendUrl}/auth/google/callback?token=${encodeURIComponent(token)}&userId=${encodeURIComponent(userId)}&role=${encodeURIComponent(role)}`
      );


    } catch(error){

      console.error("Google login error:", error);

      res.status(500).json({
        message:"Google authentication failed"
      });

    }

  }
);

export default router;