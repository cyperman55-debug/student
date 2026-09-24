import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';

const app = express();
const PORT = Number(process.env.PORT) || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'shefo-secret-key';

app.use(cors());
app.use(express.json());
const pdfUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const quizSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, default: 10, min: 1 },
  questions: [{ id: Number, text: String, options: [String], correctOption: Number }],
  published: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });
const Quiz = mongoose.models.Quiz || mongoose.model('Quiz', quizSchema);
const userSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  studentNumber: String,
  guardianPhone: String,
  phone: String,
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'student'], required: true },
  status: { type: String, default: 'active' },
  balance: { type: Number, default: 0 },
  contentUnlocked: { type: Boolean, default: false },
  contentAccess: { all: Boolean, videoIds: [Number] },
}, { versionKey: false });
const User = mongoose.models.User || mongoose.model('User', userSchema);
const videoSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  cover: { type: String, default: '' },
  price: { type: Number, default: 10, min: 0 },
}, { versionKey: false });
const Video = mongoose.models.Video || mongoose.model('Video', videoSchema);
const rechargeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  studentId: { type: Number, required: true },
  amount: { type: Number, required: true, min: 1 },
  transactionReference: { type: String, default: '' },
  senderPhone: String,
  notes: String,
  status: { type: String, default: 'Pending' },
  rejectionReason: String,
  reviewedAt: Date,
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });
const RechargeRequest = mongoose.models.RechargeRequest || mongoose.model('RechargeRequest', rechargeSchema);
let mongoReady = false;
const mongoConfigured = Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.trim());
const videoCatalog = [
  { id: 1, title: 'محاضرة تمهيدية', cover: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', price: 10 },
  { id: 2, title: 'شرح الوحدة الأولى', cover: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80', url: 'https://www.youtube.com/embed/ysz5S6PUM-U', price: 10 },
];

function normalizeVideoUrl(value) {
  const input = String(value || '').trim();
  const iframeMatch = input.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  const rawUrl = (iframeMatch ? iframeMatch[1] : input).trim();
  const url = rawUrl.replace('://player.mediadelivery.net/', '://iframe.mediadelivery.net/');
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/i);
  return youtubeMatch ? `https://www.youtube.com/embed/${youtubeMatch[1]}` : url;
}

const connectMongo = mongoConfigured
  ? mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
      .then(async () => {
        mongoReady = true;
        const savedUsers = await User.find().lean();
        if (savedUsers.length) {
          users.splice(0, users.length, ...savedUsers);
        } else {
          await User.insertMany(users);
        }
        const savedVideos = await Video.find().lean();
        if (savedVideos.length) {
          videoCatalog.splice(0, videoCatalog.length, ...savedVideos.map((video) => ({
            ...video,
            id: Number(video.id),
            url: normalizeVideoUrl(video.url),
            price: Number(video.price) || 10,
          })));
          await Promise.all(videoCatalog.map((video) => Video.updateOne({ id: video.id }, { $set: { url: video.url } })));
        } else {
          await Video.insertMany(videoCatalog);
        }
        const savedQuizzes = await Quiz.find().lean();
        const legacyQuizzes = savedQuizzes.filter((quiz) => !quiz.price || quiz.price < 1);
        if (legacyQuizzes.length) await Quiz.updateMany({ _id: { $in: legacyQuizzes.map((quiz) => quiz._id) } }, { $set: { price: 10 } });
        quizzes.push(...savedQuizzes.map((quiz) => ({ ...quiz, id: String(quiz.id || quiz._id), price: Number(quiz.price) >= 1 ? Number(quiz.price) : 10 })));
        const savedRechargeRequests = await RechargeRequest.find().lean();
        rechargeRequests.push(...savedRechargeRequests.map((request) => ({ ...request, id: String(request.id || request._id) })));
        console.log(`MongoDB connected; loaded ${savedQuizzes.length} quizzes`);
      })
      .catch((error) => {
        console.warn(`MongoDB unavailable: ${error.message}. Continuing with in-memory mode.`);
      })
  : Promise.resolve().then(() => {
      console.log('MongoDB not configured; running in memory mode.');
    });

function requireMongo(res) {
  if (!mongoReady && mongoConfigured) {
    console.warn('MongoDB unavailable, continuing in memory mode.');
  }
  return true;
}

const users = [
  {
    id: 1,
    name: 'طارق هشام',
    email: 'tarekhesham593@gmail.com',
    passwordHash: bcrypt.hashSync('Tarek@2025', 10),
    role: 'admin',
    balance: 0,
  },
  {
    id: 2,
    name: 'الطالب',
    email: 'student@shefo.com',
    studentNumber: 'ST-0002',
    guardianPhone: '01000000001',
    phone: '01000000000',
    passwordHash: bcrypt.hashSync('student123', 10),
    role: 'student',
    balance: 0,
    contentUnlocked: false,
  },
];

const chatMessages = [
  {
    id: 1,
    userId: 1,
    userName: 'أستاذ محمد عبد الشافي',
    role: 'admin',
    text: 'أهلًا بكم في شات المنصة. اكتبوا أسئلتكم عن البرمجة والذكاء الاصطناعي.',
    pinned: true,
    createdAt: new Date().toISOString(),
  },
];

const quizzes = [];
const quizAttempts = [];
const quizPurchases = [];
const videoPurchases = [];
const rechargeRequests = [];
const paymentSettings = {
  vodafoneCashNumber: process.env.VODAFONE_CASH_NUMBER || '01000000000',
  instructions: 'حوّل المبلغ إلى رقم Vodafone Cash، ثم اكتب رقم العملية والمبلغ الذي تم تحويله. سيتم إضافة الرصيد بعد مراجعة المدرس.',
  minimumAmount: 10,
};
const activityLog = [];
function optionIndex(label) {
  return { a: 0, b: 1, c: 2, d: 3, أ: 0, ب: 1, ج: 2, د: 3 }[String(label).toLowerCase()] ?? -1;
}

function parseMcqText(text) {
  const questions = [];
  let current = null;
  let answerKeyStarted = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    if (!line) continue;
    if (/^(answer key|answers|الإجابات|الاجابات|مفتاح الإجابة)/i.test(line)) {
      if (current && current.options.length >= 2) {
        questions.push(current);
        current = null;
      }
      answerKeyStarted = true;
      continue;
    }
    const answerMatch = answerKeyStarted && line.match(/^(\d+)\s*[-:.]\s*([a-dأبجد])/i);
    if (answerMatch && questions[Number(answerMatch[1]) - 1]) {
      questions[Number(answerMatch[1]) - 1].correctOption = optionIndex(answerMatch[2]);
      continue;
    }
    const questionMatch = line.match(/^(\d+)[.)\-]\s*(.+)$/);
    if (questionMatch) {
      if (current && current.options.length >= 2) questions.push(current);
      current = { text: questionMatch[2], options: [], correctOption: -1 };
      answerKeyStarted = false;
      continue;
    }
    const optionMatch = line.match(/^([a-dأبجد])[.)\-:]\s*(.+)$/i);
    if (optionMatch && current) {
      current.options.push(optionMatch[2]);
      if (current.options.length === 1 && optionMatch[1].toLowerCase() === 'a') current.correctOption = -1;
      continue;
    }
    const inlineAnswer = line.match(/^(?:answer|الإجابة|الاجابة|الإجابة الصحيحة)\s*[:\-]?\s*([a-dأبجد])/i);
    if (inlineAnswer && current) current.correctOption = optionIndex(inlineAnswer[1]);
  }
  if (current && current.options.length >= 2) questions.push(current);
  return questions.map((question, index) => ({ id: index + 1, ...question }));
}

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      balance: user.balance,
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'غير مسموح لك بالدخول' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'رمز الدخول غير صالح' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'هذه العملية خاصة بالمدرس فقط' });
  }
  next();
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'خدمة Shefo تعمل بشكل طبيعي' });
});

