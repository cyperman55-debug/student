import { useEffect, useRef, useState } from 'react';
import heroImage from '../WhatsApp Image 2026-09-30 at 4.14.49 AM.jpeg';
import RobotAssistant from './RobotAssistant';

const cloudflareApiUrl = 'https://student-puce-one.vercel.app/api';
const usesSameOriginApi = typeof window === 'undefined'
  || ['localhost', '127.0.0.1'].includes(window.location.hostname)
  || window.location.hostname.endsWith('.vercel.app');
const API_URL = import.meta.env.VITE_API_URL || (usesSameOriginApi ? '/api' : cloudflareApiUrl);
const SESSION_TOKEN_KEY = 'shefo-token';
const LAST_ACTIVITY_KEY = 'shefo-last-activity';
const INACTIVITY_LIMIT = 5 * 60 * 1000;
const gradeOptions = [
  { value: 'first-secondary', label: 'أولى ثانوي' },
  { value: 'second-secondary', label: 'تانية ثانوي' },
];
const governorateOptions = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'القليوبية', 'الشرقية', 'الغربية', 'المنوفية',
  'الدقهلية', 'كفر الشيخ', 'دمياط', 'بورسعيد', 'الإسماعيلية', 'السويس', 'شمال سيناء',
  'جنوب سيناء', 'بني سويف', 'الفيوم', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر',
  'أسوان', 'البحر الأحمر', 'الوادي الجديد', 'مطروح',
];
const termOptions = [
  { value: 'first-term', label: 'الترم الأول' },
  { value: 'second-term', label: 'الترم الثاني' },
];
const secondSecondaryUnits = Array.from({ length: 7 }, (_, index) => ({ id: index + 1, label: `الوحدة ${index + 1}` }));
const firstSecondaryUnits = termOptions.map((term) => ({ id: term.value, label: term.label }));

function formatContentLocation(item) {
  if (item.grade === 'first-secondary') {
    return item.term === 'second-term' ? 'أولى ثانوي - الترم الثاني' : 'أولى ثانوي - الترم الأول';
  }
  return `تانية ثانوي - الوحدة ${item.unitId || 1}`;
}

const moneyNumberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

function CurrencyAmount({ amount }) {
  const numericAmount = Number(amount);
  const formattedAmount = moneyNumberFormatter.format(Number.isFinite(numericAmount) ? numericAmount : 0);

  return (
    <bdi className="currency-amount" dir="rtl">
      <span dir="ltr">{formattedAmount}</span>
      <span>جنيه مصري</span>
    </bdi>
  );
}

async function readApiResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`استجابة غير صحيحة من الخادم (${response.status})`);
  }
  return response.json();
}

function CyberGlobe() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let scene;
    let renderer;
    let earthTexture;
    let animationFrame = 0;
    let resizeObserver;
    let disposed = false;

    const initialize = async () => {
      const THREE = await import('three');
      if (disposed) return;

      try {
      scene = new THREE.Scene();
      scene.add(new THREE.AmbientLight(0xbfd4d4, 1.25));
      const sunlight = new THREE.DirectionalLight(0xfff1d4, 2.2);
      sunlight.position.set(-3, 2, 4);
      scene.add(sunlight);
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
      camera.position.set(0, 0, 5.1);

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
        preserveDrawingBuffer: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);

      const globeGroup = new THREE.Group();
      globeGroup.rotation.x = -0.08;
      globeGroup.rotation.y = -0.3;
      scene.add(globeGroup);

      const globeRadius = 1.42;
      const sphereGeometry = new THREE.SphereGeometry(globeRadius, 64, 48);
      earthTexture = new THREE.TextureLoader().load(
        '/earth-blue-marble.jpg',
        () => renderer.render(scene, camera),
        undefined,
        (error) => console.warn('The Earth texture could not be loaded.', error),
      );
      earthTexture.colorSpace = THREE.SRGBColorSpace;
      earthTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const globeSurface = new THREE.Mesh(
        sphereGeometry,
        new THREE.MeshPhongMaterial({
          map: earthTexture,
          specular: new THREE.Color(0x172b3b),
          shininess: 14,
        }),
      );
      globeGroup.add(globeSurface);

      const gridMaterial = new THREE.LineBasicMaterial({
        color: 0x326d61,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
      });
      const highlightMaterial = new THREE.LineBasicMaterial({
        color: 0x438d7b,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      });

      const addGridLine = (points, material) => {
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        globeGroup.add(new THREE.Line(geometry, material));
      };

      for (let latitude = -75; latitude <= 75; latitude += 15) {
        const latitudeRadians = THREE.MathUtils.degToRad(latitude);
        const points = [];
        for (let step = 0; step <= 96; step += 1) {
          const longitudeRadians = (step / 96) * Math.PI * 2;
          points.push(new THREE.Vector3(
            globeRadius * 1.003 * Math.cos(latitudeRadians) * Math.sin(longitudeRadians),
            globeRadius * 1.003 * Math.sin(latitudeRadians),
            globeRadius * 1.003 * Math.cos(latitudeRadians) * Math.cos(longitudeRadians),
          ));
        }
        addGridLine(points, latitude % 30 === 0 ? highlightMaterial : gridMaterial);
      }

      for (let longitude = 0; longitude < 180; longitude += 15) {
        const longitudeRadians = THREE.MathUtils.degToRad(longitude);
        const points = [];
        for (let step = 0; step <= 96; step += 1) {
          const latitudeRadians = THREE.MathUtils.degToRad(-90 + (step / 96) * 180);
          points.push(new THREE.Vector3(
            globeRadius * 1.003 * Math.cos(latitudeRadians) * Math.sin(longitudeRadians),
            globeRadius * 1.003 * Math.sin(latitudeRadians),
            globeRadius * 1.003 * Math.cos(latitudeRadians) * Math.cos(longitudeRadians),
          ));
        }
        addGridLine(points, longitude % 45 === 0 ? highlightMaterial : gridMaterial);
      }

      const pointOnGlobe = (latitude, longitude, radius = globeRadius * 1.006) => {
        const latitudeRadians = THREE.MathUtils.degToRad(latitude);
        const longitudeRadians = THREE.MathUtils.degToRad(longitude);
        return new THREE.Vector3(
          radius * Math.cos(latitudeRadians) * Math.sin(longitudeRadians),
          radius * Math.sin(latitudeRadians),
          radius * Math.cos(latitudeRadians) * Math.cos(longitudeRadians),
        );
      };

      const landmasses = [
        [[72, -165], [66, -150], [60, -140], [58, -128], [50, -124], [45, -124], [38, -122], [32, -117], [24, -108], [18, -105], [20, -97], [25, -90], [28, -82], [30, -81], [25, -80], [24, -82], [29, -89], [30, -93], [33, -97], [36, -101], [41, -104], [45, -105], [49, -102], [53, -100], [57, -94], [62, -90], [65, -82], [69, -85], [72, -105], [72, -135]],
        [[12, -81], [8, -77], [2, -78], [-5, -80], [-12, -77], [-18, -72], [-25, -70], [-35, -72], [-45, -75], [-55, -68], [-52, -60], [-40, -58], [-28, -54], [-18, -48], [-8, -40], [0, -50], [7, -58], [10, -66], [12, -75]],
        [[37, -10], [35, 5], [32, 18], [31, 30], [22, 36], [12, 44], [2, 50], [-12, 42], [-25, 33], [-35, 20], [-32, 15], [-20, 12], [-5, 8], [5, -5], [15, -17], [27, -15]],
        [[70, -10], [68, 18], [72, 40], [66, 58], [62, 80], [58, 100], [52, 120], [45, 135], [38, 140], [30, 130], [22, 122], [18, 110], [7, 105], [10, 90], [20, 75], [25, 60], [35, 50], [40, 38], [36, 28], [43, 18], [48, 8], [56, 2], [62, -5]],
        [[-11, 113], [-16, 122], [-25, 133], [-34, 138], [-39, 151], [-30, 154], [-20, 148], [-16, 138], [-12, 128]],
      ];
      const pointInsideLandmass = (latitude, longitude, polygon) => {
        let inside = false;
        for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
          const [currentLatitude, currentLongitude] = polygon[current];
          const [previousLatitude, previousLongitude] = polygon[previous];
          const crossesLatitude = (currentLatitude > latitude) !== (previousLatitude > latitude);
          const edgeLongitude = ((previousLongitude - currentLongitude) * (latitude - currentLatitude))
            / (previousLatitude - currentLatitude) + currentLongitude;
          if (crossesLatitude && longitude < edgeLongitude) inside = !inside;
        }
        return inside;
      };
      const landColors = [0x64d7b3, 0xe958bd, 0x56c7ff, 0xf5a94b, 0x7db2ff].map((color) => new THREE.Color(color));
      const landPositions = [];
      const landColorValues = [];
      for (let latitude = -55; latitude <= 75; latitude += 3.5) {
        for (let longitude = -180; longitude <= 180; longitude += 3.5) {
          const landmassIndex = landmasses.findIndex((polygon) => pointInsideLandmass(latitude, longitude, polygon));
          if (landmassIndex === -1) continue;
          const point = pointOnGlobe(latitude, longitude, globeRadius * 1.012);
          const color = landColors[landmassIndex];
          landPositions.push(point.x, point.y, point.z);
          landColorValues.push(color.r, color.g, color.b);
        }
      }
      const landGeometry = new THREE.BufferGeometry();
      landGeometry.setAttribute('position', new THREE.Float32BufferAttribute(landPositions, 3));
      landGeometry.setAttribute('color', new THREE.Float32BufferAttribute(landColorValues, 3));
      globeGroup.add(new THREE.Points(
        landGeometry,
        new THREE.PointsMaterial({
          size: 0.013,
          sizeAttenuation: true,
          vertexColors: true,
          transparent: true,
          opacity: 0.36,
          depthWrite: false,
        }),
      ));
      const continentMaterial = new THREE.LineBasicMaterial({
        color: 0xa1ffe0,
        transparent: true,
        opacity: 0.36,
        depthWrite: false,
      });
      landmasses.forEach((coordinates) => {
        const outline = coordinates.map(([latitude, longitude]) => pointOnGlobe(latitude, longitude, globeRadius * 1.01));
        outline.push(outline[0]);
        addGridLine(outline, continentMaterial);
      });

      const routeDefinitions = [
        { from: [40.7, -74], to: [51.5, -0.1], color: 0xf044aa },
        { from: [51.5, -0.1], to: [30, 31.2], color: 0x57e7b4 },
        { from: [30, 31.2], to: [1.3, 103.8], color: 0xffb342 },
        { from: [35.7, 139.7], to: [37.8, -122.4], color: 0x3caeff },
        { from: [-23.5, -46.6], to: [40.7, -74], color: 0xff4b73 },
        { from: [55.7, 37.6], to: [48.8, 2.3], color: 0x9b71ff },
        { from: [1.3, 103.8], to: [-33.9, 151.2], color: 0x57e7b4 },
        { from: [19.1, 72.9], to: [25.2, 55.3], color: 0xffb342 },
        { from: [34.1, -118.2], to: [35.7, 139.7], color: 0xf044aa },
      ];
      const animatedRoutes = routeDefinitions.map((route, index) => {
        const start = pointOnGlobe(...route.from);
        const end = pointOnGlobe(...route.to);
        const control = start.clone().add(end).normalize().multiplyScalar(globeRadius * (1.32 + index * 0.025));
        const curve = new THREE.QuadraticBezierCurve3(start, control, end);
        const glow = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 64, 0.014, 6, false),
          new THREE.MeshBasicMaterial({
            color: route.color,
            transparent: true,
            opacity: 0.24,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        const routeLine = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 64, 0.0045, 6, false),
          new THREE.MeshBasicMaterial({
            color: route.color,
            transparent: true,
            opacity: 0.98,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        globeGroup.add(glow, routeLine);

        const nodeMaterial = new THREE.MeshBasicMaterial({ color: route.color });
        const nodeGeometry = new THREE.SphereGeometry(0.035, 12, 12);
        const startNode = new THREE.Mesh(nodeGeometry, nodeMaterial);
        const endNode = new THREE.Mesh(nodeGeometry, nodeMaterial);
        startNode.position.copy(start);
        endNode.position.copy(end);
        globeGroup.add(startNode, endNode);

        const pulse = new THREE.Mesh(
          new THREE.SphereGeometry(0.038, 12, 12),
          new THREE.MeshBasicMaterial({
            color: route.color,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
          }),
        );
        globeGroup.add(pulse);

        return { curve, pulse, offset: index / routeDefinitions.length };
      });

      const resize = () => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };

      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
      resize();

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        animatedRoutes.forEach(({ curve, pulse, offset }) => pulse.position.copy(curve.getPoint((0.35 + offset) % 1)));
        renderer.render(scene, camera);
      } else {
        let previousFrameTime = performance.now();
        let elapsed = 0;
        const animate = () => {
          animationFrame = window.requestAnimationFrame(animate);
          const currentFrameTime = performance.now();
          const delta = Math.min((currentFrameTime - previousFrameTime) / 1000, 0.05);
          previousFrameTime = currentFrameTime;
          elapsed += delta;
          globeGroup.rotation.y += delta * 0.045;
          animatedRoutes.forEach(({ curve, pulse, offset }) => {
            pulse.position.copy(curve.getPoint((elapsed * 0.14 + offset) % 1));
          });
          renderer.render(scene, camera);
        };
        animate();
      }
        } catch (error) {
          console.warn('The cyber globe could not be initialized.', error);
          renderer?.domElement.remove();
          renderer?.dispose();
        }
      };

      initialize().catch((error) => console.warn('The cyber globe could not be loaded.', error));

    return () => {
        disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      earthTexture?.dispose();
      scene?.traverse((object) => {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material?.dispose();
        }
      });
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer?.domElement.remove();
    };
  }, []);

  return <div ref={containerRef} className="cyber-globe" aria-hidden="true" />;
}

function CreditFooter() {
  return (
    <footer className="credit-footer">
           
  <a href="https://www.instagram.com/tarekhus72?stkn=dWJlZjB6MHd3Z2Zx&utm_source=qr" target="_blank" rel="noreferrer">
      
       RIOT.OSI{' '} تم البرمجة والتصميم بواسطه 

      </a>
    </footer>
  );
}

const publicStages = [
  {
    id: 1,
    title: 'الصف الثاني الثانوي بكالوريا',
    subtitle: 'برمجة وذكاء اصطناعي بأسلوب عملي مبسط',
    image:
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
  },
];

const featureItems = [
  {
    command: 'python3 lesson.py --examples',
    title: 'شرح عملي مبسط',
    text: 'نفهمك البرمجة خطوة بخطوة مع أمثلة ومشاريع مناسبة لمرحلتك.',
  },
  {
    command: 'mkdir ai-project && code .',
    title: 'تطبيقات ومشاريع',
    text: 'حوّل كل محاضرة إلى تطبيق عملي يثبت فهمك ويقوي مهاراتك.',
  },
  {
    command: 'python3 quiz.py --track-progress',
    title: 'اختبارات دورية',
    text: 'تقييم مستمر يساعدك على متابعة مستواك والاستعداد للامتحان.',
  },
  {
    command: 'python3 ai_lab.py --future-ready',
    title: 'ذكاء اصطناعي للمستقبل',
    text: 'تعرّف على مفاهيم الذكاء الاصطناعي بطريقة واضحة ومرتبطة بالواقع.',
  },
];

