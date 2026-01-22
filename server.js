require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const operatorRoutes = require("./routes/operatorRoutes");
const teamRoutes = require("./routes/teamRoutes");
const squadRoutes = require("./routes/squadRoutes");
const infirmaryRoutes = require("./routes/infirmaryRoutes");
const memorialRoutes = require("./routes/memorialRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const missionRoutes = require("./routes/missionRoutes");
const uploadsRouter = require("./routes/uploads");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

//Ensures cognito tokens are valid
const verifier = CognitoJwtVerifier.create({
	userPoolId: process.env.COGNITO_USER_POOL_ID,
	tokenUse: "access",
	clientId: process.env.COGNITO_CLIENT_ID,
});

//Middleware
// Attach `userId` from Cognito to `req.userId`
async function authenticate(req, res, next) {
	try {
		const token = req.headers.authorization.split(" ")[1];
		const payload = await verifier.verify(token);
		req.userId = payload.sub;
		next();
	} catch (error) {
		res.status(401).json({ message: "Unauthorized" });
	}
}

//Protected Routes with Cognito Auth
app.use("/api/operators", authenticate, operatorRoutes);
app.use("/api/teams", authenticate, teamRoutes);
app.use("/api/squads", authenticate, squadRoutes);
app.use("/api/infirmary", authenticate, infirmaryRoutes);
app.use("/api/memorial", authenticate, memorialRoutes);
app.use("/api/missions", authenticate, missionRoutes);
app.use("/api/vehicles", authenticate, vehicleRoutes);
app.use("/api/missions", authenticate, missionRoutes);
app.use("/api/uploads", authenticate, uploadsRouter);

//MongoDB Connection
mongoose
	.connect(process.env.MONGO_URI)
	.then(() => console.log("MongoDB Connected"))
	.catch((err) => console.error("MongoDB Connection Error:", err));

//Health Check Route
app.get("/api/health", (req, res) =>
	res.status(200).json({ message: "API is working!" }),
);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
