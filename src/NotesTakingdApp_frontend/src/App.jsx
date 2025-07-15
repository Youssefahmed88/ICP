import React, { useState, useEffect } from "react";
import { AuthClient } from "@dfinity/auth-client";
import { createActor } from "../../declarations/NotesTakingdApp_backend";
import { canisterId } from "../../declarations/NotesTakingdApp_backend/index.js";
import "./index.scss";

const network = process.env.DFX_NETWORK;
const identityProvider =
  network === "ic"
    ? "https://identity.ic0.app"
    : `http://${process.env.CANISTER_ID_INTERNET_IDENTITY}.localhost:4943`;

const Button = ({ onClick, disabled, children }) => (
  <button onClick={onClick} disabled={disabled}>
    {children}
  </button>
);

function App() {
  const [authClient, setAuthClient] = useState(null);
  const [actor, setActor] = useState(null);
  const [principal, setPrincipal] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    const client = await AuthClient.create();
    const identity = client.getIdentity();
    const isAuth = await client.isAuthenticated();

    const act = createActor(canisterId, {
      agentOptions: {
        identity,
        host: network !== "ic" ? "http://localhost:4943" : undefined,
      },
    });

    setAuthClient(client);
    setActor(act);
    setIsAuthenticated(isAuth);

    if (isAuth) {
      setPrincipal(identity.getPrincipal().toText());
      fetchNotes(act);
    }
  };

  const login = async () => {
    await authClient.login({
      identityProvider: `${identityProvider}#authorize`,
      onSuccess: initAuth,
    });
  };

  const logout = async () => {
    await authClient.logout();
    await initAuth();
  };

  const fetchNotes = async (actorInstance = actor) => {
    if (!actorInstance) return;
    try {
      const result = await actorInstance.get_notes();
      setNotes(result);
    } catch (err) {
      console.error("Error fetching notes:", err);
    }
  };

  const addNote = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setLoading(true);
    try {
      await actor.add_note(newTitle, newContent);
      setNewTitle("");
      setNewContent("");
      await fetchNotes();
    } catch (err) {
      console.error("Error adding note:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (index) => {
    setLoading(true);
    try {
      await actor.delete_note(BigInt(index));
      await fetchNotes();
    } catch (err) {
      console.error("Error deleting note:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!editTitle.trim() || !editContent.trim()) return;
    setLoading(true);
    try {
      await actor.edit_note(BigInt(editIndex), editTitle, editContent);
      setEditIndex(null);
      setEditTitle("");
      setEditContent("");
      await fetchNotes();
    } catch (err) {
      console.error("Error editing note:", err);
    } finally {
      setLoading(false);
    }
  };

  const beginEdit = (index) => {
    const note = notes[index];
    setEditIndex(index);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  const cancelEdit = () => {
    setEditIndex(null);
    setEditTitle("");
    setEditContent("");
  };

  if (!isAuthenticated) {
    return (
      <div className="app">
        <div className="auth-container">
          <h1>📝 Note Taking dApp</h1>
          <p>A decentralized note-taking application on the Internet Computer</p>
          <Button onClick={login} disabled={loading}>
            {loading ? "Connecting..." : "Login with Internet Identity"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>📝 My Notes</h1>
        <div className="user-info">
          <span>Principal: {principal?.substring(0, 20)}...</span>
          <Button onClick={logout}>Logout</Button>
        </div>
      </header>

      <div className="container">
        <div className="add-note-section">
          <h2>Add Note</h2>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title"
            className="input-field"
          />
          <textarea
            rows="4"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Content"
            className="textarea-field"
          />
          <Button onClick={addNote} disabled={loading || !newTitle.trim() || !newContent.trim()}>
            {loading ? "Adding..." : "Add Note"}
          </Button>
        </div>

        <div className="notes-section">
          <h2>My Notes ({notes.length})</h2>
          {notes.length === 0 ? (
            <p className="no-notes">No notes yet. Create your first note above!</p>
          ) : (
            <div className="notes-grid">
              {notes.map((note, index) => (
                <div className="note-card" key={index}>
                  {editIndex === index ? (
                    <div className="edit-mode">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="edit-input"
                      />
                      <textarea
                        rows="3"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="edit-textarea"
                      />
                      <div className="edit-actions">
                        <Button onClick={saveEdit} className="save-btn">Save</Button>
                        <Button onClick={cancelEdit} className="cancel-btn">Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="view-mode">
                      <h3>{note.title}</h3>
                      <p>{note.content}</p>
                      <div className="note-actions">
                        <Button onClick={() => beginEdit(index)} className="edit-btn">Edit</Button>
                        <Button
                          onClick={() => deleteNote(index)}
                          disabled={loading}
                          className="delete-btn"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
