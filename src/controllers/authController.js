const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const Role = require("../models/Role");

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, roleName } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const role = await Role.findOne({ name: roleName });
    if (!role) {
      return res
        .status(400)
        .json({ success: false, message: "Role does not exist" });
    }

    user = new User({
      username,
      email,
      password: await bcrypt.hash(password, 10),
      role: role._id,
    });

    await user.save();

    jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
      (err, token) => {
        if (err) throw err;
        res.json({ success: true, token, user });
      }
    );
  } catch (err) {
    res.status(500).json({ success: false, message: `Error server: ${err}` });
  }
};

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).populate("role");
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
      (err, token) => {
        if (err) throw err;
        res.json({ success: true, token, user });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: `Server error: ${err}` });
  }
};
