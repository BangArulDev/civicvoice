const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email('Format alamat email tidak valid'),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter'),
  fullName: z.string().min(1, 'Nama lengkap wajib diisi').max(150, 'Nama lengkap maksimal 150 karakter'),
});

const loginSchema = z.object({
  email: z.string().email('Format alamat email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token wajib disertakan'),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
};
