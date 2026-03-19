import Parse from "parse";

Parse.initialize("myAppId1", "myJavascriptKey");
Parse.serverURL = "https://parse.musicliveapp.xyz/parse";
// Parse.serverURL = "https://parse.vioralive.com/parse";

export default Parse;