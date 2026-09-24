import { useEffect, useRef, useState } from 'react';

const API_URL = '/api';
const SESSION_TOKEN_KEY = 'shefo-token';
const LAST_ACTIVITY_KEY = 'shefo-last-activity';
const INACTIVITY_LIMIT = 5 * 60 * 1000;

async function readApiResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`استجابة غير صحيحة من الخادم (${response.status})`);
  }
  return response.json();
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
  {
    id: 2,
    title: 'أساسيات البرمجة',
    subtitle: 'ابدأ من الصفر وابنِ مشاريع حقيقية',
    image:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 3,
    title: 'مدخل إلى الذكاء الاصطناعي',
    subtitle: 'افهم النماذج والبيانات وتطبيقاتها',
    image:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
  },
];

const featureItems = [
  {
    icon: '📚',
    title: 'شرح عملي مبسط',
    text: 'نفهمك البرمجة خطوة بخطوة مع أمثلة ومشاريع مناسبة لمرحلتك.',
  },
  {
    icon: '🧪',
    title: 'تطبيقات ومشاريع',
    text: 'حوّل كل درس إلى تطبيق عملي يثبت فهمك ويقوي مهاراتك.',
  },
  {
    icon: '🎁',
    title: 'اختبارات دورية',
    text: 'تقييم مستمر يساعدك على متابعة مستواك والاستعداد للامتحان.',
  },
  {
    icon: '💬',
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
  },
  {
    id: 2,
    title: 'شرح الوحدة الأولى',
    url: 'https://www.youtube.com/embed/ysz5S6PUM-U',
    cover:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    locked: true,
  },
];

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [registerMode, setRegisterMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [token, setToken] = useState(localStorage.getItem(SESSION_TOKEN_KEY) || '');
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(localStorage.getItem(SESSION_TOKEN_KEY)));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoCover, setVideoCover] = useState('');
  const [videoPrice, setVideoPrice] = useState('10');
  const [videoFormError, setVideoFormError] = useState('');
  const [editingVideoId, setEditingVideoId] = useState(null);
  const [editingVideoTitle, setEditingVideoTitle] = useState('');
  const [editingVideoCover, setEditingVideoCover] = useState('');
  const [editingVideoPrice, setEditingVideoPrice] = useState('10');
  const [videos, setVideos] = useState(defaultVideos);
  const [selectedVideo, setSelectedVideo] = useState(defaultVideos[0]);
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
  const [quizPrice, setQuizPrice] = useState('0');
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
  const protectedVideoRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileGuardianPhone, setProfileGuardianPhone] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [profileMessage, setProfileMessage] = useState('');

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
      body: JSON.stringify({ title: quizTitle, description: quizDescription, price: Number(quizPrice), questions: [{ text: questionText, options: questionOptions, correctOption: Number(correctOption) }] }),
    });
    const data = await readApiResponse(response);
    if (!response.ok) { setError(data.message || 'تعذر إنشاء الاختبار'); return; }
    setQuizList((current) => [...current, data.quiz]);
    setQuizTitle(''); setQuizDescription(''); setQuizPrice('0'); setQuestionText(''); setQuestionOptions(['', '', '', '']); setCorrectOption('0');
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
        body: JSON.stringify({ title: quizTitle, description: quizDescription, price: Number(quizPrice), questions: pdfPreview.questions }),
      });
      const data = await readApiResponse(response);
      if (!response.ok) { setPdfImportMessage(data.message || 'تعذر حفظ الاختبار'); return; }
      setQuizList((current) => [...current, data.quiz]);
      setPdfPreview(null); setPdfFile(null); setQuizTitle(''); setQuizDescription('');
      setPdfImportMessage('تم حفظ الاختبار في قاعدة البيانات وبنك الأسئلة.');
    } catch (err) {
      setPdfImportMessage(err.message || 'تعذر حفظ الاختبار');
    } finally {
      setPdfSaving(false);
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
      const response = await fetch(`${API_URL}/quizzes/${quizId}/purchase`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readApiResponse(response);
      if (!response.ok) { setError(data.message || 'لا يمكن فتح الاختبار'); return; }
      await openQuiz(quizId);
      setDashboard((current) => current ? {
        ...current,
        balance: data.balance,
        quizzes: current.quizzes.map((quiz) => quiz.id === quizId ? { ...quiz, purchased: true } : quiz),
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
      if (!response.ok) { setError(data.message || 'تعذر شراء الفيديو'); return; }
      const refreshed = await fetchDashboard(token);
      setDashboard(refreshed);
      setUser(refreshed.user);
      setVideos(refreshed.videos || defaultVideos);
      const unlockedVideo = (refreshed.videos || []).find((item) => item.id === video.id);
      if (unlockedVideo) setSelectedVideo(unlockedVideo);
    } catch (err) {
      setError(err.message || 'تعذر شراء الفيديو');
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
          ? { name: fullName, email, studentNumber, guardianPhone, password }
          : { email, password }),
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
      setVideoFormError('يرجى كتابة عنوان الفيديو ورابطه');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admin/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: videoTitle, url: videoUrl, cover: videoCover, price: Number(videoPrice) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'تعذر حفظ الفيديو');
      setVideos(data.videos || defaultVideos);
      setSelectedVideo(data.video);
      setVideoTitle('');
      setVideoUrl('');
      setVideoCover('');
      setVideoPrice('10');
      setVideoFormError('');
    } catch (err) {
      setVideoFormError(err.message || 'تعذر حفظ الفيديو');
    }
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
    setEditingVideoCover(video.cover || '');
    setEditingVideoPrice(String(video.price ?? 10));
    setVideoFormError('');
  };

  const cancelEditVideo = () => {
    setEditingVideoId(null);
    setEditingVideoTitle('');
    setEditingVideoCover('');
    setEditingVideoPrice('10');
  };

  const saveEditedVideo = async () => {
    const video = videos.find((item) => item.id === editingVideoId);
    if (!video) return;

    const trimmedTitle = editingVideoTitle.trim();
    const parsedPrice = Number(editingVideoPrice);
    if (!trimmedTitle) {
      setVideoFormError('اسم الفيديو لا يمكن أن يكون فارغًا');
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setVideoFormError('سعر الفيديو يجب أن يكون عددًا صحيحًا أو صفرًا');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admin/videos/${video.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: trimmedTitle, url: video.url, cover: editingVideoCover || video.cover, price: parsedPrice }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'تعذر تعديل الفيديو');
      setVideos(data.videos || defaultVideos);
      setSelectedVideo((current) => (current && current.id === video.id ? data.video : current));
      cancelEditVideo();
      setVideoFormError('');
    } catch (err) {
      setVideoFormError(err.message || 'تعذر تعديل الفيديو');
    }
  };

  const handleDeleteVideo = async (videoId) => {
    const video = videos.find((item) => item.id === videoId);
    if (!video) return;

    const confirmed = window.confirm(`هل تريد حذف الفيديو "${video.title}"؟`);
    if (!confirmed) return;

    try {
      const response = await fetch(`${API_URL}/admin/videos/${videoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'تعذر حذف الفيديو');
      setVideos(data.videos || []);
      setSelectedVideo((current) => (current && current.id === videoId ? (data.videos[0] || null) : current));
      setVideoFormError('');
    } catch (err) {
      setVideoFormError(err.message || 'تعذر حذف الفيديو');
    }
  };

  if (!token) {
    return (
      <div className="landing-shell">
        <header className="landing-header">
          <div className="brand-block">
            <div className="brand-pill">أستاذ محمد عبد الشافي</div>
          </div>

          <nav className="landing-nav">
            <a href="#features">المميزات</a>
            <a href="#levels">المراحل</a>
            <a href="#students">الطلاب</a>
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
                <button className="primary-btn" onClick={scrollToLogin}>ابدأ الآن</button>
                <button className="secondary-btn" onClick={scrollToLogin}>اكتشف المنهج</button>
              </div>

              <div className="hero-stats">
                <div>
                  <strong>2 ث</strong>
                  <span>نظام البكالوريا</span>
                </div>
                <div>
                  <strong>مشاريع</strong>
                  <span>تطبيق عملي</span>
                </div>
                <div>
                  <strong>AI</strong>
                  <span>مفاهيم المستقبل</span>
                </div>
              </div>
            </div>

            <div className="hero-visual" onMouseMove={handleHeroPointerMove} onMouseLeave={resetHeroPointer}>
              <div className="tech-orbit orbit-one" />
              <div className="tech-orbit orbit-two" />
              <div className="code-float code-float-top">{'<AI />'}</div>
              <div className="code-float code-float-bottom">محمد عبد الشافي</div>
              <div className="hero-image-card">
                <img
                  src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=85"
                  alt="تعليم البرمجة والذكاء الاصطناعي"
                />
              </div>
            </div>
          </section>

          <section id="levels" className="section-block" data-reveal>
            <div className="section-heading">
              <span className="eyebrow">المراحل الدراسية</span>
              <h2>ابدأ رحلتك في البرمجة والذكاء الاصطناعي</h2>
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

          <section id="features" className="section-block" data-reveal>
            <div className="section-heading">
              <span className="eyebrow">مميزات المنصة</span>
              <h2>تعلم المهارات التي تحتاجها في دراسة البكالوريا وسوق المستقبل</h2>
            </div>

            <div className="feature-grid">
              {featureItems.map((item, index) => (
                <div key={item.title} className="feature-card" data-reveal>
                  <span className="feature-index">{index + 1}</span>
                  <span className="feature-icon">{item.icon}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <span className="feature-line" aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>

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

          <section id="students" className="section-block" data-reveal>
            <div className="section-heading">
              <span className="eyebrow">الطلاب المتفوقون</span>
              <h2>نجاحات تدفعنا لمزيد من التفوق</h2>
            </div>

            <div className="student-grid-public">
              {publicStudents.length > 0 ? publicStudents.map((student) => (
                <div key={student.id} className="student-card-public" data-reveal>
                  <div className="avatar">{student.name.charAt(0)}</div>
                  <h3>{student.name}</h3>
                  {student.score && <strong>{student.score}</strong>}
                </div>
              )) : (
                <div className="student-empty-state">
                  <span className="student-empty-icon">★</span>
                  <h3>طلابنا المتفوقون قريبًا</h3>
                  <p>ستظهر هنا أسماء الطلاب ونتائجهم المميزة بمجرد إضافة البيانات.</p>
                </div>
              )}
            </div>
          </section>

          <section id="about" className="section-block about-block" data-reveal>
            <div className="section-heading">
              <span className="eyebrow">عن المنصة</span>
              <h2>تعليم البرمجة والذكاء الاصطناعي </h2>
            </div>

            <div className="about-box">
              <p>
                منصة تعليمية تساعد طالب الصف الثاني الثانوي بنظام البكالوريا على فهم البرمجة والذكاء الاصطناعي
                من خلال دروس تفاعلية، تطبيقات عملية، اختبارات دورية، وفيديوهات منظمة باللغة العربية.
                المحتوى الخاص مثل الفيديوهات والاختبارات متاح بعد تسجيل الدخول.
              </p>
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
                    رقم ولي الأمر
                    <input type="tel" value={guardianPhone} onChange={(event) => setGuardianPhone(event.target.value)} required />
                  </label>
                </>
              )}
              <label>
                البريد الإلكتروني
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
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

    return (
      <div className="student-shell">
        <header className="student-header">
          <div>
            <p className="eyebrow">منصة الطالب</p>
            <h2>مرحباً، {user.name}</h2>
          </div>
          <div className="student-actions">
            <span className="balance-pill">الرصيد: {dashboard?.balance ?? 0}</span>
            <button type="button" className="secondary-btn profile-btn" onClick={openProfile}>
              ملفي الشخصي
            </button>
            <button onClick={handleLogout} className="logout-btn">
              تسجيل الخروج
            </button>
          </div>
        </header>

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
          <div>
            <h3>الوصول إلى الفيديوهات</h3>
            <p>{dashboard?.balance > 0 ? 'لديك رصيد يمكنك استخدامه لشراء الفيديوهات والاختبارات' : 'اشحن رصيدك لشراء الفيديوهات والاختبارات'}</p>
          </div>

          <button onClick={openPaymentPage} className="pay-btn" disabled={loading}>
            شحن الرصيد عبر Vodafone Cash
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
            <div className="recharge-history"><h3>طلبات الشحن السابقة</h3>{rechargeRequests.map((request) => <div key={request.id}><strong>مبلغ التحويل: {request.amount} جنيه مصري</strong><span>{request.status === 'Pending' ? 'قيد المراجعة' : request.status === 'Approved' ? 'تم الاعتماد' : 'مرفوض'}</span></div>)}{!rechargeRequests.length && <p>لا توجد طلبات سابقة.</p>}</div>
          </section>
        </div>}

        {error && <div className="error-box">{error}</div>}

        <section className="student-grid">
          {videos.map((video) => (
            <div key={video.id} className={`student-video-card ${video.locked ? 'locked' : ''}`}>
              <div className="video-cover" style={{ backgroundImage: `url('${video.cover}')` }}>
                {video.locked && <span className="lock-badge">🔒</span>}
              </div>

              <div className="student-video-meta">
                <h4>{video.title}</h4>
                {video.locked ? (
                  <button type="button" className="pay-btn" onClick={() => purchaseVideo(video)} disabled={videoPurchaseLoading === video.id}>
                    {videoPurchaseLoading === video.id ? 'جاري الشراء...' : `شراء الفيديو - ${video.price || 10} جنيه`}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="watch-btn"
                    onClick={async () => {
                      setSelectedVideo(video);
                      await fetch(`${API_URL}/videos/${video.id}/view`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
                    }}
                  >
                    مشاهدة الفيديو
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>

        {selectedVideo && !selectedVideo.locked && (
          <section className="student-player">
            <h3>{selectedVideo.title}</h3>
            <div ref={protectedVideoRef} className="protected-video-frame">
              <iframe
                key={selectedVideo.id}
                src={selectedVideo.url}
                title={selectedVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                className="video-frame"
              />
              <div className="video-watermark" aria-hidden="true">
                {user.email} • {user.name}
              </div>
              <button type="button" className="protected-fullscreen-btn" onClick={toggleProtectedFullscreen}>
                ⛶ ملء الشاشة المحمي
              </button>
            </div>
          </section>
        )}

        <section className="student-quizzes">
          <div className="section-heading">
            <span className="eyebrow">بنك الأسئلة</span>
            <h2>اختباراتك التعليمية</h2>
          </div>
          <div className="quiz-card-grid">
            {(dashboard?.quizzes || []).map((quiz) => {
              const attempt = (dashboard?.attempts || []).find((item) => item.quizId === quiz.id);
              return <article key={quiz.id} className="quiz-card">
                <h3>{quiz.title}</h3>
                <p>{quiz.description}</p>
                <span>{quiz.questionCount} أسئلة • {quiz.price > 0 ? `${quiz.price} جنيه مصري` : 'مجاني'} {attempt ? `• آخر درجة ${attempt.score}/${attempt.total}` : ''}</span>
                <button type="button" className="primary-btn" onClick={() => startQuiz(quiz.id)} disabled={loading}>{loading ? 'جاري التحقق...' : quiz.purchased ? 'ابدأ الاختبار' : quiz.price > 0 ? 'شراء وبدء الاختبار' : 'ابدأ الاختبار'}</button>
              </article>;
            })}
            {!dashboard?.quizzes?.length && <div className="empty-state">لا توجد اختبارات متاحة حاليًا.</div>}
          </div>
        </section>

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
        <div className="logo">أستاذ محمد عبد الشافي</div>
        <nav>
          <button type="button" className={`nav-item ${adminSection === 'overview' ? 'active' : ''}`} onClick={() => setAdminSection('overview')}>نظرة عامة</button>
          <button type="button" className={`nav-item ${adminSection === 'videos' ? 'active' : ''}`} onClick={() => setAdminSection('videos')}>الفيديوهات</button>
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
                  <div className="payment-request-info"><h3>{request.student}</h3><p><strong>مبلغ التحويل: {request.amount} جنيه مصري</strong> • الرصيد الحالي: {request.studentBalance ?? 0} جنيه مصري</p>{request.creditedAmount && <p><strong>المبلغ المضاف: {request.creditedAmount} جنيه مصري</strong></p>}<small>الإيميل: {request.studentEmail || 'غير مسجل'} • رقم الطالب: {request.studentNumber || 'غير مسجل'} • ولي الأمر: {request.guardianPhone || 'غير مسجل'} • هاتف التحويل: {request.senderPhone || 'غير مسجل'}</small><small>{new Date(request.createdAt).toLocaleString('ar-EG')}</small></div>
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
                  <div><h3>{student.name}</h3><p>{student.email}</p><span>الرصيد: {student.balance} جنيه مصري</span></div>
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
              <form className="pdf-import-card panel" onSubmit={importPdf}>
                <div><h3>استيراد اختبار من PDF</h3><p>اكتب اسم الاختبار، ثم ارفع ملفًا يحتوي على أسئلة مرقمة واختيارات A/B/C/D أو أ/ب/ج/د، مع الإجابات في نهاية الملف أو بعد كل سؤال.</p></div>
                <label className="management-field">اسم الاختبار<input value={quizTitle} onChange={(event) => setQuizTitle(event.target.value)} placeholder="مثال: اختبار الوحدة الأولى" required /></label>
                <label className="management-field">سعر الاختبار بالجنيه المصري<input type="number" min="0" value={quizPrice} onChange={(event) => setQuizPrice(event.target.value)} /></label>
                <div className="pdf-import-row"><input type="file" accept="application/pdf" onChange={(event) => setPdfFile(event.target.files?.[0] || null)} required /><button type="submit" className="primary-btn">تحليل PDF</button></div>
                {pdfImportMessage && <div className="message">{pdfImportMessage}</div>}
                {pdfPreview && <div className="pdf-preview">{pdfPreview.questions.map((question) => <div key={question.id} className="pdf-question-preview"><strong>{question.id}. {question.text}</strong><div>{question.options.map((option, index) => <label key={option}><input type="radio" name={`pdf-${question.id}`} checked={question.correctOption === index} onChange={() => setPdfPreview((current) => ({ ...current, questions: current.questions.map((item) => item.id === question.id ? { ...item, correctOption: index } : item) }))} /> {option}</label>)}</div></div>)}<button type="button" className="primary-btn" onClick={savePdfQuiz} disabled={pdfSaving}>{pdfSaving ? 'جاري الحفظ في قاعدة البيانات...' : 'حفظ الاختبار بعد المراجعة'}</button></div>}
              </form>
              <form className="quiz-builder panel" onSubmit={createQuiz}>
                <label className="management-field">اسم الاختبار<input value={quizTitle} onChange={(event) => setQuizTitle(event.target.value)} placeholder="مثال: اختبار أساسيات البرمجة" required /></label>
                <label className="management-field">وصف الاختبار<input value={quizDescription} onChange={(event) => setQuizDescription(event.target.value)} placeholder="مراجعة الوحدة الأولى" /></label>
                <label className="management-field">السؤال<input value={questionText} onChange={(event) => setQuestionText(event.target.value)} placeholder="ما وظيفة المتغير؟" required /></label>
                <div className="quiz-builder-options">{questionOptions.map((option, index) => <label key={index} className="management-field">الاختيار {index + 1}<input value={option} onChange={(event) => setQuestionOptions((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} required /></label>)}</div>
                <label className="management-field">سعر الاختبار بالجنيه المصري<input type="number" min="0" value={quizPrice} onChange={(event) => setQuizPrice(event.target.value)} /></label>
                <label className="management-field">الإجابة الصحيحة<select value={correctOption} onChange={(event) => setCorrectOption(event.target.value)}><option value="0">الاختيار الأول</option><option value="1">الاختيار الثاني</option><option value="2">الاختيار الثالث</option><option value="3">الاختيار الرابع</option></select></label>
                <button type="submit" className="primary-btn">إضافة الاختبار</button>
              </form>
              {studentActionMessage && <div className="message">{studentActionMessage}</div>}
              <div className="quiz-admin-list">
                {quizList.map((quiz) => (
                  <article key={quiz.id} className="quiz-card">
                    {editingQuizId === quiz.id ? (
                      <div className="quiz-edit-fields">
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
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <h3>{quiz.title}</h3>
                          <p>{quiz.description}</p>
                          <span>{quiz.questions.length} أسئلة</span>
                        </div>
                        <div className="quiz-card-actions">
                          <button type="button" className="secondary-btn small-btn" onClick={() => startEditQuiz(quiz)}>تعديل الاسم والوصف</button>
                          <button type="button" className="small-btn danger-btn" onClick={async () => { await fetch(`${API_URL}/admin/quizzes/${quiz.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); setQuizList((current) => current.filter((item) => item.id !== quiz.id)); }}>حذف الاختبار</button>
                        </div>
                      </>
                    )}
                  </article>
                ))}
                {!quizList.length && <div className="empty-state">لم تتم إضافة اختبارات بعد.</div>}
              </div>
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
                <span>الدروس المتاحة</span>
                <strong>{dashboard.stats.activeLessons}</strong>
              </div>
              <div className="stat-card">
                <span>إجمالي أرصدة الطلاب</span>
                <strong>{dashboard.stats.totalWalletBalance.toLocaleString()} جنيه مصري</strong>
              </div>
              <div className="stat-card">
                <span>إجمالي المبالغ المحولة للمنصة</span>
                <strong>{(dashboard.stats.totalTransferredAmount ?? 0).toLocaleString()} جنيه مصري</strong>
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
                      {student.name} - الرصيد {student.balance} جنيه مصري
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

            {adminSection === 'videos' && <section className="video-panel">
              <div className="video-form-header">
                <h3>إضافة فيديو جديد</h3>
              </div>

              <form onSubmit={handleAddVideo} className="video-form">
                <label>
                  عنوان الفيديو
                  <input
                    type="text"
                    value={videoTitle}
                    onChange={(event) => setVideoTitle(event.target.value)}
                    placeholder="مثال: شرح الوحدة الأولى"
                  />
                </label>

                <label>
                  رابط الفيديو أو كود التضمين
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(event) => setVideoUrl(event.target.value)}
                    placeholder="الصق رابط الفيديو أو كود iframe كاملًا"
                  />
                </label>

                <label>
                  رابط غلاف الفيديو
                  <input
                    type="url"
                    value={videoCover}
                    onChange={(event) => setVideoCover(event.target.value)}
                    placeholder="https://example.com/cover.jpg"
                  />
                </label>

                <label>
                  أو رفع صورة غلاف من الجهاز
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleLocalCoverUpload(event, setVideoCover)}
                  />
                </label>

                <label>
                  سعر الفيديو (جنيه مصري)
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={videoPrice}
                    onChange={(event) => setVideoPrice(event.target.value)}
                    placeholder="10"
                  />
                </label>

                {videoFormError && <div className="error-box">{videoFormError}</div>}

                <button type="submit" className="primary-btn">
                  حفظ الفيديو
                </button>
              </form>
            </section>}

            {adminSection === 'videos' && <section className="video-library">
              <div className="video-player-box">
                {selectedVideo ? (
                  <>
                    <div className="video-player-header">
                      <h3>{selectedVideo.title}</h3>
                    </div>

                    <iframe
                      src={selectedVideo.url}
                      title={selectedVideo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="video-frame"
                    />
                  </>
                ) : (
                  <p>لا يوجد فيديو محدد</p>
                )}
              </div>

              <div className="video-grid">
                {videos.map((video) => (
                  <div key={video.id} className={`video-card ${selectedVideo?.id === video.id ? 'selected' : ''}`}>
                    <button
                      type="button"
                      className="video-card-main"
                      onClick={() => setSelectedVideo(video)}
                    >
                      <div
                        className="video-cover"
                        style={{ backgroundImage: `url('${video.cover}')` }}
                      >
                        <span className="play-badge">▶</span>
                      </div>
                      <span className="video-title">{video.title}</span>
                    </button>

                    {editingVideoId === video.id ? (
                      <div className="video-edit-box">
                        <label>
                          اسم الفيديو
                          <input
                            type="text"
                            value={editingVideoTitle}
                            onChange={(event) => setEditingVideoTitle(event.target.value)}
                          />
                        </label>
                        <label>
                          سعر الفيديو
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={editingVideoPrice}
                            onChange={(event) => setEditingVideoPrice(event.target.value)}
                          />
                        </label>
                        <label>
                          رابط غلاف الفيديو (اختياري)
                          <input
                            type="url"
                            value={editingVideoCover.startsWith('data:image') ? '' : editingVideoCover}
                            onChange={(event) => setEditingVideoCover(event.target.value)}
                            placeholder="https://example.com/cover.jpg"
                          />
                        </label>
                        <label>
                          أو رفع صورة غلاف من الجهاز
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => handleLocalCoverUpload(event, setEditingVideoCover)}
                          />
                        </label>
                        <div className="video-card-actions">
                          <button type="button" className="primary-btn small-btn" onClick={saveEditedVideo}>
                            حفظ
                          </button>
                          <button type="button" className="secondary-btn small-btn" onClick={cancelEditVideo}>
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="video-card-actions">
                        <button type="button" className="secondary-btn small-btn" onClick={() => startEditVideo(video)}>
                          تعديل الاسم
                        </button>
                        <button type="button" className="secondary-btn small-btn danger-btn" onClick={() => handleDeleteVideo(video.id)}>
                          حذف الفيديو
                        </button>
                      </div>
                    )}
                  </div>
                ))}
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