app.get('/api/public/students', (req, res) => {
  res.json({
    students: users
      .filter((item) => item.role === 'student' && item.status !== 'suspended')
      .map((item) => ({ id: item.id, name: item.name, score: item.score || null })),
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
  }

  const user = users.find((item) => item.email.toLowerCase() === String(email).toLowerCase());

  if (!user) {
    return res.status(401).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
  }

  const validPassword = bcrypt.compareSync(password, user.passwordHash);

  if (!validPassword) {
    return res.status(401).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
  }

  const token = generateToken(user);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      balance: user.balance,
    },
  });
});

app.post('/api/auth/register', async (req, res) => {
  requireMongo(res);
  const { name, email, studentNumber, guardianPhone, password } = req.body;
  if (!name || !email || !studentNumber || !guardianPhone || !password || password.length < 6) {
    return res.status(400).json({ message: 'كل البيانات مطلوبة وكلمة المرور يجب أن تكون 6 أحرف على الأقل' });
  }
  if (users.some((item) => item.email.toLowerCase() === String(email).toLowerCase())) {
    return res.status(409).json({ message: 'البريد الإلكتروني مستخدم بالفعل' });
  }
  if (users.some((item) => item.studentNumber === String(studentNumber).trim())) {
    return res.status(409).json({ message: 'رقم الطالب مستخدم بالفعل' });
  }

  const user = {
    id: Math.max(...users.map((item) => item.id)) + 1,
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    studentNumber: String(studentNumber).trim(),
    guardianPhone: String(guardianPhone).trim(),
    phone: String(guardianPhone).trim(),
    passwordHash: await bcrypt.hash(password, 10),
    role: 'student',
    balance: 0,
    contentUnlocked: false,
  };
  try {
    await User.create(user);
  } catch (error) {
    return res.status(500).json({ message: 'تعذر حفظ الحساب في قاعدة البيانات' });
  }
  users.push(user);
  res.status(201).json({ token: generateToken(user), user: { id: user.id, name: user.name, email: user.email, studentNumber: user.studentNumber, guardianPhone: user.guardianPhone, role: user.role, balance: user.balance } });
});

