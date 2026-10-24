import { useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, Router as WouterRouter, useLocation, useRoute } from 'wouter';
import { ArrowLeft, ArrowUpLeft, Check, Heart, Search, ShieldCheck, Users } from 'lucide-react';
import {
  getGetCreatorQueryKey,
  getGetPlatformStatsQueryKey,
  getListCreatorsQueryKey,
  getListCreatorSupportersQueryKey,
  useApplyAsCreator,
  useGetCreator,
  useGetPlatformStats,
  useListCreatorSupporters,
  useListCreators,
  useSimulateDonation,
} from '@workspace/api-client-react';
import type { Creator, CreatorApplication, SupportRecord } from '@workspace/api-client-react';

const queryClient = new QueryClient();
const categories = [
  { value: '', label: 'كل المجالات' },
  { value: 'Gaming', label: 'الألعاب' },
  { value: 'Comedy', label: 'الكوميديا' },
  { value: 'Music', label: 'الموسيقى' },
  { value: 'Live', label: 'البث المباشر' },
  { value: 'Tech', label: 'التقنية' },
  { value: 'Art', label: 'الفن' },
];
const categoryName = (category: string) =>
  categories.find((item) => item.value === category)?.label ?? category;
const money = (amount: number) => `${Math.round(amount).toLocaleString('en-US')} د.ع`;
const dateLabel = (date: string) =>
  new Intl.DateTimeFormat('ar-IQ', { dateStyle: 'medium' }).format(new Date(date));
const progress = (raised: number, goal: number) =>
  goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;

function Header() {
  const [location] = useLocation();
  return (
    <header className="topbar">
      <div className="topbar-inner" dir="rtl">
        <Link href="/" className="brand" data-testid="link-home-brand" aria-label="دَعمني الصفحة الرئيسية">
          <span className="brand-mark">د</span>
          <span>دَعمني</span>
        </Link>
        <nav className="nav-links" aria-label="التنقل الرئيسي">
          <Link href="/" className={`nav-link ${location === '/' ? 'active' : ''}`} data-testid="link-discover">اكتشف المبدعين</Link>
          <Link href="/apply" className={`nav-link ${location === '/apply' ? 'active' : ''}`} data-testid="link-apply-nav">للمبدعين</Link>
        </nav>
        <Link href="/apply" className="nav-apply" data-testid="link-apply-cta">انضم كمبدع</Link>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer" dir="rtl">
      <div className="container footer-inner">
        <Link href="/" className="brand" data-testid="link-footer-brand"><span className="brand-mark">د</span><span>دَعمني</span></Link>
        <span data-testid="text-footer-disclaimer">مساحة عراقية لدعم الإبداع المحلي. كل عمليات الدعم هنا تجريبية ولا تنتقل فيها أموال حقيقية.</span>
      </div>
    </footer>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="site-shell" dir="rtl">
      <Header />
      {children}
      <Footer />
    </div>
  );
}

function ErrorMessage({ retry, testId = 'status-load-error' }: { retry: () => void; testId?: string }) {
  return (
    <div className="error-box" role="alert" data-testid={testId}>
      تعذّر تحميل البيانات الآن. حاول مرة أخرى بعد قليل.
      <button className="button" type="button" onClick={retry} data-testid="button-retry-load">إعادة المحاولة</button>
    </div>
  );
}

