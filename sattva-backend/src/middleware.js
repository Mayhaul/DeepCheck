const multer = require("multer");
const { VALID_TYPES } = require("./utils");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /^(image|video|audio)\//.test(file.mimetype) ||
      [
        "application/pdf",
        "text/plain",
        "text/markdown",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ].includes(file.mimetype);
    if (!allowed)
      return cb(Object.assign(new Error("INVALID_FILE_TYPE"), { status: 422 }));
    cb(null, true);
  },
});

function errorHandler(err, req, res, next) {
  const status = err.status || (err.code === "LIMIT_FILE_SIZE" ? 413 : 500);
  res.status(status).json({
    success: false,
    error: err.message || "INTERNAL_ERROR",
  });
}

function checkSubmission(req, res, next) {
  const type = req.body.type;
  if (!VALID_TYPES.includes(type))
    return res.status(400).json({
      success: false,
      error: "INVALID_SUBMISSION_TYPE",
    });

  if (["image", "video", "audio", "document"].includes(type) && !req.file)
    return res.status(422).json({ success: false, error: "FILE_REQUIRED" });

  if (!req.body.claim?.trim())
    return res.status(422).json({ success: false, error: "CLAIM_REQUIRED" });

  if (type === "article_url" && !(req.body.sourceUrl || req.body.url)?.trim())
    return res.status(422).json({ success: false, error: "URL_REQUIRED" });

  next();
}

module.exports = { upload, errorHandler, checkSubmission };
