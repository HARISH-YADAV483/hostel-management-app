const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const multer = require("multer");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const session = require("express-session");
const path = require("path");
const sharedSession = require("express-socket.io-session");
require("dotenv").config();
const User = require("./models/User");
const Record = require("./models/Record");
const Complaint = require("./models/Complaint");
const app = express();

// 🔹 ADD THIS near the top of app.js (after imports)
// const records = [];

const server = http.createServer(app);
const io = new Server(server);

app.use(bodyParser.json());
// Middleware
// Session middleware with proper configuration for Socket.IO sharing
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000
  }
});
app.set("trust proxy", 1);

app.use(sessionMiddleware);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files (CSS, JS, Images)
app.use(express.static(path.join(__dirname, "public")));

// Session


// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("MongoDB Connected");


    let isconnecyed = false ;
     async function  connectToMonngodb(){
      
     }
    // Defensive fix: drop old `email_1` unique index that can cause
    // duplicate-key errors when documents don't have an `email` field.
    try {
      const coll = mongoose.connection.db.collection("users");
      const indexes = await coll.indexes();
      const hasEmailIndex = indexes.some(idx => idx.name === "email_1");
      if (hasEmailIndex) {
        await coll.dropIndex("email_1");
        console.log("Dropped stale index: email_1 on users collection");
      }
    } catch (err) {
      // Ignore 'index not found' style errors, log others
      if (err && err.codeName !== "IndexNotFound") {
        console.error("Error while checking/dropping email_1 index:", err);
      }
    }
  })
  .catch(err => console.log(err));

/* ---------------- ROUTES ---------------- */

// Home Page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});
app.get("/superfood", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "superfood.html"));
});
app.get("/facilities", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "facilities.html"));
});

// Login Page
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});
// app.get("/mess", (req, res) => {
//   res.sendFile(path.join(__dirname, "views", "mess.html"));
// });

// Register Page
app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "register.html"));
});

// Register User
app.post("/register", async (req, res) => {
  console.log("[REGISTER] body:", req.body);

  let { email, password } = req.body;

  if (!email || !password) {
    return res.send(`
      <script>
        alert("Missing email or password");
        window.history.back();
      </script>
    `);
  }

  email = String(email).trim().toLowerCase();

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const created = await User.create({
      email,
      password: hashedPassword
    });

    console.log("[REGISTER] created user:", created.email);
    return res.redirect("/login");

  } catch (err) {
    console.error("[REGISTER] error:", err);

    // Duplicate email error
    if (err.code === 11000) {
      return res.send(`
        <script>
          alert("account already exist");
          window.history.back();
        </script>
      `);
    }

    // Schema validation error (email domain)
    if (err.name === "ValidationError") {
      return res.send(`
        <script>
          alert("use institute mails only");
          window.history.back();
        </script>
      `);
    }

    return res.send(`
      <script>
        alert("Server error");
        window.history.back();
      </script>
    `);
  }
});

// Announcements page (used inside iframes)


// Notifications page (used inside iframes)



// Login User
app.post("/login", async (req, res) => {
  console.log("[LOGIN] body:", req.body);
  let { email, password } = req.body;
   

  if (!email || !password) {
    return res.status(400).send("Missing email or password");
  }

  email = String(email).trim().toLowerCase();

  try {
    const user = await User.findOne({ email });
    console.log("[LOGIN] lookup result:", !!user ? user.email : null);
    if (!user) return res.status(404).send("user not found");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).send("wrong password");

    req.session.user = user;
    return res.redirect("/");
  } catch (err) {
    console.error("[LOGIN] error:", err);
    return res.status(500).send("Server error");
  }
});
// Auth status (used by frontend fetch)
app.get("/auth-status", (req, res) => {
  if (req.session && req.session.user) {
    return res.json({
      loggedIn: true,
      email: req.session.user.email
    });
  } else {
    return res.json({
      loggedIn: false
    });
  }
});

function isLoggedIn(req, res, next) {
  if (req.session && req.session.user) {
    next(); // user is logged in → continue
  } else {
    res.redirect("/login"); // not logged in → redirect
  }
}
app.get("/mess", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "mess.html"));
});

// Logout


