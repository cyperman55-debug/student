import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';

const app = express();
const PORT = Number(process.env.PORT) || 5001;
const JWT_SECRET = String(process.env.JWT_SECRET || '').trim();
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required.');
}

const corsOrigins = String(process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: corsOrigins.length ? corsOrigins : true,
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
const pdfUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const quizSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, default: 10, min: 1 },
  questions: [{ id: Number, text: String, options: [String], correctOption: Number }],
  published: { type: Boolean, default: true },
  grade: { type: String, default: 'second-secondary' },
  term: { type: String, default: '' },
  unitId: { type: Number, default: 1, min: 1 },
  lessonId: { type: String, default: '' },
  packagePrice: { type: Number, default: 0, min: 0 },
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });
const Quiz = mongoose.models.Quiz || mongoose.model('Quiz', quizSchema);
const userSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true, lowercase: true },
  grade: { type: String, default: 'second-secondary' },
  term: { type: String, default: '' },
  studentNumber: String,
  guardianPhone: String,
  governorate: String,
  phone: String,
  avatar: String,
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'student'], required: true },
  status: { type: String, default: 'active' },
  balance: { type: Number, default: 0 },
  contentUnlocked: { type: Boolean, default: false },
  contentAccess: { all: Boolean, videoIds: [Number], packages: [String] },
}, { versionKey: false, autoIndex: false });
const User = mongoose.models.User || mongoose.model('User', userSchema);
const videoSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  cover: { type: String, default: '' },
  price: { type: Number, default: 10, min: 0 },
  grade: { type: String, default: 'second-secondary' },
  term: { type: String, default: '' },
  unitId: { type: Number, default: 1, min: 1 },
  packagePrice: { type: Number, default: 0, min: 0 },
}, { versionKey: false });
const Video = mongoose.models.Video || mongoose.model('Video', videoSchema);
const lessonPdfSchema = new mongoose.Schema({
  videoId: { type: Number, required: true, unique: true },
  originalName: { type: String, required: true },
  data: { type: Buffer, required: true },
  updatedAt: { type: Date, default: Date.now },
}, { versionKey: false });
const LessonPdf = mongoose.models.LessonPdf || mongoose.model('LessonPdf', lessonPdfSchema);
const videoPurchaseSchema = new mongoose.Schema({
  videoId: { type: Number, required: true },
  studentId: { type: Number, required: true },
  price: { type: Number, required: true, min: 0 },
  purchasedAt: { type: Date, default: Date.now },
}, { versionKey: false });
const VideoPurchase = mongoose.models.VideoPurchase || mongoose.model('VideoPurchase', videoPurchaseSchema);
const chatMessageSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  userId: { type: Number, required: true },
  userName: { type: String, required: true },
  role: { type: String, required: true },
  text: { type: String, required: true, maxlength: 500 },
  pinned: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });
