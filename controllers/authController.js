const AuthService = require('../services/authService');

exports.register = async (req, res, next) => {
  try {
    await AuthService.register(req.body);
    res.status(201).json({ message: 'User Registration successful.' });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { token, user } = await AuthService.login(email, password);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({ message: 'Login successful', user });
  } catch (error) {
    next(error);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const users = await AuthService.getUsers(req.query);
    res.json(users);
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    await AuthService.updateUser(req.params.id, req.body);
    res.json({ message: "User updated successfully" });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    await AuthService.deleteUser(req.params.id, req.user.id);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
};

exports.getActiveProfile = (expectedRole) => async (req, res, next) => {
  try {
    const user = await AuthService.getActiveProfile(req.user.id, expectedRole);
    res.json(user);
  } catch (error) {
    next(error);
  }
};