require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { CognitoJwtVerifier } = require("aws-jwt-verify");

const app = express();
app.use(express.json());
app.use(cors());

const verifier = CognitoJwtVerifier.create({
  userPoolId: "us-east-1_GMrBu64Hs",
  tokenUse: "access",
  clientId: "6f6mo3220ct1sdu9dum08hdk96",
});

async function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization.split(" ")[1]; // Get JWT from Header
    await verifier.verify(token);
    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
  }
}

app.use("/api/protected", authenticate);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

app.get("/", (req, res) => {
  res.send("GhostOps API is running");
});
app.get("/api/health", (req, res) => {
  res.status(200).json({ message: "API is working!" });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