function CreatorCard({ creator, index }: { creator: Creator; index: number }) {
  const pct = progress(creator.goalRaised, creator.goalAmount);
  return (
    <article className="creator-card" style={{ animationDelay: `${index * 55}ms` }} data-testid={`card-creator-${creator.id}`}>
      <div className="creator-top">
        <div className="avatar" aria-hidden="true">{creator.name.trim().charAt(0)}</div>
        <div>
          <h3 data-testid={`text-creator-name-${creator.id}`}>{creator.name}</h3>
          <span className="creator-category" data-testid={`text-creator-category-${creator.id}`}>{categoryName(creator.category)}</span>
        </div>
        {creator.status === 'verified' && <span className="pill" data-testid={`status-creator-${creator.id}`}><ShieldCheck size={14} /> موثّق</span>}
      </div>
      <p className="creator-bio" data-testid={`text-creator-bio-${creator.id}`}>{creator.bio}</p>
      <div className="goal-meta">
        <span className="muted">تم جمعه <b data-testid={`text-goal-raised-${creator.id}`}>{money(creator.goalRaised)}</b></span>
        <span className="muted">{pct}٪</span>
      </div>
      <div className="progress" aria-label={`تحقق ${pct} بالمئة من الهدف`}><span style={{ width: `${pct}%` }} /></div>
      <div className="creator-card-bottom">
        <span className="muted" data-testid={`text-supporter-count-${creator.id}`}><Users size={15} /> {creator.supporterCount.toLocaleString('en-US')} داعم</span>
        <Link href={`/creators/${creator.slug}`} className="button button-soft" data-testid={`link-creator-profile-${creator.id}`}>زيارة الصفحة <ArrowLeft size={16} /></Link>
      </div>
    </article>
  );
}

function HomePage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const stats = useGetPlatformStats();
  const creators = useListCreators({ q: search.trim() || undefined, category: category || undefined });
  return (
    <Shell>
      <main className="container">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">دعمٌ من القلب، ومن هنا</span>
            <h1>خلّي إبداعهم <em>يكبر</em> بدعمك.</h1>
            <p>منصة عراقية تجمعك بصنّاع المحتوى الذين تحبهم. كلمة طيبة أو دعم رمزي يفرق وياهم.</p>
            <div className="hero-actions">
              <a href="#discover" className="button button-primary" data-testid="link-start-discovery">اكتشف المبدعين <ArrowLeft size={17} /></a>
              <Link href="/apply" className="button button-dark" data-testid="link-hero-apply">أنا صانع محتوى <ArrowUpLeft size={16} /></Link>
            </div>
          </div>
          <div className="hero-art" aria-label="تصميم ترحيبي لمنصة دَعمني">
            <span className="art-sun" />
            <div className="art-card" dir="rtl">
              <small>كل رسالة تصنع فرقاً</small>
              <strong>إبداع عراقي يستاهل</strong>
              <div className="progress" style={{ marginTop: 18 }}><span style={{ width: '68%' }} /></div>
            </div>
            <div className="art-stamp">مجتمع<br />يساندك</div>
          </div>
        </section>

        <section className="stats-strip" aria-label="إحصاءات المنصة">
          {stats.isLoading ? (
            <div className="stat-item"><div className="skeleton" style={{ height: 32 }} /><span>جارٍ تحميل الإحصاءات</span></div>
          ) : stats.isError ? (
            <div className="stat-item" data-testid="status-stats-error">
              <span>الإحصاءات غير متاحة حالياً</span>
              <button className="button" type="button" onClick={() => stats.refetch()} data-testid="button-retry-stats">إعادة المحاولة</button>
            </div>
          ) : (
            <>
              <div className="stat-item"><strong data-testid="value-platform-creators">{stats.data?.creatorCount.toLocaleString('en-US') ?? '—'}</strong><span>مبدع على المنصة</span></div>
              <div className="stat-item"><strong data-testid="value-platform-supports">{stats.data?.supportCount.toLocaleString('en-US') ?? '—'}</strong><span>دعم مجتمعي</span></div>
              <div className="stat-item"><strong data-testid="value-platform-total">{money(stats.data?.totalSupportAmount ?? 0)}</strong><span>إجمالي الدعم التجريبي</span></div>
            </>
          )}
        </section>

        <section className="section" id="discover">
          <div className="section-heading">
            <div><span className="eyebrow">مساحتهم هنا</span><h2>اكتشف المبدعين</h2><p>اختَر شخصاً تحب محتواه، وخلي دعمك يوصل له.</p></div>
          </div>
          <div className="search-row">
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', top: 14, insetInlineStart: 14, color: 'hsl(var(--muted-foreground))' }} />
              <input className="field" style={{ paddingInlineStart: 42 }} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث باسم المبدع أو مجاله" aria-label="ابحث عن مبدع" data-testid="input-search-creators" />
            </div>
            <select className="field category-select" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="تصفية حسب المجال" data-testid="select-creator-category">
              {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          {creators.isLoading ? (
            <div className="creator-grid" data-testid="status-creators-loading">{[1, 2, 3].map((num) => <div key={num} className="skeleton skeleton-card" />)}</div>
          ) : creators.isError ? (
            <ErrorMessage retry={() => creators.refetch()} />
          ) : creators.data?.length ? (
            <div className="creator-grid" data-testid="list-creators">{creators.data.map((creator, index) => <CreatorCard key={creator.id} creator={creator} index={index} />)}</div>
          ) : (
            <div className="empty-state" data-testid="status-creators-empty"><div className="empty-mark">؟</div><strong>ما لقينا مبدعين بهذا البحث</strong><p>جرّب كلمة ثانية أو اختَر مجالاً مختلفاً.</p><button className="button" type="button" onClick={() => { setSearch(''); setCategory(''); }} data-testid="button-clear-creator-filters">عرض كل المبدعين</button></div>
          )}
        </section>
      </main>
      <section className="how-section">
        <div className="container">
          <div className="section-heading"><div><span className="eyebrow">بكل بساطة</span><h2>الدعم يبدأ بخطوة</h2><p>ما يحتاج حساب ولا بيانات دفع. مجرد تقدير يوصل لصاحبه.</p></div></div>
          <div className="steps">
            <article className="step"><span className="step-no">الخطوة ٠١</span><h3>اكتشف شخصاً يلهمك</h3><p>تصفّح ملفات المبدعين العراقيين ومحتواهم.</p></article>
            <article className="step"><span className="step-no">الخطوة ٠٢</span><h3>اكتب كلمة طيبة</h3><p>اختر مبلغاً تجريبياً ورسالة تشجّع المبدع.</p></article>
            <article className="step"><span className="step-no">الخطوة ٠٣</span><h3>أرسل تقديرك</h3><p>تظهر المساهمة في سجل تجريبي علني، بلا دفع حقيقي.</p></article>
          </div>
        </div>
      </section>
    </Shell>
  );
}

