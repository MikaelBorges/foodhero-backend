const saltRounds = 10;
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const secret = process.env.TOKEN_SECRET;

module.exports = (app, db) => {
  const userModel = require("../models/userModel");

  app.get("/user/:userId", async (req, res, next) => {
    const userId = req.params.userId;
    try {
      const user = await userModel
        .findById(userId)
        .select("-phone -cryptedPassword"); // Exclure les champs phone et cryptedPassword
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ message: String(error) });
    }
  });

  app.get("/user/phone/:userId", async (req, res, next) => {
    const userId = req.params.userId;
    try {
      const user = await userModel.findById(userId);
      res.status(200).json(user.phone);
    } catch (error) {
      res.status(500).json({ message: String(error) });
    }
  });
};
