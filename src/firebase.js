import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Vite の環境変数から Firebase の設定値を読み込み
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Firebase アプリの初期化
const app = initializeApp(firebaseConfig);

// 各サービスの各種インスタンスをエクスポート
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/**
 * 画像保存処理の分岐用関数
 * @param {File} file - 保存する画像ファイル
 * @param {string} path - Storage パス
 * @param {boolean} isPaidPlan - 有料プラン(Blaze)かどうか
 * @returns {Promise<string>} 画像の URL または Base64 文字列
 */
export async function saveImage(file, path, isPaidPlan = false) {
  if (isPaidPlan) {
    // 【有料プラン: Firebase Storageへアップロード】
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  } else {
    // 【無料プラン: Base64に変換して文字列として保持】
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }
}