function SupportForm({ creator, onSuccess }: { creator: Creator; onSuccess: (record: SupportRecord) => void }) {
  const queryClient = useQueryClient();
  const mutation = useSimulateDonation();
  const [amount, setAmount] = useState(5000);
  const [customAmount, setCustomAmount] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const chosenAmount = customAmount === '' ? amount : Number(customAmount);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    if (!Number.isInteger(chosenAmount) || chosenAmount < 1000 || chosenAmount > 5000000) {
      setFormError('اختر مبلغاً بين ١٬٠٠٠ و٥٬٠٠٠٬٠٠٠ دينار عراقي.');
      return;
    }
    mutation.mutate({
      slug: creator.slug,
      data: { amount: chosenAmount, displayName: anonymous ? null : displayName.trim() || null, isAnonymous: anonymous, message: message.trim() || null },
    }, {
      onSuccess: (record) => {
        void queryClient.invalidateQueries({ queryKey: getGetCreatorQueryKey(creator.slug) });
        void queryClient.invalidateQueries({ queryKey: getListCreatorSupportersQueryKey(creator.slug) });
        void queryClient.invalidateQueries({ queryKey: getGetPlatformStatsQueryKey() });
        onSuccess(record);
      },
      onError: () => setFormError('لم يتم تسجيل الدعم التجريبي. تأكد من البيانات وحاول مرة أخرى.'),
    });
  };
  return (
    <section className="panel support-panel" aria-labelledby="support-title">
      <h2 className="panel-title" id="support-title">أرسل دعماً تجريبياً</h2>
      <div className="notice" data-testid="text-simulation-notice">هذه تجربة فقط. لا تنتقل أموال حقيقية، ولا نطلب بيانات بطاقة أو حساب مصرفي.</div>
      <form onSubmit={submit} className="form-stack" noValidate>
        <span className="form-label">اختر المبلغ بالدينار العراقي</span>
        <div className="amount-options">
          {[1000, 2500, 5000, 10000].map((option) => (
            <button type="button" key={option} className={`amount-option ${customAmount === '' && amount === option ? 'selected' : ''}`} onClick={() => { setAmount(option); setCustomAmount(''); }} data-testid={`button-amount-${option}`}>{money(option)}</button>
          ))}
        </div>
        <label className="form-label" htmlFor="custom-amount">أو اكتب مبلغاً آخر</label>
        <input id="custom-amount" className="field" type="number" min="1000" max="5000000" step="1" inputMode="numeric" value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} data-testid="input-support-amount" />
        <label className="form-label" htmlFor="support-name">الاسم الذي سيظهر</label>
        <input id="support-name" className="field" value={displayName} maxLength={60} disabled={anonymous} onChange={(event) => setDisplayName(event.target.value)} placeholder={anonymous ? 'سيظهر الدعم باسم مجهول' : 'اسمك (اختياري)'} data-testid="input-supporter-name" />
        <label className="checkbox-line"><input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} data-testid="checkbox-anonymous-support" /><span>إظهار دعمي كمجهول</span></label>
        {!anonymous && <label className="form-label" htmlFor="support-message">رسالة للمبدع (اختياري)</label>}
        {!anonymous && <textarea id="support-message" className="field" rows={3} maxLength={240} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="اكتب كلمة تشجيع..." data-testid="input-support-message" />}
        {formError && <div className="error-box" role="alert" data-testid="status-support-error">{formError}</div>}
        <button type="submit" className="button button-primary button-wide" disabled={mutation.isPending} data-testid="button-submit-support">
          {mutation.isPending ? 'جارٍ تسجيل الدعم التجريبي…' : <>إرسال الدعم <Heart size={18} /></>}
        </button>
        <p className="hint" data-testid="text-support-status-hint">سيُسجّل هذا الدعم بحالة «تجريبي» ويظهر ضمن النشاط العام.</p>
      </form>
    </section>
  );
}

