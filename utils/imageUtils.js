const sharp = require("sharp");
const path = require("path");
const fs = require("fs").promises;

/**
 * Compress and resize an uploaded image
 * @param {string} inputPath - Path to the original uploaded image
 * @param {number} maxWidth - Maximum width (default: 800px)
 * @param {number} quality - JPEG quality (default: 85)
 * @returns {Promise<string>} - Path to the compressed image
 */
async function processImage(inputPath, maxWidth = 800, quality = 85) {
	try {
		const ext = path.extname(inputPath).toLowerCase();
		const baseName = path.basename(inputPath, ext);
		const dirName = path.dirname(inputPath);

		// Always output as .jpg for consistency and better compression
		const outputPath = path.join(dirName, `${baseName}-compressed.jpg`);

		// Process the image
		await sharp(inputPath)
			.resize(maxWidth, maxWidth, {
				fit: "inside",
				withoutEnlargement: true,
			})
			.jpeg({ quality: quality, mozjpeg: true })
			.toFile(outputPath);

		// Delete the original uncompressed file
		await fs.unlink(inputPath);

		console.log(`Image processed: ${inputPath} -> ${outputPath}`);
		return outputPath;
	} catch (error) {
		console.error("Error processing image:", error);
		throw error;
	}
}

/**
 * Delete an image file
 * @param {string} imagePath - Path to the image file to delete
 */
async function deleteImage(imagePath) {
	try {
		if (imagePath) {
			await fs.unlink(imagePath);
			console.log(`Deleted image: ${imagePath}`);
		}
	} catch (error) {
		console.error("Error deleting image:", error);
		// Don't throw - deletion failure shouldn't break the app
	}
}

module.exports = {
	processImage,
	deleteImage,
};