// DEBUG: list users (development only) - does not expose passwords
app.get("/debug/users", async (req, res) => {
  try {
    const users = await User.find({}, { password: 0, __v: 0 }).lean();
    res.json(users);
  } catch (err) {
    console.error("[DEBUG] users error:", err);
    res.status(500).send("Error fetching users");
  }
});
const SPECIAL_PASSWORD = process.env.PRO_SPECIAL_PASSWORD;
// Pro page
app.get("/pro", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "pro.html"));
});

// Pro password check
app.post("/pro-auth", (req, res) => {
  const { specialPassword } = req.body;

  if (!SPECIAL_PASSWORD) {
    console.error("PRO_SPECIAL_PASSWORD not set in .env");
    return res.status(500).send("Server misconfiguration");
  }

  if (specialPassword === SPECIAL_PASSWORD) {
    req.session.proAccess = true;
    return res.redirect("/contribute");
  } else {
    return res.send(`
      <script>
        alert("invalid password");
        window.history.back();
      </script>
    `);
  }
});

// Protected contribute page
// app.get("/contribute", (req, res) => {
//   if (!req.session.proAccess) {
//     return res.redirect("/pro");
//   }
//   res.sendFile(path.join(__dirname, "views", "contribute.html"));
// });


//asdfghj
app.get("/contribute", async(req, res) => {
  // 🔒 Protect route
  if (!req.session.proAccess) {
    return res.redirect("/pro");
  }

  // 📄 Read HTML
  let html = require("fs").readFileSync(
    path.join(__dirname, "views", "contribute.html"),
    "utf8"
  );

  // 🧾 Generate table rows
 const records = await Record.find().lean();

const rows = records.map(r => `
  <tr>
    <td>${r.name}</td>
    <td>${r.rollnumber}</td>
    <td>${r.cntcnumber}</td>
    <td>${r.place}</td>
    <td>${r.startDate}</td>
    <td>${r.endDate}</td>
    <td>${r.totalDays}</td>
    <td>${r.uploadTime}</td>
    <td>${r.email}</td>
  </tr>
`).join("");

  // 📝 Generate complaint rows
  const complaints = await Complaint.find().lean();

const complaintRows = complaints.map(c => `
  <tr>
    <td>${c.email}</td>
    <td>${c.complaintText}</td>
    <td>${c.uploadTime}</td>
  </tr>
`).join("");

  // 🪄 Inject rows
  html = html.replace(
    "{{TABLE_ROWS}}",
    rows || "<tr><td colspan='5'>No data</td></tr>"
  );

  // 📝 Inject complaint rows
  html = html.replace(
    "{{COMPLAINT_ROWS}}",
    complaintRows || "<tr><td colspan='3'>No complaints</td></tr>"
  );

  // 🚀 Send final page
  res.send(html);
});



app.post("/add-entry", async(req, res) => {
  const { name, cntcnumber, rollnumber, place, startDate, endDate, totalDays } = req.body;

  const now = new Date();

  const uploadTime = now.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
await Record.create({
  name,
  rollnumber,
  cntcnumber,
  place,
  startDate,
  endDate,
  totalDays,
  uploadTime,
  email: req.session.user.email
});
  // records.push({
  //   name,
  //   rollnumber,
  //   cntcnumber,
  //   place,
  //   startDate,
  //   endDate,
  //   totalDays,
  //   uploadTime,
  //   email: req.session.user.email
  // });

  res.redirect("/?success=rebate");
});

//asdfghjk


app.use("/uploads", express.static("uploads"));

const DATA_FILE = "./data/notifications.json";

// Ensure data file exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

// Multer setup
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({
  fileFilter: (req, file, cb) => {
    file.mimetype === "application/pdf"
      ? cb(null, true)
      : cb(new Error("Only PDFs allowed"));
  },
  storage
});
app.get("/notifications", (req, res) => {
  const notifications = JSON.parse(fs.readFileSync(DATA_FILE));
  let html = fs.readFileSync("./views/notifications.html", "utf8");

  const listItems = notifications
    .map(n => `<li><a href="${n.url}" target="_blank">${n.name}</a></li>`)
    .join("");

  html = html.replace("{{NOTIFICATIONS}}", listItems || `<li>No announcements yet</li>`);
  res.send(html);
});
app.post("/upload", upload.single("pdf"), (req, res) => {
  const notifications = JSON.parse(fs.readFileSync(DATA_FILE));

  notifications.unshift({
    name: req.file.originalname,
    url: `/uploads/${req.file.filename}`
  });

  fs.writeFileSync(DATA_FILE, JSON.stringify(notifications, null, 2));
  res.redirect("/notifications");
});








const DATA_FILES = "./data/announcements.json";
if (!fs.existsSync(DATA_FILES)) {
  fs.writeFileSync(DATA_FILES, JSON.stringify([]));
}
app.get("/announcements", (req, res) => {
  const notifications = JSON.parse(fs.readFileSync(DATA_FILES));
  let html = fs.readFileSync("./views/announcements.html", "utf8");

  const listItems = notifications
    .map(n => `<li><a href="${n.url}" target="_blank">${n.name}</a></li>`)
    .join("");

  html = html.replace("{{ANNOUNCEMENTS}}", listItems || `<li>No announcements yet</li>`);
  res.send(html);
});
app.post("/upload-announcement", upload.single("pdf"), (req, res) => {
  const announcements = JSON.parse(fs.readFileSync(DATA_FILES));

  announcements.unshift({
    name: req.file.originalname,
    url: `/uploads/${req.file.filename}`
  });
  fs.writeFileSync(DATA_FILES, JSON.stringify(announcements, null, 2));
  res.redirect("/announcements");
});

const otpStore = {}; // { email: otp }

// Email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
 auth: {
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS
}
});

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  const otp = generateOTP();

  otpStore[email] = otp;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP is ${otp}`
  });

  res.json({ message: "OTP sent to email" });
});

// Verify OTP
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  if (otpStore[email] === otp) {
    delete otpStore[email]; // one-time use
    res.json({ message: "Email verified successfully ✅" });
  } else {
    res.json({ message: "Invalid OTP ❌" });
  }
});






app.get("/complaint", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "complaint.html"));
});
app.get("/chatroom",isLoggedIn, (req, res) => {
  if (!req.session.user || !req.session.user.email) {
    return res.redirect("/");
  }

  res.sendFile(path.join(__dirname, "views", "chatroom.html"));
});

// Test chat page
app.get("/test-chat", (req, res) => {
  res.sendFile(path.join(__dirname, "test_chat.html"));
});


// Send complaint (save to database)
app.post("/send-complaint", async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const complaintText = req.body.complaint;

    // Validate input
    if (!complaintText || complaintText.trim().length === 0) {
      console.log("[COMPLAINT] Empty complaint text");
      return res.redirect("/?status=complaint-error");
    }

    // Create timestamp
    const now = new Date();
    const uploadTime = now.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    });

    // Save complaint to database
    await Complaint.create({
      email: userEmail,
      complaintText: complaintText.trim(),
      uploadTime: uploadTime
    });

    console.log("[COMPLAINT] Complaint submitted successfully for:", userEmail);

    // ✅ success redirect
    res.redirect("/?status=complaint-success");

  } catch (error) {
    console.error("[COMPLAINT] Error:", error);

    // ❌ failure redirect
    res.redirect("/?status=complaint-error");
  }
});



// Alternative approach: Share session manually using io.engine
io.engine.use((req, res, next) => {
  sessionMiddleware(req, res, next);
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
  
  // Get session manually
  const session = socket.request.session;

  console.log("Session check:", !!session, session?.user?.email);

  // HARD GUARD (important)
  if (!session || !session.user || !session.user.email) {
    console.log("Unauthenticated socket blocked - no session");
    socket.disconnect();
    return;
  }

  const email = session.user.email;
  const username = email.split("@")[0];

  console.log(`[SOCKET] ${username} connected`);

  // Notify others
  socket.broadcast.emit("system-message", {
    message: `${username} joined the chat`
  });

  // Listen for messages
  socket.on("chat-message", (msg) => {
    console.log(`[CHAT] Message from ${username}: ${msg}`);
    io.emit("chat-message", {
      user: username,
      message: msg,
      time: new Date().toLocaleTimeString()
    });
  });

  socket.on("disconnect", () => {
    console.log(`[SOCKET] ${username} disconnected`);
    socket.broadcast.emit("system-message", {
      message: `${username} left the chat`
    });
  });
});






const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// Server