function SupportSuccess({ creator, record, onAgain }: { creator: Creator; record: SupportRecord; onAgain: () => void }) {
  return (
    <main className="container">
      <section className="panel success-card" data-testid="panel-support-success">
        <div className="result-mark"><Check size={25} /></div>
        <span className="eyebrow">وصل التقدير</span>
        <h1 data-testid="text-support-success-title">تم تسجيل دعمك التجريبي</h1>
        <p className="success-amount" data-testid={`value-support-success-amount-${record.id}`}>{money(record.amount)}</p>
        <p>إلى <b data-testid={`text-support-success-creator-${record.id}`}>{creator.name}</b></p>
        <p className="muted" data-testid={`text-support-success-message-${record.id}`}>{record.message ? `«${record.message}»` : 'بدون رسالة'}</p>
        <span className="pill status-simulated" data-testid={`status-support-record-${record.id}`}>الحالة: تجريبي</span>
        <div className="notice" style={{ marginTop: 20 }}>لم يتم خصم أي مبلغ. هذا سجل محاكاة لمشاركة الدعم المجتمعي.</div>
        <button className="button button-primary" style={{ marginTop: 22 }} type="button" onClick={onAgain} data-testid="button-support-again">إرسال دعم آخر</button>
      </section>
    </main>
  );
}