const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatMessageSchema);
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
  creditedAmount: Number,
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });
const RechargeRequest = mongoose.models.RechargeRequest || mongoose.model('RechargeRequest', rechargeSchema);
let mongoReady = false;
let mongoError = null;
const mongoUri = String(process.env.MONGODB_URI || process.env.MONGO_URI || '').trim();
const mongoConfigured = Boolean(mongoUri);
const videoCatalog = [
  { id: 1, title: 'محاضرة تمهيدية', cover: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', price: 10, grade: 'second-secondary', term: '', unitId: 1, packagePrice: 50 },
  { id: 2, title: 'شرح الوحدة الأولى', cover: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80', url: 'https://www.youtube.com/embed/ysz5S6PUM-U', price: 10, grade: 'second-secondary', term: '', unitId: 1, packagePrice: 50 },
];
const localLessonPdfs = new Map();
videoCatalog.forEach((video) => { video.lessonPdfAvailable = false; });

function packageKey(grade, term, unitId) {
  return `${String(grade || 'second-secondary')}:${String(term || 'all')}:${Number(unitId) || 1}`;
}

function normalizeVideoUrl(value) {
  const input = String(value || '').trim();
  const iframeMatch = input.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  const rawUrl = (iframeMatch ? iframeMatch[1] : input).trim();
  const url = rawUrl.replace('://player.mediadelivery.net/', '://iframe.mediadelivery.net/');
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/i);
  return youtubeMatch ? `https://www.youtube.com/embed/${youtubeMatch[1]}` : url;
}

const initializeMongo = () => mongoConfigured
  ? mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 })
      .then(async () => {
        let userIndexes = await User.collection.indexes().catch((error) => {
          if (error.code === 26 || error.codeName === 'NamespaceNotFound') return [];
          throw error;
        });
        const emailIndex = userIndexes.find((index) => index.key?.email === 1);
        if (emailIndex && (!emailIndex.unique || !emailIndex.sparse)) {
          await User.collection.dropIndex(emailIndex.name);
          userIndexes = userIndexes.filter((index) => index.name !== emailIndex.name);
        }
        if (!userIndexes.some((index) => index.key?.id === 1)) {
          await User.collection.createIndex({ id: 1 }, { unique: true });
        }
        if (!userIndexes.some((index) => index.key?.email === 1 && index.unique && index.sparse)) {
          await User.collection.createIndex({ email: 1 }, { unique: true, sparse: true });
        }
        const savedUsers = await User.find().lean();
        if (savedUsers.length) {
          users.splice(0, users.length, ...savedUsers);
          const adminUser = users.find((user) => user.role === 'admin' && user.id === 1)
            || users.find((user) => user.role === 'admin');
          if (adminUser && adminUser.phone !== '01065870208') {
            adminUser.phone = '01065870208';
            await User.updateOne({ id: adminUser.id }, { $set: { phone: adminUser.phone } });
          }
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
            grade: video.grade || 'second-secondary',
            term: video.term || '',
            unitId: Number(video.unitId) || 1,
            packagePrice: Number(video.packagePrice) || Number(video.price) || 10,
          })));
          await Promise.all(videoCatalog.map((video) => Video.updateOne({ id: video.id }, { $set: { url: video.url } })));
        } else {
          await Video.insertMany(videoCatalog);
        }
        const savedLessonPdfIds = new Set((await LessonPdf.distinct('videoId')).map(Number));
        videoCatalog.forEach((video) => { video.lessonPdfAvailable = savedLessonPdfIds.has(Number(video.id)); });
        const savedQuizzes = await Quiz.find().lean();
        const legacyQuizzes = savedQuizzes.filter((quiz) => !quiz.price || quiz.price < 1);
        if (legacyQuizzes.length) await Quiz.updateMany({ _id: { $in: legacyQuizzes.map((quiz) => quiz._id) } }, { $set: { price: 10 } });
        quizzes.push(...savedQuizzes.map((quiz) => ({ ...quiz, id: String(quiz.id || quiz._id), price: Number(quiz.price) >= 1 ? Number(quiz.price) : 10, grade: quiz.grade || 'second-secondary', term: quiz.term || '', unitId: Number(quiz.unitId) || 1, packagePrice: Number(quiz.packagePrice) || Number(quiz.price) || 10 })));
        const firstUnitLesson = videoCatalog
          .filter((video) => video.grade === 'second-secondary' && Number(video.unitId) === 1)
          .sort((left, right) => Number(left.id) - Number(right.id))[0];
        const firstLessonQuiz = quizzes.find((quiz) => quiz.grade === 'second-secondary'
          && Number(quiz.unitId) === 1
          && String(quiz.title || '').replace(/^#+\s*/, '').trim().toLowerCase().includes('اختبار عن الدرس الاول فى الوحده الاولى'));
        if (firstUnitLesson && firstLessonQuiz && String(firstLessonQuiz.lessonId || '') !== String(firstUnitLesson.id)) {
          firstLessonQuiz.lessonId = String(firstUnitLesson.id);
          await Quiz.updateOne({ id: firstLessonQuiz.id }, { $set: { lessonId: firstLessonQuiz.lessonId } });
        }
        const savedRechargeRequests = await RechargeRequest.find().lean();
        rechargeRequests.push(...savedRechargeRequests.map((request) => ({ ...request, id: String(request.id || request._id) })));
        const savedVideoPurchases = await VideoPurchase.find().lean();
        videoPurchases.push(...savedVideoPurchases.map((purchase) => ({
          videoId: Number(purchase.videoId),
          studentId: Number(purchase.studentId),
          price: Number(purchase.price),
          purchasedAt: purchase.purchasedAt,
        })));
        const savedChatMessages = await ChatMessage.find().sort({ createdAt: 1 }).lean();
        if (savedChatMessages.length) {
          chatMessages.splice(0, chatMessages.length, ...savedChatMessages.map((message) => ({
            ...message,
            id: Number(message.id),
            userId: Number(message.userId),
          })));
        } else {
          await ChatMessage.insertMany(chatMessages);
        }
        mongoReady = true;
        console.log(`MongoDB connected; loaded ${savedQuizzes.length} quizzes`);
        return true;
      })
      .catch((error) => {
        mongoReady = false;
        mongoError = error;
        console.warn(`MongoDB unavailable: ${error.message}. Continuing with in-memory mode.`);
        return false;
      })
  : Promise.resolve().then(() => {
      console.log('MongoDB not configured; running in memory mode.');
    return true;
    });

let connectMongo = initializeMongo();

async function waitForMongo() {
  if (!mongoConfigured || mongoReady) return;
  const connected = await connectMongo;
  if (!mongoReady && !connected) {
    connectMongo = initializeMongo();
    await connectMongo;
  }
}

function requireMongo(res) {
  if (!mongoReady && mongoConfigured) {
    console.warn('MongoDB unavailable, continuing in memory mode.');
  }
  return true;
}

const users = [];

const chatMessages = [
  {
    id: 1,
    userId: 1,
    userName: 'مهندس محمد عبد الشافي',
    role: 'admin',
    text: 'أهلًا بكم في شات المنصة. اكتبوا أسئلتكم عن البرمجة والذكاء الاصطناعي.',
    governorate: 'القاهرة',
    pinned: true,
    createdAt: new Date().toISOString(),
  },
];

const quizzes = [];
const quizAttempts = [];
const quizPurchases = [];
const videoPurchases = [];
const rechargeRequests = [];
const vodafoneCashNumber = String(process.env.VODAFONE_CASH_NUMBER || '').trim();
const paymentSettings = {
  vodafoneCashNumber,
  instructions: 'حوّل المبلغ إلى رقم Vodafone Cash، ثم اكتب رقم العملية والمبلغ الذي تم تحويله. سيتم إضافة الرصيد بعد مراجعة المدرس.',
  minimumAmount: 10,
};
const activityLog = [];

function studentCanAccessVideo(student, video) {
  const key = packageKey(video.grade, video.term, video.unitId);
  return Boolean(
    student.contentUnlocked
    || student.contentAccess?.all
    || student.contentAccess?.packages?.includes(key)
    || student.contentAccess?.videoIds?.includes(video.id)
    || videoPurchases.some((purchase) => purchase.videoId === video.id && purchase.studentId === student.id)
  );
}

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

app.get('/api/health', async (req, res) => {
  await waitForMongo();
  if (mongoConfigured && !mongoReady) {
    return res.status(503).json({ ok: false, database: 'unavailable', reason: mongoError?.name || 'connection-failed', message: 'تعذر الاتصال بقاعدة البيانات' });
  }
  res.json({ ok: true, database: mongoReady ? 'connected' : 'not-configured', message: 'خدمة Shefo تعمل بشكل طبيعي' });
});

app.use('/api', async (req, res, next) => {
  if (!mongoConfigured) return next();
  await waitForMongo();
  if (!mongoReady) {
    return res.status(503).json({ message: 'قاعدة البيانات غير متاحة. راجع MONGODB_URI في إعدادات Vercel.', detail: process.env.VERCEL ? undefined : mongoError?.message });
  }
  next();
});

app.get('/api/public/students', (req, res) => {
  res.json({
    students: users
      .filter((item) => item.role === 'student' && item.status !== 'suspended')
      .map((item) => ({ id: item.id, name: item.name, score: item.score || null })),
  });
});

app.post('/api/login', async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ message: 'رقم الهاتف وكلمة المرور مطلوبان' });
  }

  const normalizedPhone = String(phone).trim();
  const matchingUsers = mongoReady
    ? await User.find({ phone: normalizedPhone }).lean()
    : users.filter((item) => String(item.phone || '').trim() === normalizedPhone);
  const user = matchingUsers.find((item) => bcrypt.compareSync(password, item.passwordHash));

  if (!user) {
    return res.status(401).json({ message: 'رقم الهاتف أو كلمة المرور غير صحيحة' });
  }

  const memoryUser = users.find((item) => item.id === user.id);
  if (memoryUser) Object.assign(memoryUser, user);
  else users.push(user);
  const token = generateToken(user);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      grade: user.grade || 'second-secondary',
      term: user.term || '',
      role: user.role,
      balance: user.balance,
    },
  });
});

app.post('/api/auth/register', async (req, res) => {
  requireMongo(res);
  const { name, email, studentNumber, studentPhone, guardianPhone, governorate, password, grade, term } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const validGrade = ['first-secondary', 'second-secondary'].includes(grade);
  const validTerm = term === '' || (grade === 'first-secondary' && ['first-term', 'second-term'].includes(term));
  const validEmail = !normalizedEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  if (!name || !studentNumber || !studentPhone || !guardianPhone || !governorate || !password || password.length < 6 || !validGrade || !validTerm || !validEmail) {
    return res.status(400).json({ message: 'الاسم ورقم الطالب ورقم هاتف الطالب ورقم ولي الأمر والمحافظة وكلمة المرور مطلوبة، والبريد الإلكتروني إن أُدخل يجب أن يكون صحيحًا' });
  }
  if (normalizedEmail && users.some((item) => String(item.email || '').toLowerCase() === normalizedEmail)) {
    return res.status(409).json({ message: 'البريد الإلكتروني مستخدم بالفعل' });
  }
  if (users.some((item) => item.studentNumber === String(studentNumber).trim())) {
    return res.status(409).json({ message: 'رقم الطالب مستخدم بالفعل' });
  }

  const user = {
    id: Math.max(...users.map((item) => item.id)) + 1,
    name: String(name).trim(),
    ...(normalizedEmail ? { email: normalizedEmail } : {}),
    grade,
    term: term || '',
    studentNumber: String(studentNumber).trim(),
    phone: String(studentPhone).trim(),
    guardianPhone: String(guardianPhone).trim(),
    governorate: String(governorate).trim(),
    passwordHash: await bcrypt.hash(password, 10),
    role: 'student',
    balance: 0,
    contentUnlocked: false,
  };
  try {
    if (mongoReady) await User.create(user);
  } catch (error) {
  }
  users.push(user);
  res.status(201).json({ token: generateToken(user), user: { id: user.id, name: user.name, email: user.email || '', studentNumber: user.studentNumber, phone: user.phone, guardianPhone: user.guardianPhone, governorate: user.governorate, grade: user.grade, term: user.term, role: user.role, balance: user.balance } });
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
      grade: user.grade || 'second-secondary',
      term: user.term || '',
      role: user.role,
      studentNumber: user.studentNumber || '',
      phone: user.phone || '',
      guardianPhone: user.guardianPhone || '',
      governorate: user.governorate || '',
      avatar: user.avatar || '',
      balance: user.balance,
    },
  });
});

