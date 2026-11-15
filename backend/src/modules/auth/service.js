const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../common/config');
const { conflict, unauthorized, notFound } = require('../../common/errors');
const authRepository = require('./repository');

function formatUser(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    skpdId: row.skpd_id || null,
    isActive: row.is_active,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

async function register({ email, password, fullName, ip }) {
  // 1. Periksa apakah email sudah terdaftar
  const existingUser = await authRepository.findUserByEmail(email);
  if (existingUser) {
    throw conflict('Email sudah terdaftar', [
      { field: 'email', issue: 'email_already_registered' },
    ]);
  }

  // 2. Ambil role ID untuk peran 'warga' (default registrasi)
  const roleId = await authRepository.findRoleIdByName('warga');
  if (!roleId) {
    throw new Error("Peran default 'warga' tidak ditemukan di database. Pastikan seeder sudah dijalankan.");
  }

  // 3. Hash kata sandi dengan bcrypt (cost 12 sesuai SRS NFR-S-01)
  const passwordHash = await bcrypt.hash(password, 12);

  // 4. Simpan pengguna baru
  const createdUser = await authRepository.createUser({
    email,
    passwordHash,
    fullName,
    roleId,
  });

  // 5. Catat jejak audit
  await authRepository.createAuditLog({
    userId: createdUser.id,
    action: 'auth.register',
    entity: 'users',
    entityId: createdUser.id,
    ip,
  });

  return formatUser({
    ...createdUser,
    role: 'warga',
  });
}

async function login({ email, password, ip }) {
  const genericErrorMessage = 'Email atau kata sandi tidak valid';

  // 1. Cari pengguna berdasarkan email
  const user = await authRepository.findUserByEmail(email);
  if (!user) {
    await authRepository.createAuditLog({
      userId: null,
      action: 'auth.login.failure',
      entity: 'users',
      entityId: email,
      ip,
    });
    // Pesan error seragam untuk mencegah enumerasi akun (username enumeration)
    throw unauthorized(genericErrorMessage);
  }

  // 2. Periksa status aktif akun
  if (!user.is_active) {
    await authRepository.createAuditLog({
      userId: user.id,
      action: 'auth.login.failure',
      entity: 'users',
      entityId: user.id,
      ip,
    });
    throw unauthorized('Akun pengguna ini telah dinonaktifkan');
  }

  // 3. Verifikasi hash kata sandi dengan bcrypt
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    await authRepository.createAuditLog({
      userId: user.id,
      action: 'auth.login.failure',
      entity: 'users',
      entityId: user.id,
      ip,
    });
    throw unauthorized(genericErrorMessage);
  }

  // 4. Terbitkan JWT Access Token (berlaku 15 menit)
  const accessToken = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      skpdId: user.skpd_id,
    },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn }
  );

  // 5. Terbitkan Refresh Token acak kriptografis (string acak 40 byte hex)
  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + config.jwt.refreshExpiresInDays);

  // Simpan HASH token di database (bukan token mentah)
  await authRepository.createRefreshToken({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  // 6. Catat audit log keberhasilan login
  await authRepository.createAuditLog({
    userId: user.id,
    action: 'auth.login.success',
    entity: 'users',
    entityId: user.id,
    ip,
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    tokenType: 'Bearer',
    expiresIn: 900, // 15 menit = 900 detik
  };
}

async function refreshToken({ refreshToken: rawToken, ip }) {
  if (!rawToken) {
    throw unauthorized('Refresh token tidak ada atau tidak valid');
  }

  // 1. Hitung hash SHA-256 dari token yang diterima
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // 2. Cari token di database
  const tokenRecord = await authRepository.findRefreshTokenByHash(tokenHash);

  // 3. Validasi status token: wajib ada, belum dicabut, dan belum kedaluwarsa
  if (!tokenRecord || tokenRecord.revoked_at || new Date(tokenRecord.expires_at) < new Date()) {
    throw unauthorized('Refresh token tidak valid atau telah kedaluwarsa');
  }

  // 4. ROTASI TOKEN: Cabut (revoke) token lama segera saat digunakan
  await authRepository.revokeRefreshToken(tokenRecord.id);

  // 5. Muat profil pengguna terkait
  const user = await authRepository.findUserById(tokenRecord.user_id);
  if (!user || !user.is_active) {
    throw unauthorized('Pengguna tidak aktif atau tidak ditemukan');
  }

  // 6. Terbitkan Access Token baru
  const newAccessToken = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      skpdId: user.skpd_id,
    },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn }
  );

  // 7. Terbitkan Refresh Token baru (pasangan rotasi baru)
  const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
  const newTokenHash = crypto.createHash('sha256').update(newRawRefreshToken).digest('hex');

  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + config.jwt.refreshExpiresInDays);

  await authRepository.createRefreshToken({
    userId: user.id,
    tokenHash: newTokenHash,
    expiresAt: newExpiresAt,
  });

  // 8. Catat jejak audit
  await authRepository.createAuditLog({
    userId: user.id,
    action: 'auth.refresh',
    entity: 'refresh_tokens',
    entityId: String(tokenRecord.id),
    ip,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRawRefreshToken,
    tokenType: 'Bearer',
    expiresIn: 900,
  };
}

async function getMe(userId) {
  const user = await authRepository.findUserById(userId);
  if (!user) {
    throw notFound('Pengguna tidak ditemukan');
  }
  return formatUser(user);
}

module.exports = {
  register,
  login,
  refreshToken,
  getMe,
};
