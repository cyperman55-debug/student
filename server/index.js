import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import mongoose from 'mongoose';
import dns from 'node:dns';
import { randomUUID } from 'node:crypto';

const app = express();
const PORT = Number(process.env.PORT) || 5001;
const JWT_SECRET = String(process.env.JWT_SECRET || '').trim();
const jwtConfigured = Boolean(JWT_SECRET);

const corsOrigins = String(process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: corsOrigins.length ? corsOrigins : true,
  credentials: true,
}));

// Security headers on API responses (the static frontend gets its own via vercel.json)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '5mb' }));
const pdfUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const quizSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, default: 10, min: 1 },
  questions: [{ id: Number, type: { type: String, default: 'multiple-choice' }, text: String, options: [String], correctOption: Number, modelAnswer: String, points: { type: Number, default: 1 } }],
  published: { type: Boolean, default: true },
  grade: { type: String, default: 'second-secondary' },
  term: { type: String, default: '' },
  unitId: { type: Number, default: 1, min: 1 },
  lessonId: { type: String, default: '' },
  packagePrice: { type: Number, default: 0, min: 0 },
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });
const Quiz = mongoose.models.Quiz || mongoose.model('Quiz', quizSchema);
const quizAttemptSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  quizId: { type: String, required: true },
  quizTitle: { type: String, default: '' },
  studentId: { type: Number, required: true },
  score: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 1 },
  answers: [mongoose.Schema.Types.Mixed],
  pendingEssayCount: { type: Number, default: 0 },
  submittedAt: { type: Date, default: Date.now },
}, { versionKey: false });
const QuizAttempt = mongoose.models.QuizAttempt || mongoose.model('QuizAttempt', quizAttemptSchema);
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
  lessonId: { type: Number, default: 0 },
  title: { type: String, required: true },
  url: { type: String, required: true },
  cover: { type: String, default: '' },
  coverIsCustom: { type: Boolean, default: false },
  price: { type: Number, default: 10, min: 0 },
  grade: { type: String, default: 'second-secondary' },
  term: { type: String, default: '' },
  unitId: { type: Number, default: 1, min: 1 },
  packagePrice: { type: Number, default: 0, min: 0 },
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });
const Video = mongoose.models.Video || mongoose.model('Video', videoSchema);
const lessonSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  grade: { type: String, default: 'second-secondary' },
  term: { type: String, default: '' },
  unitId: { type: Number, default: 1, min: 1 },
  requiredQuizId: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });
const Lesson = mongoose.models.Lesson || mongoose.model('Lesson', lessonSchema);
const lessonPdfSchema = new mongoose.Schema({
  videoId: { type: Number, required: true, unique: true },
  originalName: { type: String, required: true },
  data: { type: Buffer, required: true },
  updatedAt: { type: Date, default: Date.now },
}, { versionKey: false });
const LessonPdf = mongoose.models.LessonPdf || mongoose.model('LessonPdf', lessonPdfSchema);
const lessonPdfResourceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  lessonId: { type: Number, required: true },
  originalName: { type: String, required: true },
  data: { type: Buffer, required: true },
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });
const LessonPdfResource = mongoose.models.LessonPdfResource || mongoose.model('LessonPdfResource', lessonPdfResourceSchema);
const videoPurchaseSchema = new mongoose.Schema({
  videoId: { type: Number, required: true },
  studentId: { type: Number, required: true },
  price: { type: Number, required: true, min: 0 },
  purchasedAt: { type: Date, default: Date.now },
}, { versionKey: false });
const VideoPurchase = mongoose.models.VideoPurchase || mongoose.model('VideoPurchase', videoPurchaseSchema);
const quizPurchaseSchema = new mongoose.Schema({
  quizId: { type: String, required: true },
  studentId: { type: Number, required: true },
  price: { type: Number, required: true, min: 0 },
  purchasedAt: { type: Date, default: Date.now },
}, { versionKey: false });
const QuizPurchase = mongoose.models.QuizPurchase || mongoose.model('QuizPurchase', quizPurchaseSchema);
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
const unitSettingSchema = new mongoose.Schema({
  unitId: { type: Number, required: true, unique: true, min: 1, max: 7 },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  image: { type: String, default: '' },
  visible: { type: Boolean, default: true },
}, { versionKey: false });
const UnitSetting = mongoose.models.UnitSetting || mongoose.model('UnitSetting', unitSettingSchema);
let mongoReady = false;
let mongoError = null;
const productionMode = process.env.NODE_ENV === 'production';
const mongoUri = String(process.env.MONGODB_URI || (!productionMode && process.env.MONGO_URI) || '').trim();
const mongoConfigured = Boolean(mongoUri);
if (productionMode && !mongoConfigured) {
  throw new Error('MONGODB_URI is required in production.');
}
let mongoDnsFallbackApplied = false;
const mongoDnsFallbackServers = String(process.env.MONGODB_DNS_SERVERS || '1.1.1.1,8.8.8.8')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean);
const videoCatalog = [
  { id: 1, lessonId: 1, title: 'محاضرة تمهيدية', cover: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg', coverIsCustom: false, url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', price: 10, grade: 'second-secondary', term: '', unitId: 1, packagePrice: 50 },
  { id: 2, lessonId: 2, title: 'شرح الوحدة الأولى', cover: 'https://img.youtube.com/vi/ysz5S6PUM-U/hqdefault.jpg', coverIsCustom: false, url: 'https://www.youtube.com/embed/ysz5S6PUM-U', price: 10, grade: 'second-secondary', term: '', unitId: 1, packagePrice: 50 },
];
const buildDefaultUnitSettings = () => Array.from({ length: 7 }, (_, index) => ({
  unitId: index + 1,
  title: `الوحدة ${index + 1}`,
  image: '',
  visible: true,
}));
const unitSettings = buildDefaultUnitSettings();
const mergeUnitSettingDocs = (savedDocs) => {
  const savedById = new Map((savedDocs || []).map((setting) => [Number(setting.unitId), setting]));
  return buildDefaultUnitSettings().map((setting) => ({
    ...setting,
    ...(savedById.has(setting.unitId) ? savedById.get(setting.unitId) : {}),
    unitId: setting.unitId,
  }));
};
const legacyGeneratedCovers = new Set([
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1516321165247-4aa89a48be28?auto=format&fit=crop&w=1200&q=80',
]);
const localLessonPdfs = new Map();
const localLessonPdfResources = [];
const lessonCatalog = [];
videoCatalog.forEach((video, index) => {
  video.lessonPdfAvailable = false;
  video.createdAt = new Date(index);
  lessonCatalog.push({
    id: video.id,
    title: video.title,
    grade: video.grade,
    term: video.term,
    unitId: video.unitId,
    requiredQuizId: '',
    createdAt: video.createdAt,
  });
});

function packageKey(grade, term, unitId) {
  return `${String(grade || 'second-secondary')}:${String(term || 'all')}:${Number(unitId) || 1}`;
}

function getLessonVideoItems(lessonId, catalog = videoCatalog) {
  return catalog
    .filter((video) => Number(video.lessonId || video.id) === Number(lessonId))
    .sort((left, right) => new Date(left.createdAt || 0) - new Date(right.createdAt || 0) || left.id - right.id);
}

async function getLessonPdfItems(lessonId, catalog = videoCatalog) {
  const lessonVideos = getLessonVideoItems(lessonId, catalog);
  let legacyPdfs = [];
  let additionalPdfs = [];
  if (mongoReady) {
    const videoIds = lessonVideos.map((video) => video.id);
    [legacyPdfs, additionalPdfs] = await Promise.all([
      LessonPdf.find({ videoId: { $in: videoIds } }).select('videoId originalName updatedAt').lean(),
      LessonPdfResource.find({ lessonId: Number(lessonId) }).select('id lessonId originalName createdAt').lean(),
    ]);
  } else {
    legacyPdfs = lessonVideos
      .map((video) => localLessonPdfs.get(video.id))
      .filter(Boolean);
    additionalPdfs = localLessonPdfResources.filter((resource) => Number(resource.lessonId) === Number(lessonId));
  }
  return [
    ...legacyPdfs.map((pdf) => ({
      id: `legacy-${pdf.videoId}`,
      name: pdf.originalName,
      createdAt: pdf.updatedAt,
    })),
    ...additionalPdfs.map((pdf) => ({
      id: pdf.id,
      name: pdf.originalName,
      createdAt: pdf.createdAt,
    })),
  ].sort((left, right) => new Date(left.createdAt || 0) - new Date(right.createdAt || 0));
}

async function getLessonSummaries(predicate = () => true, lessons = lessonCatalog, catalog = videoCatalog) {
  return Promise.all(lessons
    .filter((lesson) => predicate(lesson))
    .sort((left, right) => new Date(left.createdAt || 0) - new Date(right.createdAt || 0) || left.id - right.id)
    .map(async (lesson) => ({
      ...lesson,
      videos: getLessonVideoItems(lesson.id, catalog),
      pdfs: await getLessonPdfItems(lesson.id, catalog),
    })));
}

