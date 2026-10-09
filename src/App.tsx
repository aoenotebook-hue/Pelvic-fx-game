import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, CircleHelp, ClipboardCheck, Cloud, CloudOff, Download, GraduationCap, Home, LayoutDashboard, LockKeyhole, Map, Play, RefreshCw, ShieldCheck, TriangleAlert, Wifi, WifiOff } from "lucide-react";
import { appConfig } from "./config";
import { MiniGameJourney } from "./screens/MiniGameJourney";
import { AccountMenu } from "./account/AccountMenu";
import { PracticeReset } from "./account/PracticeReset";
import { ArtGallery } from "./art/ArtGallery";
import { MINIGAME_VERSION, isGameVersion } from "./games/spec";
import { correctionReviewed, LEARNING_VERSION } from "./domain/learningRules";
import { LearningSummary } from "./learning/LearningSummary";
import { FacultyWorkspace } from "./faculty/FacultyWorkspace";
import { activateContent, assetById, correctionById, pelvicTraumaContent, resourceById, sourceDocumentById, latestContent } from "./content/registry";
import { computeRewards, clothingLevelFor, rankRewards, LEGACY_VERSION } from "./domain/rewards";
import { beginPractice, beginRevision, resolveSession, saveSession, type AttemptSession } from "./storage/session";
import { answerIsCorrect, deriveProgress, nextClientSequence } from "./domain/engine";
import type { Confidence, LearningEvent, Node, SafetyConceptId } from "./domain/types";
import { importAcceptedEvents, acknowledgeEvents, hasCompletionReceipt, appendEventAtomically, getOfflinePack, loadDraft, loadEvents, pendingEvents, saveDraft, stageOfflinePack, storeSubmissionRejections, submissionRejections } from "./storage/db";
import { createBackendAdapter } from "./sync/adapter";
import { recoverKnownCompletion } from "./sync/completionRecovery";
import type { LeaderboardRow } from "./sync/adapter";
import { createBaseEvent, setActiveLearnerId, setActiveContentVersion } from "./utils/events";
import { I18nContext, localizeCorrection, localizeMission, localizeNode, localizeResource, t, useLanguage, type Language } from "./i18n";

type View = "avatar" | "home" | "access" | "orientation" | "missions" | "decision" | "resources" | "reflection" | "progress" | "followup" | "faculty" | "help";
type CharacterReaction = "observe" | "urgent" | "inspect" | "communicate" | "celebrate" | "reconsider";
type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const backend = createBackendAdapter();
let accountKey: string = `${appConfig.mode}:${appConfig.demoUserId}`;
let attemptId: string = appConfig.demoAttemptId;
const avatarChoices = [
  { id: "maya", role: "Calm observer", path: "/assets/student-avatar.png", reactionSet: 1 },
  { id: "niran", role: "Pattern finder", path: "/assets/student-avatar-niran.png", reactionSet: 2 },
  { id: "arin", role: "Team communicator", path: "/assets/student-avatar-arin.png", reactionSet: 3 },
  { id: "learner4", role: "Focused coordinator", path: "/assets/student-avatar-4.png", reactionSet: 4 }
] as const;

const course = {
  title: "Pelvic Trauma Decisions", estimatedMinutes: 45, due: null as string | null,
  classUrl: null as string | null, classLocation: null as string | null, supportContact: null as string | null,
  timeZone: "Asia/Bangkok", retentionPolicy: null as string | null, privacyNoticeUrl: null as string | null,
  day2Url: null as string | null, day7Url: null as string | null
};

