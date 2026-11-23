import { useEffect, useRef, useState } from 'react';
const labels = { Pending: 'قيد المراجعة', Approved: 'تم الاعتماد', Rejected: 'مرفوض' };
const money = (value) => `${Number(value || 0).toLocaleString('ar-EG')} ج.م`;
const date = (value) => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleString('ar-EG') : '';
export function RechargeHistory({ requests }) {
  return <div className="recharge-history"><h3>طلبات الشحن السابقة</h3>{requests.map((request) => <article className={`recharge-status-item status-${request.status}`} key={request.id}>
    <div><strong>مبلغ التحويل: {money(request.amount)}</strong><span className="recharge-status-label">{labels[request.status] || 'جارٍ التحقق'}</span></div>
    <small>تاريخ الطلب: {date(request.createdAt)}</small>
    {request.status === 'Approved' && <p>تمت إضافة {money(request.creditedAmount ?? request.amount)} إلى رصيدك.</p>}
    {request.status === 'Rejected' && <p>سبب الرفض: {request.rejectionReason || 'تواصل مع المدرس لمعرفة السبب.'}</p>}
    {request.reviewedAt && <small>آخر مراجعة: {date(request.reviewedAt)}</small>}
  </article>)}{!requests.length && <p>لا توجد طلبات سابقة.</p>}</div>;
}

export default function RechargeStatus({ studentId, token, apiUrl, onRequests, onBalance }) {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState([]);
  const [busy, setBusy] = useState(false);
  const callbacks = useRef({ onRequests, onBalance });
  callbacks.current = { onRequests, onBalance };
  const refreshRef = useRef(null);
  useEffect(() => {
    let active = true;
    let inFlight = false;
    const controller = new AbortController();
    const key = `shefo-recharge-seen:${studentId}`;
    let seen = {};
    try { const stored = JSON.parse(localStorage.getItem(key) || '{}'); if (stored && typeof stored === 'object' && !Array.isArray(stored)) seen = stored; } catch { /* Private browsing. */ }
    const refresh = async () => {
      if (inFlight) return;
      inFlight = true;
      setBusy(true);
      try {
        const response = await fetch(`${apiUrl}/recharge-requests/my`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('تعذر تحديث حالة الشحن. حاول مرة أخرى.');
        const data = await response.json();
        if (!active) return;
        const list = data.requests || [];
        setRequests(list); callbacks.current.onRequests(list);
        if (Number.isFinite(data.balance)) callbacks.current.onBalance(data.balance);
        const changed = list.filter((request) => ['Approved', 'Rejected'].includes(request.status) && seen[request.id] !== request.status);
        if (changed.length) setNotice((current) => [...current.filter((old) => !changed.some((item) => item.id === old.id)), ...changed]);
        list.forEach((request) => { seen[request.id] = request.status; });
        try { localStorage.setItem(key, JSON.stringify(seen)); } catch { /* Status still works without storage. */ }
        setError('');
      } catch (err) {
        if (active && err.name !== 'AbortError') setError('تعذر تحديث حالة الشحن. حاول مرة أخرى.');
      } finally {
        inFlight = false;
        if (active) setBusy(false);
      }
    };
    refreshRef.current = refresh;
    const onVisible = () => { if (!document.hidden) refresh(); };
    refresh();
    const interval = setInterval(onVisible, 60000);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => { active = false; controller.abort(); clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('focus', onVisible); };
  }, [studentId, token, apiUrl]);
  return <section className="recharge-status-panel" aria-label="حالة طلبات الشحن">
    {notice.length > 0 && <div className="recharge-notice" role="status"><div>{notice.map((request) => <p key={request.id}>{request.status === 'Approved' ? `تم اعتماد طلب الشحن وإضافة ${money(request.creditedAmount ?? request.amount)} لرصيدك.` : `طلب شحن ${money(request.amount)} مرفوض. السبب: ${request.rejectionReason || 'تواصل مع المدرس.'}`}</p>)}</div><button type="button" className="secondary-btn" onClick={() => setNotice([])}>إخفاء الإشعار</button></div>}
    <details><summary>حالة طلبات الشحن {requests.some((request) => request.status === 'Pending') ? '• يوجد طلب قيد المراجعة' : ''}</summary>
      <p className="status-refresh-hint">تتحدث كل دقيقة أثناء فتح الصفحة، وعند الرجوع إليها.</p>
      <button type="button" className="secondary-btn" disabled={busy} onClick={() => refreshRef.current?.()}>{busy ? 'جاري التحديث...' : 'تحديث الحالة'}</button>
      {error && <p role="alert">{error}</p>}
      <RechargeHistory requests={requests} />
    </details>
  </section>;
}
