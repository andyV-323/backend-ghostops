const {
	S3Client,
	PutObjectCommand,
	DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const sharp = require("sharp");
const crypto = require("crypto");

// Initialize S3 client
const s3Client = new S3Client({
	region: process.env.AWS_REGION || "us-east-1",
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	},
});

const BUCKET_NAME      = process.env.S3_BUCKET_NAME;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN; // e.g. https://d1234abcd.cloudfront.net

/**
 * Upload image to S3 with compression
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {string} originalFilename - Original filename
 * @returns {Promise<string>} - S3 URL of uploaded image
 */
async function uploadImageToS3(fileBuffer, originalFilename) {
	try {
		// Generate unique filename
		const timestamp = Date.now();
		const randomString = crypto.randomBytes(8).toString("hex");
		const filename = `operators/operator-${timestamp}-${randomString}.jpg`;

		// Compress image with Sharp
		const compressedBuffer = await sharp(fileBuffer)
			.resize(800, 800, {
				fit: "inside",
				withoutEnlargement: true,
			})
			.jpeg({ quality: 85, mozjpeg: true })
			.toBuffer();

		console.log(`Original size: ${fileBuffer.length} bytes`);
		console.log(`Compressed size: ${compressedBuffer.length} bytes`);
		console.log(
			`Savings: ${((1 - compressedBuffer.length / fileBuffer.length) * 100).toFixed(1)}%`,
		);

		// Upload to S3
		const uploadParams = {
			Bucket: BUCKET_NAME,
			Key: filename,
			Body: compressedBuffer,
			ContentType: "image/jpeg",
			// Make the object publicly readable
		};

		const command = new PutObjectCommand(uploadParams);
		await s3Client.send(command);

		// Return CloudFront URL if configured, otherwise fall back to direct S3 URL
		const baseUrl = CLOUDFRONT_DOMAIN
			? CLOUDFRONT_DOMAIN.replace(/\/$/, "")
			: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com`;
		const imageUrl = `${baseUrl}/${filename}`;

		console.log(`Image uploaded — URL: ${imageUrl}`);
		return imageUrl;
	} catch (error) {
		console.error("Error uploading to S3:", error);
		throw error;
	}
}

/**
 * Delete image from S3
 * @param {string} imageUrl - Full S3 URL of the image
 */
async function deleteImageFromS3(imageUrl) {
	try {
		if (!imageUrl) {
			console.log("No image URL provided, skipping deletion");
			return;
		}

		// Extract the S3 key from either a CloudFront or direct S3 URL
		// CloudFront:  https://d1234abcd.cloudfront.net/operators/image.jpg
		// S3 direct:   https://bucket.s3.region.amazonaws.com/operators/image.jpg
		let key;
		if (CLOUDFRONT_DOMAIN && imageUrl.startsWith(CLOUDFRONT_DOMAIN.replace(/\/$/, ""))) {
			const base = CLOUDFRONT_DOMAIN.replace(/\/$/, "");
			key = imageUrl.slice(base.length).replace(/^\//, "");
		} else if (imageUrl.includes(".amazonaws.com/")) {
			key = imageUrl.split(".amazonaws.com/")[1];
		} else {
			console.log("Unknown image URL format, skipping deletion:", imageUrl);
			return;
		}

		if (!key) {
			console.error("Could not extract S3 key from URL:", imageUrl);
			return;
		}

		const deleteParams = {
			Bucket: BUCKET_NAME,
			Key: key,
		};

		const command = new DeleteObjectCommand(deleteParams);
		await s3Client.send(command);

		console.log(`Image deleted from S3: ${key}`);
	} catch (error) {
		console.error("Error deleting from S3:", error);
		// Don't throw - deletion failure shouldn't break the app
	}
}

module.exports = {
	uploadImageToS3,
	deleteImageFromS3,
};