function normalizeVideoUrl(value) {
  const input = String(value || '').trim();
  const iframeMatch = input.match(/<iframe\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/i);
  const rawUrl = (iframeMatch ? iframeMatch[2] : input).trim();
  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl);
  } catch {
    return rawUrl;
  }
  if (parsedUrl.protocol === 'http:') parsedUrl.protocol = 'https:';
  const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
  const pathParts = parsedUrl.pathname.split('/').filter(Boolean);

  if (['youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'youtu.be'].includes(host)) {
    const videoId = host === 'youtu.be'
      ? pathParts[0]
      : parsedUrl.searchParams.get('v') || pathParts.find((part, index) => ['embed', 'shorts', 'live', 'v'].includes(pathParts[index - 1]));
    if (videoId && /^[\w-]{6,}$/.test(videoId)) return `https://www.youtube.com/embed/${videoId}`;
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const videoIdIndex = host === 'player.vimeo.com'
      ? pathParts.indexOf('video') + 1
      : pathParts.findIndex((part) => /^\d+$/.test(part));
    const videoId = pathParts[videoIdIndex];
    if (videoId && /^\d+$/.test(videoId)) {
      const accessHash = parsedUrl.searchParams.get('h') || pathParts[videoIdIndex + 1];
      parsedUrl.hostname = 'player.vimeo.com';
      parsedUrl.pathname = `/video/${videoId}`;
      if (accessHash) parsedUrl.searchParams.set('h', accessHash);
      return parsedUrl.toString();
    }
  }

  if (host === 'drive.google.com' || host === 'docs.google.com') {
    const fileId = parsedUrl.pathname.match(/\/file\/d\/([^/]+)/)?.[1] || parsedUrl.searchParams.get('id');
    if (fileId) {
      const previewUrl = new URL(`https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`);
      const resourceKey = parsedUrl.searchParams.get('resourcekey');
      if (resourceKey) previewUrl.searchParams.set('resourcekey', resourceKey);
      return previewUrl.toString();
    }
  }

  if (host === 'player.mediadelivery.net' || host === 'iframe.mediadelivery.net') {
    const bunnyParts = parsedUrl.pathname.match(/^\/(?:video|play|embed)\/(\d+)\/([\w-]+)/i);
    if (bunnyParts) {
      parsedUrl.hostname = 'player.mediadelivery.net';
      parsedUrl.pathname = `/embed/${bunnyParts[1]}/${bunnyParts[2]}`;
      return parsedUrl.toString();
    }
  }

  return parsedUrl.toString();
}

function getVideoCoverFromUrl(value) {
  const input = String(value || '').trim();
  if (!input) return '';

  const iframeMatch = input.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  const rawUrl = (iframeMatch ? iframeMatch[1] : input).trim();
  const youtubeMatch = rawUrl.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/|embed\/)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([\w-]{6,})/i);
  if (youtubeMatch) return `https://img.youtube.com/vi/${youtubeMatch[1]}/hqdefault.jpg`;

  const bunnyMatch = rawUrl.match(/(?:iframe|player)\.mediadelivery\.net\/(?:embed|play)\/(\d+)\/([\w-]+)/i);
  if (bunnyMatch) return `https://vz-${bunnyMatch[1]}.b-cdn.net/${bunnyMatch[2]}/thumbnail.jpg`;

  return '';
}

function normalizeVideoDoc(savedVideo) {
  const url = normalizeVideoUrl(savedVideo.url);
  const savedCover = String(savedVideo.cover || '');
  const generatedCover = getVideoCoverFromUrl(url);
  const isCustomCover = typeof savedVideo.coverIsCustom === 'boolean'
    ? savedVideo.coverIsCustom
    : Boolean(savedCover && savedCover !== generatedCover && !legacyGeneratedCovers.has(savedCover));
  const cover = isCustomCover ? savedCover : generatedCover || (legacyGeneratedCovers.has(savedCover) ? '' : savedCover);
  return {
    ...savedVideo,
    id: Number(savedVideo.id),
    lessonId: Number(savedVideo.lessonId) || Number(savedVideo.id),
    url,
    cover,
    coverIsCustom: isCustomCover,
    price: Number(savedVideo.price) || 10,
    grade: savedVideo.grade || 'second-secondary',
    term: savedVideo.term || '',
    unitId: Number(savedVideo.unitId) || 1,
    packagePrice: Number(savedVideo.packagePrice) || Number(savedVideo.price) || 10,
    createdAt: savedVideo.createdAt || (savedVideo._id?.getTimestamp ? savedVideo._id.getTimestamp() : new Date(0)),
  };
}

function normalizeQuizDoc(quiz) {
  return {
    ...quiz,
    id: String(quiz.id || quiz._id),
    price: Number(quiz.price) >= 1 ? Number(quiz.price) : 10,
    grade: quiz.grade || 'second-secondary',
    term: quiz.term || '',
    unitId: Number(quiz.unitId) || 1,
    packagePrice: Number(quiz.packagePrice) || Number(quiz.price) || 10,
  };
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
        }

        if (defaultAdmin) {
          const adminUser = users.find((user) => user.role === 'admin' && user.id === 1)
            || users.find((user) => user.role === 'admin')
            || { ...defaultAdmin };

          Object.assign(adminUser, defaultAdmin, { id: 1, role: 'admin' });
          const adminIndex = users.findIndex((user) => user.role === 'admin' && user.id === 1);
          if (adminIndex >= 0) {
            users[adminIndex] = adminUser;
          } else {
            users.unshift(adminUser);
          }

          if (savedUsers.length) {
            await User.updateOne({ id: 1 }, { $set: defaultAdmin }, { upsert: true });
          } else {
            await User.insertMany(users);
          }
        } else if (!savedUsers.length && users.length) {
          await User.insertMany(users);
        }
        const savedVideos = await Video.find().lean();
        if (savedVideos.length) {
          const normalizedVideos = savedVideos.map(normalizeVideoDoc);
          videoCatalog.splice(0, videoCatalog.length, ...normalizedVideos);
          await Promise.all(videoCatalog.map((video) => Video.updateOne(
            { id: video.id },
            { $set: { lessonId: video.lessonId, createdAt: video.createdAt, url: video.url, cover: video.cover, coverIsCustom: video.coverIsCustom } },
          )));
        } else {
          await Video.insertMany(videoCatalog);
        }
        const savedLessons = await Lesson.find().lean();
        lessonCatalog.splice(0, lessonCatalog.length, ...savedLessons.map((lesson) => ({
          ...lesson,
          id: Number(lesson.id),
          grade: lesson.grade || 'second-secondary',
          term: lesson.term || '',
          unitId: Number(lesson.unitId) || 1,
        })));
        const missingLessons = [...new Set(videoCatalog.map((video) => video.lessonId))]
          .filter((lessonId) => !lessonCatalog.some((lesson) => lesson.id === lessonId))
          .map((lessonId) => {
            const lessonVideos = getLessonVideoItems(lessonId);
            const firstVideo = lessonVideos[0];
            return {
              id: lessonId,
              title: firstVideo.title,
              grade: firstVideo.grade,
              term: firstVideo.term,
              unitId: firstVideo.unitId,
              createdAt: firstVideo.createdAt || new Date(),
            };
          });
        if (missingLessons.length) {
          await Lesson.insertMany(missingLessons);
          lessonCatalog.push(...missingLessons);
        }
        await Promise.all(lessonCatalog.map((lesson) => Lesson.updateOne(
          { id: lesson.id },
          { $setOnInsert: lesson },
          { upsert: true },
        )));
        const savedUnitSettings = await UnitSetting.find().lean();
        unitSettings.splice(0, unitSettings.length, ...mergeUnitSettingDocs(savedUnitSettings));
        await Promise.all(unitSettings.map((setting) => UnitSetting.updateOne(
          { unitId: setting.unitId },
          { $setOnInsert: setting },
          { upsert: true },
        )));
        const savedLessonPdfIds = new Set((await LessonPdf.distinct('videoId')).map(Number));
        videoCatalog.forEach((video) => { video.lessonPdfAvailable = savedLessonPdfIds.has(Number(video.id)); });
        const savedQuizzes = await Quiz.find().lean();
        const legacyQuizzes = savedQuizzes.filter((quiz) => !quiz.price || quiz.price < 1);
        if (legacyQuizzes.length) await Quiz.updateMany({ _id: { $in: legacyQuizzes.map((quiz) => quiz._id) } }, { $set: { price: 10 } });
        quizzes.push(...savedQuizzes.map(normalizeQuizDoc));
        const savedQuizAttempts = await QuizAttempt.find().lean();
        quizAttempts.splice(0, quizAttempts.length, ...savedQuizAttempts.map((attempt) => ({
          ...attempt,
          id: Number(attempt.id),
          studentId: Number(attempt.studentId),
          score: Number(attempt.score),
          total: Number(attempt.total),
          submittedAt: new Date(attempt.submittedAt || attempt._id?.getTimestamp?.() || 0).toISOString(),
        })));
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
        const savedQuizPurchases = await QuizPurchase.find().lean();
        quizPurchases.push(...savedQuizPurchases.map((purchase) => ({
          quizId: String(purchase.quizId),
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
        }
        mongoReady = true;
        console.log(`MongoDB connected; loaded ${savedQuizzes.length} quizzes`);
        return true;
      })
      .catch((error) => {
        mongoReady = false;
        mongoError = error;
        const dnsResolutionFailed = String(error.message || '').includes('EBADRESP')
          || String(error.cause?.message || '').includes('EBADRESP');
        if (!productionMode && mongoUri.startsWith('mongodb+srv://') && dnsResolutionFailed && !mongoDnsFallbackApplied) {
          dns.setServers(mongoDnsFallbackServers);
          mongoDnsFallbackApplied = true;
          console.warn('MongoDB SRV lookup failed with the system DNS resolver; retrying with the configured DNS fallback.');
          return initializeMongo();
        }
        if (productionMode) {
          throw new Error('MongoDB connection failed. Production server cannot start without MongoDB.', { cause: error });
        }
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

const createDefaultAdmin = () => {
  const name = String(process.env.ADMIN_NAME || '').trim();
  const phone = String(process.env.ADMIN_PHONE || '').trim();
  const password = String(process.env.ADMIN_PASSWORD || '');
  const hasAdminConfig = Boolean(name || phone || password);

  if (!hasAdminConfig) return null;
  if (!name || !phone || !password) {
    throw new Error('ADMIN_NAME, ADMIN_PHONE, and ADMIN_PASSWORD must all be configured together.');
  }

  return {
    id: 1,
    name,
    email: '',
    grade: 'second-secondary',
    term: '',
    studentNumber: '',
    guardianPhone: '',
    governorate: 'القاهرة',
    phone,
    avatar: '',
    passwordHash: bcrypt.hashSync(password, 10),
    role: 'admin',
    status: 'active',
    balance: 0,
    contentUnlocked: true,
    contentAccess: { all: true, videoIds: [], packages: [] },
  };
};

const defaultAdmin = createDefaultAdmin();
const users = defaultAdmin ? [defaultAdmin] : [];

const chatMessages = [];

const quizzes = [];
const quizAttempts = [];
const quizPurchases = [];
const videoPurchases = [];
const rechargeRequests = [];
// Public wallet number students transfer to. The VODAFONE_CASH_NUMBER env var overrides it when set.
const DEFAULT_VODAFONE_CASH_NUMBER = '01112004658';
const vodafoneCashNumber = String(process.env.VODAFONE_CASH_NUMBER || '').trim() || DEFAULT_VODAFONE_CASH_NUMBER;
if (!process.env.VODAFONE_CASH_NUMBER) {
  console.warn(`VODAFONE_CASH_NUMBER is not set; using the built-in default ${DEFAULT_VODAFONE_CASH_NUMBER}.`);
}

// Egyptian mobile numbers: 11 digits starting with 01 (e.g. 010xxxxxxxx).
// Accepts Arabic-Indic digits and rejects placeholders like 00000000000.
const normalizePhoneDigits = (value) => String(value || '')
  .trim()
  .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  .replace(/[\s-]/g, '');
const isValidEgyptianPhone = (value) => /^01[0-9]{9}$/.test(normalizePhoneDigits(value));

const paymentSettings = {
  vodafoneCashNumber,
  instructions: 'حوّل المبلغ إلى رقم Vodafone Cash، ثم اكتب رقم العملية والمبلغ الذي تم تحويله. سيتم إضافة الرصيد بعد مراجعة المدرس.',
  minimumAmount: 10,
};
const activityLog = [];

function studentCompletedQuiz(studentId, quizId, attempts = quizAttempts) {
  return attempts.some((attempt) =>
    String(attempt.quizId) === String(quizId)
    && Number(attempt.studentId) === Number(studentId)
    && Number(attempt.total) > 0
  );
}

function studentCanAccessVideo(student, video, purchases = videoPurchases, attempts = quizAttempts) {
  const key = packageKey(video.grade, video.term, video.unitId);
  const hasContentAccess = Boolean(
    student.contentUnlocked
    || student.contentAccess?.all
    || student.contentAccess?.packages?.includes(key)
    || student.contentAccess?.videoIds?.includes(video.id)
    || purchases.some((purchase) => Number(purchase.videoId) === Number(video.id) && Number(purchase.studentId) === Number(student.id))
  );
  const lesson = lessonCatalog.find((item) => Number(item.id) === Number(video.lessonId || video.id));
  const requiredQuizId = String(lesson?.requiredQuizId || '');
  return hasContentAccess && (!requiredQuizId || studentCompletedQuiz(student.id, requiredQuizId, attempts));
}

// Mongo is the source of truth. The in-memory arrays are hydrated once per
// instance at cold start, and Vercel runs several instances, so memory goes
// stale after any write handled by another instance. User-facing entitlement
// and wallet paths read fresh state from Mongo per request and fall back to
// memory when Mongo is unavailable.
async function getFreshUser(userId) {
  const fallback = users.find((item) => Number(item.id) === Number(userId)) || null;
  if (!mongoReady) return fallback;
  try {
    const fresh = await User.findOne({ id: Number(userId) }).lean();
    return fresh || fallback;
  } catch {
    return fallback;
  }
}

async function getFreshStudentState(userId) {
  const id = Number(userId);
  const fromMemory = () => ({
    user: users.find((item) => Number(item.id) === id) || null,
    videoPurchases: videoPurchases.filter((purchase) => Number(purchase.studentId) === id),
    quizPurchases: quizPurchases.filter((purchase) => Number(purchase.studentId) === id),
    attempts: quizAttempts.filter((attempt) => Number(attempt.studentId) === id),
  });
  if (!mongoReady) return fromMemory();
  try {
    const [freshUser, freshVideoPurchases, freshQuizPurchases, freshAttempts] = await Promise.all([
      User.findOne({ id }).lean(),
      VideoPurchase.find({ studentId: id }).lean(),
      QuizPurchase.find({ studentId: id }).lean(),
      QuizAttempt.find({ studentId: id }).lean(),
    ]);
    return {
      user: freshUser || users.find((item) => Number(item.id) === id) || null,
      videoPurchases: freshVideoPurchases,
      quizPurchases: freshQuizPurchases,
      attempts: freshAttempts,
    };
  } catch {
    return fromMemory();
  }
}

async function getFreshCatalogs() {
  const fromMemory = () => ({ videos: videoCatalog, lessons: lessonCatalog, quizList: quizzes, unitSettings });
  if (!mongoReady) return fromMemory();
  try {
    const [savedVideos, savedLessons, savedQuizzes, savedUnitSettings] = await Promise.all([
      Video.find().lean(),
      Lesson.find().lean(),
      Quiz.find().lean(),
      UnitSetting.find().lean(),
    ]);
    if (!savedVideos.length) return fromMemory();
    const freshVideos = savedVideos.map(normalizeVideoDoc);
    const freshLessons = savedLessons.map((lesson) => ({
      ...lesson,
      id: Number(lesson.id),
      grade: lesson.grade || 'second-secondary',
      term: lesson.term || '',
      unitId: Number(lesson.unitId) || 1,
    }));
    // Mirror init: synthesize lesson docs for videos whose lesson is missing.
    [...new Set(freshVideos.map((video) => Number(video.lessonId)))]
      .filter((lessonId) => !freshLessons.some((lesson) => lesson.id === lessonId))
      .forEach((lessonId) => {
        const lessonVideos = freshVideos
          .filter((video) => Number(video.lessonId) === lessonId)
          .sort((left, right) => new Date(left.createdAt || 0) - new Date(right.createdAt || 0) || left.id - right.id);
        const firstVideo = lessonVideos[0];
        if (firstVideo) {
          freshLessons.push({
            id: lessonId,
            title: firstVideo.title,
            grade: firstVideo.grade,
            term: firstVideo.term,
            unitId: firstVideo.unitId,
            createdAt: firstVideo.createdAt || new Date(),
          });
        }
      });
    return {
      videos: freshVideos,
      lessons: freshLessons,
      quizList: savedQuizzes.map(normalizeQuizDoc),
      unitSettings: mergeUnitSettingDocs(savedUnitSettings),
    };
  } catch {
    return fromMemory();
  }
}

function studentHasAnyVideoAccess(student, purchases = videoPurchases) {
  const grade = student.grade || 'second-secondary';
  const term = student.term || '';
  return videoCatalog.some((video) => video.grade === grade
    && (grade === 'first-secondary' || !video.term || video.term === term)
    && studentCanAccessVideo(student, video, purchases));
}

function optionIndex(label) {
  return { a: 0, b: 1, c: 2, d: 3, ا: 0, أ: 0, ب: 1, ج: 2, د: 3 }[String(label).toLowerCase()] ?? -1;
}

function parseMcqText(text) {
  const questions = [];
  let current = null;
  let answerKeyStarted = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine
      .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
      .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
      .replace(/\s+/g, ' ')
      .trim();
    if (!line) continue;
    if (/^(answer key|answers|الإجابات|الاجابات|مفتاح الإجابة)/i.test(line)) {
      if (current && current.options.length >= 2) {
        questions.push(current);
        current = null;
      }
      answerKeyStarted = true;
      continue;
    }
    if (answerKeyStarted) {
      const answerMatch = line.match(/^(\d+)\s*[-:.]\s*([a-dأابجد])/i);
      const reversedAnswerMatch = line.match(/^[\s\-:.]*([a-dأابجد])\s*(\d+)\s*[-:.]?\s*$/i);
      const questionNumber = answerMatch ? Number(answerMatch[1]) : reversedAnswerMatch ? Number(reversedAnswerMatch[2]) : 0;
      const answerLabel = answerMatch?.[2] || reversedAnswerMatch?.[1];
      if (questionNumber && questions[questionNumber - 1] && answerLabel) {
        questions[questionNumber - 1].correctOption = optionIndex(answerLabel);
        continue;
      }
    }
    const leadingQuestionMatch = line.match(/^(\d+)[.)\-]\s*(.+)$/);
    const trailingQuestionMatch = !leadingQuestionMatch && (!current || current.options.length >= 2)
      ? line.match(/^[\s.)\-]*(.+?[\p{L}].*?)\s*(\d+)\s*[.)\-]*$/u)
      : null;
    const questionNumber = leadingQuestionMatch?.[1] || trailingQuestionMatch?.[2];
    const questionText = leadingQuestionMatch?.[2] || trailingQuestionMatch?.[1];
    if (questionNumber && questionText) {
      if (current && current.options.length >= 2) questions.push(current);
      current = { text: questionText.replace(/^[\s.)\-]+/, '').trim(), options: [], correctOption: -1 };
      answerKeyStarted = false;
      continue;
    }
    const optionMatch = line.match(/^([a-dأابجد])[\s.)\-:(]+(.+)$/i);
    if (optionMatch && current) {
      current.options.push(optionMatch[2]);
      if (current.options.length === 1 && optionMatch[1].toLowerCase() === 'a') current.correctOption = -1;
      continue;
    }
    const inlineAnswer = line.match(/^(?:answer|الإجابة|الاجابة|الإجابة الصحيحة)\s*[:\-]?\s*([a-dأابجد])/i);
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
  // Authenticated responses are per-user: never let any shared cache store them.
  res.set('Cache-Control', 'private, no-store');
  if (!jwtConfigured) {
    return res.status(503).json({ message: 'إعداد JWT_SECRET مطلوب لتشغيل تسجيل الدخول.' });
  }

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
  const missingConfiguration = [];
  if (!jwtConfigured) missingConfiguration.push('JWT_SECRET');
  if (process.env.VERCEL && !mongoConfigured) missingConfiguration.push('MONGODB_URI');
  if (missingConfiguration.length) {
    return res.status(503).json({
      ok: false,
      database: mongoConfigured ? (mongoReady ? 'connected' : 'unavailable') : 'not-configured',
      missingConfiguration,
      message: 'إعدادات الخادم المطلوبة غير مكتملة.',
    });
  }
  if (mongoConfigured && !mongoReady) {
    return res.status(503).json({ ok: false, database: 'unavailable', reason: mongoError?.name || 'connection-failed', message: 'تعذر الاتصال بقاعدة البيانات' });
  }
  res.json({ ok: true, database: mongoReady ? 'connected' : 'not-configured', message: 'خدمة Shefo تعمل بشكل طبيعي' });
});

app.use('/api', async (req, res, next) => {
  if (!mongoConfigured) {
    if (process.env.VERCEL) {
      return res.status(503).json({ message: 'إعداد MONGODB_URI مطلوب لحفظ بيانات المنصة في Vercel.' });
    }
    return next();
  }
  await waitForMongo();
  if (!mongoReady) {
    return res.status(503).json({ message: 'قاعدة البيانات غير متاحة. راجع MONGODB_URI في إعدادات Vercel.', detail: process.env.VERCEL ? undefined : mongoError?.message });
  }
  next();
});

// Public GET responses change rarely; let Vercel's edge cache them briefly.
const cachePublicBriefly = (req, res, next) => {
  res.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  next();
};

app.get('/api/public/students', cachePublicBriefly, (req, res) => {
  res.json({
    students: users
      .filter((item) => item.role === 'student' && item.status !== 'suspended')
      .map((item) => ({ id: item.id, name: item.name, score: item.score || null })),
  });
});

app.get('/api/public/quiz-leaderboard', cachePublicBriefly, (req, res) => {
  const studentsById = new Map(users
    .filter((student) => student.role === 'student' && student.status !== 'suspended')
    .map((student) => [Number(student.id), student]));
  const leaderboardByStudent = new Map();

  quizAttempts.forEach((attempt) => {
    const studentId = Number(attempt.studentId);
    const student = studentsById.get(studentId);
    const score = Number(attempt.score);
    const total = Number(attempt.total);
    if (!student || !Number.isFinite(score) || !Number.isFinite(total) || total <= 0) return;

    const percentage = (score / total) * 100;
    const current = leaderboardByStudent.get(studentId) || { bestRatio: -1, attempts: 0 };
    current.attempts += 1;
    if (percentage > current.bestRatio) {
      const nameParts = String(student.name || '').trim().split(/\s+/).filter(Boolean);
      current.bestRatio = percentage;
      current.bestPercentage = Math.round(percentage);
      current.score = score;
      current.total = total;
      current.quizTitle = String(attempt.quizTitle || '');
      current.displayName = nameParts.length > 1 ? `${nameParts[0]} ${nameParts[1][0]}.` : nameParts[0] || 'طالب';
    }
    leaderboardByStudent.set(studentId, current);
  });

  const students = [...leaderboardByStudent.values()]
    .sort((left, right) => right.bestRatio - left.bestRatio || right.score - left.score)
    .slice(0, 5)
    .map(({ bestRatio, ...student }, index) => ({ rank: index + 1, ...student }));

  res.json({ students });
});

app.get('/api/public/units/second-secondary', cachePublicBriefly, async (req, res) => {
  const catalogs = await getFreshCatalogs();
  const availableUnitIds = new Set([
    ...catalogs.videos
      .filter((video) => video.grade === 'second-secondary')
      .map((video) => Number(video.unitId) || 1),
    ...catalogs.quizList
      .filter((quiz) => quiz.published && quiz.grade === 'second-secondary')
      .map((quiz) => Number(quiz.unitId) || 1),
  ]);
  const units = await Promise.all([...availableUnitIds].sort((left, right) => left - right).map(async (unitId) => {
    const setting = catalogs.unitSettings.find((item) => item.unitId === unitId);
    if (setting?.visible === false) return null;
    const unitVideos = catalogs.videos.filter((video) => video.grade === 'second-secondary' && Number(video.unitId) === unitId);
    const unitQuizzes = catalogs.quizList.filter((quiz) => quiz.published && quiz.grade === 'second-secondary' && Number(quiz.unitId) === unitId);
    const lessonIds = new Set(unitVideos.map((video) => Number(video.lessonId || video.id)));
    const unitLessons = await getLessonSummaries((lesson) => lesson.grade === 'second-secondary' && Number(lesson.unitId) === unitId, catalogs.lessons, catalogs.videos);
    const firstLesson = unitLessons.find((lesson) => lessonIds.has(Number(lesson.id)));
    const newestContentAt = [...unitVideos, ...unitQuizzes, ...unitLessons]
      .reduce((latest, item) => Math.max(latest, new Date(item.createdAt || 0).getTime()), 0);

    return {
      id: `second-secondary-${unitId}`,
      grade: 'second-secondary',
      unitId,
      title: setting?.title || firstLesson?.title || unitVideos[0]?.title || `\u0627\u0644\u0648\u062d\u062f\u0629 ${unitId}`,
      image: setting?.image || unitVideos.find((video) => video.cover)?.cover || '',
      lessonCount: lessonIds.size,
      quizCount: unitQuizzes.length,
      isNew: newestContentAt > 0 && Date.now() - newestContentAt < 30 * 24 * 60 * 60 * 1000,
    };
  })).then((units) => units.filter(Boolean));

  res.json({ units });
});
// Public, content-safe preview of one unit: titles, covers and counts only.
// Never includes video URLs, PDF links or quiz questions, so visitors and
// unpurchased students can browse without any playable content leaking.
app.get('/api/public/units/second-secondary/:unitId/preview', cachePublicBriefly, async (req, res) => {
  const catalogs = await getFreshCatalogs();
  const unitId = Number(req.params.unitId) || 1;
  const setting = catalogs.unitSettings.find((item) => item.unitId === unitId);
  if (setting?.visible === false) return res.status(404).json({ message: 'الوحدة غير متاحة' });
  const unitVideos = catalogs.videos.filter((video) => video.grade === 'second-secondary' && Number(video.unitId) === unitId);
  const unitQuizzes = catalogs.quizList.filter((quiz) => quiz.published && quiz.grade === 'second-secondary' && Number(quiz.unitId) === unitId);
  if (!unitVideos.length && !unitQuizzes.length) return res.status(404).json({ message: 'الوحدة غير متاحة' });

  const lessonIds = new Set(unitVideos.map((video) => Number(video.lessonId || video.id)));
  const unitLessons = (await getLessonSummaries((lesson) => lesson.grade === 'second-secondary' && Number(lesson.unitId) === unitId, catalogs.lessons, catalogs.videos))
    .filter((lesson) => lessonIds.has(Number(lesson.id)));
  const lessons = unitLessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    videos: lesson.videos
      .filter((video) => unitVideos.some((unitVideo) => unitVideo.id === video.id))
      .map((video) => ({ id: video.id, title: video.title, cover: video.cover })),
    pdfCount: lesson.pdfs.length,
  })).filter((lesson) => lesson.videos.length > 0);

  const packagePrice = Math.max(0,
    ...unitVideos.map((video) => Number(video.packagePrice) || 0),
    ...unitQuizzes.map((quiz) => Number(quiz.packagePrice) || 0));

  res.json({
    unit: {
      unitId,
      title: setting?.title || lessons[0]?.title || unitVideos[0]?.title || `الوحدة ${unitId}`,
      image: setting?.image || unitVideos.find((video) => video.cover)?.cover || '',
      packagePrice,
      lessonCount: lessons.length,
      quizCount: unitQuizzes.length,
    },
    lessons,
    quizzes: unitQuizzes.map(({ questions, ...quiz }) => ({
      id: quiz.id,
      title: quiz.title,
      questionCount: (questions || []).length,
      lessonId: quiz.lessonId || null,
    })),
  });
});

app.get('/api/admin/units', authenticate, requireAdmin, (req, res) => {
  res.json({ units: unitSettings });
});

app.patch('/api/admin/units/:unitId', authenticate, requireAdmin, async (req, res) => {
  const unitId = Number(req.params.unitId);
  const setting = unitSettings.find((item) => item.unitId === unitId);
  if (!setting) return res.status(404).json({ message: 'الوحدة غير موجودة' });

  const title = req.body.title !== undefined ? String(req.body.title).trim() : setting.title;
  const image = req.body.image !== undefined ? String(req.body.image).trim() : setting.image;
  const visible = req.body.visible !== undefined ? req.body.visible : setting.visible;
  const validImage = !image
    || /^https?:\/\/\S+$/i.test(image)
    || /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(image);

  if (!title || title.length > 100 || typeof visible !== 'boolean' || !validImage || image.length > 3_000_000) {
    return res.status(400).json({ message: 'تحقق من الاسم والصورة واختيار الظهور' });
  }

  const updatedSetting = { unitId, title, image, visible };
  if (mongoReady) {
    await UnitSetting.updateOne({ unitId }, { $set: updatedSetting }, { upsert: true });
  }
  Object.assign(setting, updatedSetting);
  res.json({ unit: setting, message: 'تم حفظ إعدادات الوحدة' });
});
app.post('/api/login', async (req, res) => {
  if (!jwtConfigured) {
    return res.status(503).json({ message: 'إعداد JWT_SECRET مطلوب لتشغيل تسجيل الدخول.' });
  }

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
  if (!jwtConfigured) {
    return res.status(503).json({ message: 'إعداد JWT_SECRET مطلوب لتشغيل تسجيل الدخول.' });
  }

  requireMongo(res);
  const { name, email, studentNumber, studentPhone, guardianPhone, governorate, password, grade, term } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const validGrade = ['first-secondary', 'second-secondary'].includes(grade);
  const validTerm = term === '' || (grade === 'first-secondary' && ['first-term', 'second-term'].includes(term));
  const validEmail = !normalizedEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  if (!name || !studentPhone || !guardianPhone || !governorate || !password || password.length < 6 || !validGrade || !validTerm || !validEmail) {
    return res.status(400).json({ message: 'الاسم ورقم هاتف الطالب ورقم ولي الأمر والمحافظة وكلمة المرور مطلوبة، والبريد الإلكتروني إن أُدخل يجب أن يكون صحيحًا' });
  }
  if (!isValidEgyptianPhone(studentPhone) || !isValidEgyptianPhone(guardianPhone)) {
    return res.status(400).json({ message: 'رقم الهاتف يجب أن يكون رقمًا مصريًا صحيحًا مكونًا من 11 رقمًا ويبدأ بـ 01' });
  }
  if (studentNumber && users.some((item) => item.studentNumber === String(studentNumber).trim())) {
    return res.status(409).json({ message: 'رقم الطالب مستخدم بالفعل' });
  }
  if (normalizedEmail && users.some((item) => String(item.email || '').toLowerCase() === normalizedEmail)) {
    return res.status(409).json({ message: 'البريد الإلكتروني مستخدم بالفعل' });
  }
  const user = {
    id: Math.max(...users.map((item) => item.id)) + 1,
    name: String(name).trim(),
    ...(normalizedEmail ? { email: normalizedEmail } : {}),
    grade,
    term: term || '',
    studentNumber: String(studentNumber || '').trim(),
    phone: normalizePhoneDigits(studentPhone),
    guardianPhone: normalizePhoneDigits(guardianPhone),
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
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!name) return res.status(400).json({ message: 'الاسم مطلوب' });
  if (phone && !isValidEgyptianPhone(phone)) return res.status(400).json({ message: 'رقم الهاتف يجب أن يكون رقمًا مصريًا صحيحًا مكونًا من 11 رقمًا ويبدأ بـ 01' });
  if (guardianPhone && !isValidEgyptianPhone(guardianPhone)) return res.status(400).json({ message: 'رقم ولي الأمر يجب أن يكون رقمًا مصريًا صحيحًا مكونًا من 11 رقمًا ويبدأ بـ 01' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'البريد الإلكتروني غير صحيح' });
  if (email && users.some((item) => item.id !== user.id && String(item.email || '').toLowerCase() === email)) {
    return res.status(409).json({ message: 'البريد الإلكتروني مستخدم بالفعل' });
  }
  if (avatar && !/^data:image\/(png|jpe?g|webp|gif);base64,/.test(avatar) && !/^https?:\/\//.test(avatar)) {
    return res.status(400).json({ message: 'صورة الملف الشخصي غير صالحة' });
  }
  if (avatar.length > 4 * 1024 * 1024) return res.status(400).json({ message: 'حجم الصورة كبير جدًا' });

  user.name = name;
  user.phone = phone ? normalizePhoneDigits(phone) : '';
  user.guardianPhone = guardianPhone ? normalizePhoneDigits(guardianPhone) : '';
  user.avatar = avatar;
  user.email = email;
  // The email field has a sparse unique index: unset it when cleared instead of saving an empty string.
  await User.updateOne({ id: user.id }, email ? { $set: { name, phone: user.phone, guardianPhone: user.guardianPhone, avatar, email } } : { $set: { name, phone: user.phone, guardianPhone: user.guardianPhone, avatar }, $unset: { email: '' } });
  res.json({
    message: 'تم تحديث الملف الشخصي',
    user: { id: user.id, name: user.name, email: user.email, role: user.role, studentNumber: user.studentNumber || '', phone: user.phone, guardianPhone: user.guardianPhone, avatar, balance: user.balance },
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
  request.status = 'Approved';
  request.creditedAmount = creditedAmount;
  request.reviewedAt = new Date().toISOString();
  // Credit the balance atomically in Mongo (source of truth), then sync this
  // instance's memory so immediate reads on it agree with other instances.
  let newBalance;
  if (mongoReady) {
    const credited = await User.findOneAndUpdate(
      { id: Number(request.studentId), role: 'student' },
      { $inc: { balance: creditedAmount } },
      { new: true, lean: true }
    );
    newBalance = credited ? Number(credited.balance) : (Number(student.balance) || 0) + creditedAmount;
  } else {
    student.balance = (Number(student.balance) || 0) + creditedAmount;
    newBalance = student.balance;
  }
  const memoryStudent = users.find((user) => Number(user.id) === Number(request.studentId));
  if (memoryStudent) memoryStudent.balance = newBalance;
  await RechargeRequest.updateOne({ id: request.id }, { $set: { status: request.status, creditedAmount: request.creditedAmount, reviewedAt: request.reviewedAt } });
  const memoryRequest = rechargeRequests.find((item) => String(item.id) === String(request.id));
  if (memoryRequest) Object.assign(memoryRequest, { status: request.status, creditedAmount: request.creditedAmount, reviewedAt: request.reviewedAt });
  res.json({ request, balance: newBalance, message: 'تم اعتماد الطلب وإضافة الرصيد' });
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
  // A user created after this instance's cold start is not in memory yet;
  // resolve from Mongo (source of truth) before giving up.
  const currentUser = users.find((item) => item.id === req.user.id) || await getFreshUser(req.user.id);

  if (!currentUser) {
    return res.status(404).json({ message: 'المستخدم غير موجود' });
  }

  if (currentUser.role === 'admin') {
    const students = users.filter((item) => item.role === 'student');
    let totalStudents = students.length;
    let activeStudents = students.filter((student) => studentHasAnyVideoAccess(student)).length;

    if (mongoReady) {
      try {
        const [databaseStudents, databaseVideoPurchases, databaseStudentCount] = await Promise.all([
          User.find({ role: 'student' }).select('id grade term contentUnlocked contentAccess').lean(),
          VideoPurchase.find({ videoId: { $in: videoCatalog.map((video) => video.id) } }).select('studentId videoId').lean(),
          User.countDocuments({ role: 'student' }),
        ]);
        totalStudents = databaseStudentCount;
        activeStudents = databaseStudents.filter((student) => studentHasAnyVideoAccess(student, databaseVideoPurchases)).length;
      } catch (error) {
        console.error(`Student count query failed: ${error.message}`);
        return res.status(503).json({ message: 'تعذر تحميل إحصائيات الطلاب' });
      }
    }

    return res.json({
      role: 'admin',
      stats: {
        totalStudents,
        activeLessons: lessonCatalog.length,
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
      lessons: await getLessonSummaries(),
    });
  }

  // Student branch: read entitlements, wallet and catalog fresh from Mongo so
  // the response never reflects another instance's stale in-memory copy.
  const [freshState, catalogs] = await Promise.all([
    getFreshStudentState(req.user.id),
    getFreshCatalogs(),
  ]);
  const freshUser = freshState.user || currentUser;
  const gradeOf = freshUser.grade || 'second-secondary';
  const termOf = freshUser.term || '';
  const canAccessFresh = (video) => studentCanAccessVideo(freshUser, video, freshState.videoPurchases, freshState.attempts);
  const studentVideos = catalogs.videos.filter((video) => video.grade === gradeOf && (gradeOf === 'first-secondary' || !video.term || video.term === termOf));
  const videos = studentVideos.map((video) => {
    const key = packageKey(video.grade, video.term, video.unitId);
    const paid = Boolean(freshUser.contentUnlocked || freshUser.contentAccess?.all
      || freshUser.contentAccess?.packages?.includes(key)
      || freshUser.contentAccess?.videoIds?.includes(video.id)
      || freshState.videoPurchases.some((purchase) => Number(purchase.videoId) === Number(video.id)));
    const open = canAccessFresh(video);
    return { ...video, url: open ? video.url : '', packageKey: key, packagePurchased: freshUser.contentAccess?.packages?.includes(key), purchased: paid, locked: !paid };
  });
  const studentVideoMap = new Map(videos.map((video) => [video.id, video]));
  const studentLessons = (await getLessonSummaries((lesson) => lesson.grade === gradeOf
    && (gradeOf === 'first-secondary' || !lesson.term || lesson.term === termOf), catalogs.lessons, catalogs.videos))
    .map((lesson) => ({
      ...lesson,
      requiredQuizCompleted: !lesson.requiredQuizId || studentCompletedQuiz(freshUser.id, lesson.requiredQuizId, freshState.attempts),
      videos: lesson.videos.map((video) => studentVideoMap.get(video.id)).filter(Boolean),
      pdfs: lesson.videos.some((video) => canAccessFresh(video))
        ? lesson.pdfs
        : [],
    }))
    .filter((lesson) => lesson.videos.length > 0);
  const studentQuizzes = catalogs.quizList.filter((quiz) => quiz.published && quiz.grade === gradeOf && (gradeOf === 'first-secondary' || !quiz.term || quiz.term === termOf));

  return res.json({
    role: 'student',
    balance: freshUser.balance,
    hasPaid: freshUser.balance > 0 || freshUser.contentUnlocked,
    contentUnlocked: freshUser.contentUnlocked,
    quizzes: studentQuizzes.map(({ questions, ...quiz }) => ({ ...quiz, packageKey: packageKey(quiz.grade, quiz.term, quiz.unitId), purchased: freshUser.contentUnlocked || freshUser.contentAccess?.all || freshUser.contentAccess?.packages?.includes(packageKey(quiz.grade, quiz.term, quiz.unitId)) || quiz.packagePrice === 0 || quiz.price === 0 || freshState.quizPurchases.some((purchase) => String(purchase.quizId) === String(quiz.id)), questionCount: questions.length })),
    attempts: freshState.attempts,
    lessons: studentLessons,
    user: {
      id: freshUser.id,
      name: freshUser.name,
      email: freshUser.email,
      grade: gradeOf,
      term: termOf,
      role: freshUser.role,
      studentNumber: freshUser.studentNumber || '',
      phone: freshUser.phone || '',
      guardianPhone: freshUser.guardianPhone || '',
      avatar: freshUser.avatar || '',
      balance: freshUser.balance,
    },
    videos,
    message: 'المحاضرات مقفلة حتى يتم إتمام الدفع',
  });
});

app.post('/api/packages/:packageKey/purchase', authenticate, async (req, res) => {
  const requestedKey = String(req.params.packageKey);
  const catalogs = await getFreshCatalogs();
  const matchingVideos = catalogs.videos.filter((video) => packageKey(video.grade, video.term, video.unitId) === requestedKey);
  const matchingQuizzes = catalogs.quizList.filter((quiz) => quiz.published && packageKey(quiz.grade, quiz.term, quiz.unitId) === requestedKey);
  if (!matchingVideos.length && !matchingQuizzes.length) return res.status(404).json({ message: 'الباكدج غير موجودة' });
  const packagePrice = Number(matchingVideos[0]?.packagePrice ?? matchingQuizzes[0]?.packagePrice ?? 0);
  if (mongoReady) {
    const freshUser = await User.findOne({ id: req.user.id, role: 'student' }).lean();
    if (!freshUser) return res.status(403).json({ message: 'هذه العملية خاصة بالطلاب فقط' });
    if (Array.isArray(freshUser.contentAccess?.packages) && freshUser.contentAccess.packages.includes(requestedKey)) {
      return res.json({ success: true, purchased: true, balance: freshUser.balance });
    }
    // Atomic debit: only applies when the balance still covers the price, so a
    // double-click or a race against another debit can never double-charge.
    const updated = await User.findOneAndUpdate(
      { id: req.user.id, role: 'student', balance: { $gte: packagePrice }, 'contentAccess.packages': { $ne: requestedKey } },
      { $inc: { balance: -packagePrice }, $addToSet: { 'contentAccess.packages': requestedKey } },
      { new: true, lean: true }
    );
    if (!updated) return res.status(402).json({ message: `رصيدك غير كافٍ. سعر الباكدج ${packagePrice} جنيه مصري` });
    const memoryStudent = users.find((user) => Number(user.id) === Number(req.user.id));
    if (memoryStudent) {
      memoryStudent.balance = updated.balance;
      memoryStudent.contentAccess = updated.contentAccess;
    }
    return res.json({ success: true, purchased: true, balance: updated.balance });
  }
  const student = users.find((item) => item.id === req.user.id && item.role === 'student');
  if (!student) return res.status(403).json({ message: 'هذه العملية خاصة بالطلاب فقط' });
  const packages = Array.isArray(student.contentAccess?.packages) ? student.contentAccess.packages : [];
  if (packages.includes(requestedKey)) return res.json({ success: true, purchased: true, balance: student.balance });
  if (student.balance < packagePrice) return res.status(402).json({ message: `رصيدك غير كافٍ. سعر الباكدج ${packagePrice} جنيه مصري` });
  student.balance -= packagePrice;
  student.contentAccess = { ...(student.contentAccess || {}), packages: [...packages, requestedKey] };
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
  const lessonTitle = String(req.body.lessonTitle || title).trim();
  const url = normalizeVideoUrl(req.body.url);
  const cover = String(req.body.cover || '').trim();
  const price = Number(req.body.price ?? 10);
  const grade = ['first-secondary', 'second-secondary'].includes(req.body.grade) ? req.body.grade : 'second-secondary';
  const term = grade === 'first-secondary' && ['first-term', 'second-term'].includes(req.body.term) ? req.body.term : '';
  const unitId = Number(req.body.unitId) || 1;
  const packagePrice = Number(req.body.packagePrice ?? price);
  if (!title || !url) return res.status(400).json({ message: 'عنوان المحاضرة ورابط الشرح مطلوبان' });
  if (!lessonTitle) return res.status(400).json({ message: 'اسم المحاضرة مطلوب' });
  if (!Number.isFinite(price) || price < 0) return res.status(400).json({ message: 'سعر المحاضرة يجب أن يكون صفرًا أو أكثر' });
  if (!Number.isFinite(packagePrice) || packagePrice < 0) return res.status(400).json({ message: 'سعر الباكدج يجب أن يكون صفرًا أو أكثر' });

  const videoId = videoCatalog.length ? Math.max(...videoCatalog.map((item) => Number(item.id))) + 1 : 1;
  const requestedLessonId = Number(req.body.lessonId);
  let lesson = requestedLessonId ? lessonCatalog.find((item) => item.id === requestedLessonId) : null;
  if (requestedLessonId && !lesson) return res.status(404).json({ message: 'المحاضرة المختارة غير موجودة' });
  if (lesson && (lesson.grade !== grade || lesson.term !== term || Number(lesson.unitId) !== unitId)) {
    return res.status(400).json({ message: 'يجب أن يكون الفيديو في نفس الصف والوحدة الخاصة بالمحاضرة' });
  }
  if (!lesson) {
    const lessonId = Math.max(0, ...lessonCatalog.map((item) => Number(item.id)), ...videoCatalog.map((item) => Number(item.id))) + 1;
    lesson = { id: lessonId, title: lessonTitle, grade, term, unitId, createdAt: new Date() };
    lessonCatalog.push(lesson);
    if (mongoReady) await Lesson.create(lesson);
  }

  const coverIsCustom = Boolean(cover);
  const video = {
    id: videoId,
    lessonId: lesson.id,
    title,
    url,
    cover: cover || getVideoCoverFromUrl(url),
    coverIsCustom,
    price,
    grade,
    term,
    unitId,
    packagePrice,
    createdAt: new Date(),
    lessonPdfAvailable: false,
  };
  videoCatalog.push(video);
  if (mongoReady) await Video.create(video);
  res.status(201).json({ video, videos: videoCatalog, lessons: await getLessonSummaries() });
});

app.patch('/api/admin/lessons/:id', authenticate, requireAdmin, async (req, res) => {
  const lesson = lessonCatalog.find((item) => item.id === Number(req.params.id));
  const title = String(req.body.title || '').trim();
  const hasRequiredQuizId = Object.prototype.hasOwnProperty.call(req.body, 'requiredQuizId');
  const requiredQuizId = hasRequiredQuizId ? String(req.body.requiredQuizId || '').trim() : lesson?.requiredQuizId || '';
  if (!lesson) return res.status(404).json({ message: 'المحاضرة غير موجودة' });
  if (!title) return res.status(400).json({ message: 'اسم المحاضرة مطلوب' });
  const requiredQuiz = quizzes.find((quiz) => String(quiz.id) === requiredQuizId);
  if (requiredQuizId && (!requiredQuiz || !requiredQuiz.published || requiredQuiz.grade !== lesson.grade
    || (lesson.grade === 'first-secondary' && requiredQuiz.term !== lesson.term))) {
    return res.status(400).json({ message: 'اختر اختبارًا منشورًا ومتاحًا لصف المحاضرة وترمها' });
  }
  lesson.title = title;
  lesson.requiredQuizId = requiredQuizId;
  if (mongoReady) await Lesson.updateOne({ id: lesson.id }, { $set: { title, requiredQuizId } });
  res.json({ lesson, lessons: await getLessonSummaries() });
});

app.post('/api/admin/lessons/:id/pdfs', authenticate, requireAdmin, pdfUpload.single('pdf'), async (req, res) => {
  const lessonId = Number(req.params.id);
  const lesson = lessonCatalog.find((item) => item.id === lessonId);
  if (!lesson) return res.status(404).json({ message: 'المحاضرة غير موجودة' });
  if (!req.file || !req.file.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    return res.status(400).json({ message: 'ارفع ملف PDF صالحًا للمحاضرة' });
  }

  const resource = {
    id: randomUUID(),
    lessonId,
    originalName: String(req.file.originalname || `lesson-${lessonId}.pdf`).replace(/[\r\n]/g, '').slice(0, 180),
    data: req.file.buffer,
    createdAt: new Date(),
  };
  try {
    if (mongoReady) await LessonPdfResource.create(resource);
    else localLessonPdfResources.push(resource);
  } catch (error) {
    console.error(`Lesson PDF resource save failed: ${error.message}`);
    return res.status(500).json({ message: 'تعذر حفظ ملف المحاضرة' });
  }
  res.status(201).json({ success: true, pdfs: await getLessonPdfItems(lessonId) });
});

app.delete('/api/admin/lessons/:lessonId/pdfs/:resourceId', authenticate, requireAdmin, async (req, res) => {
  const lessonId = Number(req.params.lessonId);
  const resourceId = String(req.params.resourceId);
  const lesson = lessonCatalog.find((item) => item.id === lessonId);
  if (!lesson) return res.status(404).json({ message: 'المحاضرة غير موجودة' });
  let deleted = false;
  try {
    if (resourceId.startsWith('legacy-')) {
      const videoId = Number(resourceId.slice('legacy-'.length));
      if (!getLessonVideoItems(lessonId).some((video) => video.id === videoId)) {
        return res.status(404).json({ message: 'ملف الشرح غير موجود' });
      }
      if (mongoReady) deleted = (await LessonPdf.deleteOne({ videoId })).deletedCount > 0;
      else deleted = localLessonPdfs.delete(videoId);
      if (deleted) {
        const video = videoCatalog.find((item) => item.id === videoId);
        if (video) video.lessonPdfAvailable = false;
      }
    } else if (mongoReady) {
      deleted = (await LessonPdfResource.deleteOne({ id: resourceId, lessonId })).deletedCount > 0;
    } else {
      const index = localLessonPdfResources.findIndex((resource) => resource.id === resourceId && resource.lessonId === lessonId);
      if (index >= 0) {
        localLessonPdfResources.splice(index, 1);
        deleted = true;
      }
    }
  } catch (error) {
    console.error(`Lesson PDF resource delete failed: ${error.message}`);
    return res.status(500).json({ message: 'تعذر حذف ملف الشرح' });
  }
  if (!deleted) return res.status(404).json({ message: 'ملف الشرح غير موجود' });
  res.json({ success: true, pdfs: await getLessonPdfItems(lessonId) });
});

app.get('/api/lessons/:lessonId/pdfs/:resourceId', authenticate, async (req, res) => {
  const lessonId = Number(req.params.lessonId);
  const resourceId = String(req.params.resourceId);
  const lesson = lessonCatalog.find((item) => item.id === lessonId);
  const currentUser = await getFreshUser(req.user.id);
  if (!lesson || !currentUser) return res.status(404).json({ message: 'ملف المحاضرة غير موجود' });
  const lessonVideos = getLessonVideoItems(lessonId);
  if (currentUser.role !== 'admin') {
    const freshState = await getFreshStudentState(req.user.id);
    const accessUser = freshState.user || currentUser;
    if (!lessonVideos.some((video) => studentCanAccessVideo(accessUser, video, freshState.videoPurchases, freshState.attempts))) {
      return res.status(403).json({ message: 'يجب شراء محتوى الوحدة لعرض ملف المحاضرة' });
    }
  }

  let document;
  try {
    if (resourceId.startsWith('legacy-')) {
      const videoId = Number(resourceId.slice('legacy-'.length));
      if (!lessonVideos.some((video) => video.id === videoId)) return res.status(404).json({ message: 'ملف الشرح غير موجود' });
      document = mongoReady
        ? await LessonPdf.findOne({ videoId }).lean()
        : localLessonPdfs.get(videoId);
    } else {
      document = mongoReady
        ? await LessonPdfResource.findOne({ id: resourceId, lessonId }).lean()
        : localLessonPdfResources.find((resource) => resource.id === resourceId && resource.lessonId === lessonId);
    }
  } catch (error) {
    console.error(`Lesson PDF resource load failed: ${error.message}`);
    return res.status(503).json({ message: 'تعذر تحميل ملف المحاضرة' });
  }
  if (!document?.data) return res.status(404).json({ message: 'ملف الشرح غير موجود' });
  const safeName = String(document.originalName || `lesson-${lessonId}.pdf`).replace(/[\r\n]/g, '').slice(0, 180);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="lesson-${lessonId}.pdf"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
  });
  res.send(Buffer.from(document.data));
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
  const currentUser = await getFreshUser(req.user.id);
  if (!video || !currentUser) return res.status(404).json({ message: 'ملف المحاضرة غير موجود' });
  if (currentUser.role !== 'admin') {
    const freshState = await getFreshStudentState(req.user.id);
    if (!studentCanAccessVideo(freshState.user || currentUser, video, freshState.videoPurchases, freshState.attempts)) {
      return res.status(403).json({ message: 'يجب شراء محتوى الوحدة لعرض ملف المحاضرة' });
    }
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

  const nextUrl = req.body.url ? normalizeVideoUrl(req.body.url) : video.url;
  const nextCover = req.body.cover !== undefined ? String(req.body.cover || '').trim() : video.cover || '';
  const coverIsCustom = req.body.cover !== undefined ? Boolean(nextCover) : Boolean(video.coverIsCustom);
  const resolvedCover = coverIsCustom ? nextCover : getVideoCoverFromUrl(nextUrl);

  video.title = title;
  video.price = price;
  if (req.body.grade) video.grade = req.body.grade;
  if (req.body.term !== undefined) video.term = String(req.body.term || '');
  if (req.body.unitId !== undefined) video.unitId = Number(req.body.unitId) || 1;
  if (req.body.packagePrice !== undefined) video.packagePrice = Number(req.body.packagePrice) || 0;
  video.url = nextUrl;
  video.cover = resolvedCover;
  video.coverIsCustom = coverIsCustom;

  if (mongoReady) {
    await Video.updateOne({ id: video.id }, { $set: { title: video.title, url: video.url, cover: video.cover, coverIsCustom: video.coverIsCustom, price: video.price, grade: video.grade, term: video.term, unitId: video.unitId, packagePrice: video.packagePrice } });
  }

  res.json({ video, videos: videoCatalog });
});

app.delete('/api/admin/videos/:id', authenticate, requireAdmin, async (req, res) => {
  const videoId = Number(req.params.id);
  const index = videoCatalog.findIndex((item) => item.id === videoId);
  if (index === -1) return res.status(404).json({ message: 'المحاضرة غير موجودة' });

  const lessonId = Number(videoCatalog[index].lessonId || videoId);
  videoCatalog.splice(index, 1);
  const lessonStillHasVideos = getLessonVideoItems(lessonId).length > 0;
  if (mongoReady) {
    await Promise.all([
      Video.deleteOne({ id: videoId }),
      LessonPdf.deleteOne({ videoId }),
      ...(!lessonStillHasVideos ? [Lesson.deleteOne({ id: lessonId }), LessonPdfResource.deleteMany({ lessonId })] : []),
    ]);
  }
  localLessonPdfs.delete(videoId);
  if (!lessonStillHasVideos) {
    const lessonIndex = lessonCatalog.findIndex((lesson) => lesson.id === lessonId);
    if (lessonIndex >= 0) lessonCatalog.splice(lessonIndex, 1);
    for (let resourceIndex = localLessonPdfResources.length - 1; resourceIndex >= 0; resourceIndex -= 1) {
      if (localLessonPdfResources[resourceIndex].lessonId === lessonId) localLessonPdfResources.splice(resourceIndex, 1);
    }
  }

  res.json({ success: true, videos: videoCatalog, lessons: await getLessonSummaries() });
});

app.post('/api/videos/:id/purchase', authenticate, async (req, res) => {
  const videoId = Number(req.params.id);
  const catalogs = await getFreshCatalogs();
  const video = catalogs.videos.find((item) => item.id === videoId);
  if (!video) return res.status(404).json({ message: 'المحاضرة غير موجودة' });
  const price = Number(video.price) || 0;
  if (mongoReady) {
    const [freshUser, existingPurchase] = await Promise.all([
      User.findOne({ id: req.user.id, role: 'student' }).lean(),
      VideoPurchase.findOne({ videoId, studentId: Number(req.user.id) }).lean(),
    ]);
    if (!freshUser) return res.status(403).json({ message: 'هذه العملية خاصة بالطلاب فقط' });
    const alreadyOpen = freshUser.contentUnlocked || freshUser.contentAccess?.all || freshUser.contentAccess?.videoIds?.includes(videoId) || existingPurchase;
    if (alreadyOpen) return res.json({ success: true, purchased: true, balance: freshUser.balance });
    // Atomic debit: only applies while the balance still covers the price.
    const updated = await User.findOneAndUpdate(
      { id: req.user.id, role: 'student', balance: { $gte: price } },
      { $inc: { balance: -price } },
      { new: true, lean: true }
    );
    if (!updated) return res.status(402).json({ message: `رصيدك غير كافٍ. سعر المحاضرة ${price} جنيه مصري` });
    const purchase = { videoId, studentId: freshUser.id, price, purchasedAt: new Date().toISOString() };
    try {
      await VideoPurchase.create(purchase);
    } catch (error) {
      // Refund the debit if recording the entitlement itself failed.
      await User.updateOne({ id: freshUser.id }, { $inc: { balance: price } });
      throw error;
    }
    videoPurchases.push(purchase);
    const memoryStudent = users.find((user) => Number(user.id) === Number(freshUser.id));
    if (memoryStudent) memoryStudent.balance = updated.balance;
    return res.json({ success: true, purchased: true, balance: updated.balance });
  }
  const student = users.find((item) => item.id === req.user.id && item.role === 'student');
  const alreadyOpen = student?.contentUnlocked || student?.contentAccess?.all || student?.contentAccess?.videoIds?.includes(videoId) || videoPurchases.some((purchase) => purchase.videoId === videoId && purchase.studentId === req.user.id);
  if (alreadyOpen) return res.json({ success: true, purchased: true, balance: student.balance });
  if (!student || student.balance < price) return res.status(402).json({ message: `رصيدك غير كافٍ. سعر المحاضرة ${price} جنيه مصري` });
  student.balance -= price;
  const purchase = { videoId, studentId: student.id, price, purchasedAt: new Date().toISOString() };
  videoPurchases.push(purchase);
  res.json({ success: true, purchased: true, balance: student.balance });
});

app.post('/api/videos/:id/view', authenticate, async (req, res) => {
  const catalogs = await getFreshCatalogs();
  const video = catalogs.videos.find((item) => item.id === Number(req.params.id));
  if (!video) return res.status(404).json({ message: 'المحاضرة غير موجودة' });
  const currentUser = await getFreshUser(req.user.id);
  if (!currentUser) return res.status(403).json({ message: 'يجب شراء محتوى الوحدة لمشاهدة المحاضرة' });
  if (currentUser.role !== 'admin') {
    const freshState = await getFreshStudentState(req.user.id);
    if (!studentCanAccessVideo(freshState.user || currentUser, video, freshState.videoPurchases, freshState.attempts)) {
      return res.status(403).json({ message: 'يجب شراء محتوى الوحدة لمشاهدة المحاضرة' });
    }
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

app.post('/api/admin/students/:id/balance', authenticate, requireAdmin, async (req, res) => {
  const studentId = Number(req.params.id);
  const amount = Number(req.body.amount);

  if (!Number.isFinite(amount) || amount === 0) {
    return res.status(400).json({ message: 'قيمة الرصيد غير صحيحة أو ستجعل الرصيد سالبًا' });
  }
  if (mongoReady) {
    // Atomic adjust in Mongo (source of truth); never lets the balance go negative.
    const filter = { id: studentId, role: 'student' };
    if (amount < 0) filter.balance = { $gte: -amount };
    const updated = await User.findOneAndUpdate(filter, { $inc: { balance: amount } }, { new: true, lean: true });
    if (!updated) {
      const exists = await User.findOne({ id: studentId, role: 'student' }).lean();
      if (!exists) return res.status(404).json({ message: 'الطالب غير موجود' });
      return res.status(400).json({ message: 'قيمة الرصيد غير صحيحة أو ستجعل الرصيد سالبًا' });
    }
    const memoryStudent = users.find((item) => item.id === studentId);
    if (memoryStudent) memoryStudent.balance = updated.balance;
    return res.json({ success: true, student: { id: studentId, balance: updated.balance } });
  }
  const student = users.find((item) => item.id === studentId && item.role === 'student');
  if (!student) return res.status(404).json({ message: 'الطالب غير موجود' });
  if (student.balance + amount < 0) {
    return res.status(400).json({ message: 'قيمة الرصيد غير صحيحة أو ستجعل الرصيد سالبًا' });
  }
  student.balance += amount;
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

app.post('/api/admin/students/:id/unlock', authenticate, requireAdmin, async (req, res) => {
  const student = await getFreshUser(Number(req.params.id));

  if (!student || student.role !== 'student') return res.status(404).json({ message: 'الطالب غير موجود' });

  const contentUnlocked = Boolean(req.body.unlocked);
  const contentAccess = { all: contentUnlocked, videoIds: contentUnlocked ? videoCatalog.map((video) => video.id) : [] };
  if (mongoReady) await User.updateOne({ id: student.id }, { $set: { contentUnlocked, contentAccess } });
  const memoryStudent = users.find((item) => item.id === Number(student.id));
  if (memoryStudent) {
    memoryStudent.contentUnlocked = contentUnlocked;
    memoryStudent.contentAccess = contentAccess;
  }
  res.json({ success: true, contentUnlocked });
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

app.post('/api/admin/students/:id/content', authenticate, requireAdmin, async (req, res) => {
  const student = await getFreshUser(Number(req.params.id));
  if (!student || student.role !== 'student') return res.status(404).json({ message: 'الطالب غير موجود' });
  const videoIds = Array.isArray(req.body.videoIds) ? req.body.videoIds.map(Number).filter((id) => videoCatalog.some((video) => video.id === id)) : [];
  const contentAccess = { all: Boolean(req.body.all), videoIds };
  const contentUnlocked = contentAccess.all || videoIds.length > 0;
  if (mongoReady) await User.updateOne({ id: student.id }, { $set: { contentUnlocked, contentAccess } });
  const memoryStudent = users.find((item) => item.id === Number(student.id));
  if (memoryStudent) {
    memoryStudent.contentAccess = contentAccess;
    memoryStudent.contentUnlocked = contentUnlocked;
  }
  res.json({ contentAccess, contentUnlocked });
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
  if (lessonId) {
    const lesson = lessonCatalog.find((item) => String(item.id) === lessonId);
    if (!lesson || lesson.grade !== grade || Number(lesson.unitId) !== unitId || (grade === 'first-secondary' && lesson.term !== term)) {
      return res.status(400).json({ message: 'المحاضرة المحددة لا تنتمي إلى هذه الوحدة' });
    }
  }
  const normalizedQuestions = questions.map((question, index) => {
    const type = question.type === 'essay' ? 'essay' : 'multiple-choice';
    const text = String(question.text || '').trim();
    if (type === 'essay') return { id: index + 1, type, text, options: [], modelAnswer: String(question.modelAnswer || '').trim(), points: Number(question.points ?? 1) };
    return { id: index + 1, type, text, options: Array.isArray(question.options) ? question.options.map(String).filter(Boolean).slice(0, 6) : [], correctOption: Number(question.correctOption) };
  });
  if (normalizedQuestions.some((question) => question.type === 'essay'
    ? !question.text || !Number.isFinite(question.points) || question.points < 0.1 || question.points > 100
    : !question.text || question.options.length < 2 || !Number.isInteger(question.correctOption) || !question.options[question.correctOption])) {
    return res.status(400).json({ message: 'راجع نص كل سؤال ودرجته أو اختيارات السؤال والإجابة الصحيحة' });
  }
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

  const title = req.body.title === undefined ? quiz.title : String(req.body.title || '').trim();
  if (!title) return res.status(400).json({ message: 'اسم الاختبار مطلوب' });
  const description = req.body.description === undefined ? quiz.description : String(req.body.description || '');
  let newQuestion = null;
  if (req.body.addQuestion) {
    const input = req.body.addQuestion;
    if (input.type !== 'essay' || !String(input.text || '').trim()) return res.status(400).json({ message: 'اكتب نص السؤال المقالي أولاً' });
    const points = Number(input.points ?? 1);
    if (!Number.isFinite(points) || points <= 0 || points > 100) return res.status(400).json({ message: 'درجة السؤال يجب أن تكون بين 0.1 و100' });
    newQuestion = { id: Math.max(0, ...quiz.questions.map((question) => Number(question.id) || 0)) + 1, type: 'essay', text: String(input.text).trim(), options: [], modelAnswer: String(input.modelAnswer || '').trim(), points };
    quiz.questions.push(newQuestion);
  }
  quiz.title = title;
  quiz.description = description;
  try {
    const updateFilter = /^[a-f\d]{24}$/i.test(req.params.id)
      ? { _id: req.params.id }
      : { id: String(req.params.id) };
    const update = { $set: { title: quiz.title, description: quiz.description } };
    if (newQuestion) update.$push = { questions: newQuestion };
    await Quiz.updateOne(updateFilter, update);
  } catch (error) {
    return res.status(500).json({ message: 'تعذر حفظ تعديل الاختبار' });
  }
  res.json({ quiz });
});

app.delete('/api/admin/quizzes/:id', authenticate, requireAdmin, async (req, res) => {
  requireMongo(res);
  const deletedQuizId = String(req.params.id);
  const index = quizzes.findIndex((quiz) => String(quiz.id) === deletedQuizId);
  if (index === -1) return res.status(404).json({ message: 'الاختبار غير موجود' });
  quizzes.splice(index, 1);
  try {
    const deleteFilter = /^[a-f\d]{24}$/i.test(req.params.id)
      ? { _id: req.params.id }
      : { id: String(req.params.id) };
    lessonCatalog.forEach((lesson) => {
      if (String(lesson.requiredQuizId || '') === deletedQuizId) lesson.requiredQuizId = '';
    });
    if (mongoReady) {
      await Quiz.deleteOne(deleteFilter);
      await Lesson.updateMany({ requiredQuizId: deletedQuizId }, { $set: { requiredQuizId: '' } });
    }
  } catch (error) {
    return res.status(500).json({ message: 'تعذر حذف الاختبار من قاعدة البيانات' });
  }
  res.json({ success: true });
});

app.get('/api/quizzes', authenticate, async (req, res) => {
  const [freshState, catalogs] = await Promise.all([getFreshStudentState(req.user.id), getFreshCatalogs()]);
  return res.json({ quizzes: catalogs.quizList.filter((quiz) => quiz.published).map(({ questions, ...quiz }) => ({ ...quiz, purchased: quiz.price === 0 || freshState.quizPurchases.some((purchase) => String(purchase.quizId) === String(quiz.id)), questionCount: questions.length, questions: questions.map(({ correctOption, modelAnswer, ...question }) => ({ ...question, type: question.type || 'multiple-choice' })) })) });
});

app.post('/api/quizzes/:id/purchase', authenticate, async (req, res) => {
  const catalogs = await getFreshCatalogs();
  const quiz = catalogs.quizList.find((item) => String(item.id) === String(req.params.id) && item.published);
  if (!quiz) return res.status(404).json({ message: 'الاختبار غير موجود' });
  const price = Number(quiz.price) || 0;
  if (mongoReady) {
    const [freshUser, existingPurchase] = await Promise.all([
      User.findOne({ id: req.user.id, role: 'student' }).lean(),
      QuizPurchase.findOne({ quizId: String(quiz.id), studentId: Number(req.user.id) }).lean(),
    ]);
    if (price === 0 || existingPurchase) return res.json({ success: true, purchased: true, balance: freshUser ? freshUser.balance : req.user.balance });
    if (!freshUser) return res.status(403).json({ message: 'هذه العملية خاصة بالطلاب فقط' });
    const updated = await User.findOneAndUpdate(
      { id: req.user.id, role: 'student', balance: { $gte: price } },
      { $inc: { balance: -price } },
      { new: true, lean: true }
    );
    if (!updated) return res.status(402).json({ message: `رصيدك غير كافٍ. سعر الاختبار ${price} جنيه مصري` });
    const purchase = { quizId: String(quiz.id), studentId: freshUser.id, price, purchasedAt: new Date().toISOString() };
    try {
      await QuizPurchase.create(purchase);
    } catch (error) {
      await User.updateOne({ id: freshUser.id }, { $inc: { balance: price } });
      throw error;
    }
    quizPurchases.push(purchase);
    const memoryStudent = users.find((user) => Number(user.id) === Number(freshUser.id));
    if (memoryStudent) memoryStudent.balance = updated.balance;
    return res.json({ success: true, purchased: true, balance: updated.balance });
  }
  if (price === 0 || quizPurchases.some((purchase) => purchase.quizId === quiz.id && purchase.studentId === req.user.id)) return res.json({ success: true, purchased: true, balance: req.user.balance });
  const student = users.find((item) => item.id === req.user.id && item.role === 'student');
  if (!student || student.balance < price) return res.status(402).json({ message: `رصيدك غير كافٍ. سعر الاختبار ${price} جنيه مصري` });
  student.balance -= price;
  quizPurchases.push({ quizId: quiz.id, studentId: student.id, price, purchasedAt: new Date().toISOString() });
  res.json({ success: true, purchased: true, balance: student.balance });
});

app.post('/api/quizzes/:id/submit', authenticate, async (req, res) => {
  const catalogs = await getFreshCatalogs();
  const quiz = catalogs.quizList.find((item) => String(item.id) === String(req.params.id) && item.published);
  if (!quiz) return res.status(404).json({ message: 'الاختبار غير موجود' });
  const freshState = await getFreshStudentState(req.user.id);
  const student = freshState.user || users.find((item) => item.id === req.user.id);
  const quizPackageKey = packageKey(quiz.grade, quiz.term, quiz.unitId);
  const quizAvailable = quiz.price === 0
    || freshState.quizPurchases.some((purchase) => String(purchase.quizId) === String(quiz.id))
    || student?.contentUnlocked
    || student?.contentAccess?.all
    || student?.contentAccess?.packages?.includes(quizPackageKey);
  if (!quizAvailable) return res.status(402).json({ message: 'يجب شراء الاختبار أو الوحدة قبل البدء' });
  const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
  const essayQuestions = quiz.questions.filter((question) => question.type === 'essay');
  const objectiveQuestions = quiz.questions.filter((question) => question.type !== 'essay');
  const score = objectiveQuestions.reduce((total, question, index) => {
    const quizIndex = quiz.questions.indexOf(question);
    return total + (Number(answers[quizIndex]) === question.correctOption ? 1 : 0);
  }, 0);
  const corrections = quiz.questions.map((question, index) => ({
    questionId: question.id,
    selectedOption: Number.isInteger(Number(answers[index])) ? Number(answers[index]) : null,
    correctOption: question.correctOption,
    correctAnswer: question.options[question.correctOption],
    isCorrect: Number(answers[index]) === question.correctOption,
  }));
  const total = objectiveQuestions.length + essayQuestions.reduce((sum, question) => sum + (Number(question.points) || 1), 0);
  const attempt = { id: quizAttempts.length ? Math.max(...quizAttempts.map((item) => item.id)) + 1 : 1, quizId: quiz.id, quizTitle: quiz.title, studentId: req.user.id, score, total, answers, pendingEssayCount: essayQuestions.length, submittedAt: new Date().toISOString() };
  quizAttempts.push(attempt);
  if (mongoReady) {
    try {
      await QuizAttempt.create(attempt);
    } catch (error) {
      const failedAttemptIndex = quizAttempts.findIndex((item) => item.id === attempt.id);
      if (failedAttemptIndex >= 0) quizAttempts.splice(failedAttemptIndex, 1);
      return res.status(500).json({ message: 'تعذر حفظ نتيجة الاختبار. حاول مرة أخرى.' });
    }
  }
  activityLog.push({ studentId: req.user.id, type: 'quiz', label: `حل اختبار: ${quiz.title}`, detail: `${score} من ${quiz.questions.length}`, createdAt: attempt.submittedAt });
  res.json({ attempt, corrections });
});

if (!productionMode) {
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
}

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'مسار API غير موجود' });
});

app.use((error, req, res, next) => {
  console.error(error);
  if (req.path.startsWith('/api')) return res.status(500).json({ message: 'حدث خطأ في الخادم' });
  next(error);
});

if (productionMode) {
  await connectMongo;
}

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
