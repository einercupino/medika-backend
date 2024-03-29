const jwt = require('jsonwebtoken');
const User = require('../models/user');
require('dotenv').config();

const createToken = (id, roleId) => {
  return jwt.sign({ id, roleId }, process.env.JWT_SECRET, { expiresIn: 3 * 24 * 60 * 60 });
};

const requireAuth = (req, res, next) => {
  const token = req.cookies.jwt;
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
      if (err) {
        res.status(401).json({ error: 'Not authorized' });
      } else {
        req.user = decodedToken;
        next();
      }
    });
  } else {
    res.status(401).json({ error: 'Not authorized' });
  }
};

const checkUser = (roles) => {
  return (req, res, next) => {
    const token = req.cookies.jwt;
  
    if (token) {
      jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
        if (err) {
          res.status(401).json({ error: 'Not authorized' });
        } else {
          if (roles.includes(decodedToken.roleId)) {
            next();
          } else {
            res.status(401).json({ error: 'Not authorized' });
          }
        }
      });
    } else {
      res.status(401).json({ error: 'Not authorized' });
    }
  };
};

module.exports = { createToken, requireAuth, checkUser };