app.get('/api/profile', authenticate, (req, res) => {
  const user = users.find((item) => item.id === req.user.id);

  if (!user) {
    return res.status(404).json({ message: 'المستخدم غير موجود' });
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      balance: user.balance,
    },
  });
});

app.get('/api/payment-settings', authenticate, (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'هذه الصفحة خاصة بالطلاب' });
  res.json({ settings: paymentSettings });
});

app.get('/api/recharge-requests/my', authenticate, (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'هذه العملية خاصة بالطلاب' });
  res.json({ requests: rechargeRequests.filter((request) => request.studentId === req.user.id) });
});

app.post('/api/recharge-requests', authenticate, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'هذه العملية خاصة بالطلاب' });
  const amount = Number(req.body.amount);
  const transactionReference = String(req.body.transactionReference || `RECHARGE-${randomUUID().slice(0, 8)}`).trim();
  if (!Number.isFinite(amount) || amount < paymentSettings.minimumAmount) return res.status(400).json({ message: `الحد الأدنى للشحن ${paymentSettings.minimumAmount} جنيه مصري` });
  const request = { id: randomUUID(), studentId: req.user.id, amount, transactionReference, senderPhone: String(req.body.senderPhone || '').trim(), notes: String(req.body.notes || '').trim(), status: 'Pending', createdAt: new Date().toISOString() };
  if (mongoReady) {
    try { await RechargeRequest.create(request); } catch { return res.status(500).json({ message: 'تعذر حفظ طلب الدفع' }); }
  }
  rechargeRequests.unshift(request);
  res.status(201).json({ request, message: 'تم إرسال طلب الشحن، وسيتم تحديث الرصيد بعد المراجعة' });
});

app.get('/api/admin/recharge-requests', authenticate, requireAdmin, (req, res) => {
  res.json({ requests: rechargeRequests.map((request) => {
    const student = users.find((user) => user.id === request.studentId);
    return {
      ...request,
      student: student?.name || 'طالب غير معروف',
      studentEmail: student?.email || '',
      studentNumber: student?.studentNumber || '',
      guardianPhone: student?.guardianPhone || '',
      studentBalance: student?.balance || 0,
    };
  }) });
});

