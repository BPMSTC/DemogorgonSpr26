// Express router and the tools needed to handle user authentication requests.
const express = require('express');
// Create a mini-router that will be mounted under /api/auth in server.js.
const router = express.Router();
// Functions that carry out the actual register, login, and profile logic.
const controller = require('../controllers/authController');
// Middleware that checks the request body against a schema before the controller runs.
const validate = require('../middleware/validate');
// Guard that ensures only logged-in users can reach protected routes.
const { verifyToken } = require('../middleware/auth');
// The exact shape the request body must match for each auth action.
const { registerSchema, loginSchema } = require('../validators/authSchemas');

// Create a new user account after making sure the submitted data is valid.
router.post('/register', validate(registerSchema), controller.register);
// Log an existing user in after confirming the submitted credentials are well-formed.
router.post('/login', validate(loginSchema), controller.login);
// Return the profile of whoever is currently logged in — requires a valid token.
router.get('/me', verifyToken, controller.me);

// Hand this router to server.js so it gets mounted at the right path.
module.exports = router;