function ActivityList({ records, isLoading, isError, refetch }: { records?: SupportRecord[]; isLoading: boolean; isError: boolean; refetch: () => void }) {
  if (isLoading) return <div className="activity-list" data-testid="status-support-activity-loading"><div className="skeleton" style={{ height: 72 }} /><div className="skeleton" style={{ height: 72 }} /></div>;
  if (isError) return <ErrorMessage retry={refetch} testId="status-support-activity-error" />;
  if (!records?.length) return <div className="empty-state" data-testid="status-support-activity-empty"><div className="empty-mark">+</div><strong>لا يوجد دعم مسجّل بعد</strong><p>يمكنك أن تكون أول من يساند هذا المبدع.</p></div>;
  return (
    <div className="activity-list" data-testid="list-support-activity">
      {records.map((record) => (
        <article className="activity" key={record.id} data-testid={`row-support-record-${record.id}`}>
          <strong data-testid={`text-supporter-display-${record.id}`}>{record.isAnonymous ? 'داعم مجهول' : record.displayName || 'داعم من المجتمع'}</strong>
          <span className="amount" data-testid={`value-support-amount-${record.id}`}>{money(record.amount)}</span>
          {record.message && <span className="message" data-testid={`text-support-message-${record.id}`}>«{record.message}»</span>}
          <span className="status-line"><span className="pill status-simulated" data-testid={`status-support-${record.id}`}>تجريبي</span> <span className="hint" data-testid={`text-support-date-${record.id}`}>{dateLabel(record.createdAt)}</span></span>
        </article>
      ))}
    </div>
  );
}

function CreatorPage() {
  const [, params] = useRoute('/creators/:slug');
  const slug = params?.slug ?? '';
  const creator = useGetCreator(slug, { query: { queryKey: getGetCreatorQueryKey(slug), enabled: Boolean(slug) } });
  const supporters = useListCreatorSupporters(slug, { query: { queryKey: getListCreatorSupportersQueryKey(slug), enabled: Boolean(slug) } });
  const [successRecord, setSuccessRecord] = useState<SupportRecord | null>(null);
  if (creator.isLoading) return <Shell><main className="container profile-layout" data-testid="status-profile-loading"><div className="skeleton" style={{ height: 450 }} /><div className="skeleton" style={{ height: 560 }} /></main></Shell>;
  if (creator.isError) return <Shell><main className="container form-page"><div className="panel form-wrap"><ErrorMessage retry={() => creator.refetch()} testId="status-profile-error" /></div></main></Shell>;
  if (!creator.data) return <Shell><main className="container form-page"><div className="empty-state" data-testid="status-profile-not-found"><div className="empty-mark">؟</div><h1>لم نعثر على هذا المبدع</h1><Link href="/" className="button button-primary" data-testid="link-back-discovery">العودة لاكتشاف المبدعين</Link></div></main></Shell>;
  const data = creator.data;
  if (successRecord) return <Shell><SupportSuccess creator={data} record={successRecord} onAgain={() => setSuccessRecord(null)} /></Shell>;
  const pct = progress(data.goalRaised, data.goalAmount);
  return (
    <Shell>
      <main className="container profile-layout">
        <div>
          <section className="profile-hero" data-testid={`panel-creator-profile-${data.id}`}>
            <div className="profile-ident">
              <div className="avatar avatar-large" aria-hidden="true">{data.name.trim().charAt(0)}</div>
              <div><h1 data-testid={`text-profile-name-${data.id}`}>{data.name}</h1><p data-testid={`text-profile-category-${data.id}`}>{categoryName(data.category)} · <span dir="ltr">@{data.slug}</span></p></div>
              {data.status === 'verified' && <span className="pill" data-testid={`status-profile-verified-${data.id}`}><ShieldCheck size={14} /> موثّق</span>}
            </div>
            <p className="profile-bio" data-testid={`text-profile-bio-${data.id}`}>{data.bio}</p>
            <div className="inline-stats"><span><b data-testid={`value-profile-supporters-${data.id}`}>{data.supporterCount.toLocaleString('en-US')}</b> داعم</span><span>انضم <b data-testid={`text-profile-created-${data.id}`}>{dateLabel(data.createdAt)}</b></span></div>
          </section>
          <section className="panel" style={{ marginBottom: 18 }}>
            <h2 className="panel-title">هدف المبدع</h2>
            <div className="goal-meta"><span className="muted">تم جمعه <b data-testid={`value-profile-raised-${data.id}`}>{money(data.goalRaised)}</b></span><span className="muted">الهدف <b data-testid={`value-profile-goal-${data.id}`}>{money(data.goalAmount)}</b></span></div>
            <div className="progress"><span style={{ width: `${pct}%` }} /></div>
            <p className="hint" style={{ marginBottom: 0 }} data-testid={`text-profile-goal-percent-${data.id}`}>{pct}٪ من الهدف</p>
          </section>
          <section className="panel">
            <h2 className="panel-title">آخر رسائل الدعم</h2>
            <p className="hint">النشاط الظاهر هنا سجلات دعم تجريبية فقط.</p>
            <ActivityList records={supporters.data} isLoading={supporters.isLoading} isError={supporters.isError} refetch={() => { void supporters.refetch(); }} />
          </section>
        </div>
        <SupportForm creator={data} onSuccess={setSuccessRecord} />
      </main>
    </Shell>
  );
}

