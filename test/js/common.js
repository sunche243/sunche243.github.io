import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC4p0c57uJHLj2un5W2Mr5Us0U8zw-4WzU",
  authDomain: "accounting-pub.firebaseapp.com",
  projectId: "accounting-pub"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };