import bcrypt from 'bcryptjs';

const ROUNDS = 10;

export async function hashPassword(password) {
  return bcrypt.hash(password, ROUNDS);
}

export async function verifyPassword(plain, hashed) {
  return bcrypt.compare(plain, hashed);
}
