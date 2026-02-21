import React, { useState, useEffect } from "react";
import Parse from "../parseConfig";
import "./Profile.css";

function Profile() {

  const [username, setUsername] = useState("");

  const [password, setPassword] = useState("");

  const [currentUser, setCurrentUser] = useState(null);


  useEffect(() => {

    const loadUser = async () => {

      const user = await Parse.User.currentAsync();

      setCurrentUser(user);

    };

    loadUser();

  }, []);


  const changeUsername = async () => {

    try {

      currentUser.set("username", username);

      await currentUser.save();

      alert("Username changed");

      window.location.reload();

    } catch (error) {

      alert(error.message);

    }

  };


  const changePassword = async () => {

    try {

      currentUser.set("password", password);

      await currentUser.save();

      alert("Password changed");

    } catch (error) {

      alert(error.message);

    }

  };


  const logout = async () => {

    await Parse.User.logOut();

    window.location.href = "/login";

  };


  return (

    <div className="profile-container">

      <h2>Profile Settings</h2>


      <input
        placeholder="New Username"
        onChange={(e) =>
          setUsername(e.target.value)
        }
      />

      <button onClick={changeUsername}>
        Change Username
      </button>


      <input
        type="password"
        placeholder="New Password"
        onChange={(e) =>
          setPassword(e.target.value)
        }
      />

      <button onClick={changePassword}>
        Change Password
      </button>


      <button
        className="logout-btn"
        onClick={logout}
      >
        Logout
      </button>

    </div>

  );

}

export default Profile;