function App() {
  const storedAvatarId = localStorage.getItem("ptd-avatar");
  const [language, setLanguageState] = useState<Language>(() => localStorage.getItem("ptd-language") === "th" ? "th" : "en");
  const [view, setView] = useState<View>(window.location.hash.startsWith("#teacher") ? "faculty" : storedAvatarId ? "home" : "avatar");
  const [avatarId, setAvatarId] = useState(storedAvatarId ?? avatarChoices[0].id);
  const [events, setEvents] = useState<LearningEvent[]>([]);
  const [activeVersion, setActiveVersion] = useState(pelvicTraumaContent.id);
  const [ready, setReady] = useState(false);
  const [nodeId, setNodeId] = useState("M1N1");
  const [offlineState, setOfflineState] = useState<"none" | "downloading" | "ready" | "incomplete">("none");
  const [notice, setNotice] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [staffAuthorized,setStaffAuthorized]=useState(appConfig.mode==="demo");
  const [authRevision,setAuthRevision]=useState(0);
  const [signedIn, setSignedIn] = useState(appConfig.mode === "demo");
  const [studentId,setStudentId]=useState("");
  const [resetOpen,setResetOpen]=useState(false);
  const currentSession=useRef<AttemptSession|null>(null);
  const [navigationRevision, setNavigationRevision] = useState(0);
  const navigate = (next: View) => { setView(next); setNavigationRevision(value => value + 1); };
  const syncRunning=useRef(false);

  const progress = useMemo(() => deriveProgress(pelvicTraumaContent, events), [events, activeVersion]);
  const rewards = useMemo(() => computeRewards(pelvicTraumaContent, events, progress), [events, progress, activeVersion]);
  const rewardScore = rewards.total;
  const masteredCount = progress.clearedNodeIds.length;
  const packBytes = new Blob([JSON.stringify(pelvicTraumaContent)]).size;
  const avatar = avatarChoices.find((item) => item.id === avatarId) ?? avatarChoices[0];
  const pendingCount = useMemo(() => events.filter((event) => !event.serverReceiptTimestamp).length, [events]);
  const setLanguage = (next: Language) => { localStorage.setItem("ptd-language", next); document.documentElement.lang = next; setLanguageState(next); };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    let active=true;let generation=0;let authenticatedIdentity:string|null|undefined=undefined;
    const initialize=async(userId:string|null|undefined)=>{
      const revision=++generation;accountKey="connected:changing-account";setSignedIn(appConfig.mode==="demo"||Boolean(userId));setStaffAuthorized(appConfig.mode==="demo");setEvents([]);setReady(false);
      try {
        if(appConfig.mode==="connected"&&!userId){accountKey="connected:signed-out";setView("access");return;}
        const partition=`${appConfig.mode}:${userId??appConfig.demoUserId}`;
        if(active&&revision===generation)setStudentId(localStorage.getItem(`ptd-student-id:${partition}`)??"");
        let session=await resolveSession(partition,userId??appConfig.demoUserId);
        if(!active||revision!==generation)return;
        if(appConfig.mode==="connected"&&navigator.onLine){
          try{const profile=await backend.learnerContext?.();if(!active||revision!==generation)return;setStudentId(profile?.studentId??"");localStorage.setItem(`ptd-student-id:${partition}`,profile?.studentId??"");
            const remote=await backend.learnerAttempts?.()??[];
            if(!active||revision!==generation)return;
            for(const item of remote){if(!active||revision!==generation)return;await importAcceptedEvents(partition,item.events);if(!active||revision!==generation)return;localStorage.setItem(`ptd-session:${item.attemptId}`,JSON.stringify({...item,events:undefined}));}
            const local=await loadEvents(partition,session.attemptId);
            if(!active||revision!==generation)return;
            if(!local.length&&session.kind!=="practice"&&remote.length){const resumed=remote.find(item=>item.attemptId===session.attemptId)??remote.find(item=>item.kind==="initial")??remote[0];session={attemptId:resumed.attemptId,contentVersion:resumed.contentVersion,kind:resumed.kind,originalAttemptId:resumed.originalAttemptId};saveSession(partition,session);}
          }catch{if(active&&revision===generation)setNotice("Saved progress is available on this device. Online resume could not be checked.");}
        }
        const [stored,pack]=await Promise.all([loadEvents(partition,session.attemptId),getOfflinePack(partition,session.contentVersion)]);
        if(!active||revision!==generation)return;
        accountKey=partition;attemptId=session.attemptId;currentSession.current=session;setActiveLearnerId(userId??appConfig.demoUserId);
        activateContent(session.contentVersion);setActiveContentVersion(session.contentVersion);setActiveVersion(session.contentVersion);
        setEvents(stored);setOfflineState(pack?.state==="staging"?"downloading":pack?.state??"none");
        if(appConfig.mode==="connected"){setView(window.location.hash.startsWith("#teacher")?"faculty":"home");void backend.facultyWorkspace?.("context").then(result=>{if(active&&revision===generation)setStaffAuthorized(Boolean(result.authorized));}).catch(()=>undefined);}
        setAuthRevision(value=>value+1);
      }catch{if(active)setNotice("Device storage is unavailable. Progress cannot be saved until this is resolved.");}
      finally{if(active&&revision===generation)setReady(true);}
    };
    const authChanged=(userId:string|null|undefined)=>{if(userId===authenticatedIdentity&&userId!==undefined){setAuthRevision(value=>value+1);return;}authenticatedIdentity=userId;void initialize(userId);};
    let authSignals = 0;
    const refreshIdentity = () => {
      const signal = authSignals;
      void backend.currentUserId?.().then(userId => { if(active && signal === authSignals)authChanged(userId); }).catch(() => { if(active)setNotice("Could not check sign-in. Check your connection and try again."); });
    };
    const unsubscribe=backend.onAuthChange?.(userId => { if(!active)return;authSignals++;authChanged(userId); });
    refreshIdentity();
    const checkVisibleSession = () => { if(document.visibilityState === "visible")refreshIdentity(); };
    window.addEventListener("focus",refreshIdentity);document.addEventListener("visibilitychange",checkVisibleSession);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
    const onUpdate = () => setUpdateAvailable(true);
    window.addEventListener("online", onOnline); window.addEventListener("offline", onOffline);
    window.addEventListener("beforeinstallprompt", onInstall); window.addEventListener("ptd:update-available", onUpdate);
    return () => { active=false;generation++;unsubscribe?.();window.removeEventListener("focus",refreshIdentity);document.removeEventListener("visibilitychange",checkVisibleSession);window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); window.removeEventListener("beforeinstallprompt", onInstall); window.removeEventListener("ptd:update-available", onUpdate); };
  }, []);

  const addEvent = useCallback(async (event: LearningEvent) => {
    try {
      const partition=accountKey;
      const saved=await appendEventAtomically(partition, event);
      if(partition===accountKey && event.attemptId===attemptId) setEvents((current) => current.some(item=>item.eventId===event.eventId)?current:[...current,saved??event]);
      setNotice("Saved on this device");
      return true;
    } catch {
      setNotice("Not saved. Check available browser storage and try again.");
      return false;
    }
  }, []);

  const sync = useCallback(async () => {
    if (!online) { setNotice("Connect to submit"); return; }
    if(syncRunning.current)return;syncRunning.current=true;
    const partition=accountKey,targetAttempt=attemptId;
    try {
      if(backend.learnerAttempts){const remote=await backend.learnerAttempts();if(partition!==accountKey)return;for(const saved of remote){if(partition!==accountKey)return;await importAcceptedEvents(partition,saved.events);}}
      const queued = await pendingEvents(partition);
      if(partition!==accountKey)return;
      if (!queued.length) {
        const saved = await loadEvents(partition, targetAttempt);
        const { checked, receipt } = await recoverKnownCompletion(backend, targetAttempt, saved);
        if (receipt) await acknowledgeEvents(partition, [], receipt);
        if (partition === accountKey && targetAttempt === attemptId) {
          setEvents(saved);
          setNotice(receipt ? "Course completion confirmed" : checked ? "No pending events; completion status checked." : "No pending events. Start a quest when you are ready.");
        }
        return;
      }
      const result = await backend.syncEvents(queued);
      await acknowledgeEvents(partition, result.acknowledgments, result.completionReceipt);
      await storeSubmissionRejections(partition,result.rejected);
      try {const recovered=await backend.recoverCompletion?.(targetAttempt);if(recovered)await acknowledgeEvents(partition,[],recovered);}catch {/* Acknowledgments are durable even if receipt recovery must retry. */}
      const refreshed = await loadEvents(partition, targetAttempt);
      if(partition===accountKey&&targetAttempt===attemptId)setEvents(refreshed);
      if(partition===accountKey&&targetAttempt===attemptId)setNotice(appConfig.mode === "demo" ? "Demo sync checked locally; no course server was contacted." : result.rejected.length || result.retryable.length ? `Accepted ${result.acknowledgments.length}; ${result.retryable.length} waiting and ${result.rejected.length} rejected. Completion is not confirmed.` : result.completionReceipt ? "Course completion confirmed" : "Events accepted; course completion not yet confirmed.");
    } catch {
      if(partition===accountKey&&targetAttempt===attemptId)setNotice("Submission did not finish. Your work remains saved on this device.");
    } finally {syncRunning.current=false;}
  }, [online]);

  useEffect(() => { if(!online||!ready||!signedIn)return;const timer=setTimeout(()=>{void sync();},400);return()=>clearTimeout(timer); }, [online,ready,signedIn,pendingCount,authRevision,sync]);

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [view, nodeId]);

  const downloadPack = async () => {
    if (!online) { setNotice("Initial access and download need an internet connection."); return; }
    setOfflineState("downloading");
    try {
      const pack = await stageOfflinePack(accountKey, pelvicTraumaContent.id, packBytes, false, ["/index.html", ...pelvicTraumaContent.assets.flatMap((asset) => asset.path ? [asset.path] : []), ...pelvicTraumaContent.sourceDocuments.map((source) => source.href.split("#")[0])]);
      setOfflineState(pack.state === "staging" ? "downloading" : pack.state);
      setNotice(pack.state === "ready" ? "Offline files verified" : "Offline files are not fully cached. Use a production build, wait for installation and reload, then retry.");
    } catch { setOfflineState("incomplete"); setNotice("Download incomplete. Retry when storage is available."); }
  };

  const start = () => {
    if (progress.answeredNodeIds.length === 0) { setView("orientation"); return; }
    const first = pelvicTraumaContent.nodes.find((node) => !progress.clearedNodeIds.includes(node.id));
    if (first) { setNodeId(first.id); setView("decision"); }
    else if (!progress.reflection) setView("reflection");
    else setView("progress");
  };
  const startRevision = async () => {
    const session = beginRevision(accountKey, accountKey.slice(accountKey.indexOf(":") + 1));
    currentSession.current=session;
    attemptId = session.attemptId;
    activateContent(session.contentVersion);
    setActiveContentVersion(session.contentVersion);
    setActiveVersion(session.contentVersion);
    setEvents(await loadEvents(accountKey, attemptId));
    setNodeId("M1N1");
    setOfflineState((await getOfflinePack(accountKey, session.contentVersion))?.state === "ready" ? "ready" : "none");
    setView("home");
  };
  const resetPractice=async()=>{if(!currentSession.current)return;const session=beginPractice(accountKey,currentSession.current);currentSession.current=session;attemptId=session.attemptId;setEvents([]);setNodeId("M1N1");setResetOpen(false);navigate("home");setNotice(language==="th"?"เริ่มการฝึกใหม่ ผลเดิมยังถูกเก็บไว้":"New practice started. Your assessed result is preserved.");if(online)try{await backend.startAttempt?.(session);}catch{setNotice(language==="th"?"การฝึกใหม่บันทึกในเครื่อง จะส่งเมื่อเชื่อมต่อได้":"Practice saved on this device; server registration will retry when you submit.");}};

  useEffect(() => {
    const modelContext = (document as Document & { modelContext?: { registerTool(tool: unknown, options?: { signal?: AbortSignal }): void | Promise<void> } }).modelContext;
    if (!modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    const register = async () => {
      await modelContext.registerTool({
        name: "get_learning_progress", title: "Get learning progress",
        description: "Read this device's current core-decision, safety-concept and completion progress.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: () => ({ answeredCoreDecisions: progress.answeredNodeIds.length, corePoints: progress.score, resolvedSafetyConcepts: progress.concepts.filter((item) => item.resolved).length, locallyComplete: progress.locallyComplete })
      }, { signal: lifecycle.signal });
      await modelContext.registerTool({
        name: "start_or_resume_learning", title: "Start or resume learning",
        description: "Open the visible learner orientation or the earliest unanswered core decision.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: () => { start(); return { opened: progress.answeredNodeIds.length ? "next-decision" : "orientation" }; }
      }, { signal: lifecycle.signal });
    };
    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, [progress.answeredNodeIds.length, progress.score, progress.locallyComplete]);

  if (!ready) return <div className="loading" role="status">Loading your saved learning…</div>;
  if(import.meta.env.DEV&&window.location.hash==="#/art")return <ArtGallery/>;

  const visibleView = appConfig.mode === "connected" && !signedIn ? "access" : view;
  return (
    <I18nContext.Provider value={{ language, setLanguage }}>
    <div className="app-shell" lang={language}>
      <header className="topbar">
        <div className="brand-lockup">
          <div className="institution-logos" aria-label="Faculty of Medicine Ramathibodi Hospital, Mahidol University and CNMI Orthopaedic Surgery">
            <img src="/assets/faculty-mahidol.png" alt="Mahidol University" />
            <img src="/assets/cnmi.png" alt="CNMI Ramathibodi Orthopaedic Surgery" />
          </div>
          <button className="brand" onClick={() => navigate("home")} aria-label="Pelvic Trauma Decisions home">
            <span className="brand-mark" aria-hidden="true">PT</span>
            <span><strong>Pelvic Trauma Decisions</strong><small>{t("pre-class clinical quest", language)}</small></span>
          </button>
        </div>
        <div className="status-cluster">
          <button className="language-toggle" onClick={() => setLanguage(language === "en" ? "th" : "en")} aria-label={language === "en" ? "เปลี่ยนเป็นภาษาไทย" : "Switch to English"}>{language === "en" ? "ไทย" : "EN"}</button>
          {signedIn&&studentId&&<span className="student-id">{language==="th"?"รหัสนักศึกษา":"Student ID"}: {studentId}</span>}
          {appConfig.mode === "connected" && signedIn && <AccountMenu studentId={studentId} onProgress={()=>navigate("progress")} onSync={()=>void sync()} onReset={()=>setResetOpen(true)} language={language} pendingCount={pendingCount} signOut={async () => { if (!backend.signOut) throw new Error("Sign-out unavailable"); await backend.signOut(); }} onSignedOut={() => {
            setSignedIn(false);setStaffAuthorized(false);setEvents([]);accountKey="connected:signed-out";setView("access");
            window.history.replaceState(null,"",window.location.pathname+window.location.search);
            setNotice(language==="th"?"ออกจากระบบแล้ว งานที่บันทึกไว้ยังอยู่ในอุปกรณ์นี้":"Signed out. Saved work stays on this device.");
          }} />}
          <button className="demo-pill" onClick={() => setView("access")}>{appConfig.mode === "demo" ? "DEMO · fictional records" : "CONNECTED"}</button>
          <span className="connection" aria-live="polite">{online ? <Wifi size={16} /> : <WifiOff size={16} />}{t(online ? "Online" : "Offline", language)}</span>
        </div>
      </header>

      {notice && <div className="notice" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss message">×</button></div>}
      {resetOpen&&<PracticeReset thai={language==="th"} onCancel={()=>setResetOpen(false)} onConfirm={()=>void resetPractice()}/>}
      {updateAvailable && <div className="notice update" role="status"><span>Update available. Finish your current answer before refreshing.</span><button onClick={() => window.dispatchEvent(new CustomEvent("ptd:apply-update"))}>Refresh now</button></div>}

      <div className={signedIn ? "layout" : "layout signed-out-layout"}>
        {signedIn && <>
        <nav className="side-nav" aria-label="Main navigation">
          {view === "faculty" ? <button className="secondary" onClick={() => {window.history.replaceState(null,"",window.location.pathname+window.location.search);setView("home");}}>{language==="th"?"กลับเกมนักศึกษา":"Back to student game"}</button> : <>
          <NavButton icon={<Home />} label={t("Home", language)} active={view === "home"} onClick={() => navigate("home")} />
          <NavButton icon={<Map />} label={t("Quests", language)} active={["missions", "decision"].includes(view)} onClick={() => navigate("missions")} />
          <NavButton icon={<BookOpen />} label={t("Resources", language)} active={view === "resources"} onClick={() => navigate("resources")} />
          <NavButton icon={<ClipboardCheck />} label={t("My progress", language)} active={["progress", "reflection"].includes(view)} onClick={() => navigate("progress")} />
          </>}
          <NavButton icon={<CircleHelp />} label={t("Help", language)} active={view === "help"} onClick={() => setView("help")} />
          <div className="nav-sync">
            <button className="secondary full" onClick={sync} disabled={!signedIn}><RefreshCw size={18} /> {t("Sync now", language)}</button>
            <small>{pendingCount ? `${pendingCount} ${t("waiting to sync", language)}` : t("Saved and checked", language)}</small>
          </div>
          <small className="game-credit">{t("Game by Sorawut Thamyongkit", language)}</small>
          {staffAuthorized && view!=="faculty" && <a className="teacher-entry" href="#teacher" onClick={() => setView("faculty")}>{language==="th"?"สำหรับอาจารย์":"Teacher area"}</a>}
        </nav>
        </>}

        <main id="main-content" className="main">
          {visibleView === "access" && !signedIn ? <AccessView /> : <>
          {activeVersion !== latestContent.id && <div className="version-resume"><span>{language === "th" ? "กำลังทำเวอร์ชันเดิมที่บันทึกไว้" : "Resuming your original saved version"}</span><button className="quiet" onClick={() => void startRevision()}>{language === "th" ? "เปิดเรื่องราวและ rewards ใหม่" : "Open revised cases and rewards"}</button></div>}
          {view!=="faculty"&&<GlobalProgress progress={progress.answeredNodeIds.length} />}
          {isGameVersion(activeVersion)&&!["avatar","access","faculty","help"].includes(view)?<><MiniGameJourney content={pelvicTraumaContent} events={events} addEvent={addEvent} attemptId={attemptId} partition={accountKey} avatar={avatar} view={view} navigationRevision={navigationRevision}/><details className="offline-tools"><summary>{language==="th"?"ใช้เกมแบบ offline":"Offline access"}</summary><button className="secondary" onClick={downloadPack}>{language==="th"?"ดาวน์โหลดสำหรับ offline":"Download for offline"} · {offlineState}</button></details></>:<>
          {view === "avatar" && <AvatarPicker selectedId={avatar.id} choose={(id) => { localStorage.setItem("ptd-avatar", id); setAvatarId(id); setView("home"); }} />}
          {view === "home" && <HomeView progress={progress} start={start} go={setView} openMission={(node: string) => { setNodeId(node); setView("decision"); }} offlineState={offlineState} downloadPack={downloadPack} packBytes={packBytes} installPrompt={installPrompt} setInstallPrompt={setInstallPrompt} avatar={avatar} masteredCount={masteredCount} rewardScore={rewardScore} chooseAvatar={() => setView("avatar")} />}
          {view === "access" && <AccessView />}
          {view === "orientation" && <Orientation go={setView} />}
          {view === "missions" && <MissionMap events={events} progress={progress} choose={(firstNode) => { setNodeId(firstNode); setView("decision"); }} />}
          {view === "decision" && <DecisionFlow nodeId={nodeId} setNodeId={setNodeId} events={events} addEvent={addEvent} go={setView} avatarPath={avatar.path} avatarId={avatar.id} masteredCount={masteredCount} />}
          {view === "resources" && <ResourcesView addEvent={addEvent} events={events} go={setView} />}
          {view === "reflection" && <ReflectionView events={events} addEvent={addEvent} progress={progress} go={setView} />}
          {view === "progress" && <ProgressView progress={progress} events={events} go={setView} sync={sync} avatarId={avatar.id} />}
          {view === "followup" && <FollowUp />}
          </>}
          {view === "faculty" && (staffAuthorized ? <FacultyDashboard progress={progress} events={events} addEvent={addEvent} /> : <p>Assigned faculty authorization is required.</p>)}
          {view === "help" && <HelpView addEvent={addEvent} events={events} offlineState={offlineState} installPrompt={installPrompt} setInstallPrompt={setInstallPrompt} />}
          </>}
        </main>
      </div>
    </div>
    </I18nContext.Provider>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick(): void }) {
  return <button className={active ? "nav-item active" : "nav-item"} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function GlobalProgress({ progress }: { progress: number }) {
  const count=pelvicTraumaContent.nodes.length;
  return <div className="global-progress" aria-label={`${progress} of ${count} learning stations answered`}><span style={{ width: `${Math.round(progress / count * 100)}%` }} /></div>;
}

function AvatarPicker({ selectedId, choose }: { selectedId: string; choose(id: string): void }) {
  const { language } = useLanguage();
  const [active, setActive] = useState(selectedId);
  return <section className="avatar-picker page-enter"><div><span className="eyebrow">{t("CREATE YOUR PLAYER", language)}</span><h1>{t("Choose your clinical learner", language)}</h1><p className="lede">{t("Characters have no names or gameplay advantage. Choose the appearance you want for this quest.", language)}</p></div><div className="avatar-options">{avatarChoices.map((choice, index) => <button key={choice.id} className={active === choice.id ? "avatar-option selected" : "avatar-option"} onClick={() => setActive(choice.id)} aria-pressed={active === choice.id} aria-label={`${language === "th" ? "เลือก" : "Choose"} ${t("Character", language)} ${index + 1}: ${t(choice.role, language)}`}><img src={choice.path} alt="" /><span><strong>{t("Character", language)} {index + 1}</strong><small>{t(choice.role, language)}</small></span>{active === choice.id && <Check aria-hidden="true" />}</button>)}</div><button className="primary avatar-confirm" onClick={() => choose(active)}>{t("Start quest", language)}<Play /></button></section>;
}

function HomeView({ progress, start, go, openMission, offlineState, downloadPack, packBytes, installPrompt, setInstallPrompt, avatar, masteredCount, rewardScore, chooseAvatar }: any) {
  const { language } = useLanguage();
  const percent = Math.round(progress.answeredNodeIds.length / 15 * 100);
  const install = async () => { if (installPrompt) { await installPrompt.prompt(); await installPrompt.userChoice; setInstallPrompt(null); } };
  return (
    <section className="stack page-enter">
      <div className="eyebrow">{t("PRECLASS CLINICAL QUEST · 15 DECISIONS", language)}</div>
      <SimulationRoute progress={progress} chooseMission={openMission} avatarPath={avatar.path} avatarId={avatar.id} masteredCount={masteredCount} rewardScore={rewardScore} chooseAvatar={chooseAvatar} />
      <div className="home-grid">
        <article className="hero-card">
          <div className="hero-copy"><p className="kicker">{t("Emergency Room Quest", language)}</p><h1>{language === "th" ? <>สำรวจ ตัดสินใจ<br />พัฒนาการให้เหตุผล</> : <>Explore. Decide.<br />Build your reasoning.</>}</h1><p>{language === "th" ? "ผู้ป่วย 3 ราย · 15 การตัดสินใจ · 6 safety badges" : "3 patients · 15 decisions · 6 safety badges"}</p></div>
          <div className="score-dial" aria-label={`${percent}% of core decisions answered`}><span>{progress.answeredNodeIds.length}</span><small>of 15 decisions</small></div>
          <div className="hero-actions"><button className="primary" onClick={start}>{t(progress.answeredNodeIds.length ? "Resume quest" : "Open quest briefing", language)}<Play /></button><button className="quiet" onClick={() => go("orientation")}>{t("Quest rules", language)}</button></div>
        </article>
        <aside className="side-card"><h2>{t("Before you begin", language)}</h2><ul className="clean-list compact-copy"><li><ShieldCheck /> {language === "th" ? "เรียนภายใต้การกำกับ" : "Supervised learning"}</li><li><BookOpen /> {language === "th" ? "เปิดบัตรอ้างอิงได้เสมอ" : "References stay open"}</li><li><CloudOff /> {language === "th" ? "ดาวน์โหลดเพื่อเล่น offline" : "Download for offline play"}</li></ul></aside>
      </div>
      <div className="dashboard-grid">
        <article className="panel"><div className="panel-head"><div><span className="eyebrow">OFFLINE</span><h2>{language === "th" ? "เก็บเกมไว้ในเครื่อง" : "Keep the game on this device"}</h2></div><Download /></div><div className="inline"><span className={`state state-${offlineState}`}>{offlineState === "ready" ? "Ready offline" : offlineState === "downloading" ? "Downloading…" : offlineState === "incomplete" ? "Download incomplete" : "Not downloaded"}</span><small>{language === "th" ? "เนื้อหา" : "Content"} {Math.ceil(packBytes / 1024)} KB + {language === "th" ? "ภาพและ PDF" : "images and PDFs"}</small></div><button className="secondary" onClick={downloadPack} disabled={offlineState === "downloading"}>{offlineState === "ready" ? "Verify" : "Download"}</button></article>
        <article className="panel quest-panel"><span className="eyebrow">QUESTS</span><h2>{language === "th" ? "ผู้ป่วย 3 ราย · 15 ขั้น" : "3 patients · 15 steps"}</h2><button className="secondary" onClick={() => go("missions")}>{language === "th" ? "เปิดกระดานภารกิจ" : "Open quest board"}</button></article>
        <article className="panel"><span className="eyebrow">INSTALL</span><h2>{language === "th" ? "เพิ่มไว้ที่หน้าจอหลัก" : "Add to home screen"}</h2><button className="secondary" onClick={() => installPrompt ? void install() : go("help")}>{installPrompt ? (language === "th" ? "ติดตั้ง" : "Install") : (language === "th" ? "ดูวิธีติดตั้ง" : "Install help")}</button></article>
      </div>
      <section className="completion-strip"><div><strong>Course setup</strong><span>{course.due ? `Due ${course.due}` : "Demo has no real due date"}</span></div><div><strong>Content</strong><span>Draft · clinical approval pending</span></div><div><strong>Receipt</strong><span>{progress.locallyComplete ? "Completed on this device" : "Not yet complete"}</span></div></section>
    </section>
  );
}

function SimulationRoute({ progress, chooseMission, avatarPath, avatarId, masteredCount, rewardScore, chooseAvatar }: { progress: ReturnType<typeof deriveProgress>; chooseMission(nodeId: string): void; avatarPath: string; avatarId: string; masteredCount: number; rewardScore: number; chooseAvatar(): void }) {
  const { language } = useLanguage();
  const [position, setPosition] = useState({ x: 50, y: 84 });
  const [walking, setWalking] = useState(false);
  const [facing, setFacing] = useState<"left" | "right" | "forward">("forward");
  const heldKeys = useRef(new Set<string>());
  const routeRef = useRef<HTMLDivElement>(null);
  const missions = pelvicTraumaContent.missions.map((mission) => localizeMission(mission, language));
  const anchors = [{ x: 16, y: 58 }, { x: 50, y: 58 }, { x: 84, y: 58 }];
  const distances = anchors.map((anchor, index) => ({ index, distance: Math.hypot(position.x - anchor.x, position.y - anchor.y) }));
  const nearest = distances.slice().sort((a, b) => a.distance - b.distance)[0];
  const nearbyIndex = nearest.distance <= 14 ? nearest.index : null;
  const move = (dx: number, dy: number) => {
    setPosition((current) => ({ x: Math.max(7, Math.min(93, current.x + dx)), y: Math.max(50, Math.min(86, current.y + dy)) }));
    setFacing(dx < 0 ? "left" : dx > 0 ? "right" : "forward");
    setWalking(true);
  };
  useEffect(() => {
    let frame = 0;
    let previous = 0;
    const stop = () => { heldKeys.current.clear(); setWalking(false); };
    const release = (event: KeyboardEvent) => heldKeys.current.delete(event.key.toLowerCase());
    const tick = (now: number) => {
      const keys = heldKeys.current;
      const dx = Number(keys.has("arrowright") || keys.has("d")) - Number(keys.has("arrowleft") || keys.has("a"));
      const dy = Number(keys.has("arrowdown") || keys.has("s")) - Number(keys.has("arrowup") || keys.has("w"));
      const elapsed = Math.min(40, previous ? now - previous : 0) / 1000;
      previous = now;
      if (dx || dy) {
        const stride = 24 * elapsed / Math.hypot(dx, dy);
        setPosition((current) => ({ x: Math.max(7, Math.min(93, current.x + dx * stride)), y: Math.max(50, Math.min(86, current.y + dy * stride)) }));
        setFacing(dx < 0 ? "left" : dx > 0 ? "right" : "forward");
        setWalking(true);
      } else setWalking(false);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    window.addEventListener("keyup", release);
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", stop);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("keyup", release); window.removeEventListener("blur", stop); document.removeEventListener("visibilitychange", stop); };
  }, []);
  const enter = () => {
    if (nearbyIndex === null) return;
    const mission = missions[nearbyIndex];
    chooseMission(mission.nodeIds.find((id) => !progress.clearedNodeIds.includes(id)) ?? mission.nodeIds[0]);
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "s"].includes(key)) { event.preventDefault(); heldKeys.current.add(key); }
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); enter(); }
  };
  const stationReaction: CharacterReaction[] = ["urgent", "inspect", "communicate"];
  const directionButton = (direction: string, dx: number, dy: number, label: string, symbol: string) => <button className={`secondary ${direction}`} aria-label={label} onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); heldKeys.current.add(`arrow${direction}`); }} onPointerUp={() => heldKeys.current.delete(`arrow${direction}`)} onPointerCancel={() => heldKeys.current.delete(`arrow${direction}`)} onLostPointerCapture={() => heldKeys.current.delete(`arrow${direction}`)} onClick={(event) => { if (event.detail === 0) move(dx, dy); }}>{symbol}</button>;
  return <section className="simulation-card emergency-room quest-frame" aria-labelledby="case-route-title">
    <div className="simulation-heading"><div><span className="eyebrow">{t("QUEST HUB · EMERGENCY ROOM", language)}</span><h2 id="case-route-title">{t("Approach a patient to open a case", language)}</h2><p>{language === "th" ? "เดิน → เข้าใกล้ → เปิดเคส" : "Move → approach → enter"}</p></div><div className="player-status"><button className="quiet" onClick={chooseAvatar}>{t("Change character", language)}</button><RewardBadge rewardScore={rewardScore} /></div></div>
    <div className="hospital-route free-roam" ref={routeRef} tabIndex={0} onKeyDown={onKeyDown} onPointerDown={() => routeRef.current?.focus()} aria-label={language === "th" ? "พื้นที่ห้องฉุกเฉินสำหรับเดินเข้าหาผู้ป่วย" : "Emergency room free movement area. Approach a patient to open a case."}>
      <img className="er-backdrop" src="/assets/emergency-room.jpg" alt="Illustrated emergency room with three patient bays" />
      {missions.map((mission, index) => {
        const answered = mission.nodeIds.filter((id) => progress.answeredNodeIds.includes(id)).length;
        const bayName = ["Haemorrhage Response Bay", "Pelvic Imaging Review Bay", "Sensitive Injury Assessment Bay"][index];
        return <div key={mission.id} className={index === nearbyIndex ? "case-station selected" : "case-station"} style={{ left: `${anchors[index].x}%` }}>
          <span className="station-number">QUEST 0{mission.number}</span><strong>{t(bayName, language)}</strong><small>{answered}/{mission.nodeIds.length} {t("steps cleared", language)}</small>
        </div>;
      })}
      {missions.map((mission, index) => <img key={mission.id} className={`patient-avatar patient-${index + 1} ${index === nearbyIndex ? "approached" : ""}`} src={patientPath(index)} alt={`Fictional patient for ${mission.title}`} style={{ left: `${anchors[index].x}%` }} />)}
      {nearbyIndex !== null && <div className="proximity-prompt" style={{ left: `${anchors[nearbyIndex].x}%` }} aria-live="polite">{t("Near patient — case available", language)}</div>}
      <CharacterWithRewards className={`student-avatar facing-${facing} ${walking ? "walking" : ""}`} src={avatarPath} avatarId={avatarId} reaction={stationReaction[nearest.index]} alt="Your student character in earned clothing" masteredCount={masteredCount} rewardScore={rewardScore} showUpgrade style={{ left: `${position.x}%`, top: `${position.y}%` }} />
    </div>
    <div className="game-controls free-roam-controls"><div className="dpad" aria-label={language === "th" ? "แป้นควบคุมการเดิน" : "Movement controls"}>{directionButton("up", 0, -5, "Move up", "↑")}{directionButton("left", -5, 0, "Move left", "←")}{directionButton("down", 0, 5, "Move down", "↓")}{directionButton("right", 5, 0, "Move right", "→")}</div><div className="nearby-case"><span className="quest-label">{nearbyIndex === null ? t("Move closer to a patient", language) : t("Near patient — case available", language)}</span><strong>{nearbyIndex === null ? "—" : missions[nearbyIndex].title}</strong></div><button className="primary enter-case" onClick={enter} disabled={nearbyIndex === null}><Play /> {t("Enter case", language)}</button></div>
  </section>;
}