app.patch('/api/profile', authenticate, async (req, res) => {
  const user = users.find((item) => item.id === req.user.id);
  if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });

  const name = String(req.body.name || '').trim();
  const phone = String(req.body.phone || '').trim();
  const guardianPhone = String(req.body.guardianPhone || '').trim();
  const avatar = String(req.body.avatar || '').trim();
  if (!name) return res.status(400).json({ message: 'الاسم مطلوب' });
  if (avatar && !/^data:image\/(png|jpe?g|webp|gif);base64,/.test(avatar) && !/^https?:\/\//.test(avatar)) {
    return res.status(400).json({ message: 'صورة الملف الشخصي غير صالحة' });
  }
  if (avatar.length > 4 * 1024 * 1024) return res.status(400).json({ message: 'حجم الصورة كبير جدًا' });

  user.name = name;
  user.phone = phone;
  user.guardianPhone = guardianPhone;
  user.avatar = avatar;
  await User.updateOne({ id: user.id }, { $set: { name, phone, guardianPhone, avatar } });
  res.json({
    message: 'تم تحديث الملف الشخصي',
    user: { id: user.id, name: user.name, email: user.email, role: user.role, studentNumber: user.studentNumber || '', phone, guardianPhone, avatar, balance: user.balance },
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

function formatRechargeRequest(request, students) {
    const student = students.find((user) => String(user.id) === String(request.studentId));
    return {
      ...request,
      student: student?.name || 'طالب غير معروف',
      studentEmail: student?.email || '',
      studentNumber: student?.studentNumber || '',
      guardianPhone: student?.guardianPhone || '',
      studentBalance: student?.balance || 0,
    };
}

app.get('/api/admin/recharge-requests', authenticate, requireAdmin, async (req, res) => {
  const requests = mongoReady
    ? await RechargeRequest.find().sort({ createdAt: -1 }).lean()
    : rechargeRequests;
  const students = mongoReady
    ? await User.find({ role: 'student' }).lean()
    : users.filter((user) => user.role === 'student');
  res.json({ requests: requests.map((request) => formatRechargeRequest(request, students)) });
});

app.post('/api/admin/recharge-requests/:id/approve', authenticate, requireAdmin, async (req, res) => {
  const request = mongoReady
    ? await RechargeRequest.findOne({ id: String(req.params.id) })
    : rechargeRequests.find((item) => String(item.id) === String(req.params.id));
  if (!request) return res.status(404).json({ message: 'طلب الدفع غير موجود' });
  if (request.status !== 'Pending') return res.status(409).json({ message: 'تمت مراجعة الطلب من قبل' });
  const student = mongoReady
    ? await User.findOne({ id: Number(request.studentId), role: 'student' })
    : users.find((user) => String(user.id) === String(request.studentId));
  if (!student) return res.status(404).json({ message: 'الطالب غير موجود' });
  const creditedAmount = Number(req.body.amount ?? request.amount);
  if (!Number.isFinite(creditedAmount) || creditedAmount <= 0) return res.status(400).json({ message: 'مبلغ الإضافة غير صحيح' });
  student.balance += creditedAmount;
  request.status = 'Approved';
  request.creditedAmount = creditedAmount;
  request.reviewedAt = new Date().toISOString();
  await User.updateOne({ id: student.id }, { $set: { balance: student.balance } });
  await RechargeRequest.updateOne({ id: request.id }, { $set: { status: request.status, creditedAmount: request.creditedAmount, reviewedAt: request.reviewedAt } });
  const memoryRequest = rechargeRequests.find((item) => String(item.id) === String(request.id));
  if (memoryRequest) Object.assign(memoryRequest, { status: request.status, creditedAmount: request.creditedAmount, reviewedAt: request.reviewedAt });
  res.json({ request, balance: student.balance, message: 'تم اعتماد الطلب وإضافة الرصيد' });
});

app.post('/api/admin/recharge-requests/:id/reject', authenticate, requireAdmin, async (req, res) => {
  const request = mongoReady
    ? await RechargeRequest.findOne({ id: String(req.params.id) })
    : rechargeRequests.find((item) => String(item.id) === String(req.params.id));
  if (!request) return res.status(404).json({ message: 'طلب الدفع غير موجود' });
  if (request.status !== 'Pending') return res.status(409).json({ message: 'تمت مراجعة الطلب من قبل' });
  request.status = 'Rejected';
  request.rejectionReason = String(req.body.reason || 'لم يتم اعتماد التحويل');
  request.reviewedAt = new Date().toISOString();
  await RechargeRequest.updateOne({ id: request.id }, { $set: { status: request.status, rejectionReason: request.rejectionReason, reviewedAt: request.reviewedAt } });
  const memoryRequest = rechargeRequests.find((item) => String(item.id) === String(request.id));
  if (memoryRequest) Object.assign(memoryRequest, { status: request.status, rejectionReason: request.rejectionReason, reviewedAt: request.reviewedAt });
  res.json({ request, message: 'تم رفض طلب الدفع' });
});

app.get('/api/chat/messages', authenticate, async (req, res) => {
  if (mongoReady) {
    const messages = await ChatMessage.find().sort({ createdAt: 1 }).lean();
    return res.json({ messages: messages.map((message) => ({ ...message, id: Number(message.id), userId: Number(message.userId) })) });
  }
  res.json({ messages: [...chatMessages].sort((first, second) => new Date(first.createdAt) - new Date(second.createdAt)) });
});

app.post('/api/chat/messages', authenticate, async (req, res) => {
  const text = String(req.body.text || '').trim();
  if (!text || text.length > 500) return res.status(400).json({ message: 'اكتب رسالة من 1 إلى 500 حرف' });
  const latestMessage = mongoReady ? await ChatMessage.findOne().sort({ id: -1 }).lean() : null;
  const nextId = latestMessage ? Number(latestMessage.id) + 1 : chatMessages.length ? Math.max(...chatMessages.map((item) => item.id)) + 1 : 1;
  const message = { id: nextId, userId: req.user.id, userName: req.user.name, role: req.user.role, text, pinned: false, createdAt: new Date().toISOString() };
  chatMessages.push(message);
  if (mongoReady) {
    const savedMessage = await ChatMessage.create(message);
    return res.status(201).json({ message: { ...savedMessage.toObject(), id: Number(savedMessage.id), userId: Number(savedMessage.userId) } });
  }
  res.status(201).json({ message });
});

app.patch('/api/chat/messages/:id/pin', authenticate, requireAdmin, async (req, res) => {
  const message = mongoReady
    ? await ChatMessage.findOne({ id: Number(req.params.id) })
    : chatMessages.find((item) => item.id === Number(req.params.id));
  if (!message) return res.status(404).json({ message: 'الرسالة غير موجودة' });
  message.pinned = !message.pinned;
  if (mongoReady) {
    await message.save();
    return res.json({ message: { ...message.toObject(), id: Number(message.id), userId: Number(message.userId) } });
  }
  res.json({ message });
});

app.delete('/api/chat/messages/:id', authenticate, requireAdmin, async (req, res) => {
  if (mongoReady) {
    const result = await ChatMessage.deleteOne({ id: Number(req.params.id) });
    if (!result.deletedCount) return res.status(404).json({ message: 'الرسالة غير موجودة' });
    const memoryIndex = chatMessages.findIndex((item) => item.id === Number(req.params.id));
    if (memoryIndex >= 0) chatMessages.splice(memoryIndex, 1);
    return res.json({ success: true });
  }
  const messageIndex = chatMessages.findIndex((item) => item.id === Number(req.params.id));
  if (messageIndex === -1) return res.status(404).json({ message: 'الرسالة غير موجودة' });
  chatMessages.splice(messageIndex, 1);
  res.json({ success: true });
});

app.get('/api/dashboard', authenticate, async (req, res) => {
  const currentUser = users.find((item) => item.id === req.user.id);

  if (!currentUser) {
    return res.status(404).json({ message: 'المستخدم غير موجود' });
  }

  if (currentUser.role === 'admin') {
    const students = users.filter((item) => item.role === 'student');
    let totalStudents = students.length;
    let activeStudents = students.filter((student) => student.balance > 0 || student.contentUnlocked).length;

    if (mongoReady) {
      try {
        [totalStudents, activeStudents] = await Promise.all([
          User.countDocuments({ role: 'student' }),
          User.countDocuments({ role: 'student', $or: [{ balance: { $gt: 0 } }, { contentUnlocked: true }] }),
        ]);
      } catch (error) {
        console.error(`Student count query failed: ${error.message}`);
        return res.status(503).json({ message: 'تعذر تحميل إحصائيات الطلاب' });
      }
    }

    return res.json({
      role: 'admin',
      stats: {
        totalStudents,
        activeLessons: 2,
        totalWalletBalance: students.reduce((total, student) => total + student.balance, 0),
        totalTransferredAmount: rechargeRequests
          .filter((request) => request.status === 'Approved')
          .reduce((total, request) => total + Number(request.creditedAmount ?? request.amount ?? 0), 0),
        activeStudents,
      },
      summary: 'هذه الإحصائيات محسوبة مباشرة من حسابات الطلاب وحالة المحتوى الحالية.',
      user: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        grade: currentUser.grade || 'second-secondary',
        term: currentUser.term || '',
        role: currentUser.role,
        studentNumber: currentUser.studentNumber || '',
        phone: currentUser.phone || '',
        guardianPhone: currentUser.guardianPhone || '',
        avatar: currentUser.avatar || '',
        balance: currentUser.balance,
      },
      videos: videoCatalog,
    });
  }

  const studentVideos = videoCatalog.filter((video) => video.grade === (currentUser.grade || 'second-secondary') && (currentUser.grade === 'first-secondary' || !video.term || video.term === (currentUser.term || '')));
  const videos = studentVideos.map((video) => {
    const key = packageKey(video.grade, video.term, video.unitId);
    const open = studentCanAccessVideo(currentUser, video);
    return { ...video, url: open ? video.url : '', packageKey: key, packagePurchased: currentUser.contentAccess?.packages?.includes(key), purchased: open, locked: !open };
  });
  const studentQuizzes = quizzes.filter((quiz) => quiz.published && quiz.grade === (currentUser.grade || 'second-secondary') && (currentUser.grade === 'first-secondary' || !quiz.term || quiz.term === (currentUser.term || '')));

  return res.json({
    role: 'student',
    balance: currentUser.balance,
    hasPaid: currentUser.balance > 0 || currentUser.contentUnlocked,
    contentUnlocked: currentUser.contentUnlocked,
    quizzes: studentQuizzes.map(({ questions, ...quiz }) => ({ ...quiz, packageKey: packageKey(quiz.grade, quiz.term, quiz.unitId), purchased: currentUser.contentUnlocked || currentUser.contentAccess?.all || currentUser.contentAccess?.packages?.includes(packageKey(quiz.grade, quiz.term, quiz.unitId)) || quiz.packagePrice === 0 || quiz.price === 0 || quizPurchases.some((purchase) => purchase.quizId === quiz.id && purchase.studentId === currentUser.id), questionCount: questions.length })),
    attempts: quizAttempts.filter((attempt) => attempt.studentId === currentUser.id),
    user: {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      grade: currentUser.grade || 'second-secondary',
      term: currentUser.term || '',
      role: currentUser.role,
      studentNumber: currentUser.studentNumber || '',
      phone: currentUser.phone || '',
      guardianPhone: currentUser.guardianPhone || '',
      avatar: currentUser.avatar || '',
      balance: currentUser.balance,
    },
    videos,
    message: 'المحاضرات مقفلة حتى يتم إتمام الدفع',
  });
});

app.post('/api/packages/:packageKey/purchase', authenticate, async (req, res) => {
  const student = users.find((item) => item.id === req.user.id && item.role === 'student');
  if (!student) return res.status(403).json({ message: 'هذه العملية خاصة بالطلاب فقط' });
  const requestedKey = String(req.params.packageKey);
  const matchingVideos = videoCatalog.filter((video) => packageKey(video.grade, video.term, video.unitId) === requestedKey);
  const matchingQuizzes = quizzes.filter((quiz) => quiz.published && packageKey(quiz.grade, quiz.term, quiz.unitId) === requestedKey);
  if (!matchingVideos.length && !matchingQuizzes.length) return res.status(404).json({ message: 'الباكدج غير موجودة' });
  const packagePrice = Number(matchingVideos[0]?.packagePrice ?? matchingQuizzes[0]?.packagePrice ?? 0);
  const packages = Array.isArray(student.contentAccess?.packages) ? student.contentAccess.packages : [];
  if (packages.includes(requestedKey)) return res.json({ success: true, purchased: true, balance: student.balance });
  if (student.balance < packagePrice) return res.status(402).json({ message: `رصيدك غير كافٍ. سعر الباكدج ${packagePrice} جنيه مصري` });
  student.balance -= packagePrice;
  student.contentAccess = { ...(student.contentAccess || {}), packages: [...packages, requestedKey] };
  if (mongoReady) await User.updateOne({ id: student.id }, { $set: { balance: student.balance, contentAccess: student.contentAccess } });
  res.json({ success: true, purchased: true, balance: student.balance });
});

app.patch('/api/admin/packages/:packageKey', authenticate, requireAdmin, async (req, res) => {
  const price = Number(req.body.price);
  if (!Number.isFinite(price) || price < 0) return res.status(400).json({ message: 'سعر الوحدة يجب أن يكون صفرًا أو أكثر' });
  const requestedKey = String(req.params.packageKey);
  const matchingVideos = videoCatalog.filter((video) => packageKey(video.grade, video.term, video.unitId) === requestedKey);
  const matchingQuizzes = quizzes.filter((quiz) => packageKey(quiz.grade, quiz.term, quiz.unitId) === requestedKey);
  if (!matchingVideos.length && !matchingQuizzes.length) return res.status(404).json({ message: 'الوحدة لا تحتوي على محتوى بعد' });
  matchingVideos.forEach((video) => { video.packagePrice = price; });
  matchingQuizzes.forEach((quiz) => { quiz.packagePrice = price; });
  if (mongoReady) {
    await Promise.all([
      Video.updateMany({ id: { $in: matchingVideos.map((video) => video.id) } }, { $set: { packagePrice: price } }),
      Quiz.updateMany({ id: { $in: matchingQuizzes.map((quiz) => quiz.id) } }, { $set: { packagePrice: price } }),
    ]);
  }
  res.json({ videos: videoCatalog, quizzes });
});

app.post('/api/admin/videos', authenticate, requireAdmin, async (req, res) => {
  const title = String(req.body.title || '').trim();
  const url = normalizeVideoUrl(req.body.url);
  const cover = String(req.body.cover || '').trim();
  const price = Number(req.body.price ?? 10);
  const grade = ['first-secondary', 'second-secondary'].includes(req.body.grade) ? req.body.grade : 'second-secondary';
  const term = grade === 'first-secondary' && ['first-term', 'second-term'].includes(req.body.term) ? req.body.term : '';
  const unitId = Number(req.body.unitId) || 1;
  const packagePrice = Number(req.body.packagePrice ?? price);
  if (!title || !url) return res.status(400).json({ message: 'عنوان المحاضرة ورابط الشرح مطلوبان' });
  if (!Number.isFinite(price) || price < 0) return res.status(400).json({ message: 'سعر المحاضرة يجب أن يكون صفرًا أو أكثر' });
  if (!Number.isFinite(packagePrice) || packagePrice < 0) return res.status(400).json({ message: 'سعر الباكدج يجب أن يكون صفرًا أو أكثر' });

  const video = {
    id: videoCatalog.length ? Math.max(...videoCatalog.map((item) => Number(item.id))) + 1 : 1,
    title,
    url,
    cover: cover || 'https://images.unsplash.com/photo-1516321165247-4aa89a48be28?auto=format&fit=crop&w=1200&q=80',
    price,
    grade,
    term,
    unitId,
    packagePrice,
    lessonPdfAvailable: false,
  };
  videoCatalog.unshift(video);
  if (mongoReady) await Video.create(video);
  res.status(201).json({ video, videos: videoCatalog });
});

app.post('/api/admin/videos/:id/lesson-pdf', authenticate, requireAdmin, pdfUpload.single('pdf'), async (req, res) => {
  const videoId = Number(req.params.id);
  const video = videoCatalog.find((item) => item.id === videoId);
  if (!video) return res.status(404).json({ message: 'المحاضرة غير موجودة' });
  if (!req.file || !req.file.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    return res.status(400).json({ message: 'ارفع ملف PDF صالحًا للمحاضرة' });
  }

  const originalName = String(req.file.originalname || `lesson-${videoId}.pdf`).replace(/[\r\n]/g, '').slice(0, 180);
  const document = { videoId, originalName, data: req.file.buffer, updatedAt: new Date() };

  try {
    if (mongoReady) {
      await LessonPdf.updateOne({ videoId }, { $set: document }, { upsert: true });
    } else {
      localLessonPdfs.set(videoId, document);
    }
  } catch (error) {
    console.error(`Lesson PDF save failed: ${error.message}`);
    return res.status(500).json({ message: 'تعذر حفظ ملف المحاضرة' });
  }

  video.lessonPdfAvailable = true;
  res.json({ success: true, originalName, videoId });
});

app.delete('/api/admin/videos/:id/lesson-pdf', authenticate, requireAdmin, async (req, res) => {
  const videoId = Number(req.params.id);
  const video = videoCatalog.find((item) => item.id === videoId);
  if (!video) return res.status(404).json({ message: 'المحاضرة غير موجودة' });

  try {
    const deleted = mongoReady
      ? (await LessonPdf.deleteOne({ videoId })).deletedCount > 0
      : localLessonPdfs.delete(videoId);
    if (!deleted) return res.status(404).json({ message: 'ملف الشرح غير موجود' });
  } catch (error) {
    console.error(`Lesson PDF delete failed: ${error.message}`);
    return res.status(500).json({ message: 'تعذر حذف ملف الشرح' });
  }

  video.lessonPdfAvailable = false;
  res.json({ success: true, videoId });
});

app.get('/api/videos/:id/lesson-pdf', authenticate, async (req, res) => {
  const videoId = Number(req.params.id);
  const video = videoCatalog.find((item) => item.id === videoId);
  const currentUser = users.find((item) => item.id === req.user.id);
  if (!video || !currentUser) return res.status(404).json({ message: 'ملف المحاضرة غير موجود' });
  if (currentUser.role !== 'admin' && !studentCanAccessVideo(currentUser, video)) {
    return res.status(403).json({ message: 'يجب شراء محتوى الوحدة لعرض ملف المحاضرة' });
  }

  let document;
  try {
    document = mongoReady
      ? await LessonPdf.findOne({ videoId }).lean()
      : localLessonPdfs.get(videoId);
  } catch (error) {
    console.error(`Lesson PDF load failed: ${error.message}`);
    return res.status(503).json({ message: 'تعذر تحميل ملف المحاضرة' });
  }
  if (!document?.data) return res.status(404).json({ message: 'لم يتم رفع ملف PDF لهذه المحاضرة بعد' });

  const safeName = String(document.originalName || `lesson-${videoId}.pdf`).replace(/[\r\n]/g, '').slice(0, 180);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="lesson-${videoId}.pdf"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
  });
  res.send(Buffer.from(document.data));
});

app.patch('/api/admin/videos/:id', authenticate, requireAdmin, async (req, res) => {
  const videoId = Number(req.params.id);
  const video = videoCatalog.find((item) => item.id === videoId);
  if (!video) return res.status(404).json({ message: 'المحاضرة غير موجودة' });

  const title = String(req.body.title || '').trim();
  const price = Number(req.body.price ?? video.price ?? 10);
  if (!title) return res.status(400).json({ message: 'عنوان المحاضرة مطلوب' });
  if (!Number.isFinite(price) || price < 0) return res.status(400).json({ message: 'سعر المحاضرة يجب أن يكون صفرًا أو أكثر' });

  video.title = title;
  video.price = price;
  if (req.body.grade) video.grade = req.body.grade;
  if (req.body.term !== undefined) video.term = String(req.body.term || '');
  if (req.body.unitId !== undefined) video.unitId = Number(req.body.unitId) || 1;
  if (req.body.packagePrice !== undefined) video.packagePrice = Number(req.body.packagePrice) || 0;
  if (req.body.url) video.url = normalizeVideoUrl(req.body.url);
  if (req.body.cover) video.cover = String(req.body.cover).trim();

  if (mongoReady) {
    await Video.updateOne({ id: video.id }, { $set: { title: video.title, url: video.url, cover: video.cover, price: video.price, grade: video.grade, term: video.term, unitId: video.unitId, packagePrice: video.packagePrice } });
  }

  res.json({ video, videos: videoCatalog });
});

app.delete('/api/admin/videos/:id', authenticate, requireAdmin, async (req, res) => {
  const videoId = Number(req.params.id);
  const index = videoCatalog.findIndex((item) => item.id === videoId);
  if (index === -1) return res.status(404).json({ message: 'المحاضرة غير موجودة' });

  videoCatalog.splice(index, 1);
  if (mongoReady) {
    await Promise.all([Video.deleteOne({ id: videoId }), LessonPdf.deleteOne({ videoId })]);
  }
  localLessonPdfs.delete(videoId);

  res.json({ success: true, videos: videoCatalog });
});

app.post('/api/videos/:id/purchase', authenticate, async (req, res) => {
  const videoId = Number(req.params.id);
  const video = videoCatalog.find((item) => item.id === videoId);
  if (!video) return res.status(404).json({ message: 'المحاضرة غير موجودة' });
  const student = users.find((item) => item.id === req.user.id && item.role === 'student');
  const alreadyOpen = student?.contentUnlocked || student?.contentAccess?.all || student?.contentAccess?.videoIds?.includes(videoId) || videoPurchases.some((purchase) => purchase.videoId === videoId && purchase.studentId === req.user.id);
  if (alreadyOpen) return res.json({ success: true, purchased: true, balance: student.balance });
  const price = Number(video.price) || 0;
  if (!student || student.balance < price) return res.status(402).json({ message: `رصيدك غير كافٍ. سعر المحاضرة ${price} جنيه مصري` });
  student.balance -= price;
  const purchase = { videoId, studentId: student.id, price, purchasedAt: new Date().toISOString() };
  videoPurchases.push(purchase);
  if (mongoReady) await VideoPurchase.create(purchase);
  await User.updateOne({ id: student.id }, { $set: { balance: student.balance } });
  res.json({ success: true, purchased: true, balance: student.balance });
});