function ApplyPage() {
  const mutation = useApplyAsCreator();
  const queryClient = useQueryClient();
  const [submitted, setSubmitted] = useState<Creator | null>(null);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState<CreatorApplication>({ name: '', slug: '', category: 'Gaming', bio: '', goalAmount: 1000000 });
  const update = (key: keyof CreatorApplication, value: string | number) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    if (form.name.trim().length < 2 || form.name.trim().length > 80) { setFormError('اكتب اسماً من حرفين إلى ٨٠ حرفاً.'); return; }
    if (!/^[a-z0-9-]{3,30}$/.test(form.slug)) { setFormError('اكتب رابطاً من ٣ إلى ٣٠ حرفاً إنجليزياً صغيراً أو رقماً أو شرطة.'); return; }
    if (form.category.trim().length < 2 || form.category.trim().length > 60) { setFormError('اكتب مجالاً من حرفين إلى ٦٠ حرفاً.'); return; }
    if (form.bio.trim().length < 20 || form.bio.trim().length > 500) { setFormError('النبذة يجب أن تكون بين ٢٠ و٥٠٠ حرف.'); return; }
    if (!Number.isInteger(form.goalAmount) || form.goalAmount < 1000 || form.goalAmount > 1000000000) { setFormError('الهدف يجب أن يكون بين ١٬٠٠٠ و١٬٠٠٠٬٠٠٠٬٠٠٠ دينار.'); return; }
    mutation.mutate({ data: { ...form, name: form.name.trim(), category: form.category.trim(), bio: form.bio.trim() } }, {
      onSuccess: (creator) => {
        setSubmitted(creator);
        void queryClient.invalidateQueries({ queryKey: getListCreatorsQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getGetPlatformStatsQueryKey() });
      },
      onError: () => setFormError('لم نتمكن من إرسال الطلب الآن. راجع البيانات وحاول مرة أخرى.'),
    });
  };
  return (
    <Shell>
      <main className="container form-page">
        <div className="form-wrap">
          <div className="form-intro"><span className="eyebrow">صوتك يستاهل مساحة</span><h1>قدّم ملفك كمبدع</h1><p>عرّف مجتمعنا على شغلك. هذه الخطوة ترسل ملفك للمنصة، ولا تتطلب معلومات مالية أو مصرفية.</p></div>
          {submitted ? (
            <section className="panel result-box" data-testid="panel-application-success">
              <div className="result-mark"><Check size={25} /></div>
              <h2 data-testid="text-application-success-title">وصل طلبك يا {submitted.name}</h2>
              <p className="muted">تم إرسال الملف بنجاح. حالة الملف الحالية: <span className="pill" data-testid={`status-application-${submitted.id}`}>{submitted.status === 'verified' ? 'موثّق' : submitted.status === 'pending' ? 'قيد المراجعة' : 'موقوف'}</span></p>
              <p data-testid={`text-application-slug-${submitted.id}`}>رابطك: <b dir="ltr">/creators/{submitted.slug}</b></p>
              <p className="hint">يمكنك العودة إلى الاكتشاف لمتابعة المبدعين الموجودين حالياً.</p>
              <Link href="/" className="button button-primary" data-testid="link-application-home">العودة إلى الرئيسية</Link>
            </section>
          ) : (
            <form className="panel form-stack" onSubmit={submit} noValidate data-testid="form-creator-application">
              <div className="notice">نحتاج نبذة بسيطة عنك ومحتواك فقط. لا تدخل معلومات بطاقة أو حساب بنكي.</div>
              <label className="form-label" htmlFor="creator-name">اسم المبدع أو القناة</label>
              <input className="field" id="creator-name" required minLength={2} maxLength={80} value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="مثال: نور آرت" data-testid="input-application-name" />
              <label className="form-label" htmlFor="creator-slug">الرابط المختصر</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="muted" dir="ltr">/creators/</span><input className="field" id="creator-slug" required pattern="[a-z0-9-]{3,30}" dir="ltr" value={form.slug} onChange={(event) => update('slug', event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="noor-art" data-testid="input-application-slug" /></div>
              <label className="form-label" htmlFor="creator-category">مجال المحتوى</label>
              <select className="field" id="creator-category" value={form.category} onChange={(event) => update('category', event.target.value)} data-testid="select-application-category">
                {categories.filter((item) => item.value).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <label className="form-label" htmlFor="creator-bio">نبذة عنك وعن محتواك</label>
              <textarea className="field" id="creator-bio" required minLength={20} maxLength={500} rows={5} value={form.bio} onChange={(event) => update('bio', event.target.value)} placeholder="شاركنا ما تقدّمه ولماذا تحب هذا المجال..." data-testid="input-application-bio" />
              <label className="form-label" htmlFor="creator-goal">هدف الدعم (د.ع)</label>
              <input className="field" id="creator-goal" type="number" min={1000} max={1000000000} step={1} value={form.goalAmount} onChange={(event) => update('goalAmount', Number(event.target.value))} data-testid="input-application-goal" />
              <p className="hint">الهدف يوضح لمجتمعك ما الذي تطمح إلى تحقيقه. الحد الأدنى ١٬٠٠٠ دينار.</p>
              {formError && <div className="error-box" role="alert" data-testid="status-application-error">{formError}</div>}
              <button type="submit" className="button button-primary button-wide" disabled={mutation.isPending} data-testid="button-submit-application">{mutation.isPending ? 'جارٍ إرسال الطلب…' : 'إرسال طلب الانضمام'}</button>
              <p className="hint" data-testid="text-application-submission-note">سيظهر لك تأكيد واضح بعد إرسال الطلب، مع حالة الملف المعتمدة من النظام.</p>
            </form>
          )}
        </div>
      </main>
    </Shell>
  );
}

function NotFoundPage() {
  return <Shell><main className="container form-page"><div className="empty-state"><div className="empty-mark">؟</div><h1>هذه الصفحة غير موجودة</h1><Link href="/" className="button button-primary" data-testid="link-not-found-home">العودة للرئيسية</Link></div></main></Shell>;
}

function Router() {
  return <Switch>
    <Route path="/" component={HomePage} />
    <Route path="/apply" component={ApplyPage} />
    <Route path="/creators/:slug" component={CreatorPage} />
    <Route component={NotFoundPage} />
  </Switch>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
