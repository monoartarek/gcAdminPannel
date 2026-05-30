
import Parse from "parse"; // or "parse" for web

Parse.initialize("myAppId1", "myJavascriptKey"); // App ID, JS Key
Parse.serverURL = "https://parse.priyulive.com/parse";
Parse.masterKey = "myMasterKey"; // only if needed client-side

export default Parse;


// import Parse from "parse"; // or "parse" for web

// Parse.initialize("myAppId1", "myJavascriptKey"); // App ID, JS Key
// Parse.serverURL = "https://parse.babylive.xyz:8443/parse";
// Parse.masterKey = "myMasterKey"; // only if needed client-side

// export default Parse;