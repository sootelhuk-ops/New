import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Google Auth Provider with Google Drive File scope
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

// In-memory token cache (DO NOT store in localStorage or sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface DriveItem {
  id: string;
  name: string;
  webViewLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
}

export interface DrivePermission {
  id: string;
  role: 'reader' | 'writer' | 'commenter' | 'owner';
  type: 'user' | 'group' | 'domain' | 'anyone';
  emailAddress?: string;
  displayName?: string;
  photoLink?: string;
}

/**
 * Initialize Firebase Auth listener.
 * Keeps auth state and cached token synchronized.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

/**
 * Sign in with Google Popup and acquire Google Drive access token
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('لم يتم استلام رمز المصادقة من Google.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Get current in-memory access token
 */
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Sign out and clear in-memory token
 */
export const logout = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Dedicated drawings folder name in Google Drive
 */
export const DEFAULT_DRIVE_FOLDER_NAME = 'كروكيات شبكة الكهرباء - ALJUAN';

/**
 * Find existing or create a new dedicated folder in Google Drive
 */
export const getOrCreateDrawingsFolder = async (
  folderName = DEFAULT_DRIVE_FOLDER_NAME
): Promise<DriveItem> => {
  const token = getAccessToken();
  if (!token) throw new Error('يرجى تسجيل الدخول بحساب Google أولاً');

  // Search for folder in user's Drive
  const query = encodeURIComponent(
    `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`خطأ في استعلام Google Drive: ${errText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0];
  }

  // Create folder if not found
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'مجلد حفظ وتصدير كروكيات شبكات الكهرباء وأوامر العمل من تطبيق كروكي CAD',
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`تعذر إنشاء مجلد في Google Drive: ${errText}`);
  }

  return await createRes.json();
};

/**
 * Upload a binary blob (PNG image or PDF) to Google Drive in the specified folder
 */
export const uploadFileToDrive = async ({
  folderId,
  fileName,
  mimeType,
  fileBlob,
  description = 'تم الإنشاء والتصدير عبر تطبيق كروكي CAD',
}: {
  folderId?: string;
  fileName: string;
  mimeType: 'image/png' | 'application/pdf';
  fileBlob: Blob;
  description?: string;
}): Promise<DriveItem> => {
  const token = getAccessToken();
  if (!token) throw new Error('يرجى تسجيل الدخول بحساب Google أولاً');

  const metadata: Record<string, any> = {
    name: fileName,
    mimeType,
    description,
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  // Multipart upload boundary
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
    metadata
  )}`;

  const filePartHeader = `${delimiter}Content-Type: ${mimeType}\r\n\r\n`;

  // Convert blob to ArrayBuffer
  const fileBuffer = await fileBlob.arrayBuffer();

  // Combine into single payload
  const enc = new TextEncoder();
  const part1 = enc.encode(metadataPart);
  const part2 = enc.encode(filePartHeader);
  const part3 = new Uint8Array(fileBuffer);
  const part4 = enc.encode(closeDelimiter);

  const totalLength = part1.byteLength + part2.byteLength + part3.byteLength + part4.byteLength;
  const combined = new Uint8Array(totalLength);

  let offset = 0;
  combined.set(part1, offset);
  offset += part1.byteLength;
  combined.set(part2, offset);
  offset += part2.byteLength;
  combined.set(part3, offset);
  offset += part3.byteLength;
  combined.set(part4, offset);

  const uploadUrl =
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,iconLink,thumbnailLink';

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: combined,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`تعذر حفظ الملف على Google Drive: ${errText}`);
  }

  return await res.json();
};

/**
 * List permissions for a specific file or folder
 */
export const listDrivePermissions = async (fileId: string): Promise<DrivePermission[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('يرجى تسجيل الدخول بحساب Google أولاً');

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?fields=permissions(id,role,type,emailAddress,displayName,photoLink)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`تعذر جلب الصلاحيات من Google Drive: ${errText}`);
  }

  const data = await res.json();
  return data.permissions || [];
};

/**
 * Grant permission on a file or folder to a user or anyone with link
 */
export const grantDrivePermission = async ({
  fileId,
  role,
  type,
  emailAddress,
}: {
  fileId: string;
  role: 'reader' | 'writer' | 'commenter';
  type: 'user' | 'anyone';
  emailAddress?: string;
}): Promise<DrivePermission> => {
  const token = getAccessToken();
  if (!token) throw new Error('يرجى تسجيل الدخول بحساب Google أولاً');

  const body: Record<string, any> = { role, type };
  if (type === 'user') {
    if (!emailAddress || !emailAddress.includes('@')) {
      throw new Error('يرجى إدخال بريد إلكتروني صحيح');
    }
    body.emailAddress = emailAddress.trim();
  }

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?sendNotificationEmail=true&fields=id,role,type,emailAddress,displayName`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`تعذر منح الصلاحية على Google Drive: ${errText}`);
  }

  return await res.json();
};

/**
 * Remove/Revoke permission with explicit confirmation safeguard
 */
export const removeDrivePermission = async (
  fileId: string,
  permissionId: string
): Promise<void> => {
  const token = getAccessToken();
  if (!token) throw new Error('يرجى تسجيل الدخول بحساب Google أولاً');

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions/${permissionId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`تعذر إلغاء الصلاحية من Google Drive: ${errText}`);
  }
};