export function clothingLevel(rewardScore: number) { return clothingLevelFor(rewardScore, pelvicTraumaContent.id === LEGACY_VERSION ? "legacy-150" : pelvicTraumaContent.id===MINIGAME_VERSION?"minigames-v4":"collections-250"); }

function RewardBadge({ rewardScore }: { rewardScore: number }) {
  const level = clothingLevel(rewardScore);
  const title = ["Clinical Starter", "Prepared Teammate", "Evidence Scout", "Safety Communicator", "Case Navigator"][level - 1];
  return <div className={`reward-badge reward-${level}`} aria-label={`${rewardScore} reward points, clothing level ${level}`}><span>LV {level}</span><strong>{rewardScore} reward</strong><small>{title}</small></div>;
}

function reactionPath(avatarId: string, reaction: CharacterReaction) {
  const set = avatarChoices.find((item) => item.id === avatarId)?.reactionSet ?? 1;
  return `/assets/reactions/character-${set}-${reaction}.png`;
}

function upgradePath(avatarId: string, rewardScore: number) {
  const set = avatarChoices.find((item) => item.id === avatarId)?.reactionSet ?? 1;
  return `/assets/upgrades/character-${set}-level-${clothingLevel(rewardScore)}.png`;
}

function CharacterWithRewards({ src, avatarId, reaction, alt, masteredCount, rewardScore = masteredCount * 10, showUpgrade = false, className, style }: { src: string; avatarId?: string; reaction?: CharacterReaction; alt: string; masteredCount: number; rewardScore?: number; showUpgrade?: boolean; className?: string; style?: React.CSSProperties }) {
  const imagePath = avatarId && showUpgrade ? upgradePath(avatarId, rewardScore) : avatarId && reaction ? reactionPath(avatarId, reaction) : src;
  return <span className={`character-wrap ${className ?? ""} reaction-${reaction ?? "idle"} level-${Math.min(4, Math.floor(masteredCount / 4))}`} style={style}><img key={imagePath} src={imagePath} alt={alt} />{showUpgrade && <span className="walk-puppet" aria-hidden="true"><img className="walk-upper" src={imagePath} alt="" /><img className="walk-leg-left" src={imagePath} alt="" /><img className="walk-leg-right" src={imagePath} alt="" /></span>}{masteredCount > 0 && <span className="character-star" aria-hidden="true">★</span>}{masteredCount >= 5 && <span className="character-badge" aria-hidden="true">✓</span>}</span>;
}

