const express = require("express");
const morgan = require("morgan");

const app = express();
const mime = require("mime");
const path = require("path");
const fs = require("fs");
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

var accessLogStream = fs.createWriteStream(path.join(__dirname, "access.log"), {
  flags: "a",
});

// setup the logger
app.use(morgan("combined", { stream: accessLogStream }));
app.use(morgan("dev"));

app.param("filename", (req, res, next, filename) => {
  const reg = /(\.log|\.txt|\.json|\.yaml|\.xml|\.js)$/;
  if (!filename) {
    res.status(400).json({ message: "Filename is required" });
  } else if (filename && !reg.test(filename)) {
    res.status(400).json({ message: "Filename must have an extension" });
  } else {
    next();
  }
});
app.post("/api/files", (req, res) => {
  const { filename, content } = req.body;
  const reg = /(\.log|\.txt|\.json|\.yaml|\.xml|\.js)$/;
  if (!filename || !content) {
    return res.status(400).json({ message: "Missing name or content" });
  }
  if (filename && !reg.test(filename)) {
    return res.status(400).json({ message: "Filename must have an extension" });
  }
  var folder = __dirname + "/upload";
  const file = __dirname + "/" + "upload/" + filename;
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder);
  }
  fs.writeFile(file, content, (err) => {
    if (err) {
      res.status(500).json({ message: "internal server error" });
    } else {
      res.statusCode = 200;
      res.json({ message: "File created successfully" });
    }
  });
});
app.get("/api/files", (req, res) => {
  const path = __dirname + "/upload";
  fs.readdir(path, (err, files) => {
    if (err) {
      return res.status(500).json({ message: String(err) });
    }

    res.status(200).json({ message: "success", files: files });
  });
});
app.get("/api/files/:filename", (req, res) => {
  const filename = req.params.filename;
  const file = path.join(__dirname, "upload", filename);
  fs.readFile(file, "utf8", (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        return res.status(404).json({ message: "File not found" });
      } else {
        return res.status(500).json({ message: "internal server error" });
      }
    } else {
      const stats = fs.statSync(file);
      const sendData = {
        message: "success",
        filename: filename,
        content: data,
        extension: path.extname(filename),
        uploadedDate: stats.birthtime,
      };
      res.setHeader("Content-Type", mime.lookup(file));
      res.statusCode = 200;
      res.json(sendData);
    }
  });
});
app.put("/api/files/:filename", (req, res) => {
  const filename = req.params.filename;
  const file = path.join(__dirname, "upload", filename);

  const { content } = req.body;
    if (!content) {
       return  res.status(400).json({message:"no content"});
    }
  try {
    const stats = fs.statSync(file);

    fs.writeFile(file, content, (err) => {
      if (err) {
        res.status(err.code).json(err);
      } else {
        res.status(200).json({ message: "File updated" });
      }
    });
  } catch (err) {
    if (err.code == "ENOENT") {
      res.status(404).json({ message: "File not found" });
    } else {
      res.status(500).json({ message: String(err) });
    }
  }
});
app.delete("/api/files/:filename", (req, res) => {
  const filename = req.params.filename;
  const file = path.join(__dirname, "upload", filename);
  fs.unlink(file, (err) => {
    if (err) {
      if (err.code === "ENOENT") {
        res.status(404).json({ message: "File not found" });
      } else {
        res.status(500).json(err);
      }
    } else {
      res.status(200).json({ message: "File deleted" });
    }
  });
});
app.listen(8080, () => {
  console.log("Server is running on port 8080");
});

