const path = require('path');

exports.fileFilter = (req, file, cb) => {
  
    if (path.extname(file.originalname) !== ".png" && path.extname(file.originalname) !== ".jpg" && path.extname(file.originalname) !== ".jpeg") {
        return cb(new Error("Seuls les formats jpg, jpeg et png sont autorisés"));
    } else {
        cb(null, true);
    }

}