export const nodeReactions: Record<string, CharacterReaction> = {
  M1N1: "urgent", M1N2: "urgent", M1N3: "inspect", M1N4: "urgent", M1N5: "urgent", M1N6: "communicate",
  M2N1: "inspect", M2N2: "inspect", M2N3: "observe", M2N4: "inspect", M2N5: "communicate",
  M3N1: "urgent", M3N2: "urgent", M3N3: "communicate", M3N4: "communicate"
};

const reactionMessages: Record<CharacterReaction, string> = {
  observe: "Check the clues.",
  urgent: "Act and escalate.",
  inspect: "Review the evidence.",
  communicate: "Give a clear handover.",
  celebrate: "Reward earned.",
  reconsider: "Pause, review, retry."
};

function QuestHud({ node, masteredCount: _masteredCount, events }: { node: Node; masteredCount: number; events: LearningEvent[] }) {
  const { language } = useLanguage();
  const index = pelvicTraumaContent.nodes.findIndex((item) => item.id === node.id) + 1;
  const rewards = computeRewards(pelvicTraumaContent, events);
  return <div className="quest-hud" aria-label={`Quest decision ${index} of 15`}><div><small>{language === "th" ? "ขั้นภารกิจ" : "QUEST STEP"}</small><strong>{index} / 15</strong></div><div className="reward-track"><span style={{ width: `${rewards.total / rewards.maximum * 100}%` }} /><small>{rewards.total} / {rewards.maximum} REWARD</small></div><div><small>{language === "th" ? "SAFETY BADGES" : "SAFETY BADGES"}</small><strong>{rewards.safetyBadges.length} / 6</strong></div></div>;
}

function Orientation({ go }: { go(view: View): void }) {
  const { language } = useLanguage();
  const resource = localizeResource(resourceById.get("ORIENTATION")!, language);
  return <section className="reading quest-briefing page-enter"><span className="eyebrow">{t("QUEST BRIEFING · 3 MIN", language)}</span><h1>{resource.title}</h1><div className="quest-rule"><strong>{language === "th" ? "ขอบเขตภารกิจ" : "Quest limit"}</strong><span>{language === "th" ? "มีการตัดสินใจตามเรื่องราว 15 ข้อ การแก้ตัวอยู่ในข้อเดิม ไม่ใช่คำถามเพิ่ม" : "Exactly 15 story decisions. A correction is a retry inside the same decision, not an added question."}</span></div>{resource.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<button className="primary" onClick={() => go("resources")}>{t("Open reference inventory", language)}<BookOpen /></button></section>;
}

function AccessView() {
  const {language}=useLanguage();const th=language==="th";
  const [email, setEmail] = useState("");
  const [studentId,setStudentId]=useState("");
  const [teacher,setTeacher]=useState(window.location.hash.startsWith("#teacher"));
  const [busy,setBusy]=useState(false);const entering=useRef(false);
  const [status, setStatus] = useState("");
  const requestLink = async () => {
    if (entering.current||!email.trim()) return;entering.current=true;setBusy(true);setStatus("");
    try { if(teacher){await backend.signIn?.(email.trim());setStatus(th?"ตรวจสอบลิงก์เข้าสู่ระบบในอีเมล":"Check your email for your teacher sign-in link.");}else{await backend.enterLearner?.(email.trim(),studentId.trim());setStatus(th?"เข้าสู่ระบบแล้ว":"Signed in.");} }
    catch { setStatus(th?"เข้าสู่ระบบไม่สำเร็จ ตรวจสอบข้อมูลหรือติดต่ออาจารย์":"Could not enter. Check your details or ask your teacher for help."); }
    finally{entering.current=false;setBusy(false);}
  };
  return <section className="reading page-enter"><h1>{appConfig.mode==="demo"?"Local demonstration":teacher?(th?"เข้าสู่ระบบอาจารย์":"Teacher sign-in"):(th?"เข้าเกม":"Enter game")}</h1>{appConfig.mode==="demo"?<p>Fictional local demonstration. Course reporting requires the connected service.</p>:<><form onSubmit={event=>{event.preventDefault();void requestLink();}}><label><span>{th?"อีเมล":"Email address"}</span><input autoComplete="email" required type="email" value={email} onChange={event=>setEmail(event.target.value)} /></label>{!teacher&&<label><span>{th?"รหัสนักศึกษา":"Student ID"}</span><input autoComplete="username" required type="text" maxLength={40} value={studentId} onChange={event=>setStudentId(event.target.value)} /></label>}<button className="primary" disabled={busy||!email.trim()||(!teacher&&!studentId.trim())}>{busy?(th?"กำลังเข้าสู่ระบบ…":"Entering…"):teacher?(th?"ส่งลิงก์เข้าสู่ระบบ":"Send teacher sign-in link"):(th?"เข้าเกม":"Enter game")}</button></form><p role="status">{status}</p>{!teacher&&<small>{th?"ใช้ข้อมูลเดิมเพื่อกลับมาเล่นต่อ ผู้ที่รู้อีเมลและรหัสนักศึกษาทั้งสองอย่างสามารถเปิดบันทึกนี้ได้":"Use the same details to resume. Anyone knowing both can access this learner record."}</small>}<p><button className="text-button" onClick={()=>{setTeacher(!teacher);setStatus("");}}>{teacher?(th?"กลับไปเข้าสู่เกมนักศึกษา":"Student entry"):(th?"สำหรับอาจารย์":"Teacher access")}</button></p></>}</section>;
}

function MissionMap({ events, progress, choose }: { events: LearningEvent[]; progress: ReturnType<typeof deriveProgress>; choose(nodeId: string): void }) {
  const { language } = useLanguage();
  return <section className="stack page-enter"><div><span className="eyebrow">{t("QUEST BOARD · 15 TOTAL DECISIONS", language)}</span><h1>{t("Three patients. Three clinical quests.", language)}</h1><p className="lede">{t("Each patient quest reveals evidence step by step. A missed choice opens a retry within the same quest decision.", language)}</p></div><div className="mission-list quest-list">{pelvicTraumaContent.missions.map((sourceMission) => {
    const mission = localizeMission(sourceMission, language);
    const answered = mission.nodeIds.filter((id) => progress.answeredNodeIds.includes(id)).length;
    const status = progress.missionReviewed[mission.id] ? "Reviewed" : answered ? "In progress" : "Not started";
    const first = mission.nodeIds.find((id) => !progress.clearedNodeIds.includes(id)) ?? mission.nodeIds[0];
    return <article className="mission-card quest-card" key={mission.id}><div className="mission-number">Q{mission.number}</div><div><span className="state">{t(status, language)}</span><h2>{mission.title}</h2><div className="mission-meta"><span>{mission.estimatedMinutes} min</span><span>{answered}/{mission.nodeIds.length} {t("quest steps", language)}</span></div></div><button className="primary compact" onClick={() => choose(first)}>{t(answered ? "Resume quest" : "Accept quest", language)}</button></article>;
  })}</div></section>;
}

function DecisionFlow({ nodeId, setNodeId, events, addEvent, go, avatarPath, avatarId, masteredCount }: { nodeId: string; setNodeId(id: string): void; events: LearningEvent[]; addEvent(event: LearningEvent): Promise<boolean>; go(view: View): void; avatarPath: string; avatarId: string; masteredCount: number }) {
  const { language } = useLanguage();
  const node = localizeNode(pelvicTraumaContent.nodes.find((item) => item.id === nodeId)!, language);
  const response = events.find((event) => event.type === "core_response" && event.nodeId === node.id) as Extract<LearningEvent, { type: "core_response" }> | undefined;
  const feedbackAck = events.some((event) => event.type === "feedback_ack" && event.nodeId === node.id);
  const correct = response ? answerIsCorrect(pelvicTraumaContent, node.id, response.selectedOptionIds) : false;
  const correctionEvents = events.filter((event) => event.type === "correction_response" && event.correctionId === node.retryId) as Extract<LearningEvent, { type: "correction_response" }>[];
  const correctionDone = correctionEvents.some((event) => event.selectedOptionId === correctionById.get(node.retryId)?.correctOptionId && correctionReviewed(events,event));
  const canAdvance = feedbackAck && (correct || correctionDone || (pelvicTraumaContent.id === LEGACY_VERSION && !node.safetyFlag));

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [response?.eventId, feedbackAck, correctionDone]);

  const advance = () => {
    if (node.nextNodeId) setNodeId(node.nextNodeId);
    else {
      const missionIndex = pelvicTraumaContent.missions.findIndex((mission) => mission.id === node.missionId);
      const nextMission = pelvicTraumaContent.missions[missionIndex + 1];
      if (nextMission) { setNodeId(nextMission.nodeIds[0]); go("missions"); }
      else go("reflection");
    }
  };

  if (!response) return <DecisionCard key={node.id} node={node} events={events} addEvent={addEvent} avatarPath={avatarPath} avatarId={avatarId} masteredCount={masteredCount} />;
  if (!feedbackAck) return <FeedbackCard node={node} response={response} addEvent={addEvent} events={events} avatarPath={avatarPath} avatarId={avatarId} masteredCount={masteredCount} />;
  if (!correct && !correctionDone) return <CorrectionCard key={node.retryId} correctionId={node.retryId} avatarPath={avatarPath} avatarId={avatarId} masteredCount={masteredCount} events={events} addEvent={addEvent} canContinue={pelvicTraumaContent.id === LEGACY_VERSION && !node.safetyFlag} advance={advance} />;
  const advanceLabel = node.nextNodeId ? "Reveal next clue" : node.missionId === "mission-3" ? "Enter team debrief" : "Return to quest board";
  return <section className="decision-shell quest-decision page-enter"><QuestHud node={node} masteredCount={masteredCount} events={events} /><div className="decision-top"><span className="eyebrow">{t("QUEST STEP CLEARED", language)}</span><span className="state success"><Check /> {correct ? "10 decision reward collected" : pelvicTraumaContent.id === LEGACY_VERSION ? "+5 corrective reward" : "8 corrected reward collected"}</span></div><h1>{node.question}</h1><EncounterStrip node={node} avatarPath={avatarPath} avatarId={avatarId} masteredCount={masteredCount} state="celebrate" /><RewardCollections events={events} animate />{!correct && <div className="feedback-focus"><p>{localizeCorrection(correctionById.get(node.retryId)!,language).workedExample}</p></div>}<p>{language === "th" ? "คำตอบครั้งแรกยังอยู่ในบันทึกการเดินทาง ระดับความมั่นใจไม่เปลี่ยนคะแนน" : "Your first answer remains in your journey log. Confidence does not change the score."}</p><button className="primary" disabled={!canAdvance} onClick={advance}>{t(advanceLabel, language)}<Play /></button></section>;
}

function DecisionCard({ node, events, addEvent, avatarPath, avatarId, masteredCount }: { node: Node; events: LearningEvent[]; addEvent(event: LearningEvent): Promise<boolean>; avatarPath: string; avatarId: string; masteredCount: number }) {
  const { language } = useLanguage();
  const [selected, setSelected] = useState("");
  const [confidence, setConfidence] = useState<Confidence | "">("");
  const [rationale, setRationale] = useState("");
  const [busy, setBusy] = useState(false);
  const revised = node.rationaleRequired !== undefined;
  const needsReason = revised ? node.rationaleRequired : true;
  const prepared = events.find(event => event.type === "handover_prepared" && event.nodeId === node.id) as Extract<LearningEvent,{type:"handover_prepared"}> | undefined;
  const choicesVisible = !node.explanationBeforeChoices || Boolean(prepared);
  const prepare = async () => { if (!rationale.trim() || busy) return; setBusy(true); await addEvent({...createBaseEvent(attemptId,nextClientSequence(events)),type:"handover_prepared",nodeId:node.id,text:rationale.trim()}); setBusy(false); };
  useEffect(() => { let active = true; void loadDraft(accountKey, attemptId, node.id).then((draft) => { if (active) setRationale(draft); }); return () => { active = false; }; }, [node.id]);
  const commit = async () => {
    if (!choicesVisible || !selected || (needsReason && !(prepared?.text ?? rationale).trim()) || (!revised && !confidence) || busy) return;
    setBusy(true);
    await addEvent({ ...createBaseEvent(attemptId, nextClientSequence(events)), type: "core_response", nodeId: node.id, selectedOptionIds: [selected], presentationOrder: node.options.map((item) => item.id), ...(confidence ? { confidence } : {}), ...((prepared?.text ?? rationale).trim() ? { rationale: (prepared?.text ?? rationale).trim() } : {}) });
    setBusy(false);
  };
  const mission = localizeMission(pelvicTraumaContent.missions.find((item) => item.id === node.missionId)!, language);
  const notes = <><fieldset><legend>{t("Confidence", language)} {revised && (language === "th" ? "(เลือกได้)" : "(optional)")}</legend><div className="segmented">{node.confidenceOptions.map((value) => <label key={value}><input type="radio" name={`${node.id}-confidence`} checked={confidence === value} onChange={() => setConfidence(value)} /><span>{t(value, language)}</span></label>)}</div></fieldset><label><span>{node.rationalePrompt}</span><textarea value={prepared?.text ?? rationale} readOnly={Boolean(prepared)} maxLength={360} onChange={(event) => { setRationale(event.target.value); void saveDraft(accountKey, attemptId, node.id, event.target.value); }} placeholder={t("One sentence is enough", language)} /></label></>;
  return <section className="decision-shell quest-decision page-enter"><QuestHud node={node} masteredCount={masteredCount} events={events} /><div className="decision-top"><span className="eyebrow">CASE {mission.number} · {node.scenePhase ?? `STEP ${mission.nodeIds.indexOf(node.id) + 1}`}</span>{node.safetyFlag && <span className="safety-label"><ShieldCheck /> {t("Safety badge available", language)}</span>}</div><h1>{mission.title}</h1><EncounterStrip node={node} avatarPath={avatarPath} avatarId={avatarId} masteredCount={masteredCount} state="thinking" /><div className="evidence quest-clue"><h2>{language === "th" ? "ข้อมูลจากทีม" : "Team update"}</h2><p>{node.stem}</p>{node.vitals.length > 0 && <div className="vitals">{node.vitals.map((vital) => <div key={vital.label}><span>{vital.label}</span><strong>{vital.value}</strong></div>)}</div>}{!revised && <ul>{node.factsAvailableNow.map((fact) => <li key={fact}>{fact}</li>)}</ul>}{node.assetId && <TeachingFigure assetId={node.assetId} compact />}{node.visuals?.filter((visual) => visual.placement === "question").map((visual) => <TeachingFigure key={visual.assetId} assetId={visual.assetId} compact />)}</div><PatientChart node={node} onReference={(resourceId)=>addEvent({...createBaseEvent(attemptId,nextClientSequence(events)),type:"resource_viewed",resourceId,nodeId:node.id,stage:"question"})} />{!choicesVisible && <div className="panel"><h2>{language === "th" ? "คิด handover ก่อนดูตัวเลือก" : "Your handover before choices"}</h2><p>{language === "th" ? "เชื่อม findings, priorities และ uncertainty เปิด chart หรือบัตรอ้างอิงได้" : "Connect findings, priorities and uncertainty. Chart and references remain available."}</p><div className="response-grid">{notes}</div><button className="primary" disabled={!rationale.trim() || busy} onClick={prepare}>{language === "th" ? "บันทึกเหตุผลและดูตัวเลือก" : "Save reason and reveal choices"}</button></div>}{choicesVisible && <><fieldset className="choices"><legend>{node.question}</legend>{node.options.map((option) => <label key={option.id} className={selected === option.id ? "choice selected" : "choice"}><input type="radio" name={node.id} value={option.id} checked={selected === option.id} onChange={() => setSelected(option.id)} /><span className="choice-letter">{option.id.at(-1)}</span><span>{option.text}</span></label>)}</fieldset>{needsReason ? <div className="response-grid">{notes}</div> : <details className="optional-notes"><summary>{language === "th" ? "เพิ่มบันทึกหรือความมั่นใจ (เลือกได้)" : "Add a note or confidence (optional)"}</summary><div className="response-grid">{notes}</div></details>}<button className="primary sticky-action" disabled={!selected || (needsReason && !rationale.trim()) || (!revised && !confidence) || busy} onClick={commit}>{t(busy ? "Saving…" : "Lock in action", language)}<LockKeyhole /></button></>}</section>;
}

