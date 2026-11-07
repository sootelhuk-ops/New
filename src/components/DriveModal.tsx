import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  Check,
  AlertCircle,
  FolderOpen,
  Share2,
  ExternalLink,
  UserPlus,
  Trash2,
  Lock,
  Globe,
  Loader2,
  FileImage,
  FileText,
  Copy,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  auth,
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  getOrCreateDrawingsFolder,
  uploadFileToDrive,
  listDrivePermissions,
  grantDrivePermission,
  removeDrivePermission,
  DriveItem,
  DrivePermission,
  DEFAULT_DRIVE_FOLDER_NAME,
} from '../services/driveService';
import { captureSheetAsBlob } from '../utils/exportPdf';
import { WorkOrderData } from '../types';

interface DriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: WorkOrderData;
  canvasContainerId?: string;
}

export const DriveModal: React.FC<DriveModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  canvasContainerId = 'cad-print-area',
}) => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [token, setToken] = useState<string | null>(getAccessToken());
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active tab: 'upload' or 'permissions'
  const [activeTab, setActiveTab] = useState<'upload' | 'permissions'>('upload');

  // Dedicated Folder State
  const [folder, setFolder] = useState<DriveItem | null>(null);
  const [isLoadingFolder, setIsLoadingFolder] = useState(false);

  // Upload State
  const [uploadFormat, setUploadFormat] = useState<'png' | 'pdf' | 'both'>('png');
  const [customFileName, setCustomFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<{
    file?: DriveItem;
    files?: DriveItem[];
    message: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Permissions State
  const [permissions, setPermissions] = useState<DrivePermission[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'reader' | 'writer' | 'commenter'>('reader');
  const [isGranting, setIsGranting] = useState(false);
  const [permissionMsg, setPermissionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [copiedLink, setCopiedLink] = useState(false);

  // Destructive delete confirmation dialog state
  const [permissionToDelete, setPermissionToDelete] = useState<DrivePermission | null>(null);
  const [isDeletingPermission, setIsDeletingPermission] = useState(false);

  // Initialize Auth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setAuthError(null);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Set default filename based on work order
  useEffect(() => {
    const reportNum = workOrder.orderNumber || 'كروكي';
    const dateStr = new Date().toISOString().split('T')[0];
    setCustomFileName(`كروكي-بلاغ-${reportNum}-${dateStr}`);
  }, [workOrder.orderNumber, isOpen]);

  // Load Folder when user signs in and modal is open
  useEffect(() => {
    if (isOpen && token) {
      loadDriveFolder();
    }
  }, [isOpen, token]);

  const loadDriveFolder = async () => {
    setIsLoadingFolder(true);
    setUploadError(null);
    try {
      const f = await getOrCreateDrawingsFolder();
      setFolder(f);
      loadPermissions(f.id);
    } catch (err: any) {
      console.error('Error fetching Drive folder:', err);
      setUploadError(err.message || 'تعذر الوصول إلى مجلد Google Drive');
    } finally {
      setIsLoadingFolder(false);
    }
  };

  const loadPermissions = async (folderId: string) => {
    setIsLoadingPermissions(true);
    try {
      const perms = await listDrivePermissions(folderId);
      setPermissions(perms);
    } catch (err) {
      console.error('Failed to list permissions:', err);
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
      }
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setAuthError(err.message || 'تعذر تسجيل الدخول بحساب Google. يرجى المحاولة ثانية.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setFolder(null);
    setPermissions([]);
    setUploadSuccess(null);
  };

  const handleSaveToDrive = async () => {
    if (!token) {
      setUploadError('يرجى تسجيل الدخول بحساب Google أولاً');
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      // Ensure target folder exists
      let targetFolder = folder;
      if (!targetFolder) {
        targetFolder = await getOrCreateDrawingsFolder();
        setFolder(targetFolder);
      }

      const baseName = (customFileName.trim() || 'كروكي-مساحي').replace(/\.(png|pdf)$/i, '');
      const uploadedFiles: DriveItem[] = [];

      if (uploadFormat === 'png' || uploadFormat === 'both') {
        const pngBlob = await captureSheetAsBlob(canvasContainerId, 'png');
        const file = await uploadFileToDrive({
          folderId: targetFolder.id,
          fileName: `${baseName}.png`,
          mimeType: 'image/png',
          fileBlob: pngBlob,
          description: `كروكي شبكة الكهرباء لبلاغ ${workOrder.orderNumber} بصيغة صورة عالية الدقة PNG`,
        });
        uploadedFiles.push(file);
      }

      if (uploadFormat === 'pdf' || uploadFormat === 'both') {
        const pdfBlob = await captureSheetAsBlob(canvasContainerId, 'pdf');
        const file = await uploadFileToDrive({
          folderId: targetFolder.id,
          fileName: `${baseName}.pdf`,
          mimeType: 'application/pdf',
          fileBlob: pdfBlob,
          description: `كروكي هندسي مساحي معتمد لبلاغ ${workOrder.orderNumber} بصيغة PDF`,
        });
        uploadedFiles.push(file);
      }

      setUploadSuccess({
        files: uploadedFiles,
        file: uploadedFiles[0],
        message:
          uploadFormat === 'both'
            ? 'تم حفظ كل من صورة الكروكي (PNG) وملف الـ PDF بنجاح في مجلد Google Drive!'
            : uploadFormat === 'pdf'
            ? 'تم حفظ ملف الكروكي PDF بنجاح في مجلد Google Drive!'
            : 'تم حفظ صورة الكروكي بنجاح في مجلد Google Drive!',
      });
    } catch (err: any) {
      console.error('Error saving to Drive:', err);
      setUploadError(err.message || 'حدث خطأ أثناء الحفظ على Google Drive');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGrantPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folder) return;
    if (!inviteEmail.trim()) {
      setPermissionMsg({ type: 'error', text: 'يرجى إدخال البريد الإلكتروني للشخص المطلوب' });
      return;
    }

    setIsGranting(true);
    setPermissionMsg(null);
    try {
      await grantDrivePermission({
        fileId: folder.id,
        role: inviteRole,
        type: 'user',
        emailAddress: inviteEmail.trim(),
      });
      setInviteEmail('');
      setPermissionMsg({
        type: 'success',
        text: `تم منح صلاحية (${inviteRole === 'writer' ? 'محرر' : 'مشاهد'}) للمستخدم بنجاح وإرسال إشعار له!`,
      });
      await loadPermissions(folder.id);
    } catch (err: any) {
      console.error('Error granting permission:', err);
      setPermissionMsg({
        type: 'error',
        text: err.message || 'تعذر منح الصلاحية على المجلد',
      });
    } finally {
      setIsGranting(false);
    }
  };

  const handleMakePublicLink = async () => {
    if (!folder) return;
    setIsGranting(true);
    setPermissionMsg(null);
    try {
      await grantDrivePermission({
        fileId: folder.id,
        role: 'reader',
        type: 'anyone',
      });
      setPermissionMsg({
        type: 'success',
        text: 'تم تفعيل المشاركة: يمكن الآن لأي شخص يملك الرابط فتح وعرض رسومات المجلد!',
      });
      await loadPermissions(folder.id);
    } catch (err: any) {
      setPermissionMsg({
        type: 'error',
        text: err.message || 'تعذر تفعيل المشاركة بالرابط',
      });
    } finally {
      setIsGranting(false);
    }
  };

  const handleConfirmRevokePermission = async () => {
    if (!folder || !permissionToDelete) return;
    setIsDeletingPermission(true);
    try {
      await removeDrivePermission(folder.id, permissionToDelete.id);
      setPermissionMsg({
        type: 'success',
        text: `تم إلغاء صلاحية الوصول للمستخدم (${permissionToDelete.emailAddress || 'المشارك'}) بنجاح.`,
      });
      setPermissionToDelete(null);
      await loadPermissions(folder.id);
    } catch (err: any) {
      setPermissionMsg({
        type: 'error',
        text: err.message || 'تعذر إلغاء الصلاحية',
      });
    } finally {
      setIsDeletingPermission(false);
    }
  };

  const copyFolderLink = () => {
    if (!folder?.webViewLink) return;
    navigator.clipboard.writeText(folder.webViewLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto font-['Cairo',sans-serif] animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
          <div className="flex items-center gap-3">
            {/* Google Drive Logo Badge */}
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-2 shadow-md">
              <svg viewBox="0 0 87.3 78" className="w-full h-full">
                <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.9 2.5 3.2 3.3L30 50.8 16.3 27.2 6.6 44c-1.3 2.2-2 4.8-2 7.4.1 2.7.8 5.2 2 7.45z" fill="#0066da"/>
                <path d="M43.65 25l16.3-28.2c-1.3-.8-2.7-1.3-4.2-1.6-1.5-.3-3-.3-4.5 0H16.3c-1.5.3-3 .8-4.2 1.6L27.4 25h16.25z" fill="#00ac47"/>
                <path d="M73.55 76.8c1.3-.8 2.4-1.9 3.2-3.3l1.8-3.1c1.2-2.1 1.9-4.5 2-7 .1-2.5-.5-5-1.7-7.2L64.2 31.8 50.5 55.4l16.35 28.2c2.4-.4 4.8-1.5 6.7-2.8z" fill="#ea4335"/>
                <path d="M43.65 25L30 50.8h34.2L77.9 25H43.65z" fill="#ffba00"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                حفظ على Google Drive وإدارة الصلاحيات
              </h2>
              <p className="text-xs text-slate-400">
                حفظ مخططات الكروكي تلقائياً ومشاركة المجلد مع المهندسين والمشرفين
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Account Bar */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-xs">
          {user ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Google User'}
                    className="w-7 h-7 rounded-full border border-emerald-500/50"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-emerald-700 font-bold text-white flex items-center justify-center text-xs">
                    {(user.displayName || user.email || 'G')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-bold text-slate-200">
                    {user.displayName || 'مستخدم Google'}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">{user.email}</div>
                </div>
                <span className="mr-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                  <ShieldCheck className="w-3 h-3" />
                  متصل بحساب Drive
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                title="تسجيل الخروج من حساب Google"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تبديل الحساب</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 text-slate-300">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>يتطلب الحفظ والمشاركة تسجيل الدخول بحساب Google</span>
              </div>

              {/* Standard Google Sign In Button */}
              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-60"
              >
                {isSigningIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>جاري تسجيل الدخول...</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 48 48" className="w-4 h-4">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    <span>تسجيل الدخول بـ Google</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {authError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-900/80 px-6 pt-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs border-b-2 transition-all ${
              activeTab === 'upload'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>حفظ الكروكي في المجلد</span>
          </button>

          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs border-b-2 transition-all ${
              activeTab === 'permissions'
                ? 'border-blue-500 text-blue-400 bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>إعطاء وإدارة صلاحيات فتح الدرايف ({permissions.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Dedicated Folder Status Banner */}
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400">مجلد الرسومات في Google Drive:</div>
                <div className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <span>{folder?.name || DEFAULT_DRIVE_FOLDER_NAME}</span>
                  {isLoadingFolder && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                </div>
              </div>
            </div>

            {folder?.webViewLink && (
              <div className="flex items-center gap-2">
                <button
                  onClick={copyFolderLink}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs transition-colors"
                  title="نسخ رابط المجلد"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ الرابط</span>
                    </>
                  )}
                </button>
                <a
                  href={folder.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors shadow-xs"
                >
                  <span>فتح في Drive</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>

          {/* TAB 1: UPLOAD & SAVE */}
          {activeTab === 'upload' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {/* File Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  اسم ملف الكروكي:
                </label>
                <input
                  type="text"
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  placeholder="مثال: كروكي-بلاغ-39572523"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-medium focus:outline-hidden focus:border-emerald-500 transition-colors"
                  dir="auto"
                />
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  صيغة الحفظ على Google Drive:
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setUploadFormat('png')}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-2 ${
                      uploadFormat === 'png'
                        ? 'border-emerald-500 bg-emerald-950/30 text-white ring-1 ring-emerald-500'
                        : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <FileImage className="w-5 h-5 text-cyan-400" />
                      {uploadFormat === 'png' && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div>
                      <div className="font-bold text-xs">صورة PNG عالية الدقة</div>
                      <div className="text-[10px] text-slate-400">مناسبة للمعاينة والمشاركة السريعة</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUploadFormat('pdf')}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-2 ${
                      uploadFormat === 'pdf'
                        ? 'border-emerald-500 bg-emerald-950/30 text-white ring-1 ring-emerald-500'
                        : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <FileText className="w-5 h-5 text-red-400" />
                      {uploadFormat === 'pdf' && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div>
                      <div className="font-bold text-xs">مستند PDF هندسي</div>
                      <div className="text-[10px] text-slate-400">مقاس A4 معتمد للطباعة الرسمية</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUploadFormat('both')}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-2 ${
                      uploadFormat === 'both'
                        ? 'border-emerald-500 bg-emerald-950/30 text-white ring-1 ring-emerald-500'
                        : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-1">
                        <FileImage className="w-4 h-4 text-cyan-400" />
                        <FileText className="w-4 h-4 text-red-400" />
                      </div>
                      {uploadFormat === 'both' && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div>
                      <div className="font-bold text-xs">كلاهما (PNG + PDF)</div>
                      <div className="text-[10px] text-slate-400">حفظ النسختين معاً في المجلد</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Upload Error */}
              {uploadError && (
                <div className="p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Upload Success */}
              {uploadSuccess && (
                <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800/80 space-y-2.5 animate-in fade-in">
                  <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{uploadSuccess.message}</span>
                  </div>

                  {uploadSuccess.files && uploadSuccess.files.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {uploadSuccess.files.map((f) => (
                        <a
                          key={f.id}
                          href={f.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                        >
                          <span>عرض {f.name} في Drive</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Save Button */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={handleSaveToDrive}
                  disabled={isUploading || !user}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-sm transition-all shadow-lg shadow-emerald-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري المعالجة والرفع إلى Google Drive...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4" />
                      <span>حفظ الكروكي الآن في Google Drive</span>
                    </>
                  )}
                </button>

                {!user && (
                  <button
                    onClick={handleSignIn}
                    className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
                  >
                    تسجيل الدخول أولاً
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PERMISSIONS & SHARING */}
          {activeTab === 'permissions' && (
            <div className="space-y-5 animate-in fade-in duration-100">
              {/* Instructions Banner */}
              <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-900/50 text-xs text-blue-200 leading-relaxed">
                يمكنك هنا دعوة المهندسين، المشرفين، والعملاء وإعطائهم صلاحية مباشرة لفتح مجلد كروكيات
                الكهرباء وعرض أو تعديل المخططات.
              </div>

              {/* Add Permission Form */}
              <form onSubmit={handleGrantPermission} className="p-4 rounded-xl bg-slate-850 border border-slate-700/80 space-y-3">
                <div className="font-bold text-xs text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <span>إضافة مستخدم جديد ومنحه صلاحية فتح الدرايف:</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                  <div className="md:col-span-7">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="أدخل البريد الإلكتروني للمستخدم (Gmail)"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <select
                      value={inviteRole}
                      onChange={(e) =>
                        setInviteRole(e.target.value as 'reader' | 'writer' | 'commenter')
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="reader">مشاهد (عرض فقط)</option>
                      <option value="writer">محرر (عرض وإضافة)</option>
                      <option value="commenter">معلق (تعليقات)</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={isGranting || !user || !folder}
                      className="w-full h-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {isGranting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span>منح الصلاحية</span>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {/* Public Link Sharing Option */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">المشاركة عبر الرابط العام</div>
                    <div className="text-[11px] text-slate-400">
                      السماح لأي شخص يملك رابط المجلد بفتح الرسومات وعرضها
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleMakePublicLink}
                  disabled={isGranting || !user || !folder}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  تفعيل للجميع بالرابط
                </button>
              </div>

              {/* Message Feedback */}
              {permissionMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    permissionMsg.type === 'success'
                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                      : 'bg-red-950/60 border-red-800 text-red-200'
                  }`}
                >
                  {permissionMsg.type === 'success' ? (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{permissionMsg.text}</span>
                </div>
              )}

              {/* List of current permissions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-300">
                    الأشخاص الذين يملكون صلاحيات الوصول للمجلد حالياً:
                  </label>
                  {folder && (
                    <button
                      onClick={() => loadPermissions(folder.id)}
                      className="text-[11px] text-blue-400 hover:underline"
                    >
                      تحديث القائمة
                    </button>
                  )}
                </div>

                {isLoadingPermissions ? (
                  <div className="p-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    <span>جاري تحميل الصلاحيات...</span>
                  </div>
                ) : permissions.length === 0 ? (
                  <div className="p-4 text-center rounded-xl bg-slate-950/40 border border-slate-800 text-slate-400 text-xs">
                    لم يتم العثور على صلاحيات إضافية (أنت فقط المالك الحالي للمجلد)
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {permissions.map((p) => (
                      <div
                        key={p.id}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          {p.type === 'anyone' ? (
                            <div className="w-7 h-7 rounded-full bg-indigo-900/60 text-indigo-300 flex items-center justify-center">
                              <Globe className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold">
                              {(p.displayName || p.emailAddress || 'U')[0].toUpperCase()}
                            </div>
                          )}

                          <div>
                            <div className="font-bold text-white">
                              {p.type === 'anyone' ? 'أي شخص يملك الرابط' : p.displayName || p.emailAddress}
                            </div>
                            {p.emailAddress && p.type !== 'anyone' && (
                              <div className="text-[11px] text-slate-400 font-mono" dir="ltr">
                                {p.emailAddress}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.role === 'owner'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : p.role === 'writer'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-slate-700/50 text-slate-300'
                            }`}
                          >
                            {p.role === 'owner'
                              ? 'المالك'
                              : p.role === 'writer'
                              ? 'محرر'
                              : p.role === 'commenter'
                              ? 'معلّق'
                              : 'مشاهد'}
                          </span>

                          {p.role !== 'owner' && (
                            <button
                              onClick={() => setPermissionToDelete(p)}
                              className="p-1.5 rounded-lg hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition-colors"
                              title="إلغاء الصلاحية"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="text-slate-400 text-[11px]">
            تطبيق كروكي CAD • متكامل مع Google Drive API
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>

      {/* Explicit User Confirmation Dialog for Destructive Permission Revocation */}
      {permissionToDelete && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/75 p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-rose-600/50 rounded-2xl max-w-md w-full p-6 text-right shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400 font-bold text-base">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <span>تأكيد إلغاء صلاحية الوصول إلى المجلد</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              هل أنت متأكد من رغبتك في إلغاء صلاحية الوصول عن:
              <br />
              <strong className="text-white font-mono block mt-1">
                {permissionToDelete.emailAddress ||
                  (permissionToDelete.type === 'anyone' ? 'المشاركة العامة عبر الرابط' : 'هذا المستخدم')}
              </strong>
              <br />
              لن يتمكن هذا المستخدم بعد الآن من فتح مجلد الكروكيات أو عرض الرسومات.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setPermissionToDelete(null)}
                disabled={isDeletingPermission}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                إلغاء التراجع
              </button>
              <button
                onClick={handleConfirmRevokePermission}
                disabled={isDeletingPermission}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5"
              >
                {isDeletingPermission ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>تأكيد الإلغاء</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