const defaultVideos = [
  {
    id: 1,
    title: 'محاضرة تمهيدية',
    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    cover:
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
    locked: true,
    grade: 'second-secondary',
    term: '',
    unitId: 1,
    packagePrice: 50,
  },
  {
    id: 2,
    title: 'شرح الوحدة الأولى',
    url: 'https://www.youtube.com/embed/ysz5S6PUM-U',
    cover:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    locked: true,
    grade: 'second-secondary',
    term: '',
    unitId: 1,
    packagePrice: 50,
  },
];

function App() {
  const [email, setEmail] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [registerMode, setRegisterMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [registrationGovernorate, setRegistrationGovernorate] = useState('');
  const [registrationGrade, setRegistrationGrade] = useState('second-secondary');
  const [token, setToken] = useState(localStorage.getItem(SESSION_TOKEN_KEY) || '');
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(localStorage.getItem(SESSION_TOKEN_KEY)));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoCover, setVideoCover] = useState('');
  const [newLecturePdfFile, setNewLecturePdfFile] = useState(null);
  const [lectureQuizFile, setLectureQuizFile] = useState(null);
  const [lectureQuizPreview, setLectureQuizPreview] = useState(null);
  const [lectureQuizMessage, setLectureQuizMessage] = useState('');
  const [lectureQuizSaving, setLectureQuizSaving] = useState(false);
  const [lessonPdfFile, setLessonPdfFile] = useState(null);
  const [lessonPdfUploading, setLessonPdfUploading] = useState(false);
  const [lessonPdfDeleting, setLessonPdfDeleting] = useState(null);
  const [lessonPdfUploadMessage, setLessonPdfUploadMessage] = useState('');
  const [lessonPdfUploadVideoId, setLessonPdfUploadVideoId] = useState(null);
  const [lessonPdfGrade, setLessonPdfGrade] = useState('second-secondary');
  const [lessonPdfTerm, setLessonPdfTerm] = useState('first-term');
  const [lessonPdfUnitId, setLessonPdfUnitId] = useState('1');
  const [lessonPdfVideoId, setLessonPdfVideoId] = useState(null);
  const [lessonPdfUrl, setLessonPdfUrl] = useState('');
  const [lessonPdfLoading, setLessonPdfLoading] = useState(null);
  const [playingLessonVideoId, setPlayingLessonVideoId] = useState(null);
  const [videoGrade, setVideoGrade] = useState('second-secondary');
  const [videoTerm, setVideoTerm] = useState('');
  const [videoUnitId, setVideoUnitId] = useState('1');
  const [packagePriceDrafts, setPackagePriceDrafts] = useState({});
  const [videoFormError, setVideoFormError] = useState('');
  const [editingVideoId, setEditingVideoId] = useState(null);
  const [editingVideoTitle, setEditingVideoTitle] = useState('');
  const [editingVideoUrl, setEditingVideoUrl] = useState('');
  const [editingVideoCover, setEditingVideoCover] = useState('');
  const [videos, setVideos] = useState(defaultVideos);
  const [selectedVideo, setSelectedVideo] = useState(defaultVideos[0]);
  const [selectedAdminLectureId, setSelectedAdminLectureId] = useState(null);
  const [selectedAdminQuizId, setSelectedAdminQuizId] = useState(null);
  const [publicStudents, setPublicStudents] = useState([]);
  const [loginOpen, setLoginOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [studentsList, setStudentsList] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [balanceAmount, setBalanceAmount] = useState('');
  const [studentActionMessage, setStudentActionMessage] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [adminSection, setAdminSection] = useState('overview');
  const [studentDetails, setStudentDetails] = useState(null);
  const [quizList, setQuizList] = useState([]);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [editingQuizId, setEditingQuizId] = useState(null);
  const [editingQuizTitle, setEditingQuizTitle] = useState('');
  const [editingQuizDescription, setEditingQuizDescription] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [questionOptions, setQuestionOptions] = useState(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState('0');
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [quizResult, setQuizResult] = useState(null);
  const [quizCorrections, setQuizCorrections] = useState([]);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [pdfImportMessage, setPdfImportMessage] = useState('');
  const [pdfSaving, setPdfSaving] = useState(false);
  const [quizGrade, setQuizGrade] = useState('second-secondary');
  const [quizTerm, setQuizTerm] = useState('');
  const [quizUnitId, setQuizUnitId] = useState('1');
  const [quizLessonId, setQuizLessonId] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [rechargeRequests, setRechargeRequests] = useState([]);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [rechargeNotes, setRechargeNotes] = useState('');
  const [rechargeMessage, setRechargeMessage] = useState('');
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [paymentApprovalAmounts, setPaymentApprovalAmounts] = useState({});
  const [videoPurchaseLoading, setVideoPurchaseLoading] = useState(null);
  const [selectedPackageKey, setSelectedPackageKey] = useState(null);
  const [selectedLessonVideoId, setSelectedLessonVideoId] = useState(null);
  const protectedVideoRef = useRef(null);
  const lessonPdfObjectUrlRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileGuardianPhone, setProfileGuardianPhone] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [profileMessage, setProfileMessage] = useState('');

  useEffect(() => () => {
    if (lessonPdfObjectUrlRef.current) URL.revokeObjectURL(lessonPdfObjectUrlRef.current);
  }, []);

  useEffect(() => {
    if (!videos.length) {
      setSelectedAdminLectureId(null);
      return;
    }

    if (!selectedAdminLectureId || !videos.some((video) => String(video.id) === String(selectedAdminLectureId))) {
      setSelectedAdminLectureId(String(videos[0].id));
    }
  }, [videos, selectedAdminLectureId]);

  useEffect(() => {
    if (!quizList.length) {
      setSelectedAdminQuizId(null);
      return;
    }

    if (!selectedAdminQuizId || !quizList.some((quiz) => String(quiz.id) === String(selectedAdminQuizId))) {
      setSelectedAdminQuizId(String(quizList[0].id));
    }
  }, [quizList, selectedAdminQuizId]);

  const selectedAdminLecture = videos.find((video) => String(video.id) === String(selectedAdminLectureId)) || videos[0] || null;
  const selectedAdminQuiz = quizList.find((quiz) => String(quiz.id) === String(selectedAdminQuizId)) || quizList[0] || null;

  const scrollToLogin = () => {
    setLoginOpen(true);
  };

  const handleHeroPointerMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    event.currentTarget.style.setProperty('--hero-tilt-x', `${x * 5}deg`);
    event.currentTarget.style.setProperty('--hero-tilt-y', `${y * -5}deg`);
    event.currentTarget.style.setProperty('--hero-shift-x', `${x * 16}px`);
    event.currentTarget.style.setProperty('--hero-shift-y', `${y * 16}px`);
  };

  const resetHeroPointer = (event) => {
    event.currentTarget.style.setProperty('--hero-tilt-x', '0deg');
    event.currentTarget.style.setProperty('--hero-tilt-y', '0deg');
    event.currentTarget.style.setProperty('--hero-shift-x', '0px');
    event.currentTarget.style.setProperty('--hero-shift-y', '0px');
  };

  const fetchDashboard = async (authToken) => {
    const response = await fetch(`${API_URL}/dashboard`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('انتهت الجلسة');
    }

    return readApiResponse(response);
  };

  const fetchAdminStudents = async (authToken) => {
    const response = await fetch(`${API_URL}/admin/students`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!response.ok) throw new Error('تعذر تحميل الطلاب');
    return response.json();
  };

  const loadChatMessages = async () => {
    const response = await fetch(`${API_URL}/chat/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('تعذر تحميل الشات');
    const data = await response.json();
    setChatMessages(data.messages || []);
  };

  const openChat = async () => {
    try {
      await loadChatMessages();
      setChatOpen(true);
    } catch (err) {
      setError(err.message || 'تعذر فتح الشات');
    }
  };

  const sendChatMessage = async (event) => {
    event.preventDefault();
    if (!chatText.trim()) return;
    const response = await fetch(`${API_URL}/chat/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: chatText }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.message || 'تعذر إرسال الرسالة');
      return;
    }
    setChatMessages((current) => [...current, data.message]);
    setChatText('');
  };

  const moderateChatMessage = async (messageId, action) => {
    const response = await fetch(`${API_URL}/chat/messages/${messageId}${action === 'pin' ? '/pin' : ''}`, {
      method: action === 'pin' ? 'PATCH' : 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.message || 'تعذر تنفيذ الإجراء');
      return;
    }
    if (action === 'pin') setChatMessages((current) => current.map((message) => message.id === messageId ? data.message : message));
    else setChatMessages((current) => current.filter((message) => message.id !== messageId));
  };

  useEffect(() => {
    fetch(`${API_URL}/public/students`)
      .then((response) => response.ok ? response.json() : { students: [] })
      .then((data) => setPublicStudents(data.students || []))
      .catch(() => setPublicStudents([]));
  }, []);

  useEffect(() => {
    const isEditableTarget = (target) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable;
    const preventContextMenu = (event) => {
      if (!isEditableTarget(event.target)) event.preventDefault();
    };
    const preventProtectedShortcuts = (event) => {
      const key = String(event.key || '').toLowerCase();
      const blockedShortcut = event.ctrlKey && ['s', 'p', 'u'].includes(key);
      const blockedDevTools = event.key === 'F12' || (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key));
      if (event.key === 'PrintScreen' || blockedShortcut || blockedDevTools) {
        event.preventDefault();
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText('').catch(() => {});
      }
    };
    const preventDrag = (event) => event.preventDefault();

    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventProtectedShortcuts);
    document.addEventListener('dragstart', preventDrag);
    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventProtectedShortcuts);
      document.removeEventListener('dragstart', preventDrag);
    };
  }, []);

  useEffect(() => {
    if (token || !('IntersectionObserver' in window)) return undefined;

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16 });

    document.querySelectorAll('[data-reveal]').forEach((element) => revealObserver.observe(element));
    return () => revealObserver.disconnect();
  }, [token]);

  useEffect(() => {
    if (!token) {
      setAuthLoading(false);
      return;
    }
    setAuthLoading(true);

    const existingActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
    if (existingActivity && Date.now() - existingActivity >= INACTIVITY_LIMIT) {
      localStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      setToken('');
      setUser(null);
      setDashboard(null);
      setAuthLoading(false);
      return;
    }

    let lastActivityWrite = 0;
    const markActivity = () => {
      const now = Date.now();
      if (now - lastActivityWrite < 1000) return;
      lastActivityWrite = now;
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    };
    const checkInactivity = () => {
      const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || Date.now());
      if (Date.now() - lastActivity >= INACTIVITY_LIMIT) {
        localStorage.removeItem(SESSION_TOKEN_KEY);
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        setToken('');
        setUser(null);
        setDashboard(null);
      }
    };
    const activityEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));
    window.addEventListener('storage', checkInactivity);
    const inactivityTimer = window.setInterval(checkInactivity, 1000);
    markActivity();

    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchDashboard(token);
        setDashboard(data);
        setUser(data.user);

        if (data.role === 'admin') {
          setVideos(data.videos || defaultVideos);
          setSelectedVideo((data.videos || defaultVideos)[0] || null);
          const studentData = await fetchAdminStudents(token);
          setStudentsList(studentData.students);
          setSelectedStudentId(String(studentData.students[0]?.id || ''));
        }

        if (data.role === 'student') {
          setVideos(data.videos || defaultVideos);
          setSelectedVideo((data.videos || defaultVideos)[0] || null);
        }
      } catch (err) {
        setToken('');
        localStorage.removeItem(SESSION_TOKEN_KEY);
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        setError(err.message || 'انتهت الجلسة');
      } finally {
        setLoading(false);
        setAuthLoading(false);
      }
    };

    loadData();

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, markActivity));
      window.removeEventListener('storage', checkInactivity);
      window.clearInterval(inactivityTimer);
    };
  }, [token]);

  const updateStudentBalance = async (event) => {
    event.preventDefault();
    setStudentActionMessage('');
    const amount = Number(balanceAmount);
    if (!selectedStudentId || !Number.isFinite(amount) || amount === 0) {
      setStudentActionMessage('اختر طالبًا واكتب قيمة غير صفرية');
      return;
    }

    const response = await fetch(`${API_URL}/admin/students/${selectedStudentId}/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStudentActionMessage(data.message || 'تعذر تعديل الرصيد');
      return;
    }
    setStudentsList((current) => current.map((student) => (
      student.id === Number(selectedStudentId) ? { ...student, balance: data.student.balance } : student
    )));
    setBalanceAmount('');
    setStudentActionMessage('تم تحديث رصيد الطالب وتسجيل العملية.');
  };

  const toggleStudentContent = async () => {
    const student = studentsList.find((item) => item.id === Number(selectedStudentId));
    if (!student) return;
    const response = await fetch(`${API_URL}/admin/students/${selectedStudentId}/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ unlocked: !student.contentUnlocked }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStudentActionMessage(data.message || 'تعذر تغيير صلاحية المحتوى');
      return;
    }
    setStudentsList((current) => current.map((item) => (
      item.id === Number(selectedStudentId) ? { ...item, contentUnlocked: data.contentUnlocked } : item
    )));
    setStudentActionMessage(data.contentUnlocked ? 'تم فتح كل المحتوى للطالب.' : 'تم إغلاق المحتوى للطالب.');
  };

  const loadStudentDetails = async (studentId = selectedStudentId) => {
    const response = await fetch(`${API_URL}/admin/students/${studentId}/details`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await readApiResponse(response);
    if (!response.ok) throw new Error(data.message || 'تعذر تحميل تفاصيل الطالب');
    setStudentDetails(data);
  };

  const deleteStudent = async (student) => {
    if (!window.confirm(`هل أنت متأكد من حذف الطالب ${student.name}؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    const response = await fetch(`${API_URL}/admin/students/${student.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await readApiResponse(response);
    if (!response.ok) {
      setStudentActionMessage(data.message || 'تعذر حذف الطالب');
      return;
    }
    setStudentsList((current) => current.filter((item) => item.id !== student.id));
    if (selectedStudentId === String(student.id)) {
      setSelectedStudentId('');
      setStudentDetails(null);
    }
    setStudentActionMessage('تم حذف الطالب بنجاح.');
  };

  const toggleStudentVideo = async (videoId, open) => {
    const videoIds = studentDetails.videos.filter((video) => video.open).map((video) => video.id).filter((id) => id !== videoId);
    if (open) videoIds.push(videoId);
    const response = await fetch(`${API_URL}/admin/students/${selectedStudentId}/content`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ all: false, videoIds }),
    });
    const data = await readApiResponse(response);
    if (!response.ok) throw new Error(data.message || 'تعذر تعديل المحتوى');
    setStudentDetails((current) => ({ ...current, videos: current.videos.map((video) => ({ ...video, open: videoIds.includes(video.id) })) }));
  };

  const changeStudentPassword = async (event) => {
    event.preventDefault();
    const response = await fetch(`${API_URL}/admin/students/${selectedStudentId}/password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password: newStudentPassword }),
    });
    const data = await readApiResponse(response);
    setStudentActionMessage(data.message || 'تم تغيير كلمة المرور');
    if (response.ok) setNewStudentPassword('');
  };

  const loadQuizzes = async () => {
    const response = await fetch(`${API_URL}/admin/quizzes`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await readApiResponse(response);
    if (!response.ok) throw new Error(data.message || 'تعذر تحميل بنك الأسئلة');
    setQuizList(data.quizzes || []);
  };

  const loadPaymentRequests = async () => {
    const response = await fetch(`${API_URL}/admin/recharge-requests`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await readApiResponse(response);
    if (!response.ok) throw new Error(data.message || 'تعذر تحميل طلبات الدفع');
    const requests = data.requests || [];
    setPaymentRequests(requests);
    setPaymentApprovalAmounts((current) => requests.reduce((amounts, request) => ({
      ...amounts,
      [request.id]: current[request.id] ?? request.amount,
    }), current));
  };

  const reviewPaymentRequest = async (requestId, action) => {
    const reason = action === 'reject' ? window.prompt('اكتب سبب رفض الطلب') : '';
    if (action === 'reject' && !reason) return;
    const approvalAmount = paymentApprovalAmounts[requestId];
    if (action === 'approve' && (!Number.isFinite(Number(approvalAmount)) || Number(approvalAmount) <= 0)) {
      setError('اكتب مبلغًا صحيحًا لإضافته إلى رصيد الطالب');
      return;
    }
    const response = await fetch(`${API_URL}/admin/recharge-requests/${requestId}/${action}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason, amount: Number(approvalAmount) }),
    });
    const data = await readApiResponse(response);
    if (!response.ok) { setError(data.message || 'تعذر مراجعة الطلب'); return; }
    setPaymentRequests((current) => current.map((request) => request.id === requestId ? data.request : request));
    setStudentActionMessage(data.message);
  };

  const createQuiz = async (event) => {
    event.preventDefault();
    const response = await fetch(`${API_URL}/admin/quizzes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: quizTitle, description: quizDescription, price: 0, packagePrice: 0, grade: quizGrade, term: quizGrade === 'first-secondary' ? quizTerm : '', unitId: Number(quizUnitId), lessonId: quizLessonId, questions: [{ text: questionText, options: questionOptions, correctOption: Number(correctOption) }] }),
    });
    const data = await readApiResponse(response);
    if (!response.ok) { setError(data.message || 'تعذر إنشاء الاختبار'); return; }
    setQuizList((current) => [...current, data.quiz]);
    setQuizTitle(''); setQuizDescription(''); setQuizGrade('second-secondary'); setQuizTerm(''); setQuizUnitId('1'); setQuizLessonId(''); setQuestionText(''); setQuestionOptions(['', '', '', '']); setCorrectOption('0');
    setStudentActionMessage('تم إنشاء الاختبار وإضافته إلى بنك الأسئلة.');
  };

  const startEditQuiz = (quiz) => {
    setEditingQuizId(quiz.id);
    setEditingQuizTitle(quiz.title);
    setEditingQuizDescription(quiz.description || '');
  };

  const cancelEditQuiz = () => {
    setEditingQuizId(null);
    setEditingQuizTitle('');
    setEditingQuizDescription('');
  };

  const saveEditedQuiz = async () => {
    const title = editingQuizTitle.trim();
    if (!title) {
      setError('اسم الاختبار مطلوب');
      return;
    }

    const quiz = quizList.find((item) => item.id === editingQuizId);
    if (!quiz) return;

    try {
      const response = await fetch(`${API_URL}/admin/quizzes/${quiz.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, description: editingQuizDescription }),
      });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.message || 'تعذر تعديل الاختبار');
      setQuizList((current) => current.map((item) => item.id === quiz.id ? data.quiz : item));
      cancelEditQuiz();
      setStudentActionMessage('تم تعديل اسم ووصف الاختبار.');
    } catch (err) {
      setError(err.message || 'تعذر تعديل الاختبار');
    }
  };

  const importPdf = async (event) => {
    event.preventDefault();
    if (!pdfFile) return;
    setPdfImportMessage('جاري تحليل الملف...');
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    const response = await fetch(`${API_URL}/admin/quizzes/import-pdf`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
    const data = await readApiResponse(response);
    if (!response.ok) { setPdfImportMessage(data.message || 'تعذر تحليل الملف'); return; }
    setPdfPreview(data);
    setPdfImportMessage(`تم استخراج ${data.questions.length} سؤال${data.unresolved ? `، منها ${data.unresolved} بدون إجابة محددة` : ''}. راجع المعاينة قبل الحفظ.`);
  };

  const savePdfQuiz = async () => {
    if (!pdfPreview || !quizTitle.trim()) { setPdfImportMessage('اكتب اسم الاختبار أولًا'); return; }
    if (pdfPreview.questions.some((question) => question.correctOption < 0)) { setPdfImportMessage('حدد الإجابات الناقصة من المعاينة قبل الحفظ'); return; }
    setPdfSaving(true);
    try {
      const response = await fetch(`${API_URL}/admin/quizzes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: quizTitle, description: quizDescription, price: 0, packagePrice: 0, grade: quizGrade, term: quizGrade === 'first-secondary' ? quizTerm : '', unitId: Number(quizUnitId), lessonId: quizLessonId, questions: pdfPreview.questions }),
      });
      const data = await readApiResponse(response);
      if (!response.ok) { setPdfImportMessage(data.message || 'تعذر حفظ الاختبار'); return; }
      setQuizList((current) => [...current, data.quiz]);
      setPdfPreview(null); setPdfFile(null); setQuizTitle(''); setQuizDescription(''); setQuizLessonId('');
      setPdfImportMessage('تم حفظ الاختبار في قاعدة البيانات وبنك الأسئلة.');
    } catch (err) {
      setPdfImportMessage(err.message || 'تعذر حفظ الاختبار');
    } finally {
      setPdfSaving(false);
    }
  };

  const importLectureQuizPdf = async () => {
    if (!selectedAdminLecture || !lectureQuizFile) {
      setLectureQuizMessage('اختر ملف PDF للاختبار أولًا.');
      return;
    }

    setLectureQuizMessage('جاري تحليل ملف الاختبار...');
    try {
      const formData = new FormData();
      formData.append('pdf', lectureQuizFile);
      const response = await fetch(`${API_URL}/admin/quizzes/import-pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await readApiResponse(response);
      if (!response.ok) {
        setLectureQuizMessage(data.message || 'تعذر تحليل ملف الاختبار');
        return;
      }

      setLectureQuizPreview(data);
      setLectureQuizMessage(`تم استخراج ${data.questions.length} سؤال. راجع الإجابات قبل الحفظ.`);
    } catch (err) {
      setLectureQuizMessage(err.message || 'تعذر تحليل ملف الاختبار');
    }
  };

  const saveLectureQuizPdf = async () => {
    if (!selectedAdminLecture || !lectureQuizPreview) {
      setLectureQuizMessage('قم بتحليل ملف PDF أولًا.');
      return;
    }
    if (lectureQuizPreview.questions.some((question) => question.correctOption < 0)) {
      setLectureQuizMessage('حدد الإجابات الناقصة قبل الحفظ.');
      return;
    }

    const lectureTitle = selectedAdminLecture.title.trim();
    setLectureQuizSaving(true);
    try {
      const response = await fetch(`${API_URL}/admin/quizzes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: `${lectureTitle} - اختبار`,
          description: `اختبار مرتبط بمحاضرة: ${lectureTitle}`,
          price: 0,
          packagePrice: 0,
          grade: selectedAdminLecture.grade || 'second-secondary',
          term: selectedAdminLecture.grade === 'first-secondary' ? selectedAdminLecture.term || '' : '',
          unitId: Number(selectedAdminLecture.unitId || 1),
          lessonId: String(selectedAdminLecture.id),
          questions: lectureQuizPreview.questions,
        }),
      });
      const data = await readApiResponse(response);
      if (!response.ok) {
        setLectureQuizMessage(data.message || 'تعذر حفظ اختبار المحاضرة');
        return;
      }

      setQuizList((current) => [...current, data.quiz]);
      setSelectedAdminQuizId(String(data.quiz.id));
      setLectureQuizPreview(null);
      setLectureQuizFile(null);
      setLectureQuizMessage('تم حفظ اختبار المحاضرة بنجاح في بنك الأسئلة.');
    } catch (err) {
      setLectureQuizMessage(err.message || 'تعذر حفظ اختبار المحاضرة');
    } finally {
      setLectureQuizSaving(false);
    }
  };

  const openQuiz = async (quizId) => {
    const response = await fetch(`${API_URL}/quizzes`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await readApiResponse(response);
    const quiz = (data.quizzes || []).find((item) => item.id === quizId);
    if (quiz) { setSelectedQuiz(quiz); setQuizAnswers([]); setQuizResult(null); setQuizCorrections([]); }
  };

  const startQuiz = async (quizId) => {
    setError('');
    setLoading(true);
    try {
      const quiz = (dashboard?.quizzes || []).find((item) => item.id === quizId);
      const purchasePath = quiz?.packageKey
        ? `${API_URL}/packages/${encodeURIComponent(quiz.packageKey)}/purchase`
        : `${API_URL}/quizzes/${quizId}/purchase`;
      const response = await fetch(purchasePath, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readApiResponse(response);
      if (!response.ok) { setError(data.message || 'لا يمكن فتح الاختبار'); return; }
      await openQuiz(quizId);
      setDashboard((current) => current ? {
        ...current,
        balance: data.balance,
        quizzes: current.quizzes.map((item) => item.packageKey === quiz?.packageKey || item.id === quizId ? { ...item, purchased: true } : item),
      } : current);
    } catch (err) {
      setError(err.message || 'تعذر شراء الاختبار');
    } finally {
      setLoading(false);
    }
  };

  const openPaymentPage = async () => {
    setRechargeMessage('');
    const response = await fetch(`${API_URL}/payment-settings`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await readApiResponse(response);
    if (!response.ok) { setError(data.message || 'تعذر فتح صفحة الدفع'); return; }
    const historyResponse = await fetch(`${API_URL}/recharge-requests/my`, { headers: { Authorization: `Bearer ${token}` } });
    const historyData = await readApiResponse(historyResponse);
    setPaymentSettings(data.settings);
    setRechargeRequests(historyData.requests || []);
    setPaymentOpen(true);
  };

  const submitRechargeRequest = async (event) => {
    event.preventDefault();
    setRechargeMessage('جاري إرسال طلب الشحن...');
    const response = await fetch(`${API_URL}/recharge-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount: rechargeAmount, senderPhone, notes: rechargeNotes }),
    });
    const data = await readApiResponse(response);
    if (!response.ok) { setRechargeMessage(data.message || 'تعذر إرسال طلب الشحن'); return; }
    setRechargeRequests((current) => [data.request, ...current]);
    setRechargeAmount(''); setSenderPhone(''); setRechargeNotes('');
    setRechargeMessage(data.message || 'تم إرسال طلب الشحن بنجاح');
  };

  const purchaseVideo = async (video) => {
    setError('');
    setVideoPurchaseLoading(video.id);
    try {
      const response = await fetch(`${API_URL}/videos/${video.id}/purchase`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await readApiResponse(response);
      if (!response.ok) { setError(data.message || 'تعذر شراء المحاضرة'); return; }
      const refreshed = await fetchDashboard(token);
      setDashboard(refreshed);
      setUser(refreshed.user);
      setVideos(refreshed.videos || defaultVideos);
      const unlockedVideo = (refreshed.videos || []).find((item) => item.id === video.id);
      if (unlockedVideo) setSelectedVideo(unlockedVideo);
    } catch (err) {
      setError(err.message || 'تعذر شراء المحاضرة');
    } finally {
      setVideoPurchaseLoading(null);
    }
  };

  const purchasePackage = async (contentPackage) => {
    setError('');
    setVideoPurchaseLoading(contentPackage.packageKey);
    try {
      const response = await fetch(`${API_URL}/packages/${encodeURIComponent(contentPackage.packageKey)}/purchase`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await readApiResponse(response);
      if (!response.ok) { setError(data.message || 'تعذر شراء الباكدج'); return; }
      const refreshed = await fetchDashboard(token);
      setDashboard(refreshed);
      setUser(refreshed.user);
      setVideos(refreshed.videos || defaultVideos);
    } catch (err) {
      setError(err.message || 'تعذر شراء الباكدج');
    } finally {
      setVideoPurchaseLoading(null);
    }
  };

  const openProfile = () => {
    setProfileName(user?.name || '');
    setProfilePhone(user?.phone || '');
    setProfileGuardianPhone(user?.guardianPhone || '');
    setProfileAvatar(user?.avatar || '');
    setProfileMessage('');
    setProfileOpen(true);
  };

  const handleProfileImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileMessage('اختر ملف صورة صحيحًا');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProfileAvatar(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setProfileMessage('جاري حفظ التعديلات...');
    try {
      const response = await fetch(`${API_URL}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: profileName, phone: profilePhone, guardianPhone: profileGuardianPhone, avatar: profileAvatar }),
      });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.message || 'تعذر تحديث الملف الشخصي');
      setUser(data.user);
      setDashboard((current) => current ? { ...current, user: data.user } : current);
      setProfileMessage(data.message || 'تم حفظ الملف الشخصي');
    } catch (err) {
      setProfileMessage(err.message || 'تعذر تحديث الملف الشخصي');
    }
  };

  const toggleProtectedFullscreen = async () => {
    if (!protectedVideoRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await protectedVideoRef.current.requestFullscreen();
    }
  };

  const submitQuiz = async (event) => {
    event.preventDefault();
    const response = await fetch(`${API_URL}/quizzes/${selectedQuiz.id}/submit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ answers: quizAnswers }),
    });
    const data = await readApiResponse(response);
    if (!response.ok) { setError(data.message || 'تعذر تصحيح الاختبار'); return; }
    setQuizResult(data.attempt);
    setQuizCorrections(data.corrections || []);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/${registerMode ? 'auth/register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerMode
          ? { name: fullName, email, studentNumber, studentPhone, guardianPhone, governorate: registrationGovernorate, password, grade: registrationGrade, term: '' }
          : { phone: loginPhone, password }),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || (registerMode ? 'فشل إنشاء الحساب' : 'فشل تسجيل الدخول'));
      }

      localStorage.setItem(SESSION_TOKEN_KEY, data.token);
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      setUser(data.user);
      setToken(data.token);
    } catch (err) {
      setError(err.message || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    setToken('');
    setUser(null);
    setDashboard(null);
    setVideos(defaultVideos);
    setSelectedVideo(defaultVideos[0]);
  };

  const handlePay = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || 'فشل في إتمام الدفع');
      }

      const refreshed = await fetchDashboard(token);
      setDashboard(refreshed);
      setUser(refreshed.user);
      setVideos(refreshed.videos || defaultVideos);
      setSelectedVideo((refreshed.videos || defaultVideos)[0] || null);
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء الدفع');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVideo = async (event) => {
    event.preventDefault();

    if (!videoTitle.trim() || !videoUrl.trim()) {
      setVideoFormError('يرجى كتابة عنوان المحاضرة ورابطها');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admin/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: videoTitle, url: videoUrl, cover: videoCover, price: 0, grade: videoGrade, term: videoGrade === 'first-secondary' ? videoTerm : '', unitId: Number(videoUnitId), packagePrice: 0 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'تعذر حفظ المحاضرة');
      setVideos(data.videos || defaultVideos);
      setSelectedVideo(data.video);
      if (newLecturePdfFile) {
        const formData = new FormData();
        formData.append('pdf', newLecturePdfFile);
        const pdfResponse = await fetch(`${API_URL}/admin/videos/${data.video.id}/lesson-pdf`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const pdfData = await readApiResponse(pdfResponse);
        if (!pdfResponse.ok) throw new Error(pdfData.message || 'تم إنشاء المحاضرة لكن تعذر حفظ PDF');
        setVideos((current) => current.map((video) => video.id === data.video.id ? { ...video, lessonPdfAvailable: true } : video));
      }
      setVideoTitle('');
      setVideoUrl('');
      setVideoCover('');
      setNewLecturePdfFile(null);
      setVideoGrade('second-secondary');
      setVideoTerm('');
      setVideoUnitId('1');
      setVideoFormError('');
    } catch (err) {
      setVideoFormError(err.message || 'تعذر حفظ المحاضرة');
    }
  };

  const handleLessonPdfUpload = async (videoId) => {
    if (!lessonPdfFile) {
      setLessonPdfUploadMessage('اختر ملف PDF للمحاضرة أولًا.');
      return;
    }
    if (!lessonPdfFile.name.toLowerCase().endsWith('.pdf') || lessonPdfFile.size > 10 * 1024 * 1024) {
      setLessonPdfUploadMessage('ارفع ملف PDF صالحًا لا يتجاوز 10 ميجابايت.');
      return;
    }

    setLessonPdfUploading(true);
    setLessonPdfUploadMessage('جاري رفع ملف المحاضرة...');
    try {
      const formData = new FormData();
      formData.append('pdf', lessonPdfFile);
      const response = await fetch(`${API_URL}/admin/videos/${videoId}/lesson-pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.message || 'تعذر رفع ملف المحاضرة');
      setVideos((current) => current.map((video) => video.id === videoId ? { ...video, lessonPdfAvailable: true } : video));
      setLessonPdfFile(null);
      setLessonPdfUploadMessage('تم حفظ ملف PDF وربطه بالمحاضرة.');
    } catch (err) {
      setLessonPdfUploadMessage(err.message || 'تعذر رفع ملف المحاضرة');
    } finally {
      setLessonPdfUploading(false);
    }
  };

  const handleLessonPdfDelete = async (video) => {
    const confirmed = window.confirm(`هل تريد حذف ملف شرح المحاضرة "${video.title}"؟`);
    if (!confirmed) return;

    setLessonPdfDeleting(video.id);
    setLessonPdfUploadVideoId(video.id);
    setLessonPdfUploadMessage('جاري حذف ملف الشرح...');
    try {
      const response = await fetch(`${API_URL}/admin/videos/${video.id}/lesson-pdf`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.message || 'تعذر حذف ملف الشرح');
      setVideos((current) => current.map((item) => item.id === video.id ? { ...item, lessonPdfAvailable: false } : item));
      setLessonPdfFile(null);
      setLessonPdfUploadMessage('تم حذف ملف الشرح.');
    } catch (err) {
      setLessonPdfUploadMessage(err.message || 'تعذر حذف ملف الشرح');
    } finally {
      setLessonPdfDeleting(null);
    }
  };

  const clearLessonPdfUploadSelection = () => {
    setLessonPdfFile(null);
    setLessonPdfUploadVideoId(null);
    setLessonPdfUploadMessage('');
  };

  const closeLessonPdf = () => {
    if (lessonPdfObjectUrlRef.current) URL.revokeObjectURL(lessonPdfObjectUrlRef.current);
    lessonPdfObjectUrlRef.current = null;
    setLessonPdfUrl('');
    setLessonPdfVideoId(null);
  };

  const openLessonPdf = async (video) => {
    if (!video.lessonPdfAvailable || lessonPdfLoading === video.id) return;
    if (lessonPdfVideoId === video.id) {
      closeLessonPdf();
      return;
    }

    setLessonPdfLoading(video.id);
    try {
      const response = await fetch(`${API_URL}/videos/${video.id}/lesson-pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'تعذر فتح ملف المحاضرة');
      }
      const pdfUrl = URL.createObjectURL(await response.blob());
      closeLessonPdf();
      lessonPdfObjectUrlRef.current = pdfUrl;
      setLessonPdfUrl(pdfUrl);
      setLessonPdfVideoId(video.id);
    } catch (err) {
      setError(err.message || 'تعذر فتح ملف المحاضرة');
    } finally {
      setLessonPdfLoading(null);
    }
  };

  const playLessonVideo = async (video) => {
    if (!video.url) return;
    if (playingLessonVideoId === video.id) {
      setPlayingLessonVideoId(null);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/videos/${video.id}/view`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.message || 'تعذر تشغيل شرح المحاضرة');
      setPlayingLessonVideoId(video.id);
    } catch (err) {
      setError(err.message || 'تعذر تشغيل شرح المحاضرة');
    }
  };

  const savePackagePrice = async (packageKey) => {
    const price = Number(packagePriceDrafts[packageKey]);
    if (!Number.isFinite(price) || price < 0) {
      setError('اكتب سعرًا صحيحًا للوحدة');
      return;
    }
    const response = await fetch(`${API_URL}/admin/packages/${encodeURIComponent(packageKey)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ price }),
    });
    const data = await readApiResponse(response);
    if (!response.ok) {
      setError(data.message || 'تعذر حفظ سعر الوحدة');
      return;
    }
    setVideos(data.videos || videos);
    setQuizList((current) => current.map((quiz) => data.quizzes?.find((item) => item.id === quiz.id) || quiz));
    setStudentActionMessage('تم حفظ سعر الوحدة وتطبيقه على محتواها.');
  };

  const handleLocalCoverUpload = (event, setCoverValue) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCoverValue(String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  };

  const startEditVideo = (video) => {
    setEditingVideoId(video.id);
    setEditingVideoTitle(video.title);
    setEditingVideoUrl(video.url || '');
    setEditingVideoCover(video.cover || '');
    setVideoFormError('');
  };

  const cancelEditVideo = () => {
    setEditingVideoId(null);
    setEditingVideoTitle('');
    setEditingVideoUrl('');
    setEditingVideoCover('');
  };

  const saveEditedVideo = async () => {
    const video = videos.find((item) => item.id === editingVideoId);
    if (!video) return;

    const trimmedTitle = editingVideoTitle.trim();
    if (!trimmedTitle) {
      setVideoFormError('اسم المحاضرة لا يمكن أن يكون فارغًا');
      return;
    }
    if (!editingVideoUrl.trim()) {
      setVideoFormError('رابط شرح المحاضرة مطلوب');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admin/videos/${video.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: trimmedTitle, url: editingVideoUrl.trim(), cover: editingVideoCover || video.cover, price: 0 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'تعذر تعديل المحاضرة');
      setVideos(data.videos || defaultVideos);
      setSelectedVideo((current) => (current && current.id === video.id ? data.video : current));
      cancelEditVideo();
      setVideoFormError('');
    } catch (err) {
      setVideoFormError(err.message || 'تعذر تعديل المحاضرة');
    }
  };

  const handleDeleteVideo = async (videoId) => {
    const video = videos.find((item) => item.id === videoId);
    if (!video) return;

    const confirmed = window.confirm(`هل تريد حذف المحاضرة "${video.title}"؟`);
    if (!confirmed) return;

    try {
      const response = await fetch(`${API_URL}/admin/videos/${videoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'تعذر حذف المحاضرة');
      setVideos(data.videos || []);
      setSelectedVideo((current) => (current && current.id === videoId ? (data.videos[0] || null) : current));
      setVideoFormError('');
    } catch (err) {
      setVideoFormError(err.message || 'تعذر حذف المحاضرة');
    }
  };

  if (!token) {
    return (
      <div className="landing-shell">
        <header className="landing-header">
          <div className="brand-block">
            <div className="brand-pill">مهندس محمد عبد الشافي</div>
          </div>

          <nav className="landing-nav">
            <a href="#features">المميزات</a>
            <a href="#levels">المراحل</a>
          </nav>

          <button className="cta-btn" onClick={scrollToLogin}>تسجيل الدخول</button>
        </header>

        <main className="landing-main">
          <section className="hero-section">
            <div className="hero-copy">
              <span className="eyebrow">منصة تعليمية متخصصة</span>
              <h1>منصتك الأولى لتعلم البرمجة والذكاء الاصطناعي في نظام البكالوريا</h1>
              <p>
                برنامج تعليمي مخصص لطلاب الصف الثاني الثانوي، يجمع بين الشرح المبسط والتطبيق العملي
                لتبني أساسًا قويًا في البرمجة والذكاء الاصطناعي وتستعد لامتحاناتك بثقة.
              </p>

              <div className="hero-actions">
                <button className="primary-btn" onClick={scrollToLogin}>اكتشف المنهج</button>
              </div>
            </div>

            <div className="hero-visual" onMouseMove={handleHeroPointerMove} onMouseLeave={resetHeroPointer}>
              <div className="hero-image-card">
                <img src={heroImage} alt="المهندس محمد عبد الشافي مع روبوت تعليمي" />
              </div>
            </div>
          </section>

          <div className="code-gap code-gap-left" aria-hidden="true">
            <span className="code-float code-float-python"><span>PYTHON</span> print("Hello, world!")</span>
          </div>

          <section id="levels" className="section-block" data-reveal>
            <div className="section-heading">
              <span className="eyebrow">المراحل الدراسية</span>
              <h2>ابدأ رحلتك في البرمجة والذكاء الاصطناعي</h2>
            </div>

            <div className="stage-robot-wrap" aria-label="روبوت يرحب بك">
              <svg className="stage-robot" viewBox="0 0 180 220" role="img" aria-label="روبوت ثلاثي الأبعاد يلوح بيده">
                <defs>
                  <linearGradient id="robot-shell" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#ffffff" />
                    <stop offset="0.48" stopColor="#dce8f4" />
                    <stop offset="1" stopColor="#9fb3c8" />
                  </linearGradient>
                  <linearGradient id="robot-side" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#8298ad" />
                    <stop offset="1" stopColor="#d8e5f0" />
                  </linearGradient>
                  <linearGradient id="robot-face" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#173650" />
                    <stop offset="1" stopColor="#071c2b" />
                  </linearGradient>
                  <linearGradient id="robot-accent" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#54e2d2" />
                    <stop offset="1" stopColor="#168a89" />
                  </linearGradient>
                  <filter id="robot-shadow" x="-40%" y="-30%" width="180%" height="180%">
                    <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#183b5b" floodOpacity="0.2" />
                  </filter>
                </defs>
                <ellipse cx="91" cy="207" rx="43" ry="7" fill="#183b5b" opacity="0.13" />
                <g filter="url(#robot-shadow)">
                  <path d="M71 159 67 190q-1 9 8 10l8 1 8-30m18-12 5 29q1 9 10 8l8-2 1-8-8-31" fill="url(#robot-side)" stroke="#8197aa" strokeWidth="2" />
                  <path d="m72 190 17 1-2 10q-1 5-7 5H65q-5 0-4-5l2-7q1-4 9-4Zm38 0 17-2 6 9q3 5-3 8l-15 3q-6 1-7-5Z" fill="url(#robot-shell)" stroke="#8197aa" strokeWidth="2" />
                  <path d="m73 101-17 9-10 22q-3 7 4 11l5 2 6-7-3-4 10-15 12-5" fill="url(#robot-shell)" stroke="#8da2b6" strokeWidth="3" strokeLinejoin="round" />
                  <path d="m77 95-17 9 10 20 18-7" fill="url(#robot-accent)" opacity="0.92" />
                  <path d="M67 119q-4 0-6 5l-4 9q-2 5 3 8l6 2 7-13-2-8q-1-3-4-3Z" fill="url(#robot-side)" stroke="#8197aa" strokeWidth="2" />
                  <path d="M69 88q0-8 9-10l13-3 16 2 13 5q7 3 6 11l-5 56q-1 9-10 10l-32-1q-9-1-10-10Z" fill="url(#robot-shell)" stroke="#8197aa" strokeWidth="2.5" />
                  <path d="m82 91 17-4 17 5-3 8-17-4-14 4Z" fill="url(#robot-accent)" />
                  <rect x="82" y="112" width="27" height="22" rx="6" fill="#183b5b" opacity="0.9" />
                  <circle cx="90" cy="123" r="3" fill="#55e0d2" />
                  <path d="M99 120h6m-6 6h6" stroke="#d6f8f3" strokeWidth="2" strokeLinecap="round" />
                  <path d="M88 77v-8m0 0q0-7 7-7t7 7" fill="none" stroke="#8298ad" strokeWidth="4" strokeLinecap="round" />
                  <circle cx="102" cy="68" r="5" fill="#f1bd61" stroke="#fff0c5" strokeWidth="2" />
                  <rect x="59" y="26" width="70" height="55" rx="19" fill="url(#robot-side)" stroke="#8298ad" strokeWidth="2.5" />
                  <rect x="63" y="29" width="63" height="48" rx="16" fill="url(#robot-face)" />
                  <path d="M70 35q19-9 43-1" fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="3" strokeLinecap="round" />
                  <ellipse cx="81" cy="52" rx="4" ry="5" fill="#76f5e5" />
                  <ellipse cx="108" cy="52" rx="4" ry="5" fill="#76f5e5" />
                  <path d="M87 66q7 5 15 0" fill="none" stroke="#9aece1" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="58" cy="56" r="4" fill="url(#robot-accent)" />
                  <circle cx="130" cy="56" r="4" fill="url(#robot-accent)" />
                  <g className="robot-wave-arm">
                    <path d="m123 102 15-16 5-21" fill="none" stroke="#71899f" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="m123 100 15-16 5-19" fill="none" stroke="url(#robot-shell)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="123" cy="101" r="8" fill="url(#robot-accent)" stroke="#f4ffff" strokeWidth="2" />
                    <path d="M143 66q-4-2-5-7l-1-11q0-4 3-4 3 0 4 4l3 8 1-16q0-5 4-5t4 5l1 15 4-12q1-4 4-3 4 1 2 5l-3 13 5-8q2-3 5-1 3 2 1 5l-5 13q-4 10-13 12l-7 2q-10 2-14-8l-3-8q-2-6 4-8Z" fill="url(#robot-shell)" stroke="#8197aa" strokeWidth="2" strokeLinejoin="round" />
                    <path d="m148 53 1-7m9 8 2-7m7 9 2-5m-22 14q6 4 14 1m-15 5q5 7 13 6" fill="none" stroke="#8da2b6" strokeWidth="1.5" strokeLinecap="round" />
                  </g>
                </g>
              </svg>
            </div>

            <div className="stage-grid">
              {publicStages.map((stage) => (
                <article key={stage.id} className="stage-card" data-reveal>
                  <div className="stage-image" style={{ backgroundImage: `url('${stage.image}')` }}>
                    <button type="button" className="stage-button" onClick={scrollToLogin}>
                      استكشف المحتوى
                    </button>
                  </div>
                  <div className="stage-content">
                    <h3>{stage.title}</h3>
                    <p>{stage.subtitle}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="code-gap code-gap-right" aria-hidden="true">
            <span className="code-float code-float-js"><span>JAVASCRIPT</span> const future = "yours";</span>
          </div>

          <section id="features" className="section-block" data-reveal>
            <div className="section-heading">
              <span className="eyebrow">مميزات المنصة</span>
              <h2>تعلم المهارات التي تحتاجها في دراسة البكالوريا وسوق المستقبل</h2>
            </div>

            <div className="feature-grid">
              {featureItems.map((item, index) => (
                <article key={item.title} className="feature-card" data-reveal>
                  <div className="terminal-window">
                    <div className="terminal-titlebar" dir="ltr">
                      <span className="terminal-lights" aria-hidden="true"><i /><i /><i /></span>
                      <span className="terminal-window-title">student@shefo: ~/features</span>
                      <span className="terminal-window-menu">bash</span>
                    </div>
                    <div className="terminal-body">
                      <div className="terminal-command" dir="ltr">
                        <span className="terminal-prompt">student@shefo:~$</span>
                        <code>{item.command}</code>
                      </div>
                      <p className="terminal-comment" dir="rtl"><span aria-hidden="true">#</span>{item.text}</p>
                      <div className="terminal-output" dir="rtl">
                        <span className="terminal-output-label">النتيجة</span>
                        <strong>{item.title}</strong>
                      </div>
                    </div>
                    <div className="terminal-statusbar" dir="ltr">
                      <span><i aria-hidden="true" /> system ready</span>
                      <span>bash 5.2</span>
                      <span className="terminal-index">{String(index + 1).padStart(2, '0')}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="code-gap code-gap-left" aria-hidden="true">
            <span className="code-float code-float-sql"><span>SQL</span> SELECT * FROM ideas;</span>
          </div>

          <section className="section-block community-block" data-reveal>
            <div className="section-heading">
              <span className="eyebrow">المجتمع</span>
              <h2>انضم إلى محادثات رائعة وتفاعل مع زملائك</h2>
            </div>

            <div className="community-box">
              <div>
                <p>
                  تواصل مع الطلاب في غرف الدردشة، شارك الأسئلة، وتبادل المعرفة ضمن مجتمع داعم ومحفز.
                </p>
                <button type="button" className="primary-btn" onClick={scrollToLogin}>دخول الشات</button>
              </div>
            </div>
          </section>

          <div className="code-gap code-gap-right" aria-hidden="true">
            <span className="code-float code-float-html"><span>HTML</span> &lt;build&gt;your future&lt;/build&gt;</span>
          </div>

          <section id="about" className="section-block about-block" data-reveal>
            <div className="section-heading">
              <span className="eyebrow">عن المنصة</span>
              <h2>تعليم البرمجة والذكاء الاصطناعي </h2>
            </div>

            <div className="about-box">
              <p>
                منصة تعليمية تساعد طالب الصف الثاني الثانوي بنظام البكالوريا على فهم البرمجة والذكاء الاصطناعي
                من خلال محاضرات تفاعلية، تطبيقات عملية واختبارات دورية باللغة العربية.
                ملفات شرح المحاضرات والاختبارات متاحة بعد تسجيل الدخول.
              </p>
            </div>
          </section>

          <div className="code-gap code-gap-left" aria-hidden="true">
            <span className="code-float code-float-loop"><span>JS</span> while (learning) { 'grow()' }</span>
          </div>

          <section id="contact" className="section-block contact-block" data-reveal>
            <div className="section-heading">
              <span className="eyebrow">تواصل معانا</span>
              <h2>تابعنا على منصات التواصل</h2>
            </div>
            <div className="contact-links">
              <a className="contact-link facebook-link" href="https://www.facebook.com/profile.php?id=61594436055477" target="_blank" rel="noreferrer">
                <span className="contact-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M13.6 21v-8h2.7l.4-3.1h-3.1V8c0-.9.3-1.6 1.6-1.6h1.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.4V13h2.8v8h3.4z" /></svg></span>
                <span>فيسبوك</span>
              </a>
              <a className="contact-link tiktok-link" href="https://www.tiktok.com/@eng_mohamedabdelshafy" target="_blank" rel="noreferrer">
                <span className="contact-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M19.6 7.1a7.5 7.5 0 0 1-4.5-1.5v7.2a6.1 6.1 0 1 1-5.1-6v3.7a2.5 2.5 0 1 0 1.6 2.3V2h3.6a4.6 4.6 0 0 0 4.4 4.4v.7z" /></svg></span>
                <span>تيك توك</span>
              </a>
              <a className="contact-link youtube-link" href="https://www.youtube.com/@eng-mohamed-abdelshafy" target="_blank" rel="noreferrer">
                <span className="contact-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.6 3.6 12 3.6 12 3.6s-7.6 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.8.5 9.4.5 9.4.5s7.6 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" /></svg></span>
                <span>يوتيوب</span>
              </a>
              <a className="contact-link whatsapp-link" href="https://wa.me/201112004658" target="_blank" rel="noreferrer">
                <span className="contact-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12.04 2a9.86 9.86 0 0 0-8.45 14.94L2.3 21.7l4.88-1.28A9.86 9.86 0 1 0 12.04 2Zm0 17.92a8.03 8.03 0 0 1-4.1-1.13l-.3-.18-2.9.76.77-2.83-.2-.31a8.04 8.04 0 1 1 6.73 3.69Zm4.42-6.02c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.19-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.47-.39-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.31.98 2.47c.12.16 1.69 2.58 4.09 3.62.57.25 1.02.39 1.37.5.58.18 1.1.15 1.51.09.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" /></svg></span>
                <span>واتساب</span>
              </a>
            </div>
          </section>

          {loginOpen && <div className="login-modal-backdrop" onClick={() => setLoginOpen(false)}>
            <div className="auth-card public-login-box login-modal" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="modal-close" onClick={() => setLoginOpen(false)}>×</button>
              <h3>{registerMode ? 'إنشاء حساب طالب' : 'تسجيل الدخول'}</h3>
            <form onSubmit={handleLogin} className="auth-form">
              {registerMode && (
                <>
                  <label>
                    الاسم بالكامل
                    <input type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
                  </label>
                  <label>
                    رقم الطالب
                    <input type="text" value={studentNumber} onChange={(event) => setStudentNumber(event.target.value)} required />
                  </label>
                  <label>
                    رقم هاتف الطالب
                    <input type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="010xxxxxxxx" value={studentPhone} onChange={(event) => setStudentPhone(event.target.value)} required />
                  </label>
                  <label>
                    رقم ولي الأمر
                    <input type="tel" value={guardianPhone} onChange={(event) => setGuardianPhone(event.target.value)} required />
                  </label>
                  <label>
                    المحافظة
                    <select value={registrationGovernorate} onChange={(event) => setRegistrationGovernorate(event.target.value)} required>
                      <option value="">اختر المحافظة</option>
                      {governorateOptions.map((governorate) => <option key={governorate} value={governorate}>{governorate}</option>)}
                    </select>
                  </label>
                  <label>
                    الصف الدراسي
                    <select value={registrationGrade} onChange={(event) => setRegistrationGrade(event.target.value)} required>
                      {gradeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                </>
              )}
              <label>
                {registerMode ? 'البريد الإلكتروني (اختياري)' : 'رقم الهاتف'}
                <input
                  type={registerMode ? 'email' : 'tel'}
                  inputMode={registerMode ? 'email' : 'tel'}
                  autoComplete={registerMode ? 'email' : 'tel'}
                  dir="ltr"
                  placeholder={registerMode ? '' : '010xxxxxxxx'}
                  value={registerMode ? email : loginPhone}
                  onChange={(event) => (registerMode ? setEmail(event.target.value) : setLoginPhone(event.target.value))}
                  required={!registerMode}
                />
              </label>

              <label>
                كلمة المرور
                <span className="password-field">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </span>
              </label>

              {error && <div className="error-box">{error}</div>}

              <button type="submit" disabled={loading}>
                {loading ? 'جاري التنفيذ...' : registerMode ? 'إنشاء الحساب' : 'دخول المستخدم'}
              </button>
              <button type="button" className="secondary-btn auth-switch" onClick={() => { setRegisterMode((current) => !current); setError(''); }}>
                {registerMode ? 'لديك حساب؟ تسجيل الدخول' : 'إنشاء حساب طالب جديد'}
              </button>
            </form>
            </div>
          </div>}
          <CreditFooter />
        </main>
      </div>
    );
  }

  if (authLoading || !user) {
    return (
      <div className="auth-loading-screen">
        <div className="loading-card">جاري استعادة الجلسة...</div>
        <CreditFooter />
      </div>
    );
  }

  if (user?.role === 'student') {
    const packageDefinitions = user.grade === 'first-secondary'
      ? firstSecondaryUnits.map((unit) => ({ grade: user.grade, term: unit.id, unitId: 1, packagePrice: 0 }))
      : secondSecondaryUnits.map((unit) => ({ grade: user.grade || 'second-secondary', term: '', unitId: unit.id, packagePrice: 0 }));
    const studentPackages = packageDefinitions.reduce((packages, definition) => {
      const key = `${definition.grade}:${definition.term || 'all'}:${definition.unitId}`;
      packages[key] = { packageKey: key, grade: definition.grade, term: definition.term, unitId: definition.unitId, packagePrice: definition.packagePrice, videos: [], quizzes: [], purchased: false };
      return packages;
    }, {});

    [...videos.map((video) => ({ ...video, contentType: 'video' })), ...(dashboard?.quizzes || []).map((quiz) => ({ ...quiz, contentType: 'quiz' }))].reduce((packages, item) => {
      const key = item.packageKey || `${item.grade || user.grade}:${item.term || user.term || 'all'}:${item.unitId || 1}`;
      if (!packages[key]) packages[key] = { packageKey: key, grade: item.grade || user.grade, term: item.term || user.term || '', unitId: item.unitId || 1, packagePrice: item.packagePrice || 0, videos: [], quizzes: [], purchased: Boolean(item.purchased || item.packagePurchased) };
      packages[key][item.contentType === 'video' ? 'videos' : 'quizzes'].push(item);
      packages[key].purchased = packages[key].purchased || Boolean(item.purchased || item.packagePurchased);
      packages[key].packagePrice = packages[key].packagePrice || Number(item.packagePrice || 0);
      return packages;
    }, studentPackages);

    const orderedStudentPackages = Object.values(studentPackages).sort((left, right) => {
      if (left.grade !== right.grade) return left.grade === 'first-secondary' ? -1 : 1;
      if (left.grade === 'first-secondary') return left.term === 'first-term' ? -1 : right.term === 'first-term' ? 1 : 0;
      return Number(left.unitId) - Number(right.unitId);
    });
    const unitsWithContent = orderedStudentPackages.filter((contentPackage) => contentPackage.videos.length || contentPackage.quizzes.length);
    const totalStudentLessons = orderedStudentPackages.reduce((total, contentPackage) => total + contentPackage.videos.length, 0);
    const totalStudentQuizzes = orderedStudentPackages.reduce((total, contentPackage) => total + contentPackage.quizzes.length, 0);

    if (selectedQuiz) {
      return (
        <div className="quiz-page-shell">
          <header className="quiz-page-header">
            <button type="button" className="secondary-btn" onClick={() => setSelectedQuiz(null)}>العودة للمنصة</button>
            <div>
              <span className="eyebrow">اختبار تفاعلي</span>
              <h1>{selectedQuiz.title}</h1>
              <p>{selectedQuiz.description}</p>
            </div>
          </header>
          <main className="quiz-page-content">
            <form onSubmit={submitQuiz} className="quiz-full-form">
              {selectedQuiz.questions.map((question, index) => {
                const correction = quizCorrections.find((item) => item.questionId === question.id);
                return (
                  <fieldset key={question.id} className={`quiz-full-question ${correction ? correction.isCorrect ? 'answer-correct' : 'answer-wrong' : ''}`}>
                    <legend>{index + 1}. {question.text}</legend>
                    <div className="quiz-full-options">
                      {question.options.map((option, optionIndex) => (
                        <label key={`${question.id}-${optionIndex}`} className={correction && correction.correctOption === optionIndex ? 'correct-option' : ''}>
                          <input type="radio" name={`question-${question.id}`} checked={Number(quizAnswers[index]) === optionIndex} onChange={() => setQuizAnswers((current) => { const next = [...current]; next[index] = optionIndex; return next; })} disabled={Boolean(quizResult)} required />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                    {correction && <div className={correction.isCorrect ? 'answer-feedback correct-feedback' : 'answer-feedback wrong-feedback'}>
                      {correction.isCorrect ? 'إجابة صحيحة' : `إجابة غير صحيحة. الإجابة الصحيحة: ${correction.correctAnswer}`}
                    </div>}
                  </fieldset>
                );
              })}
              {!quizResult ? <button type="submit" className="primary-btn quiz-finish-btn">إنهاء الاختبار وتصحيح الإجابات</button> : <div className="quiz-final-result">نتيجتك: {quizResult.score} من {quizResult.total} ({Math.round((quizResult.score / quizResult.total) * 100)}%)</div>}
            </form>
          </main>
          <CreditFooter />
        </div>
      );
    }

    const selectedPackage = Object.values(studentPackages).find((contentPackage) => contentPackage.packageKey === selectedPackageKey);
    const selectedLesson = selectedPackage?.videos.find((video) => String(video.id) === String(selectedLessonVideoId));
    if (selectedPackage && selectedLesson) {
      const lessonIndex = selectedPackage.videos.findIndex((video) => String(video.id) === String(selectedLesson.id));
      const lessonQuizzes = selectedPackage.quizzes.filter((quiz) => String(quiz.lessonId || '') === String(selectedLesson.id));
      const unitTitle = selectedPackage.grade === 'first-secondary'
        ? selectedPackage.term === 'first-term' ? 'أولى ثانوي - الترم الأول' : 'أولى ثانوي - الترم الثاني'
        : `تانية ثانوي - الوحدة ${selectedPackage.unitId}`;

      return (
        <div className="student-shell lesson-detail-shell">
          <header className="student-header unit-detail-header">
            <div className="unit-detail-toolbar">
              <button type="button" className="secondary-btn unit-back-button" onClick={() => { setSelectedLessonVideoId(null); setPlayingLessonVideoId(null); closeLessonPdf(); }}>
                <span aria-hidden="true">→</span> العودة للوحدة
              </button>
              <button onClick={handleLogout} className="logout-btn">تسجيل الخروج</button>
            </div>
            <div className="unit-detail-heading">
              <span className="eyebrow">{unitTitle} • المحاضرة {lessonIndex + 1}</span>
              <h1>{selectedLesson.title}</h1>
              <p>ملف شرح المحاضرة واختباراتها والشرح المرئي.</p>
            </div>
          </header>

          <main className="unit-detail-main lesson-detail-main">
            {selectedLesson.lessonPdfAvailable && <section className="unit-lesson-resource">
              <div className="unit-resource-heading">
                <div><span className="unit-resource-type">ملف شرح المحاضرة</span><h4>{selectedLesson.title}</h4></div>
                <button type="button" className="secondary-btn" onClick={() => openLessonPdf(selectedLesson)} disabled={lessonPdfLoading === selectedLesson.id}>
                  {lessonPdfLoading === selectedLesson.id ? 'جاري فتح الملف...' : lessonPdfVideoId === selectedLesson.id ? 'إغلاق الملف' : 'عرض ملف PDF'}
                </button>
              </div>
              {lessonPdfVideoId === selectedLesson.id && lessonPdfUrl && <iframe className="lesson-pdf-frame" src={`${lessonPdfUrl}#toolbar=0`} title={`ملف PDF: ${selectedLesson.title}`} />}
            </section>}

            {selectedLesson.url && <section className="unit-lesson-resource">
              <div className="unit-resource-heading">
                <div><span className="unit-resource-type">شرح مرئي للمحاضرة</span><h4>{selectedLesson.title}</h4></div>
              </div>
              {playingLessonVideoId === selectedLesson.id ? (
                <>
                  <div className="lesson-video-frame-wrap">
                    <iframe
                      className="lesson-video-frame"
                      src={selectedLesson.url}
                      title={`شرح المحاضرة: ${selectedLesson.title}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                    <div className="video-watermark" aria-hidden="true">{user.email} • {user.name}</div>
                  </div>
                  <button type="button" className="secondary-btn lesson-video-stop" onClick={() => playLessonVideo(selectedLesson)}>إيقاف الشرح</button>
                </>
              ) : (
                <button type="button" className="lesson-video-cover" onClick={() => playLessonVideo(selectedLesson)} aria-label={`تشغيل شرح المحاضرة: ${selectedLesson.title}`}>
                  <img src={selectedLesson.cover} alt="" />
                  <span className="lesson-video-cover-play" aria-hidden="true">▶</span>
                  <span className="lesson-video-cover-caption">اضغط لتشغيل الشرح</span>
                </button>
              )}
            </section>}

            {lessonQuizzes.length > 0 && <section className="unit-quizzes-section">
              <div className="section-heading">
                <span className="eyebrow">تقييم الفهم</span>
                <h2>اختبارات المحاضرة</h2>
              </div>
              <div className="unit-quiz-list">
                {lessonQuizzes.map((quiz, index) => (
                  <article className="unit-quiz-card" key={quiz.id}>
                    <span className="unit-quiz-number">{String(index + 1).padStart(2, '0')}</span>
                    <div><h3>{quiz.title}</h3><p>{quiz.questionCount || quiz.questions?.length || 0} سؤال</p></div>
                    <button type="button" className="primary-btn" onClick={() => quiz.purchased && startQuiz(quiz.id)} disabled={!quiz.purchased || loading}>
                      {quiz.purchased ? 'ابدأ الاختبار' : 'مغلق'}
                    </button>
                  </article>
                ))}
              </div>
            </section>}
          </main>
          <CreditFooter />
        </div>
      );
    }

    if (selectedPackage) {
      const packageItems = [...selectedPackage.videos, ...selectedPackage.quizzes];
      const unitQuizzes = selectedPackage.quizzes.filter((quiz) => !quiz.lessonId);
      const packageUnlocked = packageItems.length > 0 && packageItems.every((item) => item.purchased || item.locked === false);
      const unitTitle = selectedPackage.grade === 'first-secondary'
        ? selectedPackage.term === 'first-term' ? 'أولى ثانوي - الترم الأول' : 'أولى ثانوي - الترم الثاني'
        : `تانية ثانوي - الوحدة ${selectedPackage.unitId}`;

      return (
        <div className="student-shell unit-detail-shell">
          <header className="student-header unit-detail-header">
            <div className="unit-detail-toolbar">
              <button type="button" className="secondary-btn unit-back-button" onClick={() => { setSelectedPackageKey(null); setSelectedLessonVideoId(null); setPlayingLessonVideoId(null); closeLessonPdf(); }}>
                <span aria-hidden="true">→</span> العودة للوحدات
              </button>
              <button onClick={handleLogout} className="logout-btn">تسجيل الخروج</button>
            </div>
            <div className="unit-detail-heading">
              <span className="eyebrow">محتوى الوحدة</span>
              <h1>{unitTitle}</h1>
              <p>{selectedPackage.videos.length} محاضرة و{selectedPackage.quizzes.length} اختبار</p>
            </div>
          </header>

          <main className="unit-detail-main">
            {!packageUnlocked && packageItems.length > 0 && <section className="unit-locked-banner">
              <div>
                <span className="eyebrow">محتوى الوحدة مقفول</span>
                <h2>افتح الوحدة لمشاهدة المحاضرات وملفات شرحها واختباراتها</h2>
              </div>
              <button type="button" className="pay-btn" onClick={() => purchasePackage(selectedPackage)} disabled={videoPurchaseLoading === selectedPackage.packageKey}>
                {videoPurchaseLoading === selectedPackage.packageKey ? 'جاري الشراء...' : <>شراء الوحدة - <CurrencyAmount amount={selectedPackage.packagePrice} /></>}
              </button>
            </section>}

            {packageUnlocked && <>
              {selectedPackage.videos.length > 0 && <section className="unit-lessons-section">
                <div className="section-heading">
                  <span className="eyebrow">محاضرات الوحدة</span>
                  <h2>المحاضرات</h2>
                </div>
                <div className="unit-lesson-list">
                  {selectedPackage.videos.map((video, index) => (
                    <article className="unit-lesson-card" key={video.id}>
                      <button type="button" className="unit-lesson-link" onClick={() => { setSelectedLessonVideoId(video.id); setPlayingLessonVideoId(null); closeLessonPdf(); }}>
                        <span className="unit-lesson-thumbnail">
                          {video.cover ? <img src={video.cover} alt="" /> : <span className="unit-lesson-thumbnail-placeholder" aria-hidden="true">▶</span>}
                          <span className="unit-lesson-thumbnail-shade" aria-hidden="true" />
                          <span className="unit-lesson-thumbnail-number">محاضرة {String(index + 1).padStart(2, '0')}</span>
                          <span className="unit-lesson-thumbnail-play" aria-hidden="true">▶</span>
                        </span>
                        <span className="unit-lesson-link-copy">
                          <span className="eyebrow">المحاضرة {index + 1}</span>
                          <strong>{video.title}</strong>
                          <span className="unit-lesson-resources">
                            {video.lessonPdfAvailable && <span>PDF شرح</span>}
                            {video.url && <span>شرح مرئي</span>}
                            {selectedPackage.quizzes.some((quiz) => String(quiz.lessonId || '') === String(video.id)) && <span>اختبار</span>}
                          </span>
                        </span>
                        <span className="unit-lesson-open-label">فتح المحاضرة <span aria-hidden="true">←</span></span>
                      </button>
                    </article>
                  ))}
                </div>
              </section>}

              {unitQuizzes.length > 0 && <section className="unit-quizzes-section">
                <div className="section-heading">
                  <span className="eyebrow">تقييم الفهم</span>
                  <h2>اختبارات الوحدة</h2>
                </div>
                <div className="unit-quiz-list">
                  {unitQuizzes.map((quiz, index) => (
                    <article className="unit-quiz-card" key={quiz.id}>
                      <span className="unit-quiz-number">{String(index + 1).padStart(2, '0')}</span>
                      <div><h3>{quiz.title}</h3><p>{quiz.questionCount || quiz.questions?.length || 0} سؤال</p></div>
                      <button type="button" className="primary-btn" onClick={() => quiz.purchased && startQuiz(quiz.id)} disabled={!quiz.purchased || loading}>
                        {quiz.purchased ? 'ابدأ الاختبار' : 'مغلق'}
                      </button>
                    </article>
                  ))}
                </div>
              </section>}
            </>}
          </main>
          <CreditFooter />
        </div>
      );
    }

    return (
      <div className="student-shell student-home-shell">
        {/* Robot assistant (purely visual, non-interrupting) */}
        <RobotAssistant />
        <header className="student-header student-dashboard-header">
          <div className="student-header-title">
            <p className="eyebrow">مساحة التعلم</p>
            <h2>مرحباً، {user.name}</h2>
            <p>{user.grade === 'first-secondary' ? 'الصف الأول الثانوي' : 'الصف الثاني الثانوي'} • نظام البكالوريا</p>
          </div>
          <div className="student-actions">
            <button type="button" className="secondary-btn profile-btn" onClick={openProfile}>
              ملفي الشخصي
            </button>
            <button onClick={handleLogout} className="logout-btn">
              تسجيل الخروج
            </button>
          </div>
        </header>

        <section className="student-overview" aria-label="ملخص المحتوى الدراسي">
          <div className="student-overview-copy">
            <span className="eyebrow">محتواك الدراسي</span>
            <h2>ابدأ من وحدتك</h2>
            <p>المحاضرات وملفاتها واختباراتها مرتبة داخل كل وحدة.</p>
          </div>
          <div className="student-overview-stats">
            <div><strong>{unitsWithContent.length}</strong><span>وحدة متاحة</span></div>
            <div><strong>{totalStudentLessons}</strong><span>محاضرة</span></div>
            <div><strong>{totalStudentQuizzes}</strong><span>اختبار</span></div>
          </div>
        </section>

        {profileOpen && <div className="profile-modal-backdrop" onClick={() => setProfileOpen(false)}>
          <section className="profile-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setProfileOpen(false)}>×</button>
            <div className="profile-modal-heading">
              <span className="eyebrow">حساب الطالب</span>
              <h2>ملفي الشخصي</h2>
              <p>عدّل بياناتك وصورتك الشخصية ثم احفظ التغييرات.</p>
            </div>
            <form className="profile-form" onSubmit={saveProfile}>
              <div className="profile-avatar-preview">
                {profileAvatar ? <img src={profileAvatar} alt="الصورة الشخصية" /> : <span>{profileName.charAt(0) || 'ط'}</span>}
              </div>
              <label className="management-field">
                الصورة الشخصية
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleProfileImageUpload} />
              </label>
              <label className="management-field">
                الاسم بالكامل
                <input value={profileName} onChange={(event) => setProfileName(event.target.value)} required />
              </label>
              <label className="management-field">
                البريد الإلكتروني
                <input value={user.email} disabled />
              </label>
              <label className="management-field">
                رقم الطالب
                <input value={user.studentNumber || 'مسجل بالحساب'} disabled />
              </label>
              <label className="management-field">
                رقم الهاتف
                <input type="tel" value={profilePhone} onChange={(event) => setProfilePhone(event.target.value)} placeholder="رقم هاتفك" />
              </label>
              <label className="management-field">
                رقم ولي الأمر
                <input type="tel" value={profileGuardianPhone} onChange={(event) => setProfileGuardianPhone(event.target.value)} placeholder="رقم ولي الأمر" />
              </label>
              {profileMessage && <div className="message">{profileMessage}</div>}
              <button type="submit" className="primary-btn">حفظ الملف الشخصي</button>
            </form>
          </section>
        </div>}

        <div className="student-wallet">
          <div className="student-wallet-info">
            <span className="eyebrow">رصيد المحفظة</span>
            <h3><CurrencyAmount amount={dashboard?.balance ?? 0} /></h3>
            <p>{dashboard?.balance > 0 ? 'لديك رصيد يمكنك استخدامه لشراء المحاضرات والاختبارات' : 'اشحن رصيدك لشراء المحاضرات والاختبارات'}</p>
          </div>

          <button onClick={openPaymentPage} className="pay-btn" disabled={loading}>
            {loading ? 'جاري التحميل...' : 'شحن الرصيد'}
          </button>
        </div>

        {paymentOpen && <div className="payment-modal-backdrop" onClick={() => setPaymentOpen(false)}>
          <section className="payment-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setPaymentOpen(false)}>×</button>
            <span className="eyebrow">شحن رصيد الطالب</span>
            <h2>الدفع عبر Vodafone Cash</h2>
            <div className="payment-account-summary"><strong>{user?.name}</strong><span>{user?.email}</span><span>رقم الطالب: {user?.studentNumber || 'مسجل بالحساب'}</span></div>
            <div className="vodafone-number"><span>حوّل إلى الرقم</span><strong>{paymentSettings?.vodafoneCashNumber}</strong></div>
            <p className="payment-instructions">{paymentSettings?.instructions}</p>
            <form className="recharge-form" onSubmit={submitRechargeRequest}>
              <label className="management-field">المبلغ بالجنيه المصري<input type="number" min={paymentSettings?.minimumAmount || 10} value={rechargeAmount} onChange={(event) => setRechargeAmount(event.target.value)} placeholder="مثال: 100" required /></label>
              <label className="management-field">رقم الهاتف المحوّل منه<input type="tel" value={senderPhone} onChange={(event) => setSenderPhone(event.target.value)} placeholder="اختياري" /></label>
              <label className="management-field">ملاحظات<input value={rechargeNotes} onChange={(event) => setRechargeNotes(event.target.value)} placeholder="اختياري" /></label>
              {rechargeMessage && <div className="message">{rechargeMessage}</div>}
              <button type="submit" className="primary-btn">إرسال طلب الشحن</button>
            </form>
            <div className="recharge-history"><h3>طلبات الشحن السابقة</h3>{rechargeRequests.map((request) => <div key={request.id}><strong>مبلغ التحويل: <CurrencyAmount amount={request.amount} /></strong><span>{request.status === 'Pending' ? 'قيد المراجعة' : request.status === 'Approved' ? 'تم الاعتماد' : 'مرفوض'}</span></div>)}{!rechargeRequests.length && <p>لا توجد طلبات سابقة.</p>}</div>
          </section>
        </div>}

        {error && <div className="error-box">{error}</div>}

        {unitsWithContent.length > 0 && <section className="student-packages">
          <div className="student-units-heading">
            <div className="section-heading">
              <span className="eyebrow">خريطة المنهج</span>
              <h2>وحداتك الدراسية</h2>
            </div>
            <span className="student-unit-count">{unitsWithContent.length} وحدات</span>
          </div>
          <div className="package-grid">
            {unitsWithContent.map((contentPackage) => {
              const packageCover = contentPackage.videos[0]?.cover;
              return <article key={contentPackage.packageKey} className="package-card">
                <span className="package-price">{contentPackage.packagePrice > 0 ? <CurrencyAmount amount={contentPackage.packagePrice} /> : 'السعر قريبًا'}</span>
                <button
                  type="button"
                  className="package-summary"
                  onClick={() => setSelectedPackageKey(contentPackage.packageKey)}
                >
                  <span className="package-summary-cover" style={packageCover ? { backgroundImage: `linear-gradient(0deg, rgba(8, 18, 29, 0.34), rgba(8, 18, 29, 0.08)), url('${packageCover}')` } : undefined}>
                    <span className="package-summary-play" aria-hidden="true">▶</span>
                  </span>
                  <span className="package-summary-info">
                    <span className="package-summary-title">
                      <span className="eyebrow">{contentPackage.grade === 'first-secondary' ? contentPackage.term === 'first-term' ? 'الصف الأول الثانوي • الترم الأول' : 'الصف الأول الثانوي • الترم الثاني' : `الصف الثاني الثانوي • الوحدة ${contentPackage.unitId}`}</span>
                      <strong>{contentPackage.videos[0]?.title || 'محتوى الوحدة'}</strong>
                    </span>
                    <span className="package-summary-footer">
                      <span className="package-summary-count">{contentPackage.videos.length} محاضرة • {contentPackage.quizzes.length} اختبار</span>
                      <span className="package-open-label">فتح الوحدة <span aria-hidden="true">←</span></span>
                    </span>
                  </span>
                </button>
              </article>;
            })}
          </div>
        </section>}

        <section className="chat-launcher student-chat-launcher">
          <div>
            <span className="eyebrow">مجتمع الطلاب</span>
            <h3>اسأل، ناقش، وتعلم مع زملائك</h3>
            <p>الشات متاح للطلاب المسجلين فقط وتحت إشراف المدرس.</p>
          </div>
          <button type="button" className="primary-btn" onClick={openChat}>دخول الشات</button>
        </section>

        {chatOpen && <div className="chat-modal-backdrop" onClick={() => setChatOpen(false)}>
          <section className="chat-modal" onClick={(event) => event.stopPropagation()}>
            <div className="chat-modal-header">
              <div>
                <span className="eyebrow">شات المنصة</span>
                <h3>مجتمع البرمجة والذكاء الاصطناعي</h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setChatOpen(false)}>×</button>
            </div>
            <div className="chat-messages">
              {chatMessages.map((message) => (
                <article key={message.id} className={`chat-message ${message.pinned ? 'pinned' : ''}`}>
                  <div className="chat-message-meta"><strong>{message.userName}</strong><span>{message.role === 'admin' ? 'المدرس' : 'طالب'} {message.pinned ? ' • مثبتة' : ''}</span></div>
                  <p>{message.text}</p>
                </article>
              ))}
              {!chatMessages.length && <div className="chat-empty-state">لا توجد رسائل بعد. ابدأ أول نقاش.</div>}
            </div>
            <form className="chat-form" onSubmit={sendChatMessage}>
              <input value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder="اكتب رسالتك..." maxLength={500} />
              <button type="submit" className="primary-btn">إرسال</button>
            </form>
          </section>
        </div>}

        {selectedQuiz && <div className="quiz-modal-backdrop" onClick={() => setSelectedQuiz(null)}>
          <section className="quiz-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setSelectedQuiz(null)}>×</button>
            <span className="eyebrow">اختبار تفاعلي</span>
            <h2>{selectedQuiz.title}</h2>
            <form onSubmit={submitQuiz} className="quiz-form">
              {selectedQuiz.questions.map((question, index) => <fieldset key={question.id}>
                <legend>{index + 1}. {question.text}</legend>
                {question.options.map((option, optionIndex) => <label key={option} className="quiz-option"><input type="radio" name={`question-${question.id}`} checked={Number(quizAnswers[index]) === optionIndex} onChange={() => setQuizAnswers((current) => { const next = [...current]; next[index] = optionIndex; return next; })} required /> {option}</label>)}
              </fieldset>)}
              <button type="submit" className="primary-btn">إنهاء وتصحيح الاختبار</button>
              {quizResult && <div className="quiz-result">درجتك: {quizResult.score} من {quizResult.total}</div>}
            </form>
          </section>
        </div>}
        <CreditFooter />
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="logo">مهندس محمد عبد الشافي</div>
        <nav>
          <button type="button" className={`nav-item ${adminSection === 'overview' ? 'active' : ''}`} onClick={() => setAdminSection('overview')}>نظرة عامة</button>
          <button type="button" className={`nav-item ${adminSection === 'videos' ? 'active' : ''}`} onClick={() => setAdminSection('videos')}>المحاضرات</button>
          <button type="button" className={`nav-item ${adminSection === 'lesson-files' ? 'active' : ''}`} onClick={() => setAdminSection('lesson-files')}>ملفات الشرح</button>
          <button type="button" className={`nav-item ${adminSection === 'students' ? 'active' : ''}`} onClick={() => setAdminSection('students')}>الطلاب</button>
          <button type="button" className={`nav-item ${adminSection === 'payments' ? 'active' : ''}`} onClick={() => { setAdminSection('payments'); loadPaymentRequests(); }}>طلبات الدفع</button>
          <button type="button" className={`nav-item ${adminSection === 'question-bank' ? 'active' : ''}`} onClick={() => { setAdminSection('question-bank'); loadQuizzes(); }}>بنك الأسئلة</button>
          <button type="button" className={`nav-item ${adminSection === 'chat' ? 'active' : ''}`} onClick={() => { setAdminSection('chat'); loadChatMessages(); }}>الشات</button>
          <button type="button" className={`nav-item ${adminSection === 'reports' ? 'active' : ''}`} onClick={() => setAdminSection('reports')}>التقارير</button>
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">لوحة المدرس</p>
            <h2>مرحبا، {user?.name || 'المدير'}.</h2>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            تسجيل الخروج
          </button>
        </header>

        {loading && <div className="message">جاري تحميل لوحة التحكم...</div>}

        {dashboard && (
          <>
            {adminSection === 'payments' && <section className="admin-payments-section">
              <div className="section-heading"><span className="eyebrow">Vodafone Cash</span><h2>طلبات الدفع</h2></div>
              <div className="payment-requests-list">
                {paymentRequests.map((request) => <article key={request.id} className="payment-request-card">
                  <div className="payment-request-info"><h3>{request.student}</h3><p><strong>مبلغ التحويل: <CurrencyAmount amount={request.amount} /></strong> • الرصيد الحالي: <CurrencyAmount amount={request.studentBalance ?? 0} /></p>{request.creditedAmount && <p><strong>المبلغ المضاف: <CurrencyAmount amount={request.creditedAmount} /></strong></p>}<small>الإيميل: {request.studentEmail || 'غير مسجل'} • رقم الطالب: {request.studentNumber || 'غير مسجل'} • ولي الأمر: {request.guardianPhone || 'غير مسجل'} • هاتف التحويل: {request.senderPhone || 'غير مسجل'}</small><small>{new Date(request.createdAt).toLocaleString('ar-EG')}</small></div>
                  <strong className={`request-status ${request.status.toLowerCase()}`}>{request.status === 'Pending' ? 'قيد المراجعة' : request.status === 'Approved' ? 'تم الاعتماد' : 'مرفوض'}</strong>
                  {request.status === 'Pending' && <div className="payment-request-actions"><label className="approval-amount-field">المبلغ الذي سيضاف للرصيد<input type="number" min="1" step="1" value={paymentApprovalAmounts[request.id] ?? request.amount} onChange={(event) => setPaymentApprovalAmounts((current) => ({ ...current, [request.id]: event.target.value }))} /></label><button type="button" className="primary-btn" onClick={() => reviewPaymentRequest(request.id, 'approve')}>اعتماد وإضافة الرصيد</button><button type="button" className="small-btn danger-btn" onClick={() => reviewPaymentRequest(request.id, 'reject')}>رفض</button></div>}
                </article>)}
                {!paymentRequests.length && <div className="empty-state">لا توجد طلبات دفع حتى الآن.</div>}
              </div>
              {studentActionMessage && <div className="message">{studentActionMessage}</div>}
            </section>}

            {adminSection === 'students' && <section className="admin-students-section">
              <div className="section-heading"><span className="eyebrow">إدارة الحسابات</span><h2>قائمة الطلاب</h2></div>
              <div className="admin-students-grid">
                {studentsList.map((student) => <article key={student.id} className="admin-student-card">
                  <div><h3>{student.name}</h3><p>{student.email}</p><span>الرصيد: <CurrencyAmount amount={student.balance} /></span></div>
                  <div className="admin-student-actions">
                    <button type="button" className="primary-btn" onClick={async () => { setSelectedStudentId(String(student.id)); await loadStudentDetails(String(student.id)); }}>تفاصيل الحساب</button>
                    <button type="button" className="small-btn danger-btn" onClick={() => deleteStudent(student)}>حذف الطالب</button>
                  </div>
                </article>)}
              </div>
              {studentDetails && <div className="student-details-panel panel">
                <div className="student-details-header"><div><span className="eyebrow">ملف الطالب</span><h3>{studentDetails.student.name}</h3><p>{studentDetails.student.email} • {studentDetails.student.studentNumber || 'بدون رقم طالب'} • ولي الأمر: {studentDetails.student.guardianPhone || 'غير مسجل'}</p></div><button type="button" className="secondary-btn" onClick={() => setStudentDetails(null)}>إغلاق</button></div>
                <h4>المحتوى المتاح للطالب</h4>
                <div className="content-access-list">{studentDetails.videos.map((video) => <label key={video.id}><input type="checkbox" checked={video.open} onChange={(event) => toggleStudentVideo(video.id, event.target.checked)} /> {video.title}</label>)}</div>
                <form className="student-password-form" onSubmit={changeStudentPassword}>
                  <label className="management-field">تغيير كلمة مرور الطالب<span className="password-field"><input type={showStudentPassword ? 'text' : 'password'} value={newStudentPassword} onChange={(event) => setNewStudentPassword(event.target.value)} placeholder="6 أحرف على الأقل" minLength={6} required /><button type="button" className="password-toggle" onClick={() => setShowStudentPassword((current) => !current)} aria-label={showStudentPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>{showStudentPassword ? '🙈' : '👁'}</button></span></label>
                  <button type="submit" className="secondary-btn">حفظ كلمة المرور</button>
                </form>
                <h4>سجل النشاط</h4>
                <div className="activity-list">{studentDetails.activity.map((item, index) => <div key={`${item.createdAt}-${index}`}><strong>{item.label}</strong><span>{item.detail}</span></div>)}{!studentDetails.activity.length && <p>لا يوجد نشاط مسجل بعد.</p>}</div>
                <h4>نتائج الاختبارات</h4>
                <div className="activity-list">{studentDetails.attempts.map((attempt) => <div key={attempt.id}><strong>{attempt.quizTitle}</strong><span>{attempt.score} من {attempt.total}</span></div>)}{!studentDetails.attempts.length && <p>لم يدخل الطالب اختبارات بعد.</p>}</div>
              </div>}
            </section>}

            {adminSection === 'question-bank' && <section className="question-bank-section">
              <div className="section-heading"><span className="eyebrow">اختبارات تفاعلية</span><h2>بنك الأسئلة</h2></div>

              <div className="admin-quiz-shell">
                <div className="admin-cards-panel panel">
                  <div className="admin-management-header">
                    <h3>قائمة الاختبارات</h3>
                  </div>

                  <div className="admin-list-table">
                    {quizList.map((quiz) => (
                      <button
                        type="button"
                        key={quiz.id}
                        className={`admin-list-row ${selectedAdminQuizId === String(quiz.id) ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedAdminQuizId(String(quiz.id));
                          startEditQuiz(quiz);
                        }}
                      >
                        <div>
                          <strong>{quiz.title}</strong>
                          <small>{quiz.description || 'لا يوجد وصف'}</small>
                        </div>
                        <span>{quiz.questions?.length || 0} سؤال</span>
                      </button>
                    ))}

                    {!quizList.length && <div className="empty-state">لم تتم إضافة اختبارات بعد.</div>}
                  </div>
                </div>

                <div className="panel admin-details-panel">
                  {selectedAdminQuiz ? (
                    <>
                      <div className="admin-management-header details-header">
                        <div>
                          <span className="eyebrow">اختبار</span>
                          <h3>{selectedAdminQuiz.title}</h3>
                        </div>
                        <span className="content-location-badge">{formatContentLocation(selectedAdminQuiz)}</span>
                      </div>

                      <div className="admin-edit-box">
                        <label className="management-field">
                          اسم الاختبار
                          <input value={editingQuizTitle} onChange={(event) => setEditingQuizTitle(event.target.value)} />
                        </label>
                        <label className="management-field">
                          وصف الاختبار
                          <textarea value={editingQuizDescription} onChange={(event) => setEditingQuizDescription(event.target.value)} rows="3" />
                        </label>
                        <div className="quiz-card-actions">
                          <button type="button" className="primary-btn small-btn" onClick={saveEditedQuiz}>حفظ التعديل</button>
                          <button type="button" className="secondary-btn small-btn" onClick={cancelEditQuiz}>إلغاء</button>
                          <button type="button" className="small-btn danger-btn" onClick={async () => {
                            await fetch(`${API_URL}/admin/quizzes/${selectedAdminQuiz.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                            setQuizList((current) => current.filter((item) => item.id !== selectedAdminQuiz.id));
                          }}>حذف الاختبار</button>
                        </div>
                      </div>

                      <div className="admin-stat-row">
                        <span>عدد الأسئلة: {selectedAdminQuiz.questions?.length || 0}</span>
                        <span>المحاضرة: {selectedAdminQuiz.lessonId ? videos.find((video) => String(video.id) === String(selectedAdminQuiz.lessonId))?.title || 'محاضرة مرتبطة' : 'اختبار عام'}</span>
                      </div>
                    </>
                  ) : (
                    <p>اختر اختبارًا من القائمة</p>
                  )}
                </div>
              </div>

              <form className="pdf-import-card panel" onSubmit={importPdf}>
                <div><h3>استيراد اختبار من PDF</h3><p>اكتب اسم الاختبار، ثم ارفع ملفًا يحتوي على أسئلة مرقمة واختيارات A/B/C/D أو أ/ب/ج/د، مع الإجابات في نهاية الملف أو بعد كل سؤال.</p></div>
                <label className="management-field">اسم الاختبار<input value={quizTitle} onChange={(event) => setQuizTitle(event.target.value)} placeholder="مثال: اختبار الوحدة الأولى" required /></label>
                <label className="management-field">الصف الدراسي<select value={quizGrade} onChange={(event) => { setQuizGrade(event.target.value); setQuizTerm(''); setQuizUnitId('1'); setQuizLessonId(''); }}>{gradeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                {quizGrade === 'first-secondary' ? <label className="management-field">الترم<select value={quizTerm} onChange={(event) => { setQuizTerm(event.target.value); setQuizLessonId(''); }} required><option value="">اختر الترم</option>{termOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> : <label className="management-field">الوحدة<select value={quizUnitId} onChange={(event) => { setQuizUnitId(event.target.value); setQuizLessonId(''); }}>{secondSecondaryUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.label}</option>)}</select></label>}
                <label className="management-field">المحاضرة المرتبطة<select value={quizLessonId} onChange={(event) => setQuizLessonId(event.target.value)}><option value="">اختبار عام للوحدة</option>{videos.filter((video) => video.grade === quizGrade && (quizGrade === 'first-secondary' ? video.term === quizTerm : Number(video.unitId) === Number(quizUnitId))).map((video) => <option key={video.id} value={String(video.id)}>{video.title}</option>)}</select></label>
                <div className="pdf-import-row"><input type="file" accept="application/pdf" onChange={(event) => setPdfFile(event.target.files?.[0] || null)} required /><button type="submit" className="primary-btn">تحليل PDF</button></div>
                {pdfImportMessage && <div className="message">{pdfImportMessage}</div>}
                {pdfPreview && <div className="pdf-preview">{pdfPreview.questions.map((question) => <div key={question.id} className="pdf-question-preview"><strong>{question.id}. {question.text}</strong><div>{question.options.map((option, index) => <label key={option}><input type="radio" name={`pdf-${question.id}`} checked={question.correctOption === index} onChange={() => setPdfPreview((current) => ({ ...current, questions: current.questions.map((item) => item.id === question.id ? { ...item, correctOption: index } : item) }))} /> {option}</label>)}</div></div>)}<button type="button" className="primary-btn" onClick={savePdfQuiz} disabled={pdfSaving}>{pdfSaving ? 'جاري الحفظ في قاعدة البيانات...' : 'حفظ الاختبار بعد المراجعة'}</button></div>}
              </form>
              {studentActionMessage && <div className="message">{studentActionMessage}</div>}
            </section>}

            {adminSection === 'chat' && <section className="chat-admin-panel">
              <div className="chat-modal-header">
                <div>
                  <span className="eyebrow">إدارة المجتمع</span>
                  <h3>شات الطلاب</h3>
                </div>
                <button type="button" className="secondary-btn" onClick={loadChatMessages}>تحديث الرسائل</button>
              </div>
              <div className="chat-messages admin-messages">
                {chatMessages.map((message) => (
                  <article key={message.id} className={`chat-message ${message.pinned ? 'pinned' : ''}`}>
                    <div className="chat-message-meta"><strong>{message.userName}</strong><span>{message.role === 'admin' ? 'المدرس' : 'طالب'}</span></div>
                    <p>{message.text}</p>
                    <div className="chat-admin-actions">
                      <button type="button" className="small-btn" onClick={() => moderateChatMessage(message.id, 'pin')}>{message.pinned ? 'إلغاء التثبيت' : 'تثبيت'}</button>
                      <button type="button" className="small-btn danger-btn" onClick={() => moderateChatMessage(message.id, 'delete')}>حذف</button>
                    </div>
                  </article>
                ))}
                {!chatMessages.length && <div className="chat-empty-state">لا توجد رسائل بعد. ابدأ أول رسالة للطلاب.</div>}
              </div>
              <form className="chat-form admin-chat-form" onSubmit={sendChatMessage}>
                <input value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder="اكتب رسالة للطلاب..." maxLength={500} />
                <button type="submit" className="primary-btn">إرسال للطلاب</button>
              </form>
            </section>}

            <section className="stats-grid">
              <div className="stat-card">
                <span>إجمالي الطلاب</span>
                <strong>{dashboard.stats.totalStudents}</strong>
              </div>
              <div className="stat-card">
                <span>المحاضرات المتاحة</span>
                <strong>{dashboard.stats.activeLessons}</strong>
              </div>
              <div className="stat-card money-stat">
                <span>إجمالي أرصدة الطلاب</span>
                <strong><CurrencyAmount amount={dashboard.stats.totalWalletBalance} /></strong>
              </div>
              <div className="stat-card money-stat">
                <span>إجمالي المبالغ المحولة للمنصة</span>
                <strong><CurrencyAmount amount={dashboard.stats.totalTransferredAmount ?? 0} /></strong>
              </div>
              <div className="stat-card">
                <span>طلاب لديهم وصول</span>
                <strong>{dashboard.stats.activeStudents}</strong>
              </div>
            </section>

            <section className="panel">
              <h3>نظرة عامة</h3>
              <p>{dashboard.summary}</p>
            </section>

            {adminSection === 'overview' && <section className="student-management panel">
              <div className="video-form-header">
                <h3>إدارة رصيد ومحتوى الطلاب</h3>
                <p>اختر حساب الطالب ثم عدّل رصيده أو افتح له كل المحتوى.</p>
              </div>

              <label className="management-field">
                الطالب
                <select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}>
                  <option value="">اختر طالبًا</option>
                  {studentsList.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} - الرصيد {moneyNumberFormatter.format(Number(student.balance || 0))} جنيه
                    </option>
                  ))}
                </select>
              </label>

              {selectedStudentId && (
                <div className="student-management-actions">
                  <form onSubmit={updateStudentBalance} className="balance-adjust-form">
                    <label className="management-field">
                      قيمة التعديل
                      <input
                        type="number"
                        value={balanceAmount}
                        onChange={(event) => setBalanceAmount(event.target.value)}
                        placeholder="+500 للشحن أو -100 للخصم"
                      />
                    </label>
                    <button type="submit" className="primary-btn">تحديث الرصيد</button>
                  </form>

                  <button type="button" className="secondary-btn" onClick={toggleStudentContent}>
                    {studentsList.find((student) => student.id === Number(selectedStudentId))?.contentUnlocked
                      ? 'إغلاق المحتوى'
                      : 'فتح كل المحتوى'}
                  </button>
                </div>
              )}

              {studentActionMessage && <div className="message">{studentActionMessage}</div>}
            </section>}

            {adminSection === 'videos' && <section className="admin-lecture-shell">
              <div className="section-heading"><span className="eyebrow">المحتوى</span><h2>إدارة المحاضرات</h2></div>

              <div className="admin-lecture-layout">
                <div className="admin-cards-panel panel">
                  <div className="admin-management-header">
                    <h3>قائمة المحاضرات</h3>
                  </div>

                  <div className="admin-list-table">
                    {videos.map((video) => (
                      <button
                        type="button"
                        key={video.id}
                        className={`admin-list-row ${selectedAdminLectureId === String(video.id) ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedAdminLectureId(String(video.id));
                          setSelectedVideo(video);
                          startEditVideo(video);
                        }}
                      >
                        <div>
                          <strong>{video.title}</strong>
                          <small>{formatContentLocation(video)}</small>
                        </div>
                        <span>{video.lessonPdfAvailable ? 'PDF جاهز' : 'بدون PDF'}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="panel admin-details-panel">
                  {selectedAdminLecture ? (
                    <>
                      <div className="admin-management-header details-header">
                        <div>
                          <span className="eyebrow">المحاضرة</span>
                          <h3>{selectedAdminLecture.title}</h3>
                        </div>
                        <span className="content-location-badge">{formatContentLocation(selectedAdminLecture)}</span>
                      </div>

                      <div className="admin-video-preview-box">
                        <iframe
                          src={selectedAdminLecture.url}
                          title={selectedAdminLecture.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="video-frame"
                        />
                      </div>

                      <div className="admin-edit-box">
                        <label className="management-field">
                          اسم المحاضرة
                          <input value={editingVideoTitle} onChange={(event) => setEditingVideoTitle(event.target.value)} />
                        </label>
                        <label className="management-field">
                          رابط شرح الفيديو
                          <input value={editingVideoUrl} onChange={(event) => setEditingVideoUrl(event.target.value)} />
                        </label>
                        <label className="management-field">
                          رابط غلاف المحاضرة
                          <input
                            type="url"
                            value={editingVideoCover.startsWith('data:image') ? '' : editingVideoCover}
                            onChange={(event) => setEditingVideoCover(event.target.value)}
                            placeholder="https://example.com/cover.jpg"
                          />
                        </label>
                        <label className="management-field">
                          أو رفع صورة غلاف من الجهاز
                          <input type="file" accept="image/*" onChange={(event) => handleLocalCoverUpload(event, setEditingVideoCover)} />
                        </label>

                        <div className="quiz-card-actions">
                          <button type="button" className="primary-btn small-btn" onClick={saveEditedVideo}>حفظ التعديلات</button>
                          <button type="button" className="secondary-btn small-btn" onClick={cancelEditVideo}>إلغاء</button>
                          <button type="button" className="small-btn danger-btn" onClick={() => handleDeleteVideo(selectedAdminLecture.id)}>حذف المحاضرة</button>
                        </div>
                      </div>

                      <div className="admin-upload-box">
                        <div className="admin-upload-head">
                          <h4>ملف شرح المحاضرة PDF</h4>
                          <span className={`lesson-pdf-status ${selectedAdminLecture.lessonPdfAvailable ? 'ready' : ''}`} role="status">
                            {selectedAdminLecture.lessonPdfAvailable ? 'ملف PDF محفوظ' : 'لا يوجد PDF بعد'}
                          </span>
                        </div>

                        <label className="lesson-pdf-file-field admin-pdf-field">
                          <span>{lessonPdfFile ? lessonPdfFile.name : 'اختيار ملف PDF جديد'}</span>
                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            onChange={(event) => {
                              const selectedFile = event.target.files?.[0] || null;
                              setLessonPdfFile(selectedFile);
                              setLessonPdfUploadVideoId(selectedAdminLecture.id);
                              setLessonPdfUploadMessage('');
                              event.target.value = '';
                            }}
                          />
                        </label>

                        <div className="quiz-card-actions">
                          <button type="button" className="primary-btn small-btn" onClick={() => handleLessonPdfUpload(selectedAdminLecture.id)} disabled={lessonPdfUploading || lessonPdfDeleting !== null || !lessonPdfFile}>
                            {lessonPdfUploading && lessonPdfUploadVideoId === selectedAdminLecture.id ? 'جاري الرفع...' : selectedAdminLecture.lessonPdfAvailable ? 'استبدال PDF' : 'إضافة PDF'}
                          </button>
                          {selectedAdminLecture.lessonPdfAvailable && (
                            <button type="button" className="small-btn danger-btn" onClick={() => handleLessonPdfDelete(selectedAdminLecture)} disabled={lessonPdfUploading || lessonPdfDeleting !== null}>
                              {lessonPdfDeleting === selectedAdminLecture.id ? 'جاري الحذف...' : 'حذف PDF'}
                            </button>
                          )}
                        </div>

                        {lessonPdfUploadMessage && <div className="message">{lessonPdfUploadMessage}</div>}
                      </div>

                      <div className="admin-upload-box">
                        <div className="admin-upload-head">
                          <h4>اختبار المحاضرة PDF</h4>
                          <span className="lesson-pdf-status">استخدم نفس أسلوب تحليل PDF الموجود في بنك الأسئلة</span>
                        </div>

                        <label className="lesson-pdf-file-field admin-pdf-field">
                          <span>{lectureQuizFile ? lectureQuizFile.name : 'اختيار ملف PDF للاختبار'}</span>
                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            onChange={(event) => {
                              const selectedFile = event.target.files?.[0] || null;
                              setLectureQuizFile(selectedFile);
                              setLectureQuizPreview(null);
                              setLectureQuizMessage('');
                              event.target.value = '';
                            }}
                          />
                        </label>

                        <div className="quiz-card-actions">
                          <button type="button" className="primary-btn small-btn" onClick={importLectureQuizPdf} disabled={!lectureQuizFile}>
                            تحليل PDF الاختبار
                          </button>
                          {lectureQuizPreview && (
                            <button type="button" className="secondary-btn small-btn" onClick={saveLectureQuizPdf} disabled={lectureQuizSaving}>
                              {lectureQuizSaving ? 'جاري الحفظ...' : 'حفظ الاختبار'}
                            </button>
                          )}
                        </div>

                        {lectureQuizPreview && (
                          <div className="pdf-preview">
                            {lectureQuizPreview.questions.map((question) => (
                              <div key={question.id} className="pdf-question-preview">
                                <strong>{question.id}. {question.text}</strong>
                                <div>
                                  {question.options.map((option, index) => (
                                    <label key={`${question.id}-${option}`}>
                                      <input
                                        type="radio"
                                        name={`lecture-quiz-${question.id}`}
                                        checked={question.correctOption === index}
                                        onChange={() => setLectureQuizPreview((current) => ({
                                          ...current,
                                          questions: current.questions.map((item) => item.id === question.id ? { ...item, correctOption: index } : item),
                                        }))}
                                      />
                                      {option}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {lectureQuizMessage && <div className="message">{lectureQuizMessage}</div>}
                      </div>
                    </>
                  ) : (
                    <p>اختر محاضرة من القائمة</p>
                  )}
                </div>
              </div>

              <div className="panel admin-add-panel">
                <div className="video-form-header">
                  <h3>إضافة محاضرة جديدة</h3>
                  <p>اختر الصف والوحدة، ثم أضف محاضرتك مع رابط الفيديو، الغلاف، ومكانها داخل المنهج.</p>
                </div>

                <form onSubmit={handleAddVideo} className="video-form">
                  <label>
                    عنوان المحاضرة
                    <input type="text" value={videoTitle} onChange={(event) => setVideoTitle(event.target.value)} placeholder="مثال: شرح الوحدة الأولى" />
                  </label>

                  <label>
                    الصف الدراسي
                    <select value={videoGrade} onChange={(event) => { setVideoGrade(event.target.value); setVideoTerm(''); setVideoUnitId('1'); }}>
                      {gradeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>

                  {videoGrade === 'first-secondary' ? (
                    <label>
                      الترم
                      <select value={videoTerm} onChange={(event) => setVideoTerm(event.target.value)} required>
                        <option value="">اختر الترم</option>
                        {termOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                  ) : (
                    <label>
                      الوحدة
                      <select value={videoUnitId} onChange={(event) => setVideoUnitId(event.target.value)}>
                        {secondSecondaryUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.label}</option>)}
                      </select>
                    </label>
                  )}

                  <label>
                    رابط الشرح المرئي أو كود التضمين
                    <input type="text" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="الصق رابط الشرح المرئي أو كود iframe كاملًا" />
                  </label>

                  <label>
                    رابط غلاف المحاضرة
                    <input type="url" value={videoCover} onChange={(event) => setVideoCover(event.target.value)} placeholder="https://example.com/cover.jpg" />
                  </label>

                  <label>
                    أو رفع صورة غلاف من الجهاز
                    <input type="file" accept="image/*" onChange={(event) => handleLocalCoverUpload(event, setVideoCover)} />
                  </label>

                  <label className="management-field">
                    ملف PDF شرحها (اختياري)
                    <input type="file" accept="application/pdf,.pdf" onChange={(event) => setNewLecturePdfFile(event.target.files?.[0] || null)} />
                  </label>

                  {videoFormError && <div className="error-box">{videoFormError}</div>}
                  <button type="submit" className="primary-btn">حفظ المحاضرة</button>
                </form>
              </div>
            </section>}

            {adminSection === 'lesson-files' && <section className="lesson-files-panel">
              <div className="video-form-header">
                <span className="eyebrow">ترتيب محتوى الطالب</span>
                <h2>ملفات شرح المحاضرات</h2>
                <p>اختاري الصف والوحدة، ثم ارفعي ملف PDF بجوار المحاضرة المطابقة. ترتيب المحاضرات هنا هو نفسه في صفحة الطالب.</p>
              </div>

              <div className="lesson-files-filters">
                <label className="management-field">
                  الصف الدراسي
                  <select value={lessonPdfGrade} onChange={(event) => {
                    setLessonPdfGrade(event.target.value);
                    setLessonPdfTerm('first-term');
                    setLessonPdfUnitId('1');
                    clearLessonPdfUploadSelection();
                  }}>
                    {gradeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>

                {lessonPdfGrade === 'first-secondary' ? (
                  <label className="management-field">
                    الترم
                    <select value={lessonPdfTerm} onChange={(event) => { setLessonPdfTerm(event.target.value); clearLessonPdfUploadSelection(); }}>
                      {termOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                ) : (
                  <label className="management-field">
                    الوحدة
                    <select value={lessonPdfUnitId} onChange={(event) => { setLessonPdfUnitId(event.target.value); clearLessonPdfUploadSelection(); }}>
                      {secondSecondaryUnits.map((unit) => <option key={unit.id} value={String(unit.id)}>{unit.label}</option>)}
                    </select>
                  </label>
                )}
              </div>

              <div className="lesson-files-list">
                {videos.filter((video) => video.grade === lessonPdfGrade && (lessonPdfGrade === 'first-secondary' ? video.term === lessonPdfTerm : Number(video.unitId) === Number(lessonPdfUnitId))).map((video, index) => (
                  <article className="lesson-file-row" key={video.id}>
                    <span className="lesson-file-number">{String(index + 1).padStart(2, '0')}</span>
                    <div className="lesson-file-details">
                      <span className="content-location-badge">{formatContentLocation(video)} • المحاضرة {index + 1}</span>
                      <h3>{video.title}</h3>
                      <span className={`lesson-pdf-status ${video.lessonPdfAvailable ? 'ready' : ''}`} role="status">
                        {lessonPdfUploadVideoId === video.id && lessonPdfUploadMessage ? lessonPdfUploadMessage : video.lessonPdfAvailable ? 'ملف PDF محفوظ' : 'لم يُرفع ملف شرح بعد'}
                      </span>
                    </div>
                    <div className="lesson-file-actions">
                      <label className="lesson-pdf-file-field">
                        <span>{lessonPdfUploadVideoId === video.id && lessonPdfFile ? lessonPdfFile.name : 'اختيار ملف PDF'}</span>
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          onChange={(event) => {
                            const selectedFile = event.target.files?.[0] || null;
                            setLessonPdfFile(selectedFile);
                            event.target.value = '';
                            setLessonPdfUploadVideoId(video.id);
                            setLessonPdfUploadMessage('');
                          }}
                        />
                      </label>
                      <div className="lesson-file-buttons">
                        <button type="button" className="primary-btn small-btn" onClick={() => handleLessonPdfUpload(video.id)} disabled={lessonPdfUploading || lessonPdfDeleting !== null || lessonPdfUploadVideoId !== video.id || !lessonPdfFile}>
                          {lessonPdfUploading && lessonPdfUploadVideoId === video.id ? 'جاري الرفع...' : video.lessonPdfAvailable ? 'استبدال PDF' : 'حفظ PDF'}
                        </button>
                        {video.lessonPdfAvailable && <button type="button" className="small-btn danger-btn" onClick={() => handleLessonPdfDelete(video)} disabled={lessonPdfUploading || lessonPdfDeleting !== null}>
                          {lessonPdfDeleting === video.id ? 'جاري الحذف...' : 'حذف PDF'}
                        </button>}
                      </div>
                    </div>
                  </article>
                ))}
                {!videos.some((video) => video.grade === lessonPdfGrade && (lessonPdfGrade === 'first-secondary' ? video.term === lessonPdfTerm : Number(video.unitId) === Number(lessonPdfUnitId))) && (
                  <div className="empty-state">لا توجد محاضرات مضافة لهذه الوحدة بعد. أضيفي محاضرة من قسم «المحاضرات».</div>
                )}
              </div>
            </section>}
          </>
        )}
        <CreditFooter />
      </main>
    </div>
  );
}

export default App;