function PatientChart({ node, onReference }: { node: Node; onReference?(id:string): unknown }) {
  const { language } = useLanguage();
  const ids = pelvicTraumaContent.missions.find((mission) => mission.id === node.missionId)!.nodeIds;
  const current = ids.indexOf(node.id);
  return <details className="patient-chart"><summary>{language === "th" ? "Patient chart · ข้อมูลก่อนหน้าและบัตรอ้างอิง" : "Patient chart · earlier findings and references"}</summary>{ids.slice(0, current + 1).map((id) => { const item = localizeNode(pelvicTraumaContent.nodes.find((entry) => entry.id === id)!, language); return <article key={id}><strong>{item.scenePhase ?? id}</strong><ul>{item.factsAvailableNow.map((fact) => <li key={fact}>{fact}</li>)}</ul>{item.vitals.map((vital) => <small key={vital.label}>{vital.label}: {vital.value} </small>)}</article>; })}<ReferenceShelf onReference={onReference} /></details>;
}

function ReferenceShelf({onReference}:{onReference?(id:string):unknown} = {}) {
  const { language } = useLanguage();
  return <div className="reference-shelf">{pelvicTraumaContent.resources.filter((resource) => resource.id !== "ORIENTATION").map((source) => { const resource = localizeResource(source, language); return <details key={resource.id} onToggle={(event)=>{if(event.currentTarget.open) onReference?.(resource.id);}}><summary>{resource.title}</summary>{resource.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{resource.assetIds?.map((assetId) => <TeachingFigure key={assetId} assetId={assetId} compact />)}<div className="source-links">{resource.sourceDocumentIds?.map((id) => { const source = sourceDocumentById.get(id); return source && <a key={id} href={source.href} target="_blank" rel="noreferrer">{source.title}</a>; })}</div></details>; })}</div>;
}

function FeedbackCard({ node, response, addEvent, events, avatarPath, avatarId, masteredCount }: { node: Node; response: Extract<LearningEvent, { type: "core_response" }>; addEvent(event: LearningEvent): Promise<boolean>; events: LearningEvent[]; avatarPath: string; avatarId: string; masteredCount: number }) {
  const { language } = useLanguage();
  const [busy, setBusy] = useState(false);
  const selected = node.options.find((option) => response.selectedOptionIds.includes(option.id));
  const preferred = node.options.find((option) => node.correctOptionIds.includes(option.id))!;
  const correct = answerIsCorrect(pelvicTraumaContent, node.id, response.selectedOptionIds);
  const acknowledge = async () => { if (busy) return; setBusy(true); await addEvent({ ...createBaseEvent(attemptId, nextClientSequence(events)), type: "feedback_ack", nodeId: node.id }); setBusy(false); };
  return <section className="decision-shell quest-decision page-enter"><QuestHud node={node} masteredCount={masteredCount} events={events} /><div className="decision-top"><span className="eyebrow">{language === "th" ? "ทีมช่วยทบทวน" : "Team feedback"}</span><span className={correct ? "state success" : "state review"}>{t(correct ? "Preferred action" : "Retry available", language)}</span></div><h1>{node.question}</h1><EncounterStrip node={node} avatarPath={avatarPath} avatarId={avatarId} masteredCount={masteredCount} state={correct ? "celebrate" : "reconsider"} /><div className="feedback-focus"><strong>{preferred.text}</strong><p>{preferred.explanation.replace(/^[^:]+: /, "")}</p>{!correct && <p className="selected-explanation"><strong>{language === "th" ? "คำตอบครั้งแรก: " : "Your first action: "}</strong>{selected?.explanation.replace(/^[^:]+: /, "")}</p>}</div><details className="other-explanations"><summary>{language === "th" ? "ทบทวนตัวเลือกอื่น" : "Review the other choices"}</summary>{node.options.filter((option) => option.id !== preferred.id).map((option) => <article key={option.id}><strong>{option.text}</strong><p>{option.explanation.replace(/^[^:]+: /, "")}</p></article>)}</details>{node.visuals?.filter((visual) => visual.placement === "feedback").map((visual) => <TeachingFigure key={visual.assetId} assetId={visual.assetId} compact />)}<PatientChart node={node} /><button className="primary" disabled={busy} onClick={acknowledge}>{t(correct ? "Collect reward" : "Open same-step retry", language)}<Play /></button></section>;
}

function patientPath(index: number) { return pelvicTraumaContent.id === LEGACY_VERSION ? `/assets/patient-${index + 1}.png` : `/assets/patients-v2/patient-${index + 1}.png`; }
function EncounterStrip({ node, avatarPath, avatarId, masteredCount, state }: { node: Node; avatarPath: string; avatarId: string; masteredCount: number; state: "thinking" | "celebrate" | "reconsider" }) {
  const { language } = useLanguage();
  const index = pelvicTraumaContent.missions.findIndex((mission) => mission.id === node.missionId);
  const reaction: CharacterReaction = state === "thinking" ? (nodeReactions[node.id] ?? "observe") : state;
  const image = pelvicTraumaContent.id === LEGACY_VERSION ? `/assets/patient-reactions/${state === "thinking" ? node.id : `mission-${index + 1}-${state === "celebrate" ? "reassured" : "concerned"}`}.png` : patientPath(index);
  return <div className={`encounter-strip ${state} reaction-scene-${reaction}`} aria-label="Team care continues. Learner reactions do not change patient condition."><div className="reaction-callout"><span>{language === "th" ? "ทีมกำลังดูแล" : "TEAM CARE CONTINUES"}</span><small>{node.scenePhase ?? reactionMessages[reaction]}</small></div><CharacterWithRewards src={avatarPath} avatarId={avatarId} reaction={reaction} alt={`Learner reaction: ${reaction}`} masteredCount={masteredCount} /><div className="encounter-message"><strong>{state === "celebrate" ? (language === "th" ? "เหตุผลเหมาะสม" : "Preferred reasoning") : state === "reconsider" ? (language === "th" ? "ลองทบทวน" : "Reconsider") : (language === "th" ? "เลือกการดำเนินการ" : "Choose an action")}</strong></div><div className="patient-wrap"><span>{language === "th" ? "เฝ้าระวังต่อ" : "Still monitored"}</span><img className="encounter-patient" src={image} alt="Fictional awake adult supported on a wheeled bed and covered for privacy; no clinical outcome implied" /></div></div>;
}
function RewardCollections({ events, animate = false }: { events: LearningEvent[]; animate?: boolean }) {
  const { language } = useLanguage();
  const rewards = computeRewards(pelvicTraumaContent, events);
  return <div className={`reward-collections ${animate ? "reward-burst" : ""}`}><strong>{rewards.total} / {rewards.maximum} reward · {language === "th" ? "ชุดระดับ" : "Outfit"} {rewards.level}/5</strong><progress max={rewards.nextThreshold ?? rewards.maximum} value={rewards.total} aria-label="Reward toward next outfit" /><small>{rewards.nextThreshold ? `${rewards.nextThreshold - rewards.total} ${language === "th" ? "reward ถึงชุดถัดไป" : "reward to next outfit"}` : (language === "th" ? "ปลดล็อกชุดสูงสุดแล้ว" : "Best outfit unlocked")}</small><div className="collection-badges">{(["S1","S2","S3","S4","S5","S6"] as SafetyConceptId[]).map((id) => <span key={id} className={rewards.safetyBadges.includes(id) ? "collected" : ""} title={conceptName(id)} aria-label={`${conceptName(id)}: ${rewards.safetyBadges.includes(id) ? "collected" : "not collected"}`}>◇ {id}{rewards.safetyBadges.includes(id) ? " ✓" : ""}</span>)}</div><div className="collection-stamps">{pelvicTraumaContent.missions.map((mission) => <span key={mission.id} className={rewards.caseStamps.includes(mission.id) ? "collected" : ""}>{language === "th" ? "เคส" : "Case"} {mission.number} {rewards.caseStamps.includes(mission.id) ? (rewards.scheme === "legacy-150" ? "✓" : "✓ +15") : "○"}</span>)}</div></div>;
}

function TeachingFigure({ assetId, compact = false }: { assetId: string; compact?: boolean }) {
  const { language } = useLanguage();
  const asset = assetById.get(assetId);
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (expanded) dialog.current?.showModal(); }, [expanded]);
  if (!asset?.path) return null;
  return <figure className={compact ? "teaching-figure compact" : "teaching-figure"}><span className="teaching-label">{language === "th" ? "ภาพตัวอย่างการสอน · ไม่ใช่ภาพผู้ป่วยรายนี้" : "Teaching example · not this patient"}</span><button className="figure-enlarge" onClick={() => setExpanded(true)} aria-label={`Enlarge: ${asset.caption}`}><img src={asset.path} alt={asset.altText} /></button><figcaption>{asset.caption}{asset.sourceUrl && <> · <a href={asset.sourceUrl} target="_blank" rel="noreferrer">{language === "th" ? "เปิดหน้าเอกสาร" : "Open source page"}</a></>}</figcaption>{expanded && <dialog ref={dialog} className="figure-dialog" onClose={() => setExpanded(false)} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}><button className="secondary" autoFocus onClick={() => dialog.current?.close()}>{language === "th" ? "ปิดภาพ" : "Close image"}</button><img src={asset.path} alt={asset.altText} /><p>{asset.caption}</p></dialog>}</figure>;
}

function CorrectionCard({ correctionId, events, addEvent, canContinue, advance, avatarPath, avatarId, masteredCount }: { avatarPath:string;avatarId:string;masteredCount:number; correctionId: string; events: LearningEvent[]; addEvent(event: LearningEvent): Promise<boolean>; canContinue: boolean; advance(): void }) {
  const { language } = useLanguage();
  const item = localizeCorrection(correctionById.get(correctionId)!,language);
  const attempts = events.filter(event => event.type === "correction_response" && event.correctionId === correctionId) as Extract<LearningEvent,{type:"correction_response"}>[];
  const [selected,setSelected] = useState(""); const [busy,setBusy] = useState(false);
  const latest = attempts.at(-1);
  const solved = attempts.some(event=>event.selectedOptionId===item.correctOptionId && correctionReviewed(events,event));
  const pendingReview = !solved && latest?.selectedOptionId===item.correctOptionId && item.contentVersion===LEARNING_VERSION;
  const node = localizeNode(pelvicTraumaContent.nodes.find(node=>node.id===item.parentNodeId)!,language);
  const run = async (event:LearningEvent) => { if(busy) return; setBusy(true); await addEvent(event); setBusy(false); };
  return <section className="decision-shell correction page-enter"><span className="eyebrow">{language==="th" ? "แก้ความเข้าใจในขั้นเดิม" : "SAME-STEP CORRECTION"}</span><h1>{item.stem}</h1>
    <EncounterStrip node={node} avatarPath={avatarPath} avatarId={avatarId} masteredCount={masteredCount} state={pendingReview?"thinking":"reconsider"}/>
    <PatientChart node={node} onReference={resourceId=>addEvent({...createBaseEvent(attemptId,nextClientSequence(events)),type:"resource_viewed",resourceId,nodeId:node.id,stage:"correction"})}/>
    {!pendingReview && !solved && <fieldset className="choices"><legend>{language==="th" ? "เลือกเหตุผลที่เหมาะสม" : "Choose the appropriate reasoning"}</legend>{item.options.map(option=><label key={option.id} className={selected===option.id ? "choice selected":"choice"}><input type="radio" name={correctionId} value={option.id} checked={selected===option.id} onChange={()=>setSelected(option.id)}/><span>{option.text}</span></label>)}</fieldset>}
    {latest && !solved && <div className={pendingReview ? "feedback-inline success":"feedback-inline"} role="status"><div><strong>{language==="th" ? "หลักฐาน → ความหมาย → action ภายใต้การกำกับ" : "Evidence → meaning → supervised action"}</strong><p>{node.factsAvailableNow.join(" · ")}</p><p>{item.options.find(option=>option.id===latest.selectedOptionId)?.explanation}</p>{pendingReview && <p>{item.workedExample}</p>}</div></div>}
    {pendingReview ? <button className="primary" disabled={busy} onClick={()=>run({...createBaseEvent(attemptId,nextClientSequence(events)),type:"correction_feedback_ack",correctionId,responseEventId:latest!.eventId})}>{language==="th" ? "อ่านคำอธิบายแล้ว · รับ reward" : "I reviewed the explanation · collect reward"}</button> : !solved && <button className="primary" disabled={!selected || busy} onClick={()=>run({...createBaseEvent(attemptId,nextClientSequence(events)),type:"correction_response",correctionId,selectedOptionId:selected,feedbackAcknowledged:item.contentVersion!==LEARNING_VERSION && selected===item.correctOptionId})}>{language==="th" ? "ตรวจคำตอบแก้ตัว" : "Check correction"}</button>}
    {attempts.length>=2 && !solved && !pendingReview && <details><summary>{language==="th" ? "ตัวอย่างอธิบาย" : "Worked example"}</summary><p>{item.workedExample}</p></details>}
    {solved && <><p>{language==="th" ? "แก้ความเข้าใจแล้ว คำตอบแรกยังถูกเก็บไว้" : "Corrected after feedback. Your first answer remains preserved."}</p><button className="primary" onClick={advance}>{language==="th" ? "ไปต่อ":"Continue"}</button></>}
    {canContinue && !solved && <button className="quiet" onClick={advance}>Continue other learning</button>}
  </section>;
}

