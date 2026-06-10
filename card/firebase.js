import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyAoYOszUvv_r-uE7mOMZTVacYDuJAERAOw",
    authDomain: "carddigitalloth-a0e92.firebaseapp.com",
    projectId: "carddigitalloth-a0e92",
    storageBucket: "carddigitalloth-a0e92.firebasestorage.app",
    messagingSenderId: "588513949527",
    appId: "1:588513949527:web:2348b99a4257e89e74f012",
    measurementId: "G-RV0DNCNEN9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Helper functions to get and save data
export async function getCardData() {
    try {
        const docRef = doc(db, "cardData", "main");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            console.log("No such document in Firebase! Needs initialization.");
            return null;
        }
    } catch (error) {
        console.error("Error fetching from Firebase:", error);
        return null;
    }
}

export async function saveCardData(data) {
    try {
        await setDoc(doc(db, "cardData", "main"), data);
        return true;
    } catch (error) {
        console.error("Error saving to Firebase:", error);
        return false;
    }
}

export async function uploadImageToStorage(file, path) {
    try {
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading to Firebase Storage:", error);
        throw error;
    }
}
