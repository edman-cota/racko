import React, { useEffect, useState, memo } from "react";
import { useHistory } from "react-router";
import queryString from "query-string";
import io from "socket.io-client";

const ENDPOINT = "http://localhost:8000";
let socket;

const shuffle = (array) => {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
};

const isAscending = (arr) => {
  return arr.every(function (x, i) {
    return i === 0 || x >= arr[i - 1];
  });
};

const Racko = (props) => {
  const data = queryString.parse(props.location.search);
  const history = useHistory();
  const [room] = useState(data.roomCode);
  const [roomFull, setRoomFull] = useState(false);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const [deck, setDeck] = useState(shuffle([...Array(61).keys()]));
  const [discartedDeck, setDiscartedDeck] = useState([]);

  const [player1Deck, setPlayer1Deck] = useState([]);
  const [player2Deck, setPlayer2Deck] = useState([]);
  const [player3Deck, setPlayer3Deck] = useState([]);
  const [player4Deck, setPlayer4Deck] = useState([]);

  const [gameOver, setGameOver] = useState(false);
  const [turn, setTurn] = useState("");
  const [winner, setWinner] = useState("");

  const [isChatBoxHidden, setChatBoxHidden] = useState(true);
  const [deckPressed, setDeckPressed] = useState(false);
  const [currentDeckCard, setCurrentDeckCard] = useState("");
  const [takeDeckCard, setTakeDeckCard] = useState(false);
  const [deckCardPosition, setDeckCardPosition] = useState(0);

  const toggleChatBox = () => {
    const chatBody = document.querySelector(".chat-body");
    if (isChatBoxHidden) {
      chatBody.style.display = "block";
      setChatBoxHidden(false);
    } else {
      chatBody.style.display = "none";
      setChatBoxHidden(true);
    }
  };

  useEffect(() => {
    const connectionOptions = {
      forceNew: true,
      reconnectionAttempts: "Infinity",
      timeout: 10000,
      transports: ["websocket"],
    };
    socket = io.connect(ENDPOINT, connectionOptions);

    socket.emit("join", { room, name: data.username }, (error) => {
      if (error) setRoomFull(true);
    });

    return () => {
      try {
        //cleanup on component unmount
        socket.emit("disconnect");
        //shut down connnection instance
        socket.off();
      } catch (e) {}
    };
  }, []);

  useEffect(() => {
    setDeckPressed(false);
  }, [turn]);

  useEffect(() => {
    socket.on("roomData", ({ users }) => {
      setUsers(users);
    });

    socket.on("currentUserData", ({ playerType }) => {
      setCurrentUser(playerType);
    });
  }, []);

  useEffect(() => {
    socket.emit("initGameState", {
      gameOver: false,
      turn: "Player 1",
      player1Deck: deck.slice(0, 10),
      player2Deck: deck.slice(10, 20),
      player3Deck: deck.slice(20, 30),
      player4Deck: deck.slice(30, 40),
      deck: deck.slice(40, 60),
      discartedDeck: [],
    });
  }, []);

  useEffect(() => {
    socket.on(
      "initGameState",
      ({
        gameOver,
        turn,
        player1Deck,
        player2Deck,
        player3Deck,
        player4Deck,
        deck,
        discartedDeck,
      }) => {
        setGameOver(gameOver);
        setTurn(turn);
        setPlayer1Deck(player1Deck);
        setPlayer2Deck(player2Deck);
        setPlayer3Deck(player3Deck);
        setPlayer4Deck(player4Deck);
        setDeck(deck);
        setDiscartedDeck(discartedDeck);
      }
    );

    socket.on(
      "updateGameState",
      ({
        gameOver,
        winner,
        turn,
        player1Deck,
        player2Deck,
        player3Deck,
        player4Deck,
        deck,
        discartedDeck,
        deckCard,
        deckDisabled,
      }) => {
        gameOver && setGameOver(gameOver);
        winner && setWinner(winner);
        turn && setTurn(turn);
        player1Deck && setPlayer1Deck(player1Deck);
        player2Deck && setPlayer2Deck(player2Deck);
        player3Deck && setPlayer3Deck(player3Deck);
        player4Deck && setPlayer4Deck(player4Deck);

        deck && setDeck(deck);
        discartedDeck && setDiscartedDeck(discartedDeck);
        setCurrentDeckCard(deckCard);
      }
    );

    socket.on("message", (message) => {
      setMessages((messages) => [...messages, message]);

      const chatBody = document.querySelector(".chat-body");
      chatBody.scrollTop = chatBody.scrollHeight;
    });
  }, []);

  const sendMessage = (event) => {
    event.preventDefault();
    if (message) {
      socket.emit("sendMessage", { message: message }, () => {
        setMessage("");
      });
    }
  };

  const handlePressDeck = () => {
    setDeckPressed(true);
    const deckCard = deck[0];

    socket.emit("updateGameState", {
      deckCard,
    });
  };

  const handleDeckCardDiscard = () => {
    const tempDeck = deck;
    tempDeck.splice(0, 1);
    alert("Card discarted, turn changed");
    socket.emit("updateGameState", {
      deck: tempDeck,
      discartedDeck: [...discartedDeck, currentDeckCard],
      turn:
        currentUser === "Player 1"
          ? "Player 2"
          : currentUser === "Player 2"
          ? "Player 3"
          : currentUser === "Player 3"
          ? "Player 4"
          : "Player 1",
    });

    if (deck.length === 1) {
      socket.emit("updateGameState", {
        deck: [...discartedDeck, currentDeckCard],
      });
    }
  };

  const checkWinner = () => {
    if (currentUser === "Player 1") {
      if (isAscending(player1Deck)) {
        socket.emit("updateGameState", { gameOver: true, winner: "Player 1" });
      }
    } else if (currentUser === "Player 2") {
      if (isAscending(player2Deck)) {
        socket.emit("updateGameState", { gameOver: true, winner: "Player 2" });
      }
    } else if (currentUser === "Player 3") {
      if (isAscending(player3Deck)) {
        socket.emit("updateGameState", { gameOver: true, winner: "Player 3" });
      }
    } else {
      if (isAscending(player4Deck)) {
        socket.emit("updateGameState", { gameOver: true, winner: "Player 4" });
      }
    }
  };

  const handleDeckCardTake = () => {
    setTakeDeckCard(true);
  };

  const handleChangeCard = () => {
    setTakeDeckCard(false);
    let tempDeck = [];
    let tempCard = "";
    let tempMainDeck = [];
    if (currentUser === "Player 1") {
      tempDeck = player1Deck;
      tempCard = tempDeck[deckCardPosition];
      tempDeck[deckCardPosition] = currentDeckCard;
      tempMainDeck = deck;
      tempMainDeck.splice(0, 1);
      socket.emit("updateGameState", {
        player1Deck: tempDeck,
        turn: "Player 2",
        deck: tempMainDeck,
        discartedDeck: [...discartedDeck, tempCard],
      });
    } else if (currentUser === "Player 2") {
      tempDeck = player2Deck;
      tempCard = tempDeck[deckCardPosition];
      tempDeck[deckCardPosition] = currentDeckCard;
      tempMainDeck = deck;
      tempMainDeck.splice(0, 1);
      socket.emit("updateGameState", {
        player2Deck: tempDeck,
        turn: "Player 3",
        deck: tempMainDeck,
        discartedDeck: [...discartedDeck, tempCard],
      });
    } else if (currentUser === "Player 3") {
      tempDeck = player3Deck;
      tempCard = tempDeck[deckCardPosition];
      tempDeck[deckCardPosition] = tempCard;
      tempMainDeck = deck;
      tempMainDeck.splice(0, 1);
      socket.emit("updateGameState", {
        player3Deck: tempDeck,
        turn: "Player 4",
        deck: tempMainDeck,
        discartedDeck: [...discartedDeck, tempCard],
      });
    } else {
      tempDeck = player4Deck;
      tempCard = tempDeck[deckCardPosition];
      tempDeck[deckCardPosition] = currentDeckCard;
      tempMainDeck = deck;
      tempMainDeck.splice(0, 1);
      socket.emit("updateGameState", {
        player4Deck: tempDeck,
        turn: "Player 1",
        deck: tempMainDeck,
        discartedDeck: [...discartedDeck, tempCard],
      });
    }
    if (deck.length === 1) {
      socket.emit("updateGameState", {
        deck: [...discartedDeck, tempCard],
      });
    }
    checkWinner();
    alert("Card taken, turn changed");
  };

  useEffect(() => {
    if (gameOver) {
      alert("Game Over!!!: " + "The winner is: " + winner);
      history.push("/");
    }
  }, []);

  return (
    <div className='game-main-container'>
      {!roomFull ? (
        <>
          {users.length < 4 && <h1>Code: {room}</h1>}
          {users.length < 4 && users.map((u) => <h3>{u.name}</h3>)}
          {users.length === 4 && (
            <div>
              <h1>Welcome to Rack-O</h1>
              <div
                style={{ background: "red", height: "30vh", display: "flex" }}
              >
                <div
                  style={{
                    width: "50%",
                    background: "green",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <h4 style={{ marginRight: "10px" }}>Player 4</h4>
                  {player4Deck.map((c) => (
                    <div
                      style={{
                        background: "purple",
                        height: "100px",
                        width: "75px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        border: "4px solid black",
                        marginLeft: "6px",
                        cursor: "pointer",
                      }}
                    >
                      {c}
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    width: "50%",
                    background: "blue",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <h4 style={{ marginRight: "10px" }}>Player 3</h4>
                  {player3Deck.map((c) => (
                    <div
                      style={{
                        background: "purple",
                        height: "100px",
                        width: "75px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        border: "4px solid black",
                        marginLeft: "6px",
                        cursor: "pointer",
                      }}
                    >
                      {c}
                    </div>
                  ))}
                </div>
              </div>
              <div
                style={{ background: "green", height: "30vh", display: "flex" }}
              >
                <div
                  style={{
                    width: "50%",
                    background: "blue",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flexWrap: "wrap",
                    cursor: "pointer",
                  }}
                >
                  <h4 style={{ marginRight: "10px" }}>
                    Player 2: {users[1].name}
                  </h4>
                  {player2Deck.map((c) => (
                    <div
                      style={{
                        background: "purple",
                        height: "100px",
                        width: "75px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        border: "4px solid black",
                        marginLeft: "6px",
                        cursor: "pointer",
                      }}
                      onClick={(e) => {
                        let i = player2Deck.indexOf(c);

                        setPlayer2Deck(
                          Object.assign([], player2Deck, { [i]: 80 })
                        );
                      }}
                    >
                      {c}
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    width: "50%",
                    background: "green",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <h4 style={{ marginRight: "10px" }}>
                    Player 1: {users[0].name}
                  </h4>
                  {player1Deck.map((c) => (
                    <div
                      style={{
                        background: "purple",
                        height: "100px",
                        width: "75px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        border: "4px solid black",
                        marginLeft: "6px",
                        cursor: "pointer",
                      }}
                    >
                      {c}
                    </div>
                  ))}
                </div>
              </div>
              <div className='deck-container'>
                {currentUser === "Player 1" && (
                  <button
                    onClick={handlePressDeck}
                    className='deck'
                    disabled={turn !== "Player 1" || deckPressed}
                  >
                    Deck
                  </button>
                )}

                {currentUser === "Player 2" && (
                  <button
                    onClick={handlePressDeck}
                    className='deck'
                    disabled={turn !== "Player 2" || deckPressed}
                  >
                    Deck
                  </button>
                )}

                {currentUser === "Player 3" && (
                  <button
                    onClick={handlePressDeck}
                    className='deck'
                    disabled={turn !== "Player 3" || deckPressed}
                  >
                    Deck
                  </button>
                )}

                {currentUser === "Player 4" && (
                  <button
                    onClick={handlePressDeck}
                    className='deck'
                    disabled={turn !== "Player 4" || deckPressed}
                  >
                    Deck
                  </button>
                )}

                <h3>Turn: {turn}</h3>
                <div className='chatBoxWrapper'>
                  <div className='chat-box chat-box-player1'>
                    <div className='chat-head'>
                      <h2>Chat Box</h2>
                      {!isChatBoxHidden ? (
                        <span onClick={toggleChatBox} class='material-icons'>
                          keyboard_arrow_down
                        </span>
                      ) : (
                        <span onClick={toggleChatBox} class='material-icons'>
                          keyboard_arrow_up
                        </span>
                      )}
                    </div>
                    <div className='chat-body'>
                      <div className='msg-insert'>
                        {messages.map((msg) => {
                          return (
                            <div className='msg-send'>
                              {`From: ${msg.user} ->  ${msg.text}`}
                            </div>
                          );
                        })}
                      </div>
                      <div className='chat-text'>
                        <input
                          type='text'
                          placeholder='Type a message...'
                          value={message}
                          onChange={(event) => setMessage(event.target.value)}
                          onKeyPress={(event) =>
                            event.key === "Enter" && sendMessage(event)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                {currentUser === turn && deckPressed && (
                  <div class='card-from-deck'>
                    <div
                      style={{
                        background: "purple",
                        height: "100px",
                        width: "75px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        border: "4px solid black",
                        marginLeft: "6px",
                        cursor: "pointer",
                      }}
                    >
                      {currentDeckCard}
                    </div>
                    <div>
                      {/* <input
                      type='text'
                      placeholder='Deck Position'
                    /> */}
                      <button
                        onClick={handleDeckCardTake}
                        className='btn take'
                        type='submit'
                      >
                        Take
                      </button>
                      <button
                        onClick={handleDeckCardDiscard}
                        className='btn discard'
                        type='submit'
                        disabled={takeDeckCard}
                      >
                        Discard
                      </button>
                    </div>
                    {takeDeckCard && (
                      <div>
                        <input
                          type='number'
                          placeholder='Position'
                          value={deckCardPosition}
                          onChange={(e) => setDeckCardPosition(e.target.value)}
                        ></input>
                        <button onClick={handleChangeCard}>Accept</button>
                      </div>
                    )}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    marginTop: "14px",
                    color: "red",
                  }}
                >
                  {currentUser === "Player 1" && (
                    <h1>Hi Player 1, you rock!</h1>
                  )}

                  {currentUser === "Player 2" && (
                    <h1>Hi Player 2, you're the best!</h1>
                  )}

                  {currentUser === "Player 3" && (
                    <h1>Hi Player 3, keep going!</h1>
                  )}

                  {currentUser === "Player 4" && <h1>Hi Player 4, lumos!</h1>}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <h1>Room full</h1>
      )}

      <br />
      <a href='/'>
        <button className='game-button red'>Quit</button>
      </a>
    </div>
  );
};

export default memo(Racko);
