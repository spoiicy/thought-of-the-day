import express from "express";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";

const SECRET_KEY = process.env.SECRET_KEY || "secret";
const COOKIE_NAME = "thoughts-auth";
const FREE_TIER_LIMIT = 5;

const app = express();

// Route for fetching the thought of the day
app.get("/thought-of-the-day", (req, res) => {
  const { id, random } = req.query;
  const { cookie } = req.headers;

  if (!cookie) {
    res.status(401).send({ error: "Not authenticated" });
    return;
  }

  const cookies = cookie.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.split("=").map((c) => c.trim());
    acc[key] = value;
    return acc;
  }, {});

  const cookieToken = cookies[COOKIE_NAME];

  if (!cookieToken) {
    res.status(401).send({ error: "Not authenticated" });
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(cookieToken, SECRET_KEY);
  } catch (e) {
    res.status(403).send({ error: "Invalid token" });
    return;
  }

  const filepath = path.resolve("./thoughts");
  const thoughts = fs.readFileSync(filepath, "utf-8").split("\n");

  if (random && random === "true") {
    const i = Math.floor(Math.random() * FREE_TIER_LIMIT);

    if (!decoded.subscribed && i >= FREE_TIER_LIMIT) {
      res.status(500).send({ error: "Not a paying subscriber" });
      return;
    }

    const thought = thoughts[i];

    res.status(200).send({ thought, id: i });
    return;
  }

  if (id) {
    const i = Number(id);

    if (!decoded.subscribed && i >= FREE_TIER_LIMIT) {
      res.status(500).send({ error: "Not a paying subscriber" });
      return;
    }

    if (i < 0 || i >= thoughts.length) {
      res.status(500).send({ error: "Invalid thought ID" });
      return;
    }

    const thought = thoughts[parseInt(i)];

    res.status(200).send({ thought, id: i });
    return;
  }

  res.status(500).send({ error: "Unable to get thought" });
});

// Route for registering and getting the auth token
app.get("/register", (req, res) => {
  const token = jwt.sign(
    {
      subscribed: false,
    },
    SECRET_KEY,
    { expiresIn: "1h" }
  );

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    maxAge: 3600000,
  });
  res.status(200).send({ message: "Signed in!" });
});

// Default route for serving the "Under Construction" page
app.get("*", (req, res) => {
  res.sendFile(path.resolve("under-construction.html"));
});

// Start the server
app.listen(process.env.PORT || 3000, () => {
  console.log("Server is running on port 3000");
});

