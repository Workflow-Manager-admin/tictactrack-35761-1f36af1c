import React, { useState, useEffect } from "react";
import "./App.css";

/*
Modern/minimal styles provided via App.css and color variables.
Theme color variables are in App.css. Use --bg-primary, etc.

Backend API base URL:
You must adjust API_URL if running locally/with different setup.
Assume backend endpoints mapped as:
  - POST   /api/register         {username, password}
  - POST   /api/login            {username, password}
  - POST   /api/games            (start new game)
  - GET    /api/games/history    (list game history)
  - GET    /api/games/{game_id}  (get game state)
  - POST   /api/games/{game_id}/move {row, col}

Assume backend sets and expects token via Authorization: Bearer ...
*/

// Set this according to deployment; for local: "http://localhost:8000"
const API_URL = "/api";

function useLocalStorage(key, defaultValue) {
  // Persist theme and token etc.
  const [val, setVal] = useState(() => {
    const v = window.localStorage.getItem(key);
    if (v !== null) return JSON.parse(v);
    return defaultValue;
  });
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(val));
  }, [key, val]);
  return [val, setVal];
}

function apiFetch(endpoint, { token, method = "GET", body = undefined } = {}) {
  // Helper for backend comms.
  let opts = { method, headers: { "Content-Type": "application/json" } };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) opts.body = JSON.stringify(body);
  return fetch(API_URL + endpoint, opts).then(async (res) => {
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || "API Error");
    }
    return res.json();
  });
}

function AuthForm({ onAuth, mode, setMode, loading }) {
  // mode: "login" or "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // PUBLIC_INTERFACE
  async function handleAuth(e) {
    e.preventDefault();
    setError("");
    try {
      const resp = await apiFetch(
        mode === "login" ? "/login" : "/register",
        { method: "POST", body: { username, password } }
      );
      onAuth(resp.token, resp.username);
    } catch (err) {
      setError(String(err.message || err));
    }
  }

  return (
    <div className="auth-container" style={{
      padding: 32,
      boxShadow: "0 2px 16px 0 rgba(0,0,0,0.08)",
      borderRadius: 12,
      background: "var(--bg-secondary)",
      maxWidth: 340,
      margin: "64px auto"
    }}>
      <h2 style={{ marginBottom: 8 }}>{mode === "login" ? "Login" : "Register"}</h2>
      <form onSubmit={handleAuth}>
        <input
          type="text"
          placeholder="Username"
          minLength={3}
          value={username}
          autoFocus
          required
          autoComplete="username"
          onChange={e => setUsername(e.target.value)}
          className="form-input"
        />
        <input
          type="password"
          placeholder="Password"
          minLength={3}
          value={password}
          required
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          onChange={e => setPassword(e.target.value)}
          className="form-input"
        />
        <button disabled={loading} type="submit" className="btn-primary" style={{width:"100%"}}>
          {loading ? "..." : (mode === "login" ? "Log in" : "Register")}
        </button>
      </form>
      <button
        disabled={loading}
        className="btn-link"
        style={{marginTop:8, fontSize:12}}
        onClick={()=>setMode(mode==="login"?"register":"login")}
      >
        {mode === "login"
          ? "Need an account? Register"
          : "Already have an account? Login"}
      </button>
      {error && (
        <div className="form-error" style={{ color: "#E87A41", marginTop: 6, fontSize:13}}>{error}</div>
      )}
    </div>
  );
}

function GameBoard({ board, onMove, currentTurn, disabled, winner, lastMove }) {
  // board: 2D array [['X', 'O', null], ...]
  // onMove: (row, col)
  // disabled: boolean (disable after game end or not current turn)
  // lastMove: {row, col}
  // winner: null | 'X' | 'O' | "draw"
  function getCellStyle(r, c) {
    let border = "1px solid var(--border-color)";
    let bg = "var(--bg-primary)";
    if (lastMove && lastMove.row === r && lastMove.col === c) bg = "var(--bg-secondary)";
    if (board[r][c]) bg = "var(--bg-secondary)";
    return {
      width: 58,
      height: 58,
      minWidth: 50,
      minHeight: 50,
      fontSize: 32,
      fontWeight: 600,
      textAlign: "center",
      verticalAlign: "middle",
      background: bg,
      border,
      cursor: board[r][c] || disabled ? "default" : "pointer",
      transition: "background 0.2s",
      color: board[r][c] === "X" ? "#1976d2" : board[r][c] === "O" ? "#E87A41" : "var(--text-primary)"
    };
  }
  return (
    <div>
      <table
        className="game-board"
        style={{
          borderCollapse: "collapse",
          margin: "0 auto",
          marginBottom: 8,
          background: "var(--bg-primary)",
          boxShadow: "0 4px 16px 0 rgba(0,0,0,0.08)",
          borderRadius: 8,
          overflow: "hidden"
        }}
      >
        <tbody>
          {board.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td
                  key={c}
                  style={getCellStyle(r, c)}
                  onClick={
                    cell || disabled ? undefined : () => onMove(r, c)
                  }
                  aria-label={`Row ${r + 1} Column ${c + 1}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {winner && (
        <div className="game-result" style={{ fontWeight: 600, margin: "8px 0", fontSize: 19 }}>
          {winner === "draw"
            ? "It's a draw!"
            : (
              <>
                Winner:
                <span style={{
                  color: winner === "X" ? "#1976d2" : "#E87A41",
                  marginLeft:6
                }}>{winner}</span>
              </>
            )
          }
        </div>
      )}
      {currentTurn && !winner && (
        <div className="game-turn" style={{ color: "var(--text-secondary)", marginBottom: 3, fontSize:14 }}>
          Next turn: <span style={{
            color: currentTurn === "X" ? "#1976d2" : "#E87A41"
          }}>{currentTurn}</span>
        </div>
      )}
    </div>
  );
}

function GameHistorySidebar({ games, onSelectGame, selectedGameId }) {
  return (
    <aside
      className="game-history-sidebar"
      style={{
        minWidth: 180, maxWidth: 260, background: "var(--bg-secondary)", borderLeft: "1px solid var(--border-color)",
        height: "100vh", overflowY: "auto", padding: "24px 12px 12px 12px", position: "fixed", right: 0, top: 0
      }}
    >
      <h3 style={{marginBlock:0, marginBottom:12, fontSize:19, color: "var(--text-primary)"}}>Game History</h3>
      <ul style={{ listStyle: "none", padding:0, margin:0 }}>
        {games.length === 0 && (
          <li style={{ color: "var(--text-secondary)" }}>No finished games</li>
        )}
        {games.slice().reverse().map(g => (
          <li key={g.id}>
            <button
              className="history-game-btn"
              style={{
                background: g.id === selectedGameId ? "#e1f0fa" : "transparent",
                fontSize: 14,
                color: "var(--text-primary)",
                border: "none",
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: 6,
                width: "100%",
                fontWeight: g.id === selectedGameId ? "bold" : 400,
                cursor: "pointer",
                marginBottom: 3,
                outline: g.id === selectedGameId ? "2px solid #1976d2" : "none"
              }}
              onClick={() => onSelectGame(g.id)}
            >
              #{g.id} &mdash; {g.result === "draw" ? "Draw" : (g.result ? `${g.result} won` : "Ongoing")}
              <br />
              <span style={{ fontSize: 11, color: "#888" }}>
                {g.ended_at
                  ? new Date(g.ended_at).toLocaleString()
                  : (g.started_at ? new Date(g.started_at).toLocaleString() : "")}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function Navbar({ username, onLogout }) {
  return (
    <nav style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "var(--bg-secondary)", padding: "8px 18px 8px 24px",
      borderBottom: "1px solid var(--border-color)", height: 48
    }}>
      <span style={{ fontWeight: 700, fontSize: 22, color: "#1976d2", letterSpacing: 1 }}>
        Tictac<span style={{color:"var(--text-secondary)"}}>Track</span>
      </span>
      <span style={{ display:"flex", alignItems: "center", gap: 19 }}>
        <span style={{fontSize:15, color:"var(--text-primary)"}}>Hello, {username}</span>
        <button onClick={onLogout} className="btn-link" style={{ fontSize:13 }}>Logout</button>
      </span>
    </nav>
  );
}

function GameControls({ onNewGame, disabled, loading }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <button
        className="btn-primary"
        onClick={onNewGame}
        disabled={disabled || loading}
        style={{width:200, fontSize:17, margin:"0 8px"}}
      >{loading ? "Starting..." : "Start New Game"}</button>
    </div>
  );
}

// PUBLIC_INTERFACE
function App() {
  // Theme state
  const [theme, setTheme] = useLocalStorage("theme", "light");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Auth state
  const [token, setToken] = useLocalStorage("authToken", null);
  const [username, setUsername] = useLocalStorage("authUsername", "");
  const [loading, setLoading] = useState(false);

  // Game and UI state
  const [gameId, setGameId] = useState(null);
  const [games, setGames] = useState([]); // history
  const [gameState, setGameState] = useState(null); // current board
  const [gameError, setGameError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);

  // UI: auth mode
  const [authMode, setAuthMode] = useState("login");

  // On login/register success, save token and username
  function handleAuth(_token, _username) {
    setToken(_token);
    setUsername(_username);
  }
  function handleLogout() {
    setToken(null);
    setUsername("");
    setGameId(null);
    setGameState(null);
    setGames([]);
  }
  // Load game history on login or when changed
  useEffect(() => {
    if (!token) return;
    setHistoryLoading(true);
    apiFetch("/games/history", { token })
      .then(hist => setGames(hist))
      .catch(() => setGames([]))
      .finally(() => setHistoryLoading(false));
  }, [token, gameId]);

  // Load selected ongoing/any game
  useEffect(() => {
    if (!token || !gameId) return;
    setGameError("");
    apiFetch(`/games/${gameId}`, { token })
      .then(gs => setGameState(gs))
      .catch(e => setGameError(String(e.message)));
  }, [token, gameId]);

  // On initial login, select most recent unfinished game if any
  useEffect(() => {
    if (games.find) {
      const ongoing = games.find(g => g.result === null && g.id);
      if (ongoing) setGameId(ongoing.id);
    }
  }, [games]);

  // Create a new game
  async function handleNewGame() {
    setGameError("");
    setLoading(true);
    try {
      const g = await apiFetch("/games", { token, method: "POST" });
      setGameId(g.id);
      setGameState(g);
    } catch (e) {
      setGameError(String(e.message));
    }
    setLoading(false);
  }

  // Make move
  async function handleMove(row, col) {
    setGameError("");
    try {
      // optimistic UI, but refetch after move for real source of truth
      await apiFetch(`/games/${gameId}/move`, { token, method: "POST", body: { row, col } });
      // After making move, re-fetch game (and thus, re-render)
      const state = await apiFetch(`/games/${gameId}`, { token });
      setGameState(state);
      // If now finished, refresh whole history list (new result)
      if (state && state.winner) {
        apiFetch("/games/history", { token })
          .then(hist => setGames(hist))
          .catch(()=>{});
      }
    } catch (e) {
      setGameError(String(e.message));
    }
  }

  function handleGameSelect(id) {
    setGameId(id);
    setGameState(null);
    setGameError("");
  }

  // Derived: board, etc.
  const board = (gameState && gameState.board) || [
    [null, null, null],
    [null, null, null],
    [null, null, null]
  ];
  const currentTurn = gameState && gameState.current_turn;
  const winner = gameState && (gameState.winner || (gameState.result === "draw" ? "draw" : null));
  const lastMove = gameState && gameState.last_move;

  return (
    <div className="App" style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <button
        className="theme-toggle"
        onClick={() => setTheme(t => t === "light" ? "dark" : "light")}
        aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        style={{ position:"fixed", top:22, right:historyLoading ? 220 : 20, zIndex:2 }}
      >{theme === "light" ? "🌙 Dark" : "☀️ Light"}</button>
      {!token ? (
        <AuthForm onAuth={handleAuth} mode={authMode} setMode={setAuthMode} loading={loading} />
      ) : (
        <>
          <Navbar username={username} onLogout={handleLogout} />
          {/* Use layout described: controls+game center, sidebar right */}
          <div className="main-content" style={{
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            minHeight: "calc(100vh - 48px)", marginTop:20
          }}>
            <div style={{
              flexGrow: 1, maxWidth: 420, margin: "auto",
              padding: "30px 24px", background:"var(--bg-secondary)", borderRadius:18,
              boxShadow:"0 2px 24px 0 rgba(0,0,0,0.09)",
              marginRight: 24
            }}>
              <GameControls onNewGame={handleNewGame} disabled={loading} loading={loading} />
              {gameError && <div style={{color:"#E87A41", marginBottom:10}}>{gameError}</div>}
              <GameBoard
                board={board}
                onMove={handleMove}
                currentTurn={currentTurn}
                winner={winner}
                lastMove={lastMove}
                disabled={!gameId || !!winner || (gameState && !gameState.can_play)}
              />
              {gameId && (
                <div style={{
                  marginTop:16, fontSize:13, color:"var(--text-secondary)"
                }}>Game ID: #{gameId}</div>
              )}
              {(gameState && !!winner) && (
                <button className="btn-secondary" style={{
                  marginTop:16,
                  background: "#fff", color: "#444", border: "1px solid #ddd"
                }} onClick={handleNewGame}>
                  Play Again
                </button>
              )}
            </div>
            <div style={{marginLeft: 12, marginRight:0}}>
              <GameHistorySidebar
                games={games}
                onSelectGame={handleGameSelect}
                selectedGameId={gameId}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