app.post('/api/admin/recharge-requests/:id/approve', authenticate, requireAdmin, async (req, res) => {
  const request = rechargeRequests.find((item) => String(item.id) === String(req.params.id));
  if (!request) return res.status(404).json({ message: 'طلب الدفع غير موجود' });
  if (request.status !== 'Pending') return res.status(409).json({ message: 'تمت مراجعة الطلب من قبل' });
  const student = users.find((user) => user.id === request.studentId);
  if (!student) return res.status(404).json({ message: 'الطالب غير موجود' });
  student.balance += request.amount;
  request.status = 'Approved';
  request.reviewedAt = new Date().toISOString();
  await User.updateOne({ id: student.id }, { $set: { balance: student.balance } });
  await RechargeRequest.updateOne({ id: request.id }, { $set: { status: request.status, reviewedAt: request.reviewedAt } });
  res.json({ request, balance: student.balance, message: 'تم اعتماد الطلب وإضافة الرصيد' });
});

app.post('/api/admin/recharge-requests/:id/reject', authenticate, requireAdmin, async (req, res) => {
  const request = rechargeRequests.find((item) => String(item.id) === String(req.params.id));
  if (!request) return res.status(404).json({ message: 'طلب الدفع غير موجود' });
  if (request.status !== 'Pending') return res.status(409).json({ message: 'تمت مراجعة الطلب من قبل' });
  request.status = 'Rejected';
  request.rejectionReason = String(req.body.reason || 'لم يتم اعتماد التحويل');
  request.reviewedAt = new Date().toISOString();
  await RechargeRequest.updateOne({ id: request.id }, { $set: { status: request.status, rejectionReason: request.rejectionReason, reviewedAt: request.reviewedAt } });
  res.json({ request, message: 'تم رفض طلب الدفع' });
});

app.get('/api/chat/messages', authenticate, (req, res) => {
  res.json({ messages: [...chatMessages].sort((first, second) => Number(second.pinned) - Number(first.pinned) || new Date(first.createdAt) - new Date(second.createdAt)) });
});

app.post('/api/chat/messages', authenticate, (req, res) => {
  const text = String(req.body.text || '').trim();
  if (!text || text.length > 500) return res.status(400).json({ message: 'اكتب رسالة من 1 إلى 500 حرف' });
  const message = { id: chatMessages.length ? Math.max(...chatMessages.map((item) => item.id)) + 1 : 1, userId: req.user.id, userName: req.user.name, role: req.user.role, text, pinned: false, createdAt: new Date().toISOString() };
  chatMessages.push(message);
  res.status(201).json({ message });
});

app.patch('/api/chat/messages/:id/pin', authenticate, requireAdmin, (req, res) => {
  const message = chatMessages.find((item) => item.id === Number(req.params.id));
  if (!message) return res.status(404).json({ message: 'الرسالة غير موجودة' });
  message.pinned = !message.pinned;
  res.json({ message });
});

app.delete('/api/chat/messages/:id', authenticate, requireAdmin, (req, res) => {
  const messageIndex = chatMessages.findIndex((item) => item.id === Number(req.params.id));
  if (messageIndex === -1) return res.status(404).json({ message: 'الرسالة غير موجودة' });
  chatMessages.splice(messageIndex, 1);
  res.json({ success: true });
});

app.get('/api/dashboard', authenticate, (req, res) => {
  const currentUser = users.find((item) => item.id === req.user.id);

  if (!currentUser) {
    return res.status(404).json({ message: 'المستخدم غير موجود' });
  }

  if (currentUser.role === 'admin') {
    const students = users.filter((item) => item.role === 'student');
    return res.json({
      role: 'admin',
      stats: {
        totalStudents: students.length,
        activeLessons: 2,
        totalWalletBalance: students.reduce((total, student) => total + student.balance, 0),
        activeStudents: students.filter((student) => student.balance > 0 || student.contentUnlocked).length,
      },
      summary: 'هذه الإحصائيات محسوبة مباشرة من حسابات الطلاب وحالة المحتوى الحالية.',
      user: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        balance: currentUser.balance,
      },
      videos: videoCatalog,
    });
  }

  const videos = videoCatalog.map((video) => {
    const open = currentUser.contentUnlocked
      || currentUser.contentAccess?.all
      || currentUser.contentAccess?.videoIds?.includes(video.id)
      || videoPurchases.some((purchase) => purchase.videoId === video.id && purchase.studentId === currentUser.id);
    return { ...video, purchased: open, locked: !open };
  });

  return res.json({
    role: 'student',
    balance: currentUser.balance,
    hasPaid: currentUser.balance > 0 || currentUser.contentUnlocked,
    contentUnlocked: currentUser.contentUnlocked,
    quizzes: quizzes.filter((quiz) => quiz.published).map(({ questions, ...quiz }) => ({ ...quiz, purchased: quiz.price === 0 || quizPurchases.some((purchase) => purchase.quizId === quiz.id && purchase.studentId === currentUser.id), questionCount: questions.length })),
    attempts: quizAttempts.filter((attempt) => attempt.studentId === currentUser.id),
    user: {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
      balance: currentUser.balance,
    },
    videos,
    message: 'الفيديوهات مقفلة حتى يتم إتمام الدفع',
  });
});

