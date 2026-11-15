const { registerSchema, loginSchema, refreshSchema } = require('./schema');
const authService = require('./service');

async function register(req, res, next) {
  try {
    const validatedData = registerSchema.parse(req.body);
    const clientIp = req.ip || req.connection?.remoteAddress || null;

    const user = await authService.register({
      ...validatedData,
      ip: clientIp,
    });

    return res.status(201).json(user);
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const validatedData = loginSchema.parse(req.body);
    const clientIp = req.ip || req.connection?.remoteAddress || null;

    const tokens = await authService.login({
      ...validatedData,
      ip: clientIp,
    });

    return res.status(200).json(tokens);
  } catch (error) {
    next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const validatedData = refreshSchema.parse(req.body);
    const clientIp = req.ip || req.connection?.remoteAddress || null;

    const tokens = await authService.refreshToken({
      ...validatedData,
      ip: clientIp,
    });

    return res.status(200).json(tokens);
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await authService.getMe(req.user.id);
    return res.status(200).json(user);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  refresh,
  getMe,
};
