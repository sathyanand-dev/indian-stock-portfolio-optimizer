import { authService } from '../services/auth.service.js';

export const authController = {
  register: async (req, res) => res.status(201).json(await authService.register(req.body)),
  login: async (req, res) => res.json(await authService.login(req.body)),
  me: async (req, res) => res.json(authService.publicUser(req.user)),
  update: async (req, res) => res.json(await authService.update(req.user.id, req.body)),
  remove: async (req, res) => {
    await authService.remove(req.user.id);
    res.json({ message: 'User account deleted successfully' });
  },
};