app.post('/api/admin/videos', authenticate, requireAdmin, async (req, res) => {
  const title = String(req.body.title || '').trim();
  const url = normalizeVideoUrl(req.body.url);
  const cover = String(req.body.cover || '').trim();
  const price = Number(req.body.price ?? 10);
  if (!title || !url) return res.status(400).json({ message: 'عنوان الفيديو ورابطه مطلوبان' });
  if (!Number.isFinite(price) || price < 0) return res.status(400).json({ message: 'سعر الفيديو يجب أن يكون صفرًا أو أكثر' });

  const video = {
    id: videoCatalog.length ? Math.max(...videoCatalog.map((item) => Number(item.id))) + 1 : 1,
    title,
    url,
    cover: cover || 'https://images.unsplash.com/photo-1516321165247-4aa89a48be28?auto=format&fit=crop&w=1200&q=80',
    price,
  };
  videoCatalog.unshift(video);
  if (mongoReady) await Video.create(video);
  res.status(201).json({ video, videos: videoCatalog });
});

app.patch('/api/admin/videos/:id', authenticate, requireAdmin, async (req, res) => {
  const videoId = Number(req.params.id);
  const video = videoCatalog.find((item) => item.id === videoId);
  if (!video) return res.status(404).json({ message: 'الفيديو غير موجود' });

  const title = String(req.body.title || '').trim();
  const price = Number(req.body.price ?? video.price ?? 10);
  if (!title) return res.status(400).json({ message: 'عنوان الفيديو مطلوب' });
  if (!Number.isFinite(price) || price < 0) return res.status(400).json({ message: 'سعر الفيديو يجب أن يكون صفرًا أو أكثر' });

  video.title = title;
  video.price = price;
  if (req.body.url) video.url = normalizeVideoUrl(req.body.url);
  if (req.body.cover) video.cover = String(req.body.cover).trim();

  if (mongoReady) {
    await Video.updateOne({ id: video.id }, { $set: { title: video.title, url: video.url, cover: video.cover, price: video.price } });
  }

  res.json({ video, videos: videoCatalog });
});

app.delete('/api/admin/videos/:id', authenticate, requireAdmin, async (req, res) => {
  const videoId = Number(req.params.id);
  const index = videoCatalog.findIndex((item) => item.id === videoId);
  if (index === -1) return res.status(404).json({ message: 'الفيديو غير موجود' });

  videoCatalog.splice(index, 1);
  if (mongoReady) {
    await Video.deleteOne({ id: videoId });
  }

  res.json({ success: true, videos: videoCatalog });
});

app.post('/api/videos/:id/purchase', authenticate, async (req, res) => {
  const videoId = Number(req.params.id);
  const video = videoCatalog.find((item) => item.id === videoId);
  if (!video) return res.status(404).json({ message: 'الفيديو غير موجود' });
  const student = users.find((item) => item.id === req.user.id && item.role === 'student');
  const alreadyOpen = student?.contentUnlocked || student?.contentAccess?.all || student?.contentAccess?.videoIds?.includes(videoId) || videoPurchases.some((purchase) => purchase.videoId === videoId && purchase.studentId === req.user.id);
  if (alreadyOpen) return res.json({ success: true, purchased: true, balance: student.balance });
  const price = Number(video.price) || 0;
  if (!student || student.balance < price) return res.status(402).json({ message: `رصيدك غير كافٍ. سعر الفيديو ${price} جنيه مصري` });
  student.balance -= price;
  videoPurchases.push({ videoId, studentId: student.id, price, purchasedAt: new Date().toISOString() });
  await User.updateOne({ id: student.id }, { $set: { balance: student.balance } });
  res.json({ success: true, purchased: true, balance: student.balance });
});

app.post('/api/videos/:id/view', authenticate, (req, res) => {
  const video = videoCatalog.find((item) => item.id === Number(req.params.id));
  if (!video) return res.status(404).json({ message: 'الفيديو غير موجود' });
  activityLog.push({ studentId: req.user.id, type: 'video', label: `مشاهدة فيديو: ${video.title}`, detail: 'تم تسجيل المشاهدة', createdAt: new Date().toISOString() });
  res.json({ success: true });
});

app.get('/api/admin/students', authenticate, requireAdmin, (req, res) => {
  res.json({
    students: users
      .filter((item) => item.role === 'student')
      .map((item) => ({
        id: item.id,
        name: item.name,
        email: item.email,
        balance: item.balance,
        contentUnlocked: Boolean(item.contentUnlocked),
      })),
  });
});

app.post('/api/admin/students/:id/balance', authenticate, requireAdmin, (req, res) => {
  const student = users.find((item) => item.id === Number(req.params.id) && item.role === 'student');
  const amount = Number(req.body.amount);

  if (!student) return res.status(404).json({ message: 'الطالب غير موجود' });
  if (!Number.isFinite(amount) || amount === 0 || student.balance + amount < 0) {
    return res.status(400).json({ message: 'قيمة الرصيد غير صحيحة أو ستجعل الرصيد سالبًا' });
  }

  student.balance += amount;
  User.updateOne({ id: student.id }, { $set: { balance: student.balance } }).catch((error) => console.error(`Balance persistence failed: ${error.message}`));
  res.json({ success: true, student: { id: student.id, balance: student.balance } });
});

app.post('/api/admin/students/:id/password', authenticate, requireAdmin, async (req, res) => {
  const student = users.find((item) => item.id === Number(req.params.id) && item.role === 'student');
  const password = String(req.body.password || '');
  if (!student) return res.status(404).json({ message: 'الطالب غير موجود' });
  if (password.length < 6) return res.status(400).json({ message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
  student.passwordHash = await bcrypt.hash(password, 10);
  await User.updateOne({ id: student.id }, { $set: { passwordHash: student.passwordHash } });
  res.json({ success: true, message: 'تم تغيير كلمة مرور الطالب' });
});

app.post('/api/admin/students/:id/unlock', authenticate, requireAdmin, (req, res) => {
  const student = users.find((item) => item.id === Number(req.params.id) && item.role === 'student');

  if (!student) return res.status(404).json({ message: 'الطالب غير موجود' });

  student.contentUnlocked = Boolean(req.body.unlocked);
  student.contentAccess = { all: student.contentUnlocked, videoIds: student.contentUnlocked ? videoCatalog.map((video) => video.id) : [] };
  User.updateOne({ id: student.id }, { $set: { contentUnlocked: student.contentUnlocked, contentAccess: student.contentAccess } }).catch((error) => console.error(`Content access persistence failed: ${error.message}`));
  res.json({ success: true, contentUnlocked: student.contentUnlocked });
});

app.get('/api/admin/students/:id/details', authenticate, requireAdmin, (req, res) => {
  const student = users.find((item) => item.id === Number(req.params.id) && item.role === 'student');
  if (!student) return res.status(404).json({ message: 'الطالب غير موجود' });
  res.json({
    student: { ...student, passwordHash: undefined },
    videos: videoCatalog.map((video) => ({ ...video, open: Boolean(student.contentAccess?.all || student.contentAccess?.videoIds?.includes(video.id)) })),
    activity: activityLog.filter((item) => item.studentId === student.id).slice(-30).reverse(),
    attempts: quizAttempts.filter((item) => item.studentId === student.id),
  });
});

app.post('/api/admin/students/:id/content', authenticate, requireAdmin, (req, res) => {
  const student = users.find((item) => item.id === Number(req.params.id) && item.role === 'student');
  if (!student) return res.status(404).json({ message: 'الطالب غير موجود' });
  const videoIds = Array.isArray(req.body.videoIds) ? req.body.videoIds.map(Number).filter((id) => videoCatalog.some((video) => video.id === id)) : [];
  student.contentAccess = { all: Boolean(req.body.all), videoIds };
  student.contentUnlocked = student.contentAccess.all || videoIds.length > 0;
  User.updateOne({ id: student.id }, { $set: { contentUnlocked: student.contentUnlocked, contentAccess: student.contentAccess } }).catch((error) => console.error(`Content access persistence failed: ${error.message}`));
  res.json({ contentAccess: student.contentAccess, contentUnlocked: student.contentUnlocked });
});

app.get('/api/admin/quizzes', authenticate, requireAdmin, (req, res) => res.json({ quizzes }));

app.post('/api/admin/quizzes/import-pdf', authenticate, requireAdmin, pdfUpload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'اختر ملف PDF أولًا' });
  if (req.file.mimetype !== 'application/pdf') return res.status(400).json({ message: 'الملف يجب أن يكون PDF' });
  try {
    const parser = new PDFParse({ data: req.file.buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    const questions = parseMcqText(parsed.text);
    if (!questions.length) return res.status(422).json({ message: 'لم أجد أسئلة MCQ واضحة. استخدم ترقيم الأسئلة واختيارات A/B/C/D أو أ/ب/ج/د.' });
    res.json({ fileName: req.file.originalname, questions, unresolved: questions.filter((question) => question.correctOption < 0).length });
  } catch (error) {
    res.status(422).json({ message: 'تعذر قراءة ملف PDF. تأكد أنه يحتوي على نص قابل للتحديد وليس صورًا فقط.' });
  }
});

app.post('/api/admin/quizzes', authenticate, requireAdmin, async (req, res) => {
  requireMongo(res);
  const { title, description = '', price = 0, questions = [], published = true } = req.body;
  if (!title?.trim() || !Array.isArray(questions) || questions.length === 0) return res.status(400).json({ message: 'اسم الاختبار وسؤال واحد على الأقل مطلوبان' });
  const normalizedQuestions = questions.map((question, index) => ({ id: index + 1, text: String(question.text || '').trim(), options: Array.isArray(question.options) ? question.options.map(String).filter(Boolean).slice(0, 6) : [], correctOption: Number(question.correctOption) }));
  if (normalizedQuestions.some((question) => !question.text || question.options.length < 2 || !Number.isInteger(question.correctOption) || !question.options[question.correctOption])) return res.status(400).json({ message: 'كل سؤال يجب أن يحتوي على اختيارات وإجابة صحيحة' });
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice < 1) return res.status(400).json({ message: 'سعر الاختبار يجب أن يكون جنيهًا مصريًا واحدًا على الأقل' });
  const quiz = { id: randomUUID(), title: title.trim(), description: String(description), price: numericPrice, questions: normalizedQuestions, published: Boolean(published), createdAt: new Date().toISOString() };
  try {
    await Quiz.create(quiz);
  } catch (error) {
    return res.status(500).json({ message: 'تعذر حفظ الاختبار في قاعدة البيانات' });
  }
  quizzes.push(quiz);
  res.status(201).json({ quiz });
});

app.patch('/api/admin/quizzes/:id', authenticate, requireAdmin, async (req, res) => {
  requireMongo(res);
  const quiz = quizzes.find((item) => String(item.id) === String(req.params.id));
  if (!quiz) return res.status(404).json({ message: 'الاختبار غير موجود' });

  const title = String(req.body.title || '').trim();
  if (!title) return res.status(400).json({ message: 'اسم الاختبار مطلوب' });

  quiz.title = title;
  quiz.description = String(req.body.description || '');
  try {
    const updateFilter = /^[a-f\d]{24}$/i.test(req.params.id)
      ? { _id: req.params.id }
      : { id: String(req.params.id) };
    await Quiz.updateOne(updateFilter, { $set: { title: quiz.title, description: quiz.description } });
  } catch (error) {
    return res.status(500).json({ message: 'تعذر حفظ تعديل الاختبار' });
  }
  res.json({ quiz });
});

app.delete('/api/admin/quizzes/:id', authenticate, requireAdmin, async (req, res) => {
  requireMongo(res);
  const index = quizzes.findIndex((quiz) => String(quiz.id) === String(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'الاختبار غير موجود' });
  quizzes.splice(index, 1);
  try {
    const deleteFilter = /^[a-f\d]{24}$/i.test(req.params.id)
      ? { _id: req.params.id }
      : { id: String(req.params.id) };
    await Quiz.deleteOne(deleteFilter);
  } catch (error) {
    return res.status(500).json({ message: 'تعذر حذف الاختبار من قاعدة البيانات' });
  }
  res.json({ success: true });
});

