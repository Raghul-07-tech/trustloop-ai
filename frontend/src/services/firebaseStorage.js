import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase";

/**
 * Upload file to Firebase Storage
 * @param {File} file - File to upload
 * @param {string} folder - Folder path in storage
 * @returns {Promise<string>} Download URL
 */
export const uploadFileToFirebase = async (file, folder = "evidence") => {
  try {
    const timestamp = Date.now();
    const fileName = `${folder}/${timestamp}_${file.name}`;
    const storageRef = ref(storage, fileName);
    
    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error("Error uploading to Firebase:", error);
    throw error;
  }
};

/**
 * Upload audio blob to Firebase Storage
 * @param {Blob} blob - Audio blob
 * @returns {Promise<string>} Download URL
 */
export const uploadAudioToFirebase = async (blob) => {
  try {
    const timestamp = Date.now();
    const fileName = `audio/${timestamp}_recording.webm`;
    const storageRef = ref(storage, fileName);
    
    // Upload blob
    const snapshot = await uploadBytes(storageRef, blob, {
      contentType: "audio/webm"
    });
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error("Error uploading audio to Firebase:", error);
    throw error;
  }
};

export default { uploadFileToFirebase, uploadAudioToFirebase };