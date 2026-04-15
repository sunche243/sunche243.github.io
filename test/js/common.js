import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyC4p0c57uJHLj2un5W2Mr5Us0U8zw-4WzU",
  authDomain: "accounting-pub.firebaseapp.com",
  projectId: "accounting-pub",
  storageBucket: "accounting-pub.firebasestorage.app"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };