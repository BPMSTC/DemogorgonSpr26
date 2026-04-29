const express = require('express');
const router = express.Router();
const controller = require('../controllers/authController');
const validate = require('../middleware/validate');
const { verifyToken } = require('../middleware/auth');
const { registerSchema, loginSchema } = require('../validators/authSchemas');

router.post('/register', validate(registerSchema), controller.register);
router.post('/login', validate(loginSchema), controller.login);
router.get('/me', verifyToken, controller.me);

module.exports = router;