app.get('/api/quizzes', authenticate, (req, res) => res.json({ quizzes: quizzes.filter((quiz) => quiz.published).map(({ questions, ...quiz }) => ({ ...quiz, purchased: quiz.price === 0 || quizPurchases.some((purchase) => purchase.quizId === quiz.id && purchase.studentId === req.user.id), questionCount: questions.length, questions: questions.map(({ correctOption, ...question }) => question) })) }));

app.post('/api/quizzes/:id/purchase', authenticate, (req, res) => {
  const quiz = quizzes.find((item) => String(item.id) === String(req.params.id) && item.published);
  if (!quiz) return res.status(404).json({ message: 'الاختبار غير موجود' });
  if (quiz.price === 0 || quizPurchases.some((purchase) => purchase.quizId === quiz.id && purchase.studentId === req.user.id)) return res.json({ success: true, purchased: true, balance: req.user.balance });
  const student = users.find((item) => item.id === req.user.id && item.role === 'student');
  if (!student || student.balance < quiz.price) return res.status(402).json({ message: `رصيدك غير كافٍ. سعر الاختبار ${quiz.price} جنيه مصري` });
  student.balance -= quiz.price;
  User.updateOne({ id: student.id }, { $set: { balance: student.balance } }).catch((error) => console.error(`Quiz purchase persistence failed: ${error.message}`));
  quizPurchases.push({ quizId: quiz.id, studentId: student.id, price: quiz.price, purchasedAt: new Date().toISOString() });
  res.json({ success: true, purchased: true, balance: student.balance });
});

app.post('/api/quizzes/:id/submit', authenticate, (req, res) => {
  const quiz = quizzes.find((item) => String(item.id) === String(req.params.id) && item.published);
  if (!quiz) return res.status(404).json({ message: 'الاختبار غير موجود' });
  if (quiz.price > 0 && !quizPurchases.some((purchase) => purchase.quizId === quiz.id && purchase.studentId === req.user.id)) return res.status(402).json({ message: 'يجب شراء الاختبار قبل البدء' });
  const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
  const score = quiz.questions.reduce((total, question, index) => total + (Number(answers[index]) === question.correctOption ? 1 : 0), 0);
  const corrections = quiz.questions.map((question, index) => ({
    questionId: question.id,
    selectedOption: Number.isInteger(Number(answers[index])) ? Number(answers[index]) : null,
    correctOption: question.correctOption,
    correctAnswer: question.options[question.correctOption],
    isCorrect: Number(answers[index]) === question.correctOption,
  }));
  const attempt = { id: quizAttempts.length ? Math.max(...quizAttempts.map((item) => item.id)) + 1 : 1, quizId: quiz.id, quizTitle: quiz.title, studentId: req.user.id, score, total: quiz.questions.length, answers, submittedAt: new Date().toISOString() };
  quizAttempts.push(attempt);
  activityLog.push({ studentId: req.user.id, type: 'quiz', label: `حل اختبار: ${quiz.title}`, detail: `${score} من ${quiz.questions.length}`, createdAt: attempt.submittedAt });
  res.json({ attempt, corrections });
});

app.post('/api/pay', authenticate, (req, res) => {
  const currentUser = users.find((item) => item.id === req.user.id);

  if (!currentUser) {
    return res.status(404).json({ message: 'المستخدم غير موجود' });
  }

  if (currentUser.role !== 'student') {
    return res.status(403).json({ message: 'هذه العملية خاصة بالطلاب فقط' });
  }

  currentUser.balance = 1;
  User.updateOne({ id: currentUser.id }, { $set: { balance: currentUser.balance } }).catch((error) => console.error(`Payment persistence failed: ${error.message}`));

  return res.json({
    success: true,
    message: 'تم تفعيل الوصول إلى الفيديوهات بنجاح',
    balance: currentUser.balance,
  });
});

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'مسار API غير موجود' });
});

app.use((error, req, res, next) => {
  console.error(error);
  if (req.path.startsWith('/api')) return res.status(500).json({ message: 'حدث خطأ في الخادم' });
  next(error);
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
