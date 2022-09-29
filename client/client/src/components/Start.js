import React, { useState } from "react";
import { Link } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import "../styles/start.css";

const Start = () => {
  const [roomCode, setRoomCode] = useState("");
  const [username, setUsername] = useState("");

  return (
    <div className='Homepage-Container'>
      <h1 style={{ color: "white" }}>Rack-O - AndresQuinto, Mirka M, Oscar de Leon</h1>
      <img
        src='https://m.media-amazon.com/images/I/71ERH-4PeWL._AC_SL1500_.jpg'
        className='Homepage-background-image'
      />
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          width: "50%",
          padding: "0 400px",
          flexWrap: "wrap",
        }}
      >
        <input
          type='text'
          placeholder='Username'
          onChange={(event) => setUsername(event.target.value)}
          className='Homepage-input'
          style={{ paddingLeft: "10px" }}
        />
        {username !== "" && (
          <input
            type='text'
            placeholder='Game Code'
            onChange={(event) => setRoomCode(event.target.value)}
            className='Homepage-input'
            style={{ paddingLeft: "10px" }}
          />
        )}

        {username !== "" && (
          <Link
            to={`/racko?roomCode=${uuidv4().slice(0, 8)}&username=${username}`}
          >
            <button className='Homepage-button CreateRoom-button'>
              Create Room
            </button>
          </Link>
        )}
        {roomCode !== "" && (
          <Link to={`/racko?roomCode=${roomCode}&username=${username}`}>
            <button className='Homepage-button JoinRoom-button'>
              Join Room
            </button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Start;
