import * as firebase from "firebase";
import * as firebaseConfig from "./firebase-config.json";

interface FirebaseConfig{
  apiKey: string;
  databaseURL: string;
}

class FirebaseService{
  public readonly database: firebase.database.Database;

  constructor(config: FirebaseConfig) {
    firebase.initializeApp(config);
    this.database = firebase.database();
  }

  public isConnected(): Promise<boolean> {
    return this.database.ref(".info/connected").once("value")
      .then(snap => snap.val());
  }
}

export const firebaseService = new FirebaseService(firebaseConfig);
