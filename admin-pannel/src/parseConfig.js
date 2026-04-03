// import Parse from "parse";

// Parse.initialize("myAppId1", "myJavascriptKey");
// Parse.serverURL = "https://parse.priyulive.com/parse";

// export default Parse;
// -------------------------------------------
// import Parse from "parse";

// Parse.initialize(
//   "myAppId1",        // Application ID
//   "myJavascriptKey", // JavaScript Key
//   "myMasterKey"      // Master Key — only used server-side via useMasterKey: true
// );

// Parse.serverURL = "https://parse.priyulive.com/parse";

// export default Parse;
// -------------------------------------------
import Parse from "parse"; // or "parse" for web

Parse.initialize("myAppId1", "myJavascriptKey"); // App ID, JS Key
Parse.serverURL = "https://parse.apliveapp.com/parse";
Parse.masterKey = "myMasterKey"; // only if needed client-side

export default Parse;