import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';

import db from '../config/db.js';

import {
  login,
  register,
  anonymousLogin,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';

const router = express.Router();

// =====================================================
// LOGIN
// POST /api/auth/login
// =====================================================

router.post('/login', login);


// =====================================================
// REGISTER
// POST /api/auth/register
// =====================================================

router.post('/register', register);


// =====================================================
// ANONYMOUS LOGIN
// POST /api/auth/register/anonymous
// =====================================================

router.post('/register/anonymous', anonymousLogin);


// =====================================================
// FORGOT PASSWORD
// POST /api/auth/forgot-password
// =====================================================

router.post('/forgot-password', forgotPassword);


// =====================================================
// RESET PASSWORD
// POST /api/auth/reset-password
// =====================================================

router.post('/reset-password', resetPassword);


// =====================================================
// GOOGLE AUTHENTICATION
// =====================================================

// Step 1: Redirect user to Google login

router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);


// =====================================================
// GOOGLE CALLBACK
// GET /api/auth/google/callback
// =====================================================

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


      // -------------------------------------------------
      // Check if Google user already exists
      // -------------------------------------------------

      const [existingUsers] = await db.query(
        'SELECT id, role FROM users WHERE email = ?',
        [email]
      );


      let userId;
      let role = 'Student';


      // -------------------------------------------------
      // Existing user
      // -------------------------------------------------

      if (existingUsers.length > 0) {

        userId = existingUsers[0].id;
        role = existingUsers[0].role;

      }


      // -------------------------------------------------
      // New Google user
      // -------------------------------------------------

      else {

        const [result] = await db.query(
          `INSERT INTO users
          (name, email, password, role)
          VALUES (?, ?, ?, ?)`,
          [
            name,
            email,
            null,
            'Student',
          ]
        );


        userId = result.insertId;

      }


      // -------------------------------------------------
      // Generate CareBridge JWT
      // -------------------------------------------------

      const token = jwt.sign(
        {
          id: userId,
          role: String(role).toLowerCase(),
        },

        process.env.JWT_SECRET,

        {
          expiresIn: '1h',
        }
      );


      // -------------------------------------------------
      // Redirect to Student Dashboard
      // -------------------------------------------------

      res.redirect(
        `http://localhost:3000/student/dashboard?token=${token}&userId=${userId}&role=${role}`
      );

    }


    // -------------------------------------------------
    // Google Authentication Error
    // -------------------------------------------------

    catch (error) {

      console.error(
        'Google login error:',
        error
      );


      res.status(500).json({
        message: 'Google authentication failed',
      });

    }
  }
);


// =====================================================
// EXPORT ROUTER
// =====================================================

export default router;