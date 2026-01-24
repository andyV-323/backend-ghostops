const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads directory exists at backend ROOT (not in middleware folder)
const uploadDir = path.join(__dirname, "..", "uploads", "operators");
//                           ^^^^^^^^^^^
//                           Goes UP from middleware/ to backend root/
//                           Then into uploads/operators/

if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir, { recursive: true });
	console.log("Created uploads directory at:", uploadDir);
}

// Configure storage
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, uploadDir);
	},
	filename: (req, file, cb) => {
		// Generate unique filename: timestamp-randomstring.extension
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		cb(null, `operator-${uniqueSuffix}${path.extname(file.originalname)}`);
	},
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
	const allowedTypes = /jpeg|jpg|png/;
	const extname = allowedTypes.test(
		path.extname(file.originalname).toLowerCase(),
	);
	const mimetype = allowedTypes.test(file.mimetype);

	if (mimetype && extname) {
		return cb(null, true);
	} else {
		cb(new Error("Only .png, .jpg and .jpeg format allowed!"));
	}
};

// Multer configuration
const upload = multer({
	storage: storage,
	limits: {
		fileSize: 5 * 1024 * 1024, // 5MB max file size
	},
	fileFilter: fileFilter,
});

module.exports = upload;
