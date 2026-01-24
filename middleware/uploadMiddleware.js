const multer = require("multer");

// Use memory storage - files will be in req.file.buffer
const storage = multer.memoryStorage();

// File filter to accept only images
const fileFilter = (req, file, cb) => {
	const allowedTypes = /jpeg|jpg|png/;
	const mimetype = allowedTypes.test(file.mimetype);

	if (mimetype) {
		return cb(null, true);
	} else {
		cb(new Error("Only .png, .jpg and .jpeg format allowed!"));
	}
};

// Multer configuration
const upload = multer({
	storage: storage,
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB max file size
	},
	fileFilter: fileFilter,
});

module.exports = upload;