function ResourcesView({ addEvent, events, go }: { addEvent(event: LearningEvent): Promise<boolean>; events: LearningEvent[]; go(view: View): void }) {
  const { language } = useLanguage();
  const [active, setActive] = useState("R1"); const resource = localizeResource(resourceById.get(active)!, language);
  const markViewed = () => addEvent({ ...createBaseEvent(attemptId, nextClientSequence(events)), type: "resource_viewed", resourceId: active });
  const downloadText = () => { const text = pelvicTraumaContent.resources.map((item) => localizeResource(item, language)).map((item) => `${item.title}\n\n${item.body.join("\n\n")}`).join("\n\n---\n\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([text], { type: "text/plain" })); link.download = `pelvic-trauma-reference-pack-${language}.txt`; link.click(); URL.revokeObjectURL(link.href); };
  const sources = (resource.sourceDocumentIds ?? []).map((id) => sourceDocumentById.get(id)).filter(Boolean);
  return <section className="resource-layout page-enter"><aside><span className="eyebrow">FOUNDATIONS · 9 MIN</span><h1>{language === "th" ? "บัตรอ้างอิง" : "Reference cards"}</h1>{pelvicTraumaContent.resources.filter((item) => item.id !== "ORIENTATION").map((item) => { const localized = localizeResource(item, language); return <button className={active === item.id ? "resource-tab active" : "resource-tab"} key={item.id} onClick={() => setActive(item.id)}><span>{item.id}</span>{localized.title}<small>{item.estimatedMinutes} min</small></button>; })}<button className="secondary full" onClick={downloadText}><Download /> {language === "th" ? "ดาวน์โหลด" : "Download"}</button><button className="quiet full" onClick={() => window.print()}>{language === "th" ? "พิมพ์" : "Print"}</button><button className="primary full" onClick={() => go("missions")}>{language === "th" ? "เปิดเคส" : "Open cases"}</button></aside><article className="reading" id={`resource-${active}`}><span className="eyebrow">{resource.id} · {resource.estimatedMinutes} MIN</span><h2>{resource.title}</h2>{resource.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{(resource.assetIds ?? []).map((assetId) => <TeachingFigure key={assetId} assetId={assetId} />)}{resource.selfPrompt && <div className="self-prompt"><strong>Self-prompt</strong><p>{resource.selfPrompt}</p></div>}<details className="source-note"><summary>{language === "th" ? "แหล่งข้อมูล" : "Sources"}</summary><p>{language === "th" ? "ดัดแปลงจากเอกสารประกอบการสอนที่ให้มา ต้องได้รับ clinical approval และตรวจ permission ก่อนใช้งานระดับสถาบัน" : "Adapted from the supplied teaching resources. Clinical and image approval remain required."}</p><div className="source-links">{sources.map((source) => source && <a key={source.id} href={source.href} target="_blank" rel="noreferrer"><BookOpen /> <span><strong>{source.title}</strong><small>{source.language} · PDF</small></span></a>)}</div></details><button className="secondary" onClick={markViewed}>{language === "th" ? "บันทึกว่าอ่านแล้ว" : "Mark as viewed"}</button></article></section>;
}

function ReflectionView({ events, addEvent, progress, go }: { events: LearningEvent[]; addEvent(event: LearningEvent): Promise<boolean>; progress: ReturnType<typeof deriveProgress>; go(view: View): void }) {
  const { language } = useLanguage();
  const [text, setText] = useState(progress.reflection ?? "");
  const [busy, setBusy] = useState(false);
  const revised = pelvicTraumaContent.id !== LEGACY_VERSION;
  const completeCases = Object.values(progress.missionReviewed).every(Boolean);
  const submit = async () => {
    if (busy || (revised ? !completeCases : !text.trim())) return;
    setBusy(true);
    const reflection = revised ? progress.handoverNotes.map((note) => `${note.missionId}: ${note.text}`).join("\n") : text.trim();
    if (await addEvent({ ...createBaseEvent(attemptId, nextClientSequence(events)), type: "reflection_submitted", text: reflection })) go("progress");
    setBusy(false);
  };
  return <section className="reading page-enter"><span className="eyebrow">{language === "th" ? "ทบทวน handover" : "TEAM HANDOVER REVIEW"}</span><h1>{revised ? (language === "th" ? "พร้อมนำประเด็นไปคุยในชั้นเรียน" : "Ready for the classroom discussion") : "What remains uncertain?"}</h1>{revised ? <>{progress.handoverNotes.map((note) => <article className="handover-note" key={note.nodeId}><strong>{localizeMission(pelvicTraumaContent.missions.find((mission) => mission.id === note.missionId)!, language).title}</strong><p>{note.text || (language === "th" ? "ยังไม่มี handover" : "Handover not yet saved")}</p></article>)}<p>{language === "th" ? "ทบทวนเหตุผลหรือ uncertainty ทั้งสาม แล้วจบเวรเพื่อรับ 25 reward" : "Review your three handover reasons or uncertainties. Finish the shift to collect 25 reward."}</p>{!completeCases && <button className="secondary" onClick={() => go("missions")}>{language === "th" ? "กลับไปเคสที่ยังไม่ครบ" : "Return to unfinished cases"}</button>}</> : <label><span>Your debrief note</span><textarea rows={6} maxLength={700} value={text} onChange={(event) => setText(event.target.value)} placeholder="No current question; I will review…" /></label>}<button className="primary" disabled={busy || (revised ? !completeCases : !text.trim())} onClick={submit}>{revised ? (language === "th" ? "จบเวร" : "Finish shift") : "Save debrief"}<Check /></button></section>;
}

function ProgressView({ progress, events, go, sync, avatarId }: { progress: ReturnType<typeof deriveProgress>; events: LearningEvent[]; go(view: View): void; sync(): void; avatarId: string }) {
  const { language } = useLanguage(); const rewards = computeRewards(pelvicTraumaContent, events, progress);
  return <section className="stack page-enter"><div><span className="eyebrow">{language === "th" ? "บันทึกการเดินทาง" : "SHIFT JOURNEY"}</span><h1>{language === "th" ? "Reward และ safety badges" : "Rewards and safety badges"}</h1><p>{language === "th" ? "ครบ 15 decisions · แก้คำตอบแล้วก็ปลดล็อกชุดสูงสุดได้" : "15 decisions. Completing through corrections can unlock the best outfit."}</p></div><div className="metrics"><Metric label={language === "th" ? "Reward รวม" : "Total reward"} value={`${rewards.total} / ${rewards.maximum}`} note={rewards.scheme === "legacy-150" ? "10 first-correct · 5 corrected" : "10 first-correct · 8 corrected"} /><Metric label={language === "th" ? "ขั้นที่ผ่าน" : "Steps cleared"} value={`${progress.clearedNodeIds.length} / 15`} note={`${progress.correctedNodeIds.length} corrected`} /><Metric label="Safety badges" value={`${rewards.safetyBadges.length} / 6`} note={language === "th" ? "เก็บครบทั้งหก" : "Collect all six"} /></div><RewardCollections events={events} /><div className="progress-grid"><article className="panel quest-panel"><h2>Patient cases</h2>{pelvicTraumaContent.missions.map((mission) => <StatusRow key={mission.id} label={localizeMission(mission, language).title} okay={progress.missionReviewed[mission.id]} />)}</article><article className="panel wardrobe-panel"><div><h2>{language === "th" ? "ชุดระดับ" : "Clothing level"} {rewards.level}/5</h2><p>{language === "th" ? "ชุดเป็น visual reward ไม่เปลี่ยน clinical feedback" : "Clothing is a visual reward, not clinical certification."}</p></div><img src={upgradePath(avatarId, rewards.total)} alt={`Learner outfit level ${rewards.level}`} /></article><article className="panel"><h2>{language === "th" ? "การส่งผลก่อนเรียน" : "Pre-class receipt"}</h2><LearningSummary content={pelvicTraumaContent} events={events} language={language} /><ReceiptState events={events} complete={progress.locallyComplete} />{!progress.locallyComplete && <button className="primary" onClick={() => go(Object.values(progress.missionReviewed).every(Boolean) ? "reflection" : "missions")}>{language === "th" ? "ทำต่อ" : "Continue shift"}</button>}{progress.locallyComplete && <button className="secondary" onClick={sync}>{language === "th" ? "ส่งผลให้รายวิชา" : "Send progress to course"}</button>}</article></div><Leaderboard complete={progress.locallyComplete} rewardScore={rewards.total} avatarId={avatarId} /></section>;
}

function Leaderboard({ complete, rewardScore, avatarId }: { complete: boolean; rewardScore: number; avatarId: string }) {
  const {language} = useLanguage();
  const label = (en: string, th: string) => language === "th" ? th : en;
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [state, setState] = useState<"locked" | "loading" | "ready" | "error">(complete ? "loading" : "locked");
  useEffect(() => {
    if (!complete) { setState("locked"); return; }
    if (appConfig.mode === "demo") {
      const demo = [
        { label: "You", reward: rewardScore, isCurrentLearner: true },
        { label: "Fictional classmate A", reward: pelvicTraumaContent.id === LEGACY_VERSION ? 135 : 240, isCurrentLearner: false },
        { label: "Fictional classmate B", reward: pelvicTraumaContent.id === LEGACY_VERSION ? 115 : 220, isCurrentLearner: false },
        { label: "Fictional classmate C", reward: pelvicTraumaContent.id === LEGACY_VERSION ? 90 : 220, isCurrentLearner: false }
      ];
      const ranked = rankRewards(demo).map((row) => ({ ...row, clothingLevel: clothingLevel(row.reward) }));
      setRows(ranked); setState("ready"); return;
    }
    setState("loading");
    void backend.loadLeaderboard?.(pelvicTraumaContent.id).then((data) => { setRows(data ?? []); setState("ready"); }).catch(() => setState("error"));
  }, [complete, rewardScore]);
  if (!complete) return <article className="panel leaderboard locked"><span className="eyebrow">COHORT REWARD PODIUM</span><h2>{label("Complete the shift to compare rewards","จบเวรเพื่อเปรียบเทียบ reward")}</h2><p>{label("Equal totals share rank; time never breaks ties. Only matching versions are compared.","Reward เท่ากันได้อันดับร่วม ไม่ใช้ความเร็วตัดสิน เปรียบเทียบเฉพาะเวอร์ชันเดียวกัน")}</p></article>;
  const podium = [rows[1], rows[0], rows[2]].filter(Boolean) as LeaderboardRow[];
  return <article className="panel leaderboard"><div className="leaderboard-head"><div><span className="eyebrow">COHORT REWARD PODIUM</span><h2>{label("Compare your total reward","เปรียบเทียบ reward รวม")}</h2><p>{appConfig.mode === "demo" ? label("Local demonstration with fictional classmates.","ตัวอย่างในเครื่อง เพื่อนร่วมชั้นเป็นข้อมูลสมมติ") : label("Confirmed reporting attempts in your cohort.","ผลที่ยืนยันแล้วใน cohort ของคุณ ใช้ชื่อแทนตัวตน")}</p></div><strong>{rows.find((row) => row.isCurrentLearner)?.rank ? `${label("Your rank","อันดับของคุณ")}: ${rows.find((row) => row.isCurrentLearner)?.rank}` : label("Sync to receive your rank","Sync เพื่อรับอันดับ")}</strong></div>{state === "loading" && <p role="status">Loading cohort ranking…</p>}{state === "error" && <p role="alert">The cohort ranking could not be loaded. Your individual progress remains saved.</p>}{state === "ready" && <><div className="podium">{podium.map((row) => <div className={`podium-place place-${row.rank} ${row.isCurrentLearner ? "you" : ""}`} key={`${row.rank}-${row.isCurrentLearner ? label("You","คุณ") : appConfig.mode === "demo" ? label(row.label,"เพื่อนสมมติ " + row.label.at(-1)) : row.label}`}>{row.isCurrentLearner ? <img src={upgradePath(avatarId, row.reward)} alt={`Your clothing level ${row.clothingLevel}`} /> : <span className="podium-person" aria-hidden="true">{row.rank === 1 ? "★" : row.rank}</span>}<strong>{row.isCurrentLearner ? label("You","คุณ") : appConfig.mode === "demo" ? label(row.label,"เพื่อนสมมติ " + row.label.at(-1)) : row.label}</strong><small>{row.reward} reward · clothing {row.clothingLevel}</small><div>{row.rank}</div></div>)}</div><ol className="ranking-list">{rows.map((row) => <li className={row.isCurrentLearner ? "you" : ""} key={`${row.rank}-${row.isCurrentLearner ? label("You","คุณ") : appConfig.mode === "demo" ? label(row.label,"เพื่อนสมมติ " + row.label.at(-1)) : row.label}`}><span>{row.rank}</span><strong>{row.isCurrentLearner ? label("You","คุณ") : appConfig.mode === "demo" ? label(row.label,"เพื่อนสมมติ " + row.label.at(-1)) : row.label}</strong><small>{row.reward} reward</small></li>)}</ol></>}</article>;
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) { return <article className="metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>; }
function StatusRow({ label, okay, note }: { label: string; okay: boolean; note?: string }) { return <div className="status-row"><span className={okay ? "check-icon okay" : "check-icon"}>{okay ? <Check /> : "·"}</span><span><strong>{label}</strong>{note && <small>{note}</small>}</span><span>{okay ? "Reviewed" : "Needs review"}</span></div>; }
function ReceiptState({ events, complete }: { events: LearningEvent[]; complete: boolean }) {
  const {language}=useLanguage(); const [confirmed,setConfirmed]=useState(false);
  useEffect(()=>{let active=true; void hasCompletionReceipt(accountKey,attemptId).then((value)=>{if(active)setConfirmed(value);}).catch(()=>{if(active)setConfirmed(false);});return()=>{active=false;};},[events]);
  const pending=events.some((event)=>!event.serverReceiptTimestamp);
  const title=!complete ? (language==="th"?"ยังไม่ครบ":"Not yet complete") : appConfig.mode==="demo" ? (language==="th"?"เสร็จในเครื่องนี้":"Completed on this device") : confirmed ? (language==="th"?"รายวิชายืนยันแล้ว":"Confirmed by course") : pending ? (language==="th"?"รอส่งผล":"Waiting to sync") : (language==="th"?"รอรายวิชายืนยัน":"Waiting for course confirmation");
  return <div className="receipt-state">{confirmed ? <ShieldCheck/> : complete ? <Check/> : <CloudOff/>}<span><strong>{title}</strong><small>{appConfig.mode==="demo" ? (language==="th"?"Demo ไม่ออกใบยืนยันจริง":"Demo cannot issue a real course receipt.") : (language==="th"?"ยืนยันเมื่อได้รับ completion receipt จาก server เท่านั้น":"Confirmation requires the server's completion receipt.")}</small></span></div>;
}

function FacultyDashboard({events}: {progress:ReturnType<typeof deriveProgress>;events:LearningEvent[];addEvent(event:LearningEvent):Promise<boolean>}) { return <FacultyWorkspace events={events} attemptId={attemptId}/>; }

function FollowUp() { return <section className="reading"><span className="eyebrow">AFTER CLASS</span><h1>Follow-up links</h1><p>No teacher-controlled day-2 or day-7 link has been released in this demo. Unseen assessment keys are not included in the offline pack.</p></section>; }

function HelpView({ addEvent, events, offlineState, installPrompt, setInstallPrompt }: any) { const [message, setMessage] = useState(""); const [rejected,setRejected]=useState<Array<{eventId:string;reason:string}>>([]); useEffect(()=>{void submissionRejections(accountKey).then(setRejected).catch(()=>undefined);},[events]); const submit = async () => { await addEvent({ ...createBaseEvent(attemptId, nextClientSequence(events)), type: "issue_reported", nodeId: null, message: message.trim() }); setMessage(""); }; const install = async () => { if (installPrompt) { await installPrompt.prompt(); await installPrompt.userChoice; setInstallPrompt(null); } }; return <section className="stack page-enter"><div><span className="eyebrow">HELP AND RECOVERY</span><h1>Keep your work safe</h1></div>{rejected.length>0 && <article className="panel"><h2>Rejected records — still saved locally</h2>{rejected.map(item=><p key={item.eventId}>{item.reason} · {item.eventId}</p>)}<p>Contact the course team before retrying. Original responses have not been erased.</p></article>}<div className="help-grid"><article className="panel"><Download /><h2>Offline and installation</h2><p>First access and download require internet. Current pack: <strong>{offlineState}</strong>. Browser storage can be cleared or evicted, so sync when you reconnect.</p><button className="secondary" onClick={install} disabled={!installPrompt}>{installPrompt ? "Install this app" : "Use browser install menu"}</button><p><strong>iPhone:</strong> open in Safari, tap Share, then Add to Home Screen. Android Chrome normally offers Install app in its menu.</p></article><article className="panel"><ShieldCheck /><h2>Privacy and account changes</h2><p>Progress is partitioned by account on this device. Sign out only after syncing. Remote revocation cannot instantly erase an offline device; the learning content contains no patient data.</p></article><article className="panel report"><CircleHelp /><h2>Report a confusing question</h2><label><span>What was confusing?</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={800} /></label><button className="primary" disabled={!message.trim()} onClick={submit}>Save report</button><small>If offline, the report waits on this device and is submitted only for the same account.</small></article></div><details><summary>Support diagnostics</summary><pre>{JSON.stringify({ mode: appConfig.mode, online: navigator.onLine, contentVersion: pelvicTraumaContent.id, accountPartition: accountKey, eventCount: events.length, offlineState }, null, 2)}</pre></details></section>; }

function conceptName(id: SafetyConceptId) { return { S1: "Urgent resuscitation and escalation", S2: "Binder landmark", S3: "Imaging during unresolved shock", S4: "Binder reassessment and removal", S5: "Urethral warning", S6: "Possible open injury" }[id]; }

export default App;