app.post('/api/videos/:id/view', authenticate, (req, res) => {
  const video = videoCatalog.find((item) => item.id === Number(req.params.id));
  if (!video) return res.status(404).json({ message: 'المحاضرة غير موجودة' });
  const currentUser = users.find((item) => item.id === req.user.id);
  if (!currentUser || (currentUser.role !== 'admin' && !studentCanAccessVideo(currentUser, video))) {
    return res.status(403).json({ message: 'يجب شراء محتوى الوحدة لمشاهدة المحاضرة' });
  }
  activityLog.push({ studentId: req.user.id, type: 'video', label: `مشاهدة محاضرة: ${video.title}`, detail: 'تم تسجيل المشاهدة', createdAt: new Date().toISOString() });
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

app.delete('/api/admin/students/:id', authenticate, requireAdmin, async (req, res) => {
  const studentId = Number(req.params.id);
  const studentIndex = users.findIndex((item) => item.id === studentId && item.role === 'student');
  if (studentIndex === -1) return res.status(404).json({ message: 'الطالب غير موجود' });

  if (mongoReady) {
    try {
      await User.deleteOne({ id: studentId, role: 'student' });
      await RechargeRequest.deleteMany({ studentId });
    } catch (error) {
      return res.status(500).json({ message: 'تعذر حذف الطالب من قاعدة البيانات' });
    }
  }

  users.splice(studentIndex, 1);
  rechargeRequests.splice(0, rechargeRequests.length, ...rechargeRequests.filter((request) => request.studentId !== studentId));
  activityLog.splice(0, activityLog.length, ...activityLog.filter((item) => item.studentId !== studentId));
  quizAttempts.splice(0, quizAttempts.length, ...quizAttempts.filter((attempt) => attempt.studentId !== studentId));
  quizPurchases.splice(0, quizPurchases.length, ...quizPurchases.filter((purchase) => purchase.studentId !== studentId));
  videoPurchases.splice(0, videoPurchases.length, ...videoPurchases.filter((purchase) => purchase.studentId !== studentId));
  res.json({ success: true });
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
  const student = mongoReady
    ? await User.findOne({ id: Number(req.params.id), role: 'student' })
    : users.find((item) => item.id === Number(req.params.id) && item.role === 'student');
  const password = String(req.body.password || '');
  if (!student) return res.status(404).json({ message: 'الطالب غير موجود' });
  if (password.length < 6) return res.status(400).json({ message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
  student.passwordHash = await bcrypt.hash(password, 10);
  await User.updateOne({ id: student.id }, { $set: { passwordHash: student.passwordHash } });
  const memoryStudent = users.find((item) => item.id === Number(student.id));
  if (memoryStudent) memoryStudent.passwordHash = student.passwordHash;
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
    const pdfModule = await import('pdf-parse');
    const pdfParse = pdfModule.default || pdfModule;
    const parsed = await pdfParse(req.file.buffer);
    const questions = parseMcqText(parsed.text);
    if (!questions.length) return res.status(422).json({ message: 'لم أجد أسئلة MCQ واضحة. استخدم ترقيم الأسئلة واختيارات A/B/C/D أو أ/ب/ج/د.' });
    res.json({ fileName: req.file.originalname, questions, unresolved: questions.filter((question) => question.correctOption < 0).length });
  } catch (error) {
    console.error(`PDF parsing failed: ${error.message}`);
    res.status(422).json({ message: 'تعذر قراءة ملف PDF. تأكد أنه يحتوي على نص قابل للتحديد وليس صورًا فقط.' });
  }
});

app.post('/api/admin/quizzes', authenticate, requireAdmin, async (req, res) => {
  requireMongo(res);
  const { title, description = '', price = 0, questions = [], published = true } = req.body;
  const grade = ['first-secondary', 'second-secondary'].includes(req.body.grade) ? req.body.grade : 'second-secondary';
  const term = grade === 'first-secondary' && ['first-term', 'second-term'].includes(req.body.term) ? req.body.term : '';
  const unitId = Number(req.body.unitId) || 1;
  const lessonId = String(req.body.lessonId || '').trim();
  const packagePrice = Number(req.body.packagePrice ?? price);
  if (!title?.trim() || !Array.isArray(questions) || questions.length === 0) return res.status(400).json({ message: 'اسم الاختبار وسؤال واحد على الأقل مطلوبان' });
  if (lessonId && !videoCatalog.some((video) => String(video.id) === lessonId && video.grade === grade && Number(video.unitId) === unitId && (grade !== 'first-secondary' || video.term === term))) return res.status(400).json({ message: 'المحاضرة المحددة لا تنتمي إلى هذه الوحدة' });
  const normalizedQuestions = questions.map((question, index) => ({ id: index + 1, text: String(question.text || '').trim(), options: Array.isArray(question.options) ? question.options.map(String).filter(Boolean).slice(0, 6) : [], correctOption: Number(question.correctOption) }));
  if (normalizedQuestions.some((question) => !question.text || question.options.length < 2 || !Number.isInteger(question.correctOption) || !question.options[question.correctOption])) return res.status(400).json({ message: 'كل سؤال يجب أن يحتوي على اختيارات وإجابة صحيحة' });
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice < 0) return res.status(400).json({ message: 'سعر الاختبار يجب أن يكون صفرًا أو أكثر' });
  if (!Number.isFinite(packagePrice) || packagePrice < 0) return res.status(400).json({ message: 'سعر الباكدج يجب أن يكون صفرًا أو أكثر' });
  const quiz = { id: randomUUID(), title: title.trim(), description: String(description), price: numericPrice, packagePrice, grade, term, unitId, lessonId, questions: normalizedQuestions, published: Boolean(published), createdAt: new Date().toISOString() };
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
    message: 'تم تفعيل الوصول إلى المحاضرات بنجاح',